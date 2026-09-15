import {
  Component,
  ElementRef,
  HostListener,
  Injector,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayoutComponent {
  private readonly injector = inject(Injector);
  private readonly firstMenuItem = viewChild<ElementRef<HTMLAnchorElement>>('firstMenuItem');
  private readonly menuToggle = viewChild<ElementRef<HTMLButtonElement>>('menuToggle');

  protected readonly menuOpen = signal(false);

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.menuOpen()) this.closeMenu();
  }

  @HostListener('window:resize')
  protected onViewportResize(): void {
    if (this.menuOpen() && window.innerWidth > 800) this.closeMenu(false);
  }

  protected toggleMenu(): void {
    if (this.menuOpen()) {
      this.closeMenu();
      return;
    }

    this.menuOpen.set(true);
    afterNextRender(
      () => {
        if (this.menuOpen()) this.firstMenuItem()?.nativeElement.focus();
      },
      { injector: this.injector },
    );
  }

  protected closeMenu(restoreFocus = true): void {
    const wasOpen = this.menuOpen();
    this.menuOpen.set(false);

    if (wasOpen && restoreFocus) {
      afterNextRender(
        () => {
          if (!this.menuOpen()) this.menuToggle()?.nativeElement.focus();
        },
        { injector: this.injector },
      );
    }
  }
}
