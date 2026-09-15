export type ComicStatus = 'Em andamento' | 'Concluída' | 'Em hiato';

export interface ComicPage {
  id: string;
  issueId: string;
  pageNumber: number;
  imageUrl: string;
}

export interface Issue {
  id: string;
  comicId: string;
  number: number;
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  pages: ComicPage[];
}

export interface Comic {
  id: string;
  title: string;
  slug: string;
  description: string;
  tagline: string;
  coverUrl: string;
  author: string;
  genres: string[];
  status: ComicStatus;
  releaseDate: string;
  featured: boolean;
  accentColor: string;
  issues: Issue[];
}

export interface ReaderProgress {
  comicSlug: string;
  issueSlug: string;
  pageIndex: number;
  updatedAt: string;
}
