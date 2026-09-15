import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Comic } from '../../../core/models/comic.models';

@Component({
  selector: 'app-comic-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './comic-card.html',
  styleUrl: './comic-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComicCardComponent {
  readonly comic = input.required<Comic>();
  readonly badge = input<string | null>(null);
  readonly showMetadata = input(true);
  readonly imagePriority = input(false);

  protected readonly imageFailed = signal(false);
  protected readonly releaseYear = computed(() => this.comic().releaseDate.slice(0, 4));

  protected markImageAsFailed(): void {
    this.imageFailed.set(true);
  }
}
