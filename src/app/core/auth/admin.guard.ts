import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AdminAuthService } from './admin-auth.service';

export const adminGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);

  try {
    const user = await auth.getUser();

    if (!user) {
      return router.createUrlTree(['/admin/login'], {
        queryParams: { returnUrl: state.url },
      });
    }

    if (!(await auth.isAdmin(user.id))) {
      await auth.signOut();
      return router.createUrlTree(['/admin/login'], {
        queryParams: { acesso: 'negado' },
      });
    }

    return true;
  } catch {
    return router.createUrlTree(['/admin/login'], {
      queryParams: { erro: 'indisponivel' },
    });
  }
};
