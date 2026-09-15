import { Comic, ComicPage, Issue } from '../../../core/models/comic.models';

export type AdminPublicationStatus = 'draft' | 'published';

export interface AdminComicPage extends ComicPage {
  fileName?: string;
  fileSize?: number;
}

export interface AdminIssue extends Issue {
  publicationStatus: AdminPublicationStatus;
  coverUrl: string;
  createdAt: string;
  updatedAt: string;
  pages: AdminComicPage[];
}

export interface AdminComic extends Comic {
  publicationStatus: AdminPublicationStatus;
  createdAt: string;
  updatedAt: string;
  issues: AdminIssue[];
}

export type AdminComicInput = Omit<AdminComic, 'id' | 'createdAt' | 'updatedAt' | 'issues'>;

export type AdminIssueInput = Omit<
  AdminIssue,
  'id' | 'comicId' | 'createdAt' | 'updatedAt' | 'pages'
>;
