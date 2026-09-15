import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router, RouterOutlet } from '@angular/router';
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
  protected readonly hasDedicatedLayout = signal(this.usesDedicatedLayout(this.router.url));

  constructor() {
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationStart | NavigationEnd =>
            event instanceof NavigationStart || event instanceof NavigationEnd,
        ),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        const url = event instanceof NavigationEnd ? event.urlAfterRedirects : event.url;
        this.hasDedicatedLayout.set(this.usesDedicatedLayout(url));
      });
  }

  private usesDedicatedLayout(url: string): boolean {
    const path = url.split(/[?#]/, 1)[0];
    return path.startsWith('/ler/') || path === '/admin' || path.startsWith('/admin/');
  }
}
