import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type ReaderFitMode = 'contain' | 'width' | 'height';

@Component({
  selector: 'app-reader-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reader-controls.html',
  styleUrl: './reader-controls.css',
})
export class ReaderControlsComponent {
  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly canGoPrevious = input.required<boolean>();
  readonly canGoNext = input.required<boolean>();
  readonly zoomPercent = input.required<number>();
  readonly fitMode = input.required<ReaderFitMode>();
  readonly isFullscreen = input.required<boolean>();

  readonly previousRequested = output<void>();
  readonly nextRequested = output<void>();
  readonly zoomOutRequested = output<void>();
  readonly zoomInRequested = output<void>();
  readonly resetZoomRequested = output<void>();
  readonly fitModeRequested = output<ReaderFitMode>();
  readonly fullscreenRequested = output<void>();
}
