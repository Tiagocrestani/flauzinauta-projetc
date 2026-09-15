import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import {
  AdminCatalogService,
  AdminComicForIssue,
  sortFilesByName,
  slugify,
  UploadProgress,
  validateImageFiles,
} from '../data/admin-catalog.service';

@Component({
  selector: 'app-admin-issue-form-page',
  imports: [DecimalPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-issue-form-page.html',
  styleUrl: '../comic-form/admin-comic-form-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminIssueFormPageComponent {
  private readonly catalogService = inject(AdminCatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly today = new Date().toISOString().slice(0, 10);

  protected readonly comic = signal<AdminComicForIssue | null>(null);
  protected readonly loading = signal(true);
  protected readonly pages = signal<File[]>([]);
  protected readonly fileError = signal('');
  protected readonly submitError = signal('');
  protected readonly submitting = signal(false);
  protected readonly progress = signal<UploadProgress | null>(null);
  protected readonly success = signal<{ comicSlug: string; issueSlug: string } | null>(null);
  protected readonly totalSize = computed(() =>
    this.pages().reduce((total, file) => total + file.size, 0),
  );
  protected readonly progressPercent = computed(() => {
    const progress = this.progress();

    if (!progress) return 0;
    if (progress.stage === 'database') return 92;
    if (progress.stage === 'finished') return 100;
    return Math.max(5, Math.round((progress.completed / Math.max(progress.total, 1)) * 85));
  });

  protected readonly form = new FormGroup({
    issueNumber: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    issueTitle: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    issueSlug: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)],
    }),
    issueDescription: new FormControl('', { nonNullable: true }),
    publishedAt: new FormControl(this.today, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    publishNow: new FormControl(true, { nonNullable: true }),
  });

  constructor() {
    void this.loadComic();
  }

  protected syncIssueSlug(): void {
    if (this.form.controls.issueSlug.pristine) {
      this.form.controls.issueSlug.setValue(slugify(this.form.controls.issueTitle.value), {
        emitEvent: false,
      });
    }
  }

  protected selectPages(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = sortFilesByName(Array.from(input.files ?? []));
    const validationError = validateImageFiles(files);
    this.fileError.set(validationError ?? '');

    if (validationError) {
      this.pages.set([]);
      input.value = '';
      return;
    }

    this.pages.set(files);
  }

  protected movePage(index: number, direction: -1 | 1): void {
    const destination = index + direction;

    if (destination < 0 || destination >= this.pages().length) return;

    const pages = [...this.pages()];
    [pages[index], pages[destination]] = [pages[destination], pages[index]];
    this.pages.set(pages);
  }

  protected removePage(index: number): void {
    this.pages.update((pages) => pages.filter((_, currentIndex) => currentIndex !== index));
  }

  protected async submit(): Promise<void> {
    this.submitError.set('');
    this.success.set(null);
    const comic = this.comic();

    if (!comic) {
      this.submitError.set('A HQ não foi carregada.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.submitError.set('Revise os campos obrigatórios antes de continuar.');
      return;
    }

    if (this.pages().length === 0) {
      this.submitError.set('Selecione pelo menos uma página.');
      return;
    }

    this.submitting.set(true);

    try {
      const result = await this.catalogService.createIssuePackage(
        { ...this.form.getRawValue(), comic, pages: this.pages() },
        (progress) => this.progress.set(progress),
      );
      this.success.set(result);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      this.submitError.set(
        error instanceof Error ? error.message : 'Não foi possível cadastrar a parte.',
      );
    } finally {
      this.submitting.set(false);
    }
  }

  protected fileSize(size: number): number {
    return size / 1024 / 1024;
  }

  private async loadComic(): Promise<void> {
    const comicId = this.route.snapshot.paramMap.get('comicId');

    if (!comicId) {
      this.submitError.set('Identificador da HQ não informado.');
      this.loading.set(false);
      return;
    }

    try {
      const comic = await this.catalogService.getComicForIssue(comicId);
      this.comic.set(comic);
      this.form.controls.issueNumber.setValue(comic.nextIssueNumber);
    } catch (error) {
      this.submitError.set(
        error instanceof Error ? error.message : 'Não foi possível carregar a HQ.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
