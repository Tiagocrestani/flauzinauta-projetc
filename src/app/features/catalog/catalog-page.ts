import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';

import { COMIC_REPOSITORY } from '../../core/data/comic.repository';
import { Comic } from '../../core/models/comic.models';
import { ComicCardComponent } from '../../shared/components/comic-card/comic-card';

type SortOption = 'recent' | 'title-asc' | 'title-desc';

@Component({
  selector: 'app-catalog-page',
  imports: [ComicCardComponent],
  templateUrl: './catalog-page.html',
  styleUrl: './catalog-page.css',
})
export class CatalogPageComponent {
  private readonly repository = inject(COMIC_REPOSITORY);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly comics = toSignal(this.repository.getComics(), {
    initialValue: [] as Comic[],
  });
  protected readonly query = signal('');
  protected readonly selectedGenre = signal('Todos');
  protected readonly sort = signal<SortOption>('recent');
  protected readonly isFilterOpen = signal(false);

  protected readonly genres = computed(() => [
    'Todos',
    ...new Set(this.comics().flatMap((comic) => comic.genres)),
  ]);

  protected readonly results = computed(() => {
    const query = this.normalize(this.query());
    const genre = this.selectedGenre();
    const comics = this.comics().filter((comic) => {
      const matchesQuery =
        !query || this.normalize(`${comic.title} ${comic.author} ${comic.tagline}`).includes(query);
      const matchesGenre = genre === 'Todos' || comic.genres.includes(genre);
      return matchesQuery && matchesGenre;
    });

    return comics.sort((a, b) => {
      switch (this.sort()) {
        case 'title-asc':
          return a.title.localeCompare(b.title, 'pt-BR');
        case 'title-desc':
          return b.title.localeCompare(a.title, 'pt-BR');
        case 'recent':
          return Date.parse(b.releaseDate) - Date.parse(a.releaseDate);
      }
    });
  });

  constructor() {
    inject(Title).setTitle('Catálogo de super-heróis — Flauzinauta');
    inject(Meta).updateTag({
      name: 'description',
      content:
        'Explore o catálogo de HQs autorais de super-heróis brasileiros por título e gênero.',
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.query.set(params.get('q') ?? '');
      this.selectedGenre.set(params.get('genero') ?? 'Todos');
    });
  }

  protected updateQuery(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    void this.updateUrl();
  }

  protected selectGenre(genre: string): void {
    this.selectedGenre.set(genre);
    void this.updateUrl();
  }

  protected updateSort(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value as SortOption);
  }

  protected clearFilters(): void {
    this.query.set('');
    this.selectedGenre.set('Todos');
    void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
  }

  private updateUrl(): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: this.query() || null,
        genero: this.selectedGenre() === 'Todos' ? null : this.selectedGenre(),
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .trim();
  }
}
