import { Injectable } from '@angular/core';

import { ComicStatus } from '../../../core/models/comic.models';
import { SupabaseClientService } from '../../../core/supabase/supabase-client.service';

export type PublicationStatus = 'draft' | 'published' | 'archived';

export interface AdminComicSummary {
  id: string;
  title: string;
  slug: string;
  coverUrl: string;
  author: string;
  genre: string;
  status: ComicStatus;
  publicationStatus: PublicationStatus;
  featured: boolean;
  releaseDate: string;
  issueCount: number;
  pageCount: number;
}

export interface CreateComicPackageInput {
  title: string;
  slug: string;
  description: string;
  tagline: string;
  author: string;
  genre: string;
  status: ComicStatus;
  releaseDate: string;
  featured: boolean;
  accentColor: string;
  issueNumber: number;
  issueSlug: string;
  issueTitle: string;
  issueDescription: string;
  publishedAt: string;
  publishNow: boolean;
  cover: File;
  pages: File[];
}

export interface UploadProgress {
  stage: 'cover' | 'pages' | 'database' | 'finished';
  completed: number;
  total: number;
  message: string;
}

export interface AdminComicForIssue {
  id: string;
  title: string;
  slug: string;
  coverPath: string;
  nextIssueNumber: number;
}

export interface CreateIssuePackageInput {
  comic: AdminComicForIssue;
  issueNumber: number;
  issueSlug: string;
  issueTitle: string;
  issueDescription: string;
  publishedAt: string;
  publishNow: boolean;
  pages: File[];
}

interface ComicRecord {
  id: string;
  title: string;
  slug: string;
  cover_path: string;
  author: string;
  genre: string;
  status: ComicStatus;
  publication_status: PublicationStatus;
  featured: boolean;
  release_date: string;
  issues: Array<{
    id: string;
    pages: Array<{ id: string }>;
  }>;
}

const ALLOWED_IMAGE_TYPES = new Set([
  'image/avif',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp',
]);
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const fileNameCollator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

export function sortFilesByName(files: File[]): File[] {
  return [...files].sort((left, right) => fileNameCollator.compare(left.name, right.name));
}

export function validateImageFiles(files: File[]): string | null {
  const unsupported = files.find((file) => !ALLOWED_IMAGE_TYPES.has(file.type));

  if (unsupported) {
    return `O arquivo ${unsupported.name} não está em um formato de imagem permitido.`;
  }

  const oversized = files.find((file) => file.size > MAX_FILE_SIZE);

  if (oversized) {
    return `O arquivo ${oversized.name} ultrapassa o limite de 15 MB.`;
  }

  return null;
}

@Injectable({ providedIn: 'root' })
export class AdminCatalogService {
  constructor(private readonly supabase: SupabaseClientService) {}

