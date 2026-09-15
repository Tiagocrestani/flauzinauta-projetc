import { Component, HostListener, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ADMIN_COMIC_REPOSITORY } from '../data/admin-comic.repository';
import {
  AdminComicPage,
  AdminIssueInput,
  AdminPublicationStatus,
} from '../data/admin-comic.models';
import { slugify } from '../data/slugify';
import { AdminImagePickerComponent } from '../image-picker/admin-image-picker';
import {
  ADMIN_IMAGE_ACCEPT,
  formatAdminImageFileSize,
  validateAdminImageFile,
} from '../shared/admin-image-file.utils';
import { AdminConfirmDialogComponent } from '../shared/admin-confirm-dialog';
import { compareNaturalFileNames } from '../shared/natural-file-name-sort';

function todayForDateInput(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

@Component({
  selector: 'app-admin-issue-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AdminImagePickerComponent,
    AdminConfirmDialogComponent,
  ],
  templateUrl: './admin-issue-form.html',
  styleUrl: './admin-issue-form.css',
})
export class AdminIssueFormComponent {
  private readonly repository = inject(ADMIN_COMIC_REPOSITORY);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly coverPicker = viewChild(AdminImagePickerComponent);
  private readonly createdUrls = new Set<string>();
  private leaveResolver?: (allow: boolean) => void;

  protected readonly comicId = this.route.snapshot.paramMap.get('comicId') ?? '';
  protected readonly issueId = this.route.snapshot.paramMap.get('issueId');
  protected readonly comic = computed(() =>
    this.repository.comics().find((item) => item.id === this.comicId),
  );
  protected readonly issue = computed(() =>
    this.comic()?.issues.find((item) => item.id === this.issueId),
  );
  protected readonly pages = signal<AdminComicPage[]>([]);
  protected readonly activePageIndex = signal(0);
  protected readonly activePage = computed(() => this.pages()[this.activePageIndex()]);
  protected readonly coverUrl = signal('');
  protected readonly feedback = signal('');
  protected readonly feedbackIsError = signal(false);
  protected readonly pageError = signal('');
  protected readonly fileErrors = signal<string[]>([]);
  protected readonly submitted = signal(false);
  protected readonly pagesChanged = signal(false);
  protected readonly leaveDialogOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly acceptedImageFormats = ADMIN_IMAGE_ACCEPT;
  protected readonly isNew = !this.issueId;
  protected readonly form = this.formBuilder.nonNullable.group({
    number: [1, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
    title: ['', [Validators.required, Validators.maxLength(120)]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    description: ['', [Validators.maxLength(2000)]],
    publishedAt: [todayForDateInput(), [Validators.required]],
    publicationStatus: ['draft' as AdminPublicationStatus, [Validators.required]],
    coverUrl: [''],
  });
  private slugEdited = false;

  constructor() {
    const issue = this.issue();
    if (issue) {
      this.form.setValue({
        number: issue.number,
        title: issue.title,
        slug: issue.slug,
        description: issue.description,
        publishedAt: issue.publishedAt,
        publicationStatus: issue.publicationStatus,
        coverUrl: issue.coverUrl,
      });
      this.form.markAsPristine();
      this.pages.set(issue.pages.map((page) => ({ ...page })));
      this.coverUrl.set(issue.coverUrl);
      this.slugEdited = true;
    }

    if (this.route.snapshot.queryParamMap.get('criada') === '1') {
      this.feedback.set('Edição criada com sucesso.');
    }

    this.form.controls.title.valueChanges.pipe(takeUntilDestroyed()).subscribe((title) => {
      if (!this.slugEdited) this.form.controls.slug.setValue(slugify(title), { emitEvent: false });
    });
  }

  @HostListener('window:beforeunload', ['$event'])
  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasPendingChanges()) event.preventDefault();
  }

  canDeactivate(): boolean | Promise<boolean> {
    if (!this.hasPendingChanges()) return true;
    if (this.leaveResolver) return false;
    this.leaveDialogOpen.set(true);
    return new Promise<boolean>((resolve) => (this.leaveResolver = resolve));
  }

  protected confirmLeave(): void {
    this.leaveDialogOpen.set(false);
    this.releaseUncommittedUrls();
    this.leaveResolver?.(true);
    this.leaveResolver = undefined;
  }

  protected cancelLeave(): void {
    this.leaveDialogOpen.set(false);
    this.leaveResolver?.(false);
    this.leaveResolver = undefined;
  }

  protected markSlugEdited(): void {
    this.slugEdited = true;
  }

  protected onCoverUrlChange(url: string): void {
    this.coverUrl.set(url);
    this.form.controls.coverUrl.setValue(url);
    this.form.controls.coverUrl.markAsDirty();
  }

  protected slugDuplicate(): boolean {
    const slug = this.form.controls.slug.value.trim();
    return !!slug && this.repository.issueSlugExists(this.comicId, slug, this.issueId ?? undefined);
  }

  protected numberDuplicate(): boolean {
    const number = Number(this.form.controls.number.value);
    return (
      Number.isInteger(number) &&
      this.repository.issueNumberExists(this.comicId, number, this.issueId ?? undefined)
    );
  }

