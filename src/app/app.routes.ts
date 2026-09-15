import { Routes } from '@angular/router';

import { adminGuard } from './core/auth/admin.guard';

export const routes: Routes = [
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
  {
    path: 'admin/login',
    title: 'Acesso administrativo — Flauzinauta',
    loadComponent: () =>
      import('./features/admin/login/admin-login-page').then(
        (module) => module.AdminLoginPageComponent,
      ),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/layout/admin-layout').then((module) => module.AdminLayoutComponent),
    children: [
      {
        path: '',
        title: 'Painel administrativo — Flauzinauta',
        loadComponent: () =>
          import('./features/admin/dashboard/admin-dashboard-page').then(
            (module) => module.AdminDashboardPageComponent,
          ),
      },
      {
        path: 'hqs/nova',
        title: 'Nova HQ — Flauzinauta',
        loadComponent: () =>
          import('./features/admin/comic-form/admin-comic-form-page').then(
            (module) => module.AdminComicFormPageComponent,
          ),
      },
      {
        path: 'hqs/:comicId/partes/nova',
        title: 'Nova parte — Flauzinauta',
        loadComponent: () =>
          import('./features/admin/issue-form/admin-issue-form-page').then(
            (module) => module.AdminIssueFormPageComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
