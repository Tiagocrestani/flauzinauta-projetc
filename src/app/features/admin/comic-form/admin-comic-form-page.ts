import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ComicStatus } from '../../../core/models/comic.models';
import {
  AdminCatalogService,
  sortFilesByName,
  slugify,
  UploadProgress,
  validateImageFiles,
} from '../data/admin-catalog.service';

@Component({
  selector: 'app-admin-comic-form-page',
  imports: [DecimalPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-comic-form-page.html',
  styleUrl: './admin-comic-form-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComicFormPageComponent {
  private readonly catalogService = inject(AdminCatalogService);
  private readonly today = new Date().toISOString().slice(0, 10);

  protected readonly coverFile = signal<File | null>(null);
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
    if (progress.stage === 'cover') return 5;
    if (progress.stage === 'database') return 92;
    if (progress.stage === 'finished') return 100;
    return Math.max(8, Math.round((progress.completed / Math.max(progress.total, 1)) * 80) + 8);
  });

  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    slug: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)],
    }),
    author: new FormControl('Equipe Flauzinauta', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    genre: new FormControl('Fantasia', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    tagline: new FormControl('', { nonNullable: true }),
    status: new FormControl<ComicStatus>('Em andamento', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    releaseDate: new FormControl(this.today, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    featured: new FormControl(true, { nonNullable: true }),
    accentColor: new FormControl('#D6A43B', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)],
    }),
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

  protected syncComicSlug(): void {
    if (this.form.controls.slug.pristine) {
      this.form.controls.slug.setValue(slugify(this.form.controls.title.value), {
        emitEvent: false,
      });
    }
  }

  protected syncIssueSlug(): void {
    if (this.form.controls.issueSlug.pristine) {
      this.form.controls.issueSlug.setValue(slugify(this.form.controls.issueTitle.value), {
        emitEvent: false,
      });
    }
  }

  protected selectCover(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.fileError.set('');

    if (file) {
      const validationError = validateImageFiles([file]);

      if (validationError) {
        this.coverFile.set(null);
        this.fileError.set(validationError);
        input.value = '';
        return;
      }
    }

    this.coverFile.set(file);
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

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.submitError.set('Revise os campos obrigatórios antes de continuar.');
      return;
    }

    const cover = this.coverFile();
    const pages = this.pages();

    if (!cover || pages.length === 0) {
      this.submitError.set('Selecione uma capa e pelo menos uma página da HQ.');
      return;
    }

    const validationError = validateImageFiles([cover, ...pages]);

    if (validationError) {
      this.submitError.set(validationError);
      return;
    }

    this.submitting.set(true);

    try {
      const value = this.form.getRawValue();
      const result = await this.catalogService.createComicPackage(
        { ...value, cover, pages },
        (progress) => this.progress.set(progress),
      );
      this.success.set(result);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      this.submitError.set(
        error instanceof Error ? error.message : 'Não foi possível cadastrar a HQ.',
      );
    } finally {
      this.submitting.set(false);
    }
  }

  protected fileSize(size: number): number {
    return size / 1024 / 1024;
  }
}