  async getCatalog(): Promise<AdminComicSummary[]> {
    const client = await this.supabase.getClient();
    const { data, error } = await client
      .from('comics')
      .select(
        'id, title, slug, cover_path, author, genre, status, publication_status, featured, release_date, issues(id, pages(id))',
      )
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Não foi possível carregar o catálogo: ${error.message}`);
    }

    return ((data ?? []) as unknown as ComicRecord[]).map((comic) => ({
      id: comic.id,
      title: comic.title,
      slug: comic.slug,
      coverUrl: client.storage.from('comic-covers').getPublicUrl(comic.cover_path).data.publicUrl,
      author: comic.author,
      genre: comic.genre,
      status: comic.status,
      publicationStatus: comic.publication_status,
      featured: comic.featured,
      releaseDate: comic.release_date,
      issueCount: comic.issues.length,
      pageCount: comic.issues.reduce((total, issue) => total + issue.pages.length, 0),
    }));
  }

  async setPublicationStatus(comicId: string, status: PublicationStatus): Promise<void> {
    const client = await this.supabase.getClient();
    const issueStatus = status === 'archived' ? 'archived' : status;
    const { error: issueError } = await client
      .from('issues')
      .update({ publication_status: issueStatus })
      .eq('comic_id', comicId);

    if (issueError) {
      throw new Error(`Não foi possível atualizar as partes: ${issueError.message}`);
    }

    const { error: comicError } = await client
      .from('comics')
      .update({ publication_status: status })
      .eq('id', comicId);

    if (comicError) {
      throw new Error(`Não foi possível atualizar a HQ: ${comicError.message}`);
    }
  }

  async getComicForIssue(comicId: string): Promise<AdminComicForIssue> {
    const client = await this.supabase.getClient();
    const { data: comic, error: comicError } = await client
      .from('comics')
      .select('id, title, slug, cover_path')
      .eq('id', comicId)
      .single();

    if (comicError || !comic) {
      throw new Error(`Não foi possível localizar a HQ: ${comicError?.message ?? 'sem retorno'}`);
    }

    const { data: lastIssue, error: issueError } = await client
      .from('issues')
      .select('number')
      .eq('comic_id', comicId)
      .order('number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (issueError) {
      throw new Error(`Não foi possível consultar as partes: ${issueError.message}`);
    }

    return {
      id: comic.id,
      title: comic.title,
      slug: comic.slug,
      coverPath: comic.cover_path,
      nextIssueNumber: (lastIssue?.number ?? 0) + 1,
    };
  }

  async createIssuePackage(
    input: CreateIssuePackageInput,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<{ comicSlug: string; issueSlug: string }> {
    const client = await this.supabase.getClient();
    const issueSlug = slugify(input.issueSlug || input.issueTitle);
    const uploadedPagePaths: string[] = [];
    let issueId: string | null = null;

    try {
      for (let index = 0; index < input.pages.length; index += 1) {
        const file = input.pages[index];
        const pageNumber = index + 1;
        const pagePath = `${input.comic.slug}/${issueSlug}/${String(pageNumber).padStart(3, '0')}-${crypto.randomUUID()}.${this.extensionFor(file)}`;

        onProgress?.({
          stage: 'pages',
          completed: index,
          total: input.pages.length,
          message: `Enviando página ${pageNumber} de ${input.pages.length}`,
        });

        const { error } = await client.storage.from('comic-pages').upload(pagePath, file, {
          cacheControl: '31536000',
          contentType: file.type,
          upsert: false,
        });

        if (error) {
          throw new Error(`Falha ao enviar ${file.name}: ${error.message}`);
        }

        uploadedPagePaths.push(pagePath);
      }

      onProgress?.({
        stage: 'database',
        completed: input.pages.length,
        total: input.pages.length,
        message: 'Salvando a nova parte e a ordem das páginas',
      });

      const { data: issue, error: issueError } = await client
        .from('issues')
        .insert({
          comic_id: input.comic.id,
          number: input.issueNumber,
          slug: issueSlug,
          title: input.issueTitle.trim(),
          description: input.issueDescription.trim(),
          cover_path: input.comic.coverPath,
          publication_status: 'draft',
          published_at: input.publishedAt,
        })
        .select('id')
        .single();

      if (issueError || !issue) {
        throw new Error(
          `Não foi possível cadastrar a parte: ${issueError?.message ?? 'sem retorno'}`,
        );
      }

      issueId = issue.id;
      const pageRows = await Promise.all(
        input.pages.map(async (file, index) => {
          const dimensions = await this.readImageDimensions(file);

          return {
            issue_id: issue.id,
            page_number: index + 1,
            image_path: uploadedPagePaths[index],
            width: dimensions?.width ?? null,
            height: dimensions?.height ?? null,
            alt_text: `Página ${index + 1} de ${input.issueTitle.trim()}`,
          };
        }),
      );
      const { error: pagesError } = await client.from('pages').insert(pageRows);

      if (pagesError) {
        throw new Error(`Não foi possível salvar as páginas: ${pagesError.message}`);
      }

      if (input.publishNow) {
        const { error: issuePublishError } = await client
          .from('issues')
          .update({ publication_status: 'published' })
          .eq('id', issue.id);
        const { error: comicPublishError } = await client
          .from('comics')
          .update({ publication_status: 'published' })
          .eq('id', input.comic.id);

        if (issuePublishError || comicPublishError) {
          throw new Error(
            `A parte foi salva, mas não pôde ser publicada: ${issuePublishError?.message ?? comicPublishError?.message}`,
          );
        }
      }

      onProgress?.({
        stage: 'finished',
        completed: input.pages.length,
        total: input.pages.length,
        message: input.publishNow ? 'Parte publicada com sucesso' : 'Rascunho salvo com sucesso',
      });

      return { comicSlug: input.comic.slug, issueSlug };
    } catch (error) {
      const operations: Promise<unknown>[] = [];

      if (uploadedPagePaths.length > 0) {
        operations.push(client.storage.from('comic-pages').remove(uploadedPagePaths));
      }

      if (issueId) {
        operations.push(Promise.resolve(client.from('issues').delete().eq('id', issueId)));
      }

      await Promise.allSettled(operations);
      throw error;
    }
  }

  async createComicPackage(
    input: CreateComicPackageInput,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<{ comicSlug: string; issueSlug: string }> {
    const client = await this.supabase.getClient();
    const comicSlug = slugify(input.slug || input.title);
    const issueSlug = slugify(input.issueSlug || input.issueTitle);
    const uploadedPagePaths: string[] = [];
    const coverPath = `${comicSlug}/cover-${crypto.randomUUID()}.${this.extensionFor(input.cover)}`;
    let comicId: string | null = null;

    try {
      onProgress?.({ stage: 'cover', completed: 0, total: 1, message: 'Enviando a capa' });
      const { error: coverError } = await client.storage
        .from('comic-covers')
        .upload(coverPath, input.cover, {
          cacheControl: '31536000',
          contentType: input.cover.type,
          upsert: false,
        });

      if (coverError) {
        throw new Error(`Não foi possível enviar a capa: ${coverError.message}`);
      }

      const pages = [...input.pages];

      for (let index = 0; index < pages.length; index += 1) {
        const file = pages[index];
        const pageNumber = index + 1;
        const pagePath = `${comicSlug}/${issueSlug}/${String(pageNumber).padStart(3, '0')}-${crypto.randomUUID()}.${this.extensionFor(file)}`;

        onProgress?.({
          stage: 'pages',
          completed: index,
          total: pages.length,
          message: `Enviando página ${pageNumber} de ${pages.length}`,
        });

        const { error } = await client.storage.from('comic-pages').upload(pagePath, file, {
          cacheControl: '31536000',
          contentType: file.type,
          upsert: false,
        });

        if (error) {
          throw new Error(`Falha ao enviar ${file.name}: ${error.message}`);
        }

        uploadedPagePaths.push(pagePath);
      }

      onProgress?.({
        stage: 'database',
        completed: pages.length,
        total: pages.length,
        message: 'Salvando HQ, parte e ordem das páginas',
      });

      const { data: comic, error: comicError } = await client
        .from('comics')
        .insert({
          title: input.title.trim(),
          slug: comicSlug,
          description: input.description.trim(),
          tagline: input.tagline.trim(),
          cover_path: coverPath,
          status: input.status,
          publication_status: 'draft',
          release_date: input.releaseDate,
          featured: input.featured,
          accent_color: input.accentColor,
          author: input.author.trim(),
          genre: input.genre.trim(),
        })
        .select('id')
        .single();

      if (comicError || !comic) {
        throw new Error(`Não foi possível cadastrar a HQ: ${comicError?.message ?? 'sem retorno'}`);
      }

      comicId = comic.id;
      const { data: issue, error: issueError } = await client
        .from('issues')
        .insert({
          comic_id: comicId,
          number: input.issueNumber,
          slug: issueSlug,
          title: input.issueTitle.trim(),
          description: input.issueDescription.trim(),
          cover_path: coverPath,
          publication_status: 'draft',
          published_at: input.publishedAt,
        })
        .select('id')
        .single();

      if (issueError || !issue) {
        throw new Error(
          `Não foi possível cadastrar a parte: ${issueError?.message ?? 'sem retorno'}`,
        );
      }

      const pageRows = await Promise.all(
        pages.map(async (file, index) => {
          const dimensions = await this.readImageDimensions(file);

          return {
            issue_id: issue.id,
            page_number: index + 1,
            image_path: uploadedPagePaths[index],
            width: dimensions?.width ?? null,
            height: dimensions?.height ?? null,
            alt_text: `Página ${index + 1} de ${input.issueTitle.trim()}`,
          };
        }),
      );
      const { error: pagesError } = await client.from('pages').insert(pageRows);

      if (pagesError) {
        throw new Error(`Não foi possível salvar as páginas: ${pagesError.message}`);
      }

      if (input.publishNow) {
        const { error: issuePublishError } = await client
          .from('issues')
          .update({ publication_status: 'published' })
          .eq('id', issue.id);
        const { error: comicPublishError } = await client
          .from('comics')
          .update({ publication_status: 'published' })
          .eq('id', comicId);

        if (issuePublishError || comicPublishError) {
          throw new Error(
            `O conteúdo foi salvo, mas não pôde ser publicado: ${issuePublishError?.message ?? comicPublishError?.message}`,
          );
        }
      }

      onProgress?.({
        stage: 'finished',
        completed: pages.length,
        total: pages.length,
        message: input.publishNow ? 'HQ publicada com sucesso' : 'Rascunho salvo com sucesso',
      });

      return { comicSlug, issueSlug };
    } catch (error) {
      await this.rollback(client, comicId, coverPath, uploadedPagePaths);
      throw error;
    }
  }

  private extensionFor(file: File): string {
    const extensions: Record<string, string> = {
      'image/avif': 'avif',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/svg+xml': 'svg',
      'image/webp': 'webp',
    };

    return extensions[file.type] ?? 'img';
  }

  private async readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
    if (typeof createImageBitmap !== 'function' || file.type === 'image/svg+xml') {
      return null;
    }

    try {
      const bitmap = await createImageBitmap(file);
      const dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return dimensions;
    } catch {
      return null;
    }
  }

  private async rollback(
    client: Awaited<ReturnType<SupabaseClientService['getClient']>>,
    comicId: string | null,
    coverPath: string,
    pagePaths: string[],
  ): Promise<void> {
    const operations: Promise<unknown>[] = [
      client.storage.from('comic-covers').remove([coverPath]),
    ];

    if (pagePaths.length > 0) {
      operations.push(client.storage.from('comic-pages').remove(pagePaths));
    }

    if (comicId) {
      operations.push(Promise.resolve(client.from('comics').delete().eq('id', comicId)));
    }

    await Promise.allSettled(operations);
  }
}
