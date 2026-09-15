import { InjectionToken, Signal } from '@angular/core';

import {
  AdminComic,
  AdminComicInput,
  AdminComicPage,
  AdminIssue,
  AdminIssueInput,
} from './admin-comic.models';

/** Allows the in-memory mock to stay synchronous while remote adapters resolve asynchronously. */
export type RepositoryResult<T> = T | Promise<T>;

/** Authoring contract isolated from storage and from the public catalog. */
export interface AdminComicRepository {
  readonly comics: Signal<AdminComic[]>;

  listComics(): AdminComic[];
  getComicById(id: string): AdminComic | undefined;
  slugExists(slug: string, excludeId?: string): boolean;
  createComic(input: AdminComicInput): RepositoryResult<AdminComic>;
  updateComic(id: string, input: AdminComicInput): RepositoryResult<AdminComic>;
  deleteComic(id: string): RepositoryResult<void>;
  togglePublication(id: string): RepositoryResult<AdminComic>;

  createIssue(comicId: string, input: AdminIssueInput): RepositoryResult<AdminIssue>;
  updateIssue(
    comicId: string,
    issueId: string,
    input: AdminIssueInput,
  ): RepositoryResult<AdminIssue>;
  saveIssueWithPages(
    comicId: string,
    issueId: string | null,
    input: AdminIssueInput,
    pages: AdminComicPage[],
  ): RepositoryResult<AdminIssue>;
  deleteIssue(comicId: string, issueId: string): RepositoryResult<void>;
  toggleIssuePublication(comicId: string, issueId: string): RepositoryResult<AdminIssue>;
  issueSlugExists(comicId: string, slug: string, excludeId?: string): boolean;
  issueNumberExists(comicId: string, number: number, excludeId?: string): boolean;
  setPages(comicId: string, issueId: string, pages: AdminComicPage[]): RepositoryResult<AdminIssue>;
  reorderPages(comicId: string, issueId: string, pageIds: string[]): RepositoryResult<AdminIssue>;
}

export const ADMIN_COMIC_REPOSITORY = new InjectionToken<AdminComicRepository>(
  'ADMIN_COMIC_REPOSITORY',
);
