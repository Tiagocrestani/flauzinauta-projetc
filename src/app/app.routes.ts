import { Routes } from '@angular/router';

import { canDeactivatePendingChanges } from './features/admin/shared/pending-changes.guard';

export const routes: Routes = [
  {
    path: 'admin',
    title: 'Painel administrativo — Flauzinauta',
    loadComponent: () =>
      import('./features/admin/layout/admin-layout').then((module) => module.AdminLayoutComponent),
    children: [
      {
        path: '',
        title: 'Visão geral — Flauzinauta Admin',
        loadComponent: () =>
          import('./features/admin/dashboard/admin-dashboard').then(
            (module) => module.AdminDashboardComponent,
          ),
      },
      {
        path: 'hqs',
        title: 'Gerenciar HQs — Flauzinauta Admin',
        loadComponent: () =>
          import('./features/admin/comic-list/admin-comic-list').then(
            (module) => module.AdminComicListComponent,
          ),
      },
      {
        path: 'hqs/nova',
        title: 'Nova HQ — Flauzinauta Admin',
        canDeactivate: [canDeactivatePendingChanges],
        loadComponent: () =>
          import('./features/admin/comic-form/admin-comic-form').then(
            (module) => module.AdminComicFormComponent,
          ),
      },
      {
        path: 'hqs/:id/editar',
        title: 'Editar HQ — Flauzinauta Admin',
        canDeactivate: [canDeactivatePendingChanges],
        loadComponent: () =>
          import('./features/admin/comic-form/admin-comic-form').then(
            (module) => module.AdminComicFormComponent,
          ),
      },
      {
        path: 'hqs/:comicId/edicoes',
        title: 'Edições — Flauzinauta Admin',
        loadComponent: () =>
          import('./features/admin/issue-list/admin-issue-list').then(
            (module) => module.AdminIssueListComponent,
          ),
      },
      {
        path: 'hqs/:comicId/edicoes/nova',
        title: 'Nova edição — Flauzinauta Admin',
        canDeactivate: [canDeactivatePendingChanges],
        loadComponent: () =>
          import('./features/admin/issue-form/admin-issue-form').then(
            (module) => module.AdminIssueFormComponent,
          ),
      },
      {
        path: 'hqs/:comicId/edicoes/:issueId/editar',
        title: 'Editar edição — Flauzinauta Admin',
        canDeactivate: [canDeactivatePendingChanges],
        loadComponent: () =>
          import('./features/admin/issue-form/admin-issue-form').then(
            (module) => module.AdminIssueFormComponent,
          ),
      },
    ],
  },
  {
    path: '',
    title: 'Flauzinauta — HQs de super-heróis para ler online',
    loadComponent: () =>
      import('./features/home/home-page').then((module) => module.HomePageComponent),
  },
  {
    path: 'hqs',
    title: 'Catálogo de heróis — Flauzinauta',
    loadComponent: () =>
      import('./features/catalog/catalog-page').then((module) => module.CatalogPageComponent),
  },
  {
    path: 'hq/:slug',
    loadComponent: () =>
      import('./features/comic-detail/comic-detail-page').then(
        (module) => module.ComicDetailPageComponent,
      ),
  },
  {
    path: 'ler/:comicSlug/:issueSlug',
    loadComponent: () =>
      import('./features/reader/reader-page').then((module) => module.ReaderPageComponent),
  },
  { path: '**', redirectTo: '' },
];
