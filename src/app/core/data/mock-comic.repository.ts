import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Comic, Issue } from '../models/comic.models';
import { ComicRepository } from './comic.repository';
import { MOCK_COMICS } from './mock-comics.data';

@Injectable({ providedIn: 'root' })
export class MockComicRepository implements ComicRepository {
  getComics(): Observable<Comic[]> {
    return of([...MOCK_COMICS]);
  }

  getFeaturedComics(): Observable<Comic[]> {
    return of(MOCK_COMICS.filter((comic) => comic.featured));
  }

  getLatestComics(): Observable<Comic[]> {
    return of(
      [...MOCK_COMICS].sort(
        (left, right) => this.latestIssueTime(right) - this.latestIssueTime(left),
      ),
    );
  }

  getComicBySlug(slug: string): Observable<Comic | undefined> {
    return of(MOCK_COMICS.find((comic) => comic.slug === slug));
  }

  getIssue(comicSlug: string, issueSlug: string): Observable<Issue | undefined> {
    const comic = MOCK_COMICS.find((candidate) => candidate.slug === comicSlug);
    return of(comic?.issues.find((issue) => issue.slug === issueSlug));
  }

  private latestIssueTime(comic: Comic): number {
    return Math.max(...comic.issues.map((issue) => Date.parse(issue.publishedAt)));
  }
}
