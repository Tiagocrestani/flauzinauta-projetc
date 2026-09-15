import { Component, ElementRef, effect, input, output, viewChild } from '@angular/core';

@Component({
  selector: 'app-admin-confirm-dialog',
  templateUrl: './admin-confirm-dialog.html',
  styleUrl: './admin-confirm-dialog.css',
})
export class AdminConfirmDialogComponent {
  readonly open = input(false);
  readonly title = input('Confirmar ação');
  readonly message = input('Deseja continuar?');
  readonly confirmLabel = input('Sim, excluir');
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialog()?.nativeElement;
      if (!dialog) return;

      if (this.open() && !dialog.open) {
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
      } else if (!this.open() && dialog.open) {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
      }
    });
  }

  protected cancel(event?: Event): void {
    event?.preventDefault();
    this.cancelled.emit();
  }

  protected confirm(): void {
    this.confirmed.emit();
  }
}
