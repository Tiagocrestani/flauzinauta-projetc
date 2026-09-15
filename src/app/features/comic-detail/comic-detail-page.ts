import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, shareReplay, switchMap, tap } from 'rxjs';

import { COMIC_REPOSITORY } from '../../core/data/comic.repository';
import { Comic } from '../../core/models/comic.models';

@Component({
  selector: 'app-comic-detail-page',
  imports: [AsyncPipe, DatePipe, RouterLink],
  templateUrl: './comic-detail-page.html',
  styleUrl: './comic-detail-page.css',
})
export class ComicDetailPageComponent {
  private readonly repository = inject(COMIC_REPOSITORY);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly route = inject(ActivatedRoute);

  protected readonly comic$ = this.route.paramMap.pipe(
    map((params) => params.get('slug') ?? ''),
    switchMap((slug) => this.repository.getComicBySlug(slug)),
    tap((comic) => this.updateMetadata(comic)),
    catchError(() => of(undefined)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  protected firstIssue(comic: Comic) {
    return comic.issues[0];
  }

  protected paddedIssue(number: number): string {
    return number.toString().padStart(2, '0');
  }

  private updateMetadata(comic: Comic | undefined): void {
    if (!comic) {
      this.title.setTitle('Herói não encontrado — Flauzinauta');
      return;
    }
    this.title.setTitle(`${comic.title} — Heróis Flauzinauta`);
    this.meta.updateTag({ name: 'description', content: comic.description });
    this.meta.updateTag({ property: 'og:title', content: comic.title });
    this.meta.updateTag({ property: 'og:description', content: comic.tagline });
    this.meta.updateTag({ property: 'og:image', content: comic.coverUrl });
  }
}
