import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly title = input('Nenhuma HQ encontrada');
  readonly message = input('Tente ajustar sua busca ou explorar todo o catálogo.');
  readonly actionLabel = input<string | null>(null);
  readonly actionLink = input<string | null>(null);
}
