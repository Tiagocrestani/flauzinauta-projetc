import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { COMIC_REPOSITORY } from '../../../core/data/comic.repository';
import { Comic } from '../../../core/models/comic.models';
import { ADMIN_COMIC_REPOSITORY } from '../data/admin-comic.repository';
import { AdminComic } from '../data/admin-comic.models';
import { AdminConfirmDialogComponent } from '../shared/admin-confirm-dialog';

type PublicationFilter = 'all' | 'published' | 'draft';
type SortOption = 'updated-desc' | 'updated-asc' | 'title-asc' | 'title-desc' | 'issues-desc';

@Component({
  selector: 'app-admin-comic-list',
  imports: [DatePipe, RouterLink, AdminConfirmDialogComponent],
  templateUrl: './admin-comic-list.html',
  styleUrl: './admin-comic-list.css',
})
export class AdminComicListComponent {
  private readonly repository = inject(ADMIN_COMIC_REPOSITORY);
  private readonly publicRepository = inject(COMIC_REPOSITORY);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly comics = this.repository.comics;
  protected readonly publicComics = toSignal(this.publicRepository.getComics(), {
    initialValue: [] as Comic[],
  });
  protected readonly query = signal('');
  protected readonly publicationFilter = signal<PublicationFilter>('all');
  protected readonly genreFilter = signal('all');
  protected readonly sort = signal<SortOption>('updated-desc');
  protected readonly isLoading = signal(true);
  protected readonly pendingDelete = signal<AdminComic | null>(null);
  protected readonly feedback = signal<{ kind: 'success' | 'error'; message: string } | null>(null);

  protected readonly genres = computed(() =>
    [...new Set(this.comics().flatMap((comic) => comic.genres))].sort((a, b) =>
      a.localeCompare(b, 'pt-BR'),
    ),
  );

  protected readonly filteredComics = computed(() => {
    const query = this.normalize(this.query());
    const status = this.publicationFilter();
    const genre = this.genreFilter();
    return this.comics()
      .filter((comic) => {
        const matchesQuery =
          !query || this.normalize(`${comic.title} ${comic.author}`).includes(query);
        const matchesStatus = status === 'all' || comic.publicationStatus === status;
        const matchesGenre = genre === 'all' || comic.genres.includes(genre);
        return matchesQuery && matchesStatus && matchesGenre;
      })
      .sort((left, right) => {
        switch (this.sort()) {
          case 'updated-desc':
            return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
          case 'updated-asc':
            return Date.parse(left.updatedAt) - Date.parse(right.updatedAt);
          case 'title-asc':
            return left.title.localeCompare(right.title, 'pt-BR');
          case 'title-desc':
            return right.title.localeCompare(left.title, 'pt-BR');
          case 'issues-desc':
            return right.issues.length - left.issues.length;
        }
      });
  });

  protected readonly hasFilters = computed(
    () => !!this.query() || this.publicationFilter() !== 'all' || this.genreFilter() !== 'all',
  );

  constructor() {
    const loadingTimer = setTimeout(() => this.isLoading.set(false), 250);
    this.destroyRef.onDestroy(() => clearTimeout(loadingTimer));
  }

  protected updateQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected updateStatus(event: Event): void {
    this.publicationFilter.set((event.target as HTMLSelectElement).value as PublicationFilter);
  }

  protected updateGenre(event: Event): void {
    this.genreFilter.set((event.target as HTMLSelectElement).value);
  }

  protected updateSort(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value as SortOption);
  }

  protected clearFilters(): void {
    this.query.set('');
    this.publicationFilter.set('all');
    this.genreFilter.set('all');
  }

  protected publicSlugFor(comic: AdminComic): string | null {
    return this.publicComics().find((publicComic) => publicComic.id === comic.id)?.slug ?? null;
  }

  protected async togglePublication(comic: AdminComic): Promise<void> {
    try {
      const updated = await this.repository.togglePublication(comic.id);
      this.feedback.set({
        kind: 'success',
        message: `${updated.title} ${updated.publicationStatus === 'published' ? 'publicada' : 'movida para rascunhos'} com sucesso.`,
      });
    } catch (error) {
      this.feedback.set({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível alterar a publicação.',
      });
    }
  }

  protected askToDelete(comic: AdminComic): void {
    this.pendingDelete.set(comic);
  }

  protected async confirmDelete(): Promise<void> {
    const comic = this.pendingDelete();
    this.pendingDelete.set(null);
    if (!comic) return;

    try {
      await this.repository.deleteComic(comic.id);
      this.feedback.set({ kind: 'success', message: `${comic.title} excluída do acervo.` });
    } catch (error) {
      this.feedback.set({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível excluir a HQ.',
      });
    }
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .trim();
  }
}
