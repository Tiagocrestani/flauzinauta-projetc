import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

import { ReaderProgress } from '../models/comic.models';

const STORAGE_KEY = 'flauzinata.reader-progress.v1';

@Injectable({ providedIn: 'root' })
export class ReaderProgressService {
  private readonly platformId = inject(PLATFORM_ID);

  saveProgress(comicSlug: string, issueSlug: string, pageIndex: number): void {
    const normalizedPageIndex = Number.isFinite(pageIndex) ? Math.max(0, Math.trunc(pageIndex)) : 0;
    const progress: ReaderProgress = {
      comicSlug,
      issueSlug,
      pageIndex: normalizedPageIndex,
      updatedAt: new Date().toISOString(),
    };
    const entries = this.getAllProgress().filter(
      (entry) => entry.comicSlug !== comicSlug || entry.issueSlug !== issueSlug,
    );

    this.write([progress, ...entries]);
  }

  getProgress(comicSlug: string, issueSlug?: string): ReaderProgress | null {
    return (
      this.getAllProgress().find(
        (entry) =>
          entry.comicSlug === comicSlug &&
          (issueSlug === undefined || entry.issueSlug === issueSlug),
      ) ?? null
    );
  }

  getAllProgress(): ReaderProgress[] {
    const storage = this.getStorage();

    if (!storage) {
      return [];
    }

    try {
      const rawValue = storage.getItem(STORAGE_KEY);

      if (!rawValue) {
        return [];
      }

      const value: unknown = JSON.parse(rawValue);

      if (!Array.isArray(value)) {
        return [];
      }

      return value
        .filter((entry): entry is ReaderProgress => this.isReaderProgress(entry))
        .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
    } catch {
      return [];
    }
  }

  clearProgress(comicSlug: string, issueSlug: string): void {
    const entries = this.getAllProgress().filter(
      (entry) => entry.comicSlug !== comicSlug || entry.issueSlug !== issueSlug,
    );
    const storage = this.getStorage();

    if (!storage) {
      return;
    }

    try {
      if (entries.length === 0) {
        storage.removeItem(STORAGE_KEY);
        return;
      }

      storage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Storage may be unavailable in privacy modes or restricted browser contexts.
    }
  }

  private write(entries: ReaderProgress[]): void {
    const storage = this.getStorage();

    if (!storage) {
      return;
    }

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // A full or disabled localStorage must not interrupt the reading experience.
    }
  }

  private getStorage(): Storage | null {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined') {
      return null;
    }

    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  private isReaderProgress(value: unknown): value is ReaderProgress {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<ReaderProgress>;

    return (
      typeof candidate.comicSlug === 'string' &&
      typeof candidate.issueSlug === 'string' &&
      typeof candidate.pageIndex === 'number' &&
      Number.isInteger(candidate.pageIndex) &&
      candidate.pageIndex >= 0 &&
      typeof candidate.updatedAt === 'string' &&
      !Number.isNaN(Date.parse(candidate.updatedAt))
    );
  }
}