  protected selectPages(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = [...(input.files ?? [])].sort((a, b) => compareNaturalFileNames(a.name, b.name));
    input.value = '';

    const errors: string[] = [];
    const additions: AdminComicPage[] = [];
    for (const file of files) {
      const error = this.validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
        continue;
      }
      const imageUrl = URL.createObjectURL(file);
      this.createdUrls.add(imageUrl);
      additions.push({
        id: crypto.randomUUID(),
        issueId: this.issueId ?? 'new',
        pageNumber: 0,
        imageUrl,
        fileName: file.name,
        fileSize: file.size,
      });
    }

    this.fileErrors.set(errors);
    if (additions.length) {
      this.setLocalPages([...this.pages(), ...additions]);
      this.pageError.set('');
    }
  }

  protected replacePage(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const error = this.validateFile(file);
    if (error) {
      this.fileErrors.set([`${file.name}: ${error}`]);
      return;
    }

    const current = this.pages()[index];
    if (!current) return;
    this.releaseUrlIfUncommitted(current.imageUrl);
    const imageUrl = URL.createObjectURL(file);
    this.createdUrls.add(imageUrl);
    const updated = [...this.pages()];
    updated[index] = { ...current, imageUrl, fileName: file.name, fileSize: file.size };
    this.setLocalPages(updated);
    this.fileErrors.set([]);
  }

  protected removePage(index: number): void {
    const page = this.pages()[index];
    if (!page) return;
    this.releaseUrlIfUncommitted(page.imageUrl);
    this.setLocalPages(this.pages().filter((_, pageIndex) => pageIndex !== index));
    this.activePageIndex.set(
      Math.min(this.activePageIndex(), Math.max(0, this.pages().length - 1)),
    );
  }

  protected movePage(index: number, offset: number): void {
    this.movePageTo(index, index + offset);
  }

  protected movePageToInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const position = Number(input.value);
    if (!Number.isInteger(position) || position < 1 || position > this.pages().length) {
      input.value = String(index + 1);
      return;
    }
    this.movePageTo(index, position - 1);
  }

  private movePageTo(index: number, target: number): void {
    if (target < 0 || target >= this.pages().length || target === index) return;
    const updated = [...this.pages()];
    const [page] = updated.splice(index, 1);
    updated.splice(target, 0, page);
    this.setLocalPages(updated);
    this.activePageIndex.set(target);
  }

  protected showPreviousPage(): void {
    this.activePageIndex.update((index) => Math.max(0, index - 1));
  }

  protected showNextPage(): void {
    this.activePageIndex.update((index) => Math.min(this.pages().length - 1, index + 1));
  }

  protected selectPreview(index: number): void {
    this.activePageIndex.set(index);
  }

  protected pageName(page: AdminComicPage): string {
    return page.fileName || page.imageUrl.split('/').pop() || `Página ${page.pageNumber}`;
  }

  protected pageSize(page: AdminComicPage): string {
    if (!page.fileSize) return 'Imagem mockada';
    return formatAdminImageFileSize(page.fileSize);
  }

  protected async save(): Promise<void> {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    this.pageError.set('');
    this.feedback.set('');
    this.feedbackIsError.set(false);
    if (this.form.invalid || this.slugDuplicate() || this.numberDuplicate() || this.saving())
      return;
    if (this.form.controls.publicationStatus.value === 'published' && !this.pages().length) {
      this.pageError.set('Adicione pelo menos uma página antes de publicar a edição.');
      return;
    }

    const raw = this.form.getRawValue();
    const input: AdminIssueInput = {
      number: Number(raw.number),
      title: raw.title.trim(),
      slug: raw.slug.trim(),
      description: raw.description.trim(),
      publishedAt: raw.publishedAt,
      publicationStatus: raw.publicationStatus,
      coverUrl: raw.coverUrl,
    };

    this.saving.set(true);
    try {
      const existing = this.issue();
      const saved = await this.repository.saveIssueWithPages(
        this.comicId,
        existing?.id ?? null,
        input,
        this.pages(),
      );

      this.coverPicker()?.commitCurrentUrl();
      this.createdUrls.clear();
      this.pagesChanged.set(false);
      this.form.markAsPristine();
      this.feedbackIsError.set(false);
      this.feedback.set(existing ? 'Edição atualizada com sucesso.' : 'Edição criada com sucesso.');
      if (!existing) {
        void this.router.navigate(['/admin/hqs', this.comicId, 'edicoes', saved.id, 'editar'], {
          replaceUrl: true,
          queryParams: { criada: '1' },
        });
      }
    } catch (error) {
      this.feedbackIsError.set(true);
      this.feedback.set(
        error instanceof Error ? error.message : 'Não foi possível salvar a edição.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  private validateFile(file: File): string | null {
    const validation = validateAdminImageFile(file);
    return validation.valid ? null : validation.message;
  }

  private setLocalPages(pages: AdminComicPage[]): void {
    this.pages.set(pages.map((page, index) => ({ ...page, pageNumber: index + 1 })));
    this.pagesChanged.set(true);
  }

  private releaseUrlIfUncommitted(url: string): void {
    if (!this.createdUrls.delete(url)) return;
    URL.revokeObjectURL(url);
  }

  private releaseUncommittedUrls(): void {
    for (const url of this.createdUrls) URL.revokeObjectURL(url);
    this.createdUrls.clear();
  }

  private hasPendingChanges(): boolean {
    return this.form.dirty || this.pagesChanged();
  }

  ngOnDestroy(): void {
    this.releaseUncommittedUrls();
  }
}
