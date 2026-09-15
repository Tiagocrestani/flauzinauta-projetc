import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { Comic, Issue } from '../models/comic.models';

export interface ComicRepository {
  getComics(): Observable<Comic[]>;
  getFeaturedComics(): Observable<Comic[]>;
  getLatestComics(): Observable<Comic[]>;
  getComicBySlug(slug: string): Observable<Comic | undefined>;
  getIssue(comicSlug: string, issueSlug: string): Observable<Issue | undefined>;
}

export const COMIC_REPOSITORY = new InjectionToken<ComicRepository>('COMIC_REPOSITORY');
