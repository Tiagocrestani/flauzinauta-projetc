import { Component, ElementRef, HostListener, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ComicStatus } from '../../../core/models/comic.models';
import { AdminComicInput, AdminPublicationStatus } from '../data/admin-comic.models';
import { ADMIN_COMIC_REPOSITORY } from '../data/admin-comic.repository';
import { slugify } from '../data/slugify';
import { AdminImagePickerComponent } from '../image-picker/admin-image-picker';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const trimmedRequiredValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null =>
  String(control.value ?? '').trim().length > 0 ? null : { required: true };

const trimmedMinLengthValidator =
  (minimumLength: number): ValidatorFn =>
  (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    return value.length === 0 || value.length >= minimumLength
      ? null
      : {
          minlength: {
            requiredLength: minimumLength,
            actualLength: value.length,
          },
        };
  };

const genresValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  String(control.value ?? '')
    .split(',')
    .some((genre) => genre.trim().length > 0)
    ? null
    : { required: true };

const coverForPublicationValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null =>
  control.get('publicationStatus')?.value === 'published' && !control.get('coverUrl')?.value
    ? { coverRequired: true }
    : null;

@Component({
  selector: 'app-admin-comic-form',
  imports: [ReactiveFormsModule, RouterLink, AdminImagePickerComponent],
  templateUrl: './admin-comic-form.html',
  styleUrl: './admin-comic-form.css',
})
export class AdminComicFormComponent {
  private readonly repository = inject(ADMIN_COMIC_REPOSITORY);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly titleService = inject(Title);
  private readonly formBuilder = inject(FormBuilder).nonNullable;

  @ViewChild(AdminImagePickerComponent) private imagePicker?: AdminImagePickerComponent;
  @ViewChild('discardDialog') private discardDialog?: ElementRef<HTMLDialogElement>;

  protected readonly comicId = signal<string | null>(null);
  protected readonly initialCover = signal('');
  protected readonly notFound = signal(false);
  protected readonly submitted = signal(false);
  protected readonly notice = signal('');
  protected readonly saveError = signal('');
  protected readonly saving = signal(false);

  private slugManuallyEdited = false;
  private discardDecision: ((proceed: boolean) => void) | null = null;

  readonly form = this.formBuilder.group(
    {
      title: ['', [trimmedRequiredValidator, Validators.maxLength(140)]],
      slug: [
        '',
        [
          Validators.required,
          Validators.pattern(SLUG_PATTERN),
          (control: AbstractControl) => this.validateUniqueSlug(control),
        ],
      ],
      tagline: ['', [Validators.maxLength(220)]],
      description: [
        '',
        [trimmedRequiredValidator, trimmedMinLengthValidator(10), Validators.maxLength(2000)],
      ],
      author: ['', [trimmedRequiredValidator]],
      genresText: ['', [genresValidator]],
      status: ['Em andamento' as ComicStatus, [Validators.required]],
      publicationStatus: ['draft' as AdminPublicationStatus, [Validators.required]],
      releaseDate: ['', [Validators.required]],
      featured: [false],
      accentColor: ['#f4c542'],
      coverUrl: [''],
    },
    { validators: coverForPublicationValidator },
  );

