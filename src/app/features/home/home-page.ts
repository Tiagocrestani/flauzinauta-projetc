import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { COMIC_REPOSITORY } from '../../core/data/comic.repository';
import { Comic, Issue } from '../../core/models/comic.models';
import { ReaderProgressService } from '../../core/services/reader-progress.service';
import { ComicCardComponent } from '../../shared/components/comic-card/comic-card';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header';

@Component({
  selector: 'app-home-page',
  imports: [AsyncPipe, RouterLink, ComicCardComponent, SectionHeaderComponent],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePageComponent {
  private readonly repository = inject(COMIC_REPOSITORY);
  private readonly progressService = inject(ReaderProgressService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  protected readonly featured$ = this.repository.getFeaturedComics();
  protected readonly latest$ = this.repository
    .getLatestComics()
    .pipe(map((comics) => comics.slice(0, 4)));
  protected readonly continueReading$ = this.repository.getComics().pipe(
    map((comics) => {
      const progress = this.progressService.getAllProgress()[0];
      const comic = comics.find((candidate) => candidate.slug === progress?.comicSlug);
      const issue = comic?.issues.find((candidate) => candidate.slug === progress?.issueSlug);

      return progress && comic && issue
        ? {
            comic,
            issue,
            page: Math.min(progress.pageIndex + 1, issue.pages.length),
          }
        : null;
    }),
  );

  protected readonly genres = [
    {
      name: 'Fantasia',
      number: '01',
      copy: 'Conflitos celestiais, escolhas decisivas e uma guerra que mudará tudo.',
    },
  ];

  constructor() {
    this.title.setTitle('Fláuzinauta — HQs para ler online');
    this.meta.updateTag({
      name: 'description',
      content: 'Leia Fláuzinauta gratuitamente no navegador e acompanhe A Guerra no Céu.',
    });
  }

  protected firstIssue(comic: Comic) {
    return comic.issues[0];
  }

  protected issueLabel(issue: Issue): string {
    return `Edição ${issue.number.toString().padStart(2, '0')}`;
  }
}
