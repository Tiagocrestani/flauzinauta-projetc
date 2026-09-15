import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ADMIN_COMIC_REPOSITORY } from '../data/admin-comic.repository';

@Component({
  selector: 'app-admin-dashboard',
  imports: [DatePipe, RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboardComponent {
  private readonly repository = inject(ADMIN_COMIC_REPOSITORY);
  protected readonly comics = this.repository.comics;

  protected readonly overview = computed(() => {
    const comics = this.comics();
    return [
      { label: 'HQs no acervo', value: comics.length, marker: '01' },
      {
        label: 'Publicadas',
        value: comics.filter((comic) => comic.publicationStatus === 'published').length,
        marker: '02',
      },
      {
        label: 'Rascunhos',
        value: comics.filter((comic) => comic.publicationStatus === 'draft').length,
        marker: '03',
      },
      {
        label: 'Edições',
        value: comics.reduce((total, comic) => total + comic.issues.length, 0),
        marker: '04',
      },
      {
        label: 'Páginas',
        value: comics.reduce(
          (total, comic) =>
            total + comic.issues.reduce((count, issue) => count + issue.pages.length, 0),
          0,
        ),
        marker: '05',
      },
    ];
  });

  protected readonly recentComics = computed(() =>
    [...this.comics()]
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
      .slice(0, 4),
  );

  protected readonly drafts = computed(() =>
    this.comics()
      .filter((comic) => comic.publicationStatus === 'draft')
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)),
  );

  protected readonly recentDrafts = computed(() => this.drafts().slice(0, 4));
}
