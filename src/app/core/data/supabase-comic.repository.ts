import { Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Observable, defer, map, shareReplay } from 'rxjs';

import { Comic, ComicPage, Issue } from '../models/comic.models';
import { SupabaseClientService } from '../supabase/supabase-client.service';
import { Database } from '../supabase/database.types';
import { ComicRepository } from './comic.repository';

interface ComicRecord {
  id: string;
  title: string;
  slug: string;
  description: string;
  tagline: string;
  cover_path: string;
  status: Comic['status'];
  release_date: string;
  featured: boolean;
  accent_color: string;
  author: string;
  genre: string;
  issues: IssueRecord[];
}

interface IssueRecord {
  id: string;
  comic_id: string;
  number: number;
  slug: string;
  title: string;
  description: string;
  published_at: string;
  pages: PageRecord[];
}

interface PageRecord {
  id: string;
  issue_id: string;
  page_number: number;
  image_path: string;
}

const COMICS_SELECT = `
  id,
  title,
  slug,
  description,
  tagline,
  cover_path,
  status,
  release_date,
  featured,
  accent_color,
  author,
  genre,
  issues(
    id,
    comic_id,
    number,
    slug,
    title,
    description,
    published_at,
    pages(id, issue_id, page_number, image_path)
  )
`;

@Injectable({ providedIn: 'root' })
export class SupabaseComicRepository implements ComicRepository {
  private readonly comics$ = defer(() => this.fetchComics()).pipe(
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  constructor(private readonly supabase: SupabaseClientService) {}

  getComics(): Observable<Comic[]> {
    return this.comics$;
  }

  getFeaturedComics(): Observable<Comic[]> {
    return this.comics$.pipe(map((comics) => comics.filter((comic) => comic.featured)));
  }

  getLatestComics(): Observable<Comic[]> {
    return this.comics$.pipe(
      map((comics) =>
        [...comics].sort((left, right) => this.latestIssueTime(right) - this.latestIssueTime(left)),
      ),
    );
  }

  getComicBySlug(slug: string): Observable<Comic | undefined> {
    return this.comics$.pipe(map((comics) => comics.find((comic) => comic.slug === slug)));
  }

  getIssue(comicSlug: string, issueSlug: string): Observable<Issue | undefined> {
    return this.getComicBySlug(comicSlug).pipe(
      map((comic) => comic?.issues.find((issue) => issue.slug === issueSlug)),
    );
  }

  private async fetchComics(): Promise<Comic[]> {
    const client = await this.supabase.getClient();
    const { data, error } = await client
      .from('comics')
      .select(COMICS_SELECT)
      .eq('publication_status', 'published')
      .order('release_date', { ascending: false });

    if (error) {
      throw new Error(`Não foi possível carregar as HQs: ${error.message}`);
    }

    return ((data ?? []) as unknown as ComicRecord[]).map((record) =>
      this.mapComic(record, client),
    );
  }

  private mapComic(record: ComicRecord, client: SupabaseClient<Database>): Comic {
    return {
      id: record.id,
      title: record.title,
      slug: record.slug,
      description: record.description,
      tagline: record.tagline,
      coverUrl: this.resolveAssetUrl(client, 'comic-covers', record.cover_path),
      author: record.author,
      genres: [record.genre],
      status: record.status,
      releaseDate: record.release_date,
      featured: record.featured,
      accentColor: record.accent_color,
      issues: [...(record.issues ?? [])]
        .sort((left, right) => left.number - right.number)
        .map((issue) => this.mapIssue(issue, client)),
    };
  }

  private mapIssue(record: IssueRecord, client: SupabaseClient<Database>): Issue {
    return {
      id: record.id,
      comicId: record.comic_id,
      number: record.number,
      slug: record.slug,
      title: record.title,
      description: record.description,
      publishedAt: record.published_at,
      pages: [...(record.pages ?? [])]
        .sort((left, right) => left.page_number - right.page_number)
        .map((page) => this.mapPage(page, client)),
    };
  }

  private mapPage(record: PageRecord, client: SupabaseClient<Database>): ComicPage {
    return {
      id: record.id,
      issueId: record.issue_id,
      pageNumber: record.page_number,
      imageUrl: this.resolveAssetUrl(client, 'comic-pages', record.image_path),
    };
  }

  private resolveAssetUrl(client: SupabaseClient<Database>, bucket: string, path: string): string {
    if (/^(?:https?:\/\/|\/)/i.test(path)) {
      return path;
    }

    return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  private latestIssueTime(comic: Comic): number {
    if (comic.issues.length === 0) {
      return Date.parse(comic.releaseDate);
    }

    return Math.max(...comic.issues.map((issue) => Date.parse(issue.publishedAt)));
  }
}
