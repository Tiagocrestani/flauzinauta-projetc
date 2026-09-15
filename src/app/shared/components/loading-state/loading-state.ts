import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  templateUrl: './loading-state.html',
  styleUrl: './loading-state.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingStateComponent {
  readonly label = input('Carregando HQs');
  readonly itemCount = input(4);
  readonly compact = input(false);

  protected readonly placeholders = computed(() =>
    Array.from({ length: Math.max(1, Math.min(this.itemCount(), 12)) }),
  );
}
