import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { SiteFooterComponent } from './shared/components/site-footer/site-footer';
import { SiteHeaderComponent } from './shared/components/site-header/site-header';

@Component({
  imports: [RouterOutlet, SiteHeaderComponent, SiteFooterComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  protected readonly isReaderRoute = signal(this.router.url.startsWith('/ler/'));
  protected readonly isAdminRoute = signal(this.router.url.startsWith('/admin'));

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        this.isReaderRoute.set(event.urlAfterRedirects.startsWith('/ler/'));
        this.isAdminRoute.set(event.urlAfterRedirects.startsWith('/admin'));
      });
  }
}
