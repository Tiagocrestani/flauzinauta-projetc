import { computed, Injectable, Signal, signal } from '@angular/core';

import { MOCK_COMICS } from '../../../core/data/mock-comics.data';
import {
  AdminComic,
  AdminComicInput,
  AdminComicPage,
  AdminIssue,
  AdminIssueInput,
} from './admin-comic.models';
import { AdminComicRepository } from './admin-comic.repository';
import { slugify } from './slugify';

function copyIssue(issue: AdminIssue): AdminIssue {
  return { ...issue, pages: issue.pages.map((page) => ({ ...page })) };
}

function copyComic(comic: AdminComic): AdminComic {
  return {
    ...comic,
    genres: [...comic.genres],
    issues: comic.issues.map(copyIssue),
  };
}

function freezePage(page: AdminComicPage): AdminComicPage {
  return Object.freeze({ ...page }) as AdminComicPage;
}

function freezeIssue(issue: AdminIssue): AdminIssue {
  const pages = Object.freeze(issue.pages.map(freezePage)) as unknown as AdminComicPage[];
  return Object.freeze({ ...issue, pages }) as AdminIssue;
}

function freezeComic(comic: AdminComic): AdminComic {
  const genres = Object.freeze([...comic.genres]) as unknown as string[];
  const issues = Object.freeze(comic.issues.map(freezeIssue)) as unknown as AdminIssue[];
  return Object.freeze({ ...comic, genres, issues }) as AdminComic;
}