  constructor() {
    this.form.controls.title.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      if (!this.slugManuallyEdited) {
        this.form.controls.slug.setValue(slugify(value));
      }
    });

    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.loadComic(params.get('id'));
    });
  }

  protected onSlugInput(): void {
    this.slugManuallyEdited = true;
  }

  protected onCoverChange(url: string): void {
    this.form.controls.coverUrl.setValue(url);
    this.form.controls.coverUrl.markAsDirty();
    this.form.controls.coverUrl.markAsTouched();
    this.form.updateValueAndValidity();
    this.notice.set('');
  }

  protected showError(field: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  protected coverRequired(): boolean {
    return (
      this.form.hasError('coverRequired') &&
      (this.submitted() || this.form.controls.publicationStatus.touched)
    );
  }

  protected async save(): Promise<void> {
    this.submitted.set(true);
    this.notice.set('');
    this.saveError.set('');
    this.form.controls.slug.updateValueAndValidity();
    this.form.updateValueAndValidity();

    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const values = this.form.getRawValue();
    const input: AdminComicInput = {
      title: values.title.trim(),
      slug: values.slug.trim(),
      tagline: values.tagline.trim(),
      description: values.description.trim(),
      author: values.author.trim(),
      genres: [
        ...new Set(
          values.genresText
            .split(',')
            .map((genre) => genre.trim())
            .filter(Boolean),
        ),
      ],
      status: values.status,
      publicationStatus: values.publicationStatus,
      releaseDate: values.releaseDate,
      featured: values.featured,
      accentColor: values.accentColor,
      coverUrl: values.coverUrl,
    };

    try {
      const id = this.comicId();
      const comic = await (id
        ? this.repository.updateComic(id, input)
        : this.repository.createComic(input));
      this.imagePicker?.commitCurrentUrl();
      this.initialCover.set(comic.coverUrl);
      this.form.markAsPristine();
      this.submitted.set(false);
      if (id) {
        this.notice.set('HQ atualizada com sucesso.');
      } else {
        void this.router.navigate(['/admin/hqs', comic.id, 'editar'], {
          replaceUrl: true,
          queryParams: { criada: '1' },
        });
      }
    } catch (error) {
      this.saveError.set(error instanceof Error ? error.message : 'Não foi possível salvar a HQ.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async cancel(): Promise<void> {
    if (await this.canDeactivate()) {
      void this.router.navigate(['/admin/hqs']);
    }
  }

  /** Can be attached to the admin routes to also cover browser back and links. */
  canDeactivate(): boolean | Promise<boolean> {
    if (!this.form.dirty) return true;
    const dialog = this.discardDialog?.nativeElement;
    if (!dialog || this.discardDecision) return false;

    return new Promise<boolean>((resolve) => {
      this.discardDecision = resolve;
      dialog.showModal();
    });
  }

  protected answerDiscard(proceed: boolean): void {
    this.discardDialog?.nativeElement.close();
    if (proceed) this.form.markAsPristine();
    this.discardDecision?.(proceed);
    this.discardDecision = null;
  }

  protected onDialogCancel(event: Event): void {
    event.preventDefault();
    this.answerDiscard(false);
  }

  @HostListener('window:beforeunload', ['$event'])
  protected warnBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.form.dirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  private loadComic(id: string | null): void {
    this.comicId.set(id);
    this.notFound.set(false);
    this.submitted.set(false);
    this.saveError.set('');
    this.notice.set(
      this.route.snapshot.queryParamMap.get('criada') === '1' ? 'HQ criada com sucesso.' : '',
    );
    this.slugManuallyEdited = false;

    const comic = id ? this.repository.getComicById(id) : undefined;
    if (id && !comic) {
      this.notFound.set(true);
      this.titleService.setTitle('HQ não encontrada — Flauzinauta Admin');
      return;
    }

    this.form.reset({
      title: comic?.title ?? '',
      slug: comic?.slug ?? '',
      tagline: comic?.tagline ?? '',
      description: comic?.description ?? '',
      author: comic?.author ?? '',
      genresText: comic?.genres.join(', ') ?? '',
      status: comic?.status ?? 'Em andamento',
      publicationStatus: comic?.publicationStatus ?? 'draft',
      releaseDate: comic?.releaseDate ?? '',
      featured: comic?.featured ?? false,
      accentColor: comic?.accentColor ?? '#f4c542',
      coverUrl: comic?.coverUrl ?? '',
    });
    this.initialCover.set(comic?.coverUrl ?? '');
    this.form.controls.slug.updateValueAndValidity();
    this.form.markAsPristine();
    this.titleService.setTitle(
      id ? `Editar ${comic?.title} — Flauzinauta Admin` : 'Nova HQ — Flauzinauta Admin',
    );
  }

  private validateUniqueSlug(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value ?? '').trim();
    return value && this.repository.slugExists(value, this.comicId() ?? undefined)
      ? { duplicate: true }
      : null;
  }
}
