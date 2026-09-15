import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  PLATFORM_ID,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { COMIC_REPOSITORY } from '../../core/data/comic.repository';
import { Comic, ComicPage, Issue } from '../../core/models/comic.models';
import { ReaderProgressService } from '../../core/services/reader-progress.service';
import { ReaderControlsComponent, ReaderFitMode } from './reader-controls/reader-controls';

type ImageState = 'loading' | 'loaded' | 'error';

interface ReaderRouteParams {
  comicSlug: string;
  issueSlug: string;
}

interface ReaderData extends ReaderRouteParams {
  comic?: Comic;
  issue?: Issue;
  failed?: boolean;
}

interface PointerOrigin {
  id: number;
  x: number;
  y: number;
  startedAt: number;
}

@Component({
  selector: 'app-reader-page',
  imports: [RouterLink, ReaderControlsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reader-page.html',
  styleUrl: './reader-page.css',
})
export class ReaderPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly comicRepository = inject(COMIC_REPOSITORY);
  private readonly progressService = inject(ReaderProgressService);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly readerRoot = viewChild<ElementRef<HTMLElement>>('readerRoot');
  private preloadedImage: HTMLImageElement | null = null;
  private pointerOrigin: PointerOrigin | null = null;

  protected readonly comic = signal<Comic | null>(null);
  protected readonly issue = signal<Issue | null>(null);
  protected readonly pages = signal<readonly ComicPage[]>([]);
  protected readonly comicSlug = signal('');
  protected readonly issueSlug = signal('');
  protected readonly currentPageIndex = signal(0);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly imageState = signal<ImageState>('loading');
  protected readonly zoom = signal(1);
  protected readonly fitMode = signal<ReaderFitMode>('contain');
  protected readonly nativeFullscreen = signal(false);
  protected readonly fallbackFullscreen = signal(false);

  protected readonly currentPage = computed(() => this.pages()[this.currentPageIndex()] ?? null);
  protected readonly totalPages = computed(() => this.pages().length);
  protected readonly canGoPrevious = computed(() => this.currentPageIndex() > 0);
  protected readonly canGoNext = computed(() => this.currentPageIndex() < this.totalPages() - 1);
  protected readonly zoomPercent = computed(() => Math.round(this.zoom() * 100));
  protected readonly isFullscreen = computed(
    () => this.nativeFullscreen() || this.fallbackFullscreen(),
  );
  protected readonly pageAlt = computed(() => {
    const comic = this.comic();
    const issue = this.issue();
    const page = this.currentPage();

    if (!page) {
      return 'Página da HQ';
    }

    return `${comic?.title ?? 'HQ'}, ${issue?.title ?? 'edição'}, página ${page.pageNumber}`;
  });

  constructor() {
    this.route.paramMap
      .pipe(
        map((params): ReaderRouteParams => ({
          comicSlug: params.get('comicSlug') ?? '',
          issueSlug: params.get('issueSlug') ?? '',
        })),
        distinctUntilChanged(
          (previous, current) =>
            previous.comicSlug === current.comicSlug && previous.issueSlug === current.issueSlug,
        ),
        tap(({ comicSlug, issueSlug }) => this.beginLoading(comicSlug, issueSlug)),
        switchMap(({ comicSlug, issueSlug }) => {
          if (!comicSlug || !issueSlug) {
            return of<ReaderData>({ comicSlug, issueSlug });
          }

          return combineLatest({
            comic: this.comicRepository.getComicBySlug(comicSlug),
            issue: this.comicRepository.getIssue(comicSlug, issueSlug),
          }).pipe(
            map(({ comic, issue }): ReaderData => ({
              comicSlug,
              issueSlug,
              comic,
              issue,
            })),
            catchError(() => of<ReaderData>({ comicSlug, issueSlug, failed: true })),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((data) => this.applyReaderData(data));
  }

  protected previousPage(): void {
    if (this.canGoPrevious()) {
      this.selectPage(this.currentPageIndex() - 1);
    }
  }

  protected nextPage(): void {
    if (this.canGoNext()) {
      this.selectPage(this.currentPageIndex() + 1);
    }
  }

  protected zoomIn(): void {
    this.zoom.update((zoom) => Math.min(3, Number((zoom + 0.25).toFixed(2))));
  }

  protected zoomOut(): void {
    this.zoom.update((zoom) => Math.max(0.5, Number((zoom - 0.25).toFixed(2))));
  }

  protected resetZoom(): void {
    this.zoom.set(1);
    this.fitMode.set('contain');
  }

  protected setFitMode(mode: ReaderFitMode): void {
    this.fitMode.set(mode);
    this.zoom.set(1);
  }

  protected markImageLoaded(): void {
    this.imageState.set('loaded');
  }

  protected markImageFailed(): void {
    this.imageState.set('error');
  }

  protected retryImage(): void {
    this.imageState.set('loading');
  }

  protected onPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' || event.button !== 0) {
      return;
    }

    this.pointerOrigin = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startedAt: Date.now(),
    };
  }

  protected onPointerUp(event: PointerEvent): void {
    const origin = this.pointerOrigin;
    this.pointerOrigin = null;

    if (!origin || origin.id !== event.pointerId) {
      return;
    }

    const horizontalDistance = event.clientX - origin.x;
    const verticalDistance = event.clientY - origin.y;
    const elapsed = Date.now() - origin.startedAt;

    if (
      elapsed > 900 ||
      Math.abs(horizontalDistance) < 48 ||
      Math.abs(horizontalDistance) <= Math.abs(verticalDistance) * 1.2
    ) {
      return;
    }

    if (horizontalDistance < 0) {
      this.nextPage();
    } else {
      this.previousPage();
    }
  }

  protected cancelPointer(): void {
    this.pointerOrigin = null;
  }

  protected async toggleFullscreen(): Promise<void> {
    if (!this.isBrowser) {
      return;
    }

    if (this.fallbackFullscreen()) {
      this.fallbackFullscreen.set(false);
      return;
    }

    const readerElement = this.readerRoot()?.nativeElement;
    if (!readerElement) {
      return;
    }

    if (this.document.fullscreenElement) {
      try {
        await this.document.exitFullscreen();
      } catch {
        this.nativeFullscreen.set(false);
      }
      return;
    }

    if (typeof readerElement.requestFullscreen !== 'function') {
      this.fallbackFullscreen.set(true);
      return;
    }

    try {
      await readerElement.requestFullscreen({ navigationUI: 'hide' });
    } catch {
      this.fallbackFullscreen.set(true);
    }
  }

  @HostListener('document:fullscreenchange')
  protected onFullscreenChange(): void {
    const readerElement = this.readerRoot()?.nativeElement;
    this.nativeFullscreen.set(!!readerElement && this.document.fullscreenElement === readerElement);
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName))
    ) {
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previousPage();
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.nextPage();
      return;
    }

    if (event.key === 'Escape' && this.fallbackFullscreen()) {
      event.preventDefault();
      this.fallbackFullscreen.set(false);
    }
  }

  private beginLoading(comicSlug: string, issueSlug: string): void {
    this.comicSlug.set(comicSlug);
    this.issueSlug.set(issueSlug);
    this.loading.set(true);
    this.loadError.set(null);
    this.imageState.set('loading');
    this.comic.set(null);
    this.issue.set(null);
    this.pages.set([]);
    this.currentPageIndex.set(0);
    this.preloadedImage = null;
  }

  private applyReaderData(data: ReaderData): void {
    this.loading.set(false);

    if (data.failed) {
      this.loadError.set('Não foi possível carregar esta edição. Tente novamente mais tarde.');
      return;
    }

    if (!data.comic || !data.issue) {
      this.loadError.set('A HQ ou a edição solicitada não foi encontrada.');
      return;
    }

    const pages = [...data.issue.pages].sort(
      (first, second) => first.pageNumber - second.pageNumber,
    );

    this.comic.set(data.comic);
    this.issue.set(data.issue);
    this.pages.set(pages);

    if (pages.length === 0) {
      this.loadError.set('Esta edição ainda não possui páginas disponíveis.');
      return;
    }

    const savedProgress = this.progressService.getProgress(data.comicSlug, data.issueSlug);
    const restoredIndex = Math.min(Math.max(savedProgress?.pageIndex ?? 0, 0), pages.length - 1);

    this.selectPage(restoredIndex);
  }

  private selectPage(index: number): void {
    if (index < 0 || index >= this.pages().length) {
      return;
    }

    this.currentPageIndex.set(index);
    this.imageState.set('loading');
    this.persistProgress(index);
    this.preloadNextPage(index);
  }

  private persistProgress(pageIndex: number): void {
    const comicSlug = this.comicSlug();
    const issueSlug = this.issueSlug();

    if (!comicSlug || !issueSlug) {
      return;
    }

    this.progressService.saveProgress(comicSlug, issueSlug, pageIndex);
  }

  private preloadNextPage(currentIndex: number): void {
    this.preloadedImage = null;

    if (!this.isBrowser) {
      return;
    }

    const nextPage = this.pages()[currentIndex + 1];
    if (!nextPage) {
      return;
    }

    const image = new Image();
    image.decoding = 'async';
    image.src = nextPage.imageUrl;
    this.preloadedImage = image;
  }
}