function freezeComics(comics: AdminComic[]): AdminComic[] {
  return Object.freeze(comics.map(freezeComic)) as unknown as AdminComic[];
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateOnly(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function initialComics(): AdminComic[] {
  const published = MOCK_COMICS.map((comic): AdminComic => {
    const createdAt = new Date(`${comic.releaseDate}T00:00:00.000Z`).toISOString();
    const latestDate = comic.issues.reduce(
      (latest, issue) => (issue.publishedAt > latest ? issue.publishedAt : latest),
      comic.releaseDate,
    );

    return {
      ...comic,
      genres: [...comic.genres],
      publicationStatus: 'published',
      createdAt,
      updatedAt: new Date(`${latestDate}T00:00:00.000Z`).toISOString(),
      issues: comic.issues.map((issue): AdminIssue => ({
        ...issue,
        publicationStatus: 'published',
        coverUrl: comic.coverUrl,
        createdAt: new Date(`${issue.publishedAt}T00:00:00.000Z`).toISOString(),
        updatedAt: new Date(`${issue.publishedAt}T00:00:00.000Z`).toISOString(),
        pages: issue.pages.map((page) => ({ ...page })),
      })),
    };
  });

  // Editorial drafts are based on existing series, but never added to MOCK_COMICS.
  const now = new Date().toISOString();
  const drafts = published.slice(0, 2).map((comic, index): AdminComic => ({
    ...comic,
    genres: [...comic.genres],
    id: `admin-draft-${comic.id}`,
    title: index === 0 ? 'Sentinela Solar: Nova Aurora' : 'Vértice: Ponto Zero',
    slug: index === 0 ? 'sentinela-solar-nova-aurora' : 'vertice-ponto-zero',
    coverUrl: '',
    featured: false,
    publicationStatus: 'draft',
    createdAt: now,
    updatedAt: now,
    issues: [],
  }));

  return [...published, ...drafts];
}

function blobUrls(comics: AdminComic[]): Set<string> {
  const urls = new Set<string>();
  const add = (url: string): void => {
    if (url.startsWith('blob:')) urls.add(url);
  };

  for (const comic of comics) {
    add(comic.coverUrl);
    for (const issue of comic.issues) {
      add(issue.coverUrl);
      for (const page of issue.pages) add(page.imageUrl);
    }
  }
  return urls;
}

@Injectable({ providedIn: 'root' })
export class MockAdminComicRepository implements AdminComicRepository {
  private readonly state = signal<AdminComic[]>(initialComics());
  readonly comics: Signal<AdminComic[]> = computed(() => freezeComics(this.state()));
  private nextId = 0;

  listComics(): AdminComic[] {
    return this.state().map(copyComic);
  }

  getComicById(id: string): AdminComic | undefined {
    const comic = this.state().find((candidate) => candidate.id === id);
    return comic ? copyComic(comic) : undefined;
  }

  slugExists(slug: string, excludeId?: string): boolean {
    const normalized = slugify(slug);
    return this.state().some((comic) => comic.id !== excludeId && comic.slug === normalized);
  }

  createComic(input: AdminComicInput): AdminComic {
    const normalized = this.normalizeComicInput(input);
    const now = new Date().toISOString();
    const comic: AdminComic = {
      ...normalized,
      id: `admin-comic-${++this.nextId}`,
      createdAt: now,
      updatedAt: now,
      issues: [],
    };
    this.commit([...this.state(), comic]);
    return copyComic(comic);
  }

  updateComic(id: string, input: AdminComicInput): AdminComic {
    const current = this.requireComic(id);
    const normalized = this.normalizeComicInput(input, id);
    const updated: AdminComic = {
      ...current,
      ...normalized,
      updatedAt: new Date().toISOString(),
    };
    this.commit(this.state().map((comic) => (comic.id === id ? updated : comic)));
    return copyComic(updated);
  }

  deleteComic(id: string): void {
    this.requireComic(id);
    this.commit(this.state().filter((comic) => comic.id !== id));
  }

  togglePublication(id: string): AdminComic {
    const comic = this.requireComic(id);
    const {
      id: _id,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      issues: _issues,
      ...input
    } = comic;
    return this.updateComic(id, {
      ...input,
      publicationStatus: comic.publicationStatus === 'draft' ? 'published' : 'draft',
    });
  }

  createIssue(comicId: string, input: AdminIssueInput): AdminIssue {
    const comic = this.requireComic(comicId);
    const normalized = this.normalizeIssueInput(comicId, input);
    if (normalized.publicationStatus === 'published') {
      throw new Error('Adicione páginas antes de publicar a edição.');
    }
    const now = new Date().toISOString();
    const issue: AdminIssue = {
      ...normalized,
      id: `admin-issue-${++this.nextId}`,
      comicId,
      createdAt: now,
      updatedAt: now,
      pages: [],
    };
    this.replaceComic({
      ...comic,
      updatedAt: now,
      issues: [...comic.issues, issue],
    });
    return copyIssue(issue);
  }

  updateIssue(comicId: string, issueId: string, input: AdminIssueInput): AdminIssue {
    const issue = this.requireIssue(comicId, issueId);
    const normalized = this.normalizeIssueInput(comicId, input, issueId);
    const updated: AdminIssue = {
      ...issue,
      ...normalized,
      updatedAt: new Date().toISOString(),
    };
    return this.replaceIssue(comicId, updated);
  }

  saveIssueWithPages(
    comicId: string,
    issueId: string | null,
    input: AdminIssueInput,
    pages: AdminComicPage[],
  ): AdminIssue {
    const comic = this.requireComic(comicId);
    const current = issueId ? this.requireIssue(comicId, issueId) : undefined;
    const normalizedInput = this.normalizeIssueInput(comicId, input, current?.id);
    const now = new Date().toISOString();
    let stagedNextId = this.nextId;
    const savedIssueId = current?.id ?? `admin-issue-${++stagedNextId}`;
    const normalizedPages = this.normalizePages(
      savedIssueId,
      pages,
      () => `admin-page-${++stagedNextId}`,
    );
    const saved: AdminIssue = {
      ...normalizedInput,
      id: savedIssueId,
      comicId,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
      pages: normalizedPages,
    };

    this.assertIssueCanBeSaved(saved);

    const issues = current
      ? comic.issues.map((issue) => (issue.id === current.id ? saved : issue))
      : [...comic.issues, saved];
    const updatedComic: AdminComic = { ...comic, updatedAt: now, issues };

    this.commit(this.state().map((item) => (item.id === comicId ? updatedComic : item)));
    this.nextId = stagedNextId;
    return copyIssue(saved);
  }

  deleteIssue(comicId: string, issueId: string): void {
    const comic = this.requireComic(comicId);
    this.requireIssue(comicId, issueId);
    this.replaceComic({
      ...comic,
      updatedAt: new Date().toISOString(),
      issues: comic.issues.filter((issue) => issue.id !== issueId),
    });
  }

  toggleIssuePublication(comicId: string, issueId: string): AdminIssue {
    const issue = this.requireIssue(comicId, issueId);
    return this.replaceIssue(comicId, {
      ...issue,
      publicationStatus: issue.publicationStatus === 'draft' ? 'published' : 'draft',
      updatedAt: new Date().toISOString(),
    });
  }

  issueSlugExists(comicId: string, slug: string, excludeId?: string): boolean {
    const normalized = slugify(slug);
    return this.requireComic(comicId).issues.some(
      (issue) => issue.id !== excludeId && issue.slug === normalized,
    );
  }

  issueNumberExists(comicId: string, number: number, excludeId?: string): boolean {
    return this.requireComic(comicId).issues.some(
      (issue) => issue.id !== excludeId && issue.number === number,
    );
  }

  setPages(comicId: string, issueId: string, pages: AdminComicPage[]): AdminIssue {
    const issue = this.requireIssue(comicId, issueId);
    const normalized = this.normalizePages(issueId, pages, () => `admin-page-${++this.nextId}`);
    return this.replaceIssue(comicId, {
      ...issue,
      pages: normalized,
      updatedAt: new Date().toISOString(),
    });
  }

  reorderPages(comicId: string, issueId: string, pageIds: string[]): AdminIssue {
    const issue = this.requireIssue(comicId, issueId);
    const pagesById = new Map(issue.pages.map((page) => [page.id, page]));
    if (
      pageIds.length !== issue.pages.length ||
      new Set(pageIds).size !== pageIds.length ||
      pageIds.some((id) => !pagesById.has(id))
    ) {
      throw new Error('A nova ordem deve conter todas as páginas exatamente uma vez.');
    }
    return this.setPages(
      comicId,
      issueId,
      pageIds.map((id) => pagesById.get(id)!),
    );
  }

  private normalizeComicInput(input: AdminComicInput, excludeId?: string): AdminComicInput {
    const title = input.title.trim();
    const slug = slugify(input.slug);
    const tagline = input.tagline.trim();
    const description = input.description.trim();
    const author = input.author.trim();
    const genres = [...new Set(input.genres.map((genre) => genre.trim()).filter(Boolean))];
    const releaseDate = input.releaseDate.trim();
    const coverUrl = input.coverUrl.trim();
    if (!title || !slug) throw new Error('Informe o título e o slug da HQ.');
    if (!description) throw new Error('Informe a descrição da HQ.');
    if (!author) throw new Error('Informe o autor ou a equipe responsável pela HQ.');
    if (!genres.length) throw new Error('Informe ao menos um gênero para a HQ.');
    if (!isValidDateOnly(releaseDate)) {
      throw new Error('Informe uma data de lançamento válida para a HQ.');
    }
    if (this.slugExists(slug, excludeId)) throw new Error('Já existe uma HQ com este slug.');
    if (input.publicationStatus === 'published' && !coverUrl) {
      throw new Error('Adicione uma capa antes de publicar a HQ.');
    }
    return { ...input, title, slug, tagline, description, author, genres, releaseDate, coverUrl };
  }

  private normalizeIssueInput(
    comicId: string,
    input: AdminIssueInput,
    excludeId?: string,
  ): AdminIssueInput {
    const title = input.title.trim();
    const slug = slugify(input.slug);
    const description = input.description.trim();
    const publishedAt = input.publishedAt.trim();
    const coverUrl = input.coverUrl.trim();
    if (!title || !slug) throw new Error('Informe o título e o slug da edição.');
    if (!Number.isInteger(input.number) || input.number < 1) {
      throw new Error('O número da edição deve ser um inteiro positivo.');
    }
    if (!isValidDateOnly(publishedAt)) {
      throw new Error('Informe uma data de publicação válida para a edição.');
    }
    if (this.issueSlugExists(comicId, slug, excludeId)) {
      throw new Error('Já existe uma edição com este slug nesta HQ.');
    }
    if (this.issueNumberExists(comicId, input.number, excludeId)) {
      throw new Error('Já existe uma edição com este número nesta HQ.');
    }
    return { ...input, title, slug, description, publishedAt, coverUrl };
  }

  private normalizePages(
    issueId: string,
    pages: AdminComicPage[],
    allocateId: () => string,
  ): AdminComicPage[] {
    const seen = new Set<string>();
    return pages.map((page, index): AdminComicPage => {
      const id = page.id?.trim() || allocateId();
      if (seen.has(id)) throw new Error('Cada página deve ter um identificador único.');
      seen.add(id);
      return {
        ...page,
        id,
        issueId,
        pageNumber: index + 1,
        imageUrl: String(page.imageUrl ?? '').trim(),
      };
    });
  }

  private assertIssueCanBeSaved(issue: AdminIssue): void {
    if (
      issue.publicationStatus === 'published' &&
      (!issue.pages.length || issue.pages.some((page) => !page.imageUrl))
    ) {
      throw new Error('Adicione páginas com imagens antes de publicar a edição.');
    }
  }

  private requireComic(id: string): AdminComic {
    const comic = this.state().find((candidate) => candidate.id === id);
    if (!comic) throw new Error('HQ não encontrada.');
    return comic;
  }

  private requireIssue(comicId: string, issueId: string): AdminIssue {
    const issue = this.requireComic(comicId).issues.find((candidate) => candidate.id === issueId);
    if (!issue) throw new Error('Edição não encontrada.');
    return issue;
  }

  private replaceIssue(comicId: string, issue: AdminIssue): AdminIssue {
    this.assertIssueCanBeSaved(issue);
    const comic = this.requireComic(comicId);
    this.replaceComic({
      ...comic,
      updatedAt: new Date().toISOString(),
      issues: comic.issues.map((candidate) => (candidate.id === issue.id ? issue : candidate)),
    });
    return copyIssue(issue);
  }

  private replaceComic(updated: AdminComic): void {
    this.commit(this.state().map((comic) => (comic.id === updated.id ? updated : comic)));
  }

  private commit(next: AdminComic[]): void {
    // Saved object URLs belong to the repository, not to component lifecycles.
    const retained = blobUrls(next);
    for (const url of blobUrls(this.state())) {
      if (!retained.has(url) && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(url);
      }
    }
    this.state.set(next);
  }
}
