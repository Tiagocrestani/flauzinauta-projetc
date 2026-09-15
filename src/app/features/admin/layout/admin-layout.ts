import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AdminAuthService } from '../../../core/auth/admin-auth.service';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayoutComponent {
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);

  protected readonly email = signal('Administrador');
  protected readonly signingOut = signal(false);

  constructor() {
    void this.loadIdentity();
  }

  protected async signOut(): Promise<void> {
    this.signingOut.set(true);
    await this.auth.signOut();
    await this.router.navigate(['/admin/login']);
  }

  private async loadIdentity(): Promise<void> {
    const user = await this.auth.getUser();
    this.email.set(user?.email ?? 'Administrador');
  }
}
