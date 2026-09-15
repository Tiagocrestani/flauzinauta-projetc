import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AdminAuthService } from '../../../core/auth/admin-auth.service';

@Component({
  selector: 'app-admin-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './admin-login-page.html',
  styleUrl: './admin-login-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLoginPageComponent {
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal(this.initialMessage());
  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
  });

  protected async submit(): Promise<void> {
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);

    try {
      const { email, password } = this.form.getRawValue();
      const { data, error } = await this.auth.signIn(email.trim(), password);

      if (error || !data.user) {
        throw new Error('E-mail ou senha inválidos.');
      }

      if (!(await this.auth.isAdmin(data.user.id))) {
        await this.auth.signOut();
        throw new Error('Este usuário não possui acesso administrativo.');
      }

      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      const safeReturnUrl = returnUrl?.startsWith('/admin') ? returnUrl : '/admin';
      await this.router.navigateByUrl(safeReturnUrl);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Não foi possível entrar no painel.',
      );
    } finally {
      this.submitting.set(false);
    }
  }

  private initialMessage(): string {
    if (this.route.snapshot.queryParamMap.get('acesso') === 'negado') {
      return 'Sua conta não está cadastrada como administradora.';
    }

    if (this.route.snapshot.queryParamMap.get('erro') === 'indisponivel') {
      return 'Não foi possível validar o acesso. Tente novamente.';
    }

    return '';
  }
}
