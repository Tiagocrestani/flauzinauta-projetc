import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  AdminCatalogService,
  AdminComicSummary,
  PublicationStatus,
} from '../data/admin-catalog.service';

@Component({
  selector: 'app-admin-dashboard-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './admin-dashboard-page.html',
  styleUrl: './admin-dashboard-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardPageComponent {
  private readonly catalogService = inject(AdminCatalogService);

  protected readonly comics = signal<AdminComicSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly updatingId = signal<string | null>(null);
  protected readonly message = signal('');
  protected readonly errorMessage = signal('');
  protected readonly issueCount = computed(() =>
    this.comics().reduce((total, comic) => total + comic.issueCount, 0),
  );
  protected readonly pageCount = computed(() =>
    this.comics().reduce((total, comic) => total + comic.pageCount, 0),
  );
  protected readonly publishedCount = computed(
    () => this.comics().filter((comic) => comic.publicationStatus === 'published').length,
  );

  constructor() {
    void this.loadCatalog();
  }

  protected async changeStatus(comic: AdminComicSummary, status: PublicationStatus): Promise<void> {
    this.message.set('');
    this.errorMessage.set('');
    this.updatingId.set(comic.id);

    try {
      await this.catalogService.setPublicationStatus(comic.id, status);
      this.message.set(
        status === 'published'
          ? `${comic.title} foi publicada.`
          : status === 'draft'
            ? `${comic.title} voltou para rascunho.`
            : `${comic.title} foi arquivada.`,
      );
      await this.loadCatalog(false);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Não foi possível atualizar a HQ.',
      );
    } finally {
      this.updatingId.set(null);
    }
  }

  protected statusLabel(status: PublicationStatus): string {
    return { draft: 'Rascunho', published: 'Publicada', archived: 'Arquivada' }[status];
  }

  private async loadCatalog(showLoading = true): Promise<void> {
    if (showLoading) {
      this.loading.set(true);
    }

    this.errorMessage.set('');

    try {
      this.comics.set(await this.catalogService.getCatalog());
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Não foi possível carregar o catálogo.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
