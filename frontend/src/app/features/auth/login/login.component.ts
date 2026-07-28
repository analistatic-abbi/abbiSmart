import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorCode } from '../../../core/models/rol.enum';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorBody } from '../../../core/models/auth.model';
import { LOGO_ABBI, LOGIN_HERO_EQUIPO, LOGIN_OPERADOR } from '../../../core/constants/branding';
import { DEV_LOGIN_ACCOUNTS, DevLoginAccount } from '../../../core/constants/dev-login';
import { environment } from '../../../../environments/environment';
import { LOGIN_FAQ_ITEMS } from './login-faq';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  protected readonly logoUrl = LOGO_ABBI;
  protected readonly loginHeroEquipo = LOGIN_HERO_EQUIPO;
  protected readonly loginOperador = LOGIN_OPERADOR;
  protected readonly isDev = !environment.production;
  protected readonly devAccounts = DEV_LOGIN_ACCOUNTS;
  protected readonly loading = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly errorType = signal<'credentials' | 'blocked' | 'generic' | null>(null);
  protected readonly faqItems = LOGIN_FAQ_ITEMS;
  protected readonly expandedFaq = signal<string | null>(null);
  protected readonly faqOpen = signal(false);

  ngOnInit(): void {
    this.route.fragment.subscribe((fragment) => {
      if (fragment === 'faq') {
        this.faqOpen.set(true);
      }
    });
  }

  protected toggleFaqPanel(): void {
    this.faqOpen.update((open) => !open);
  }

  protected closeFaqPanel(): void {
    this.faqOpen.set(false);
  }

  protected toggleFaq(id: string): void {
    this.expandedFaq.update((current) => (current === id ? null : id));
  }

  protected readonly form = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  protected quickLogin(account: DevLoginAccount): void {
    if (this.loading()) {
      return;
    }

    this.form.patchValue({
      correo: account.correo,
      password: account.password,
    });
    this.submit();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.errorType.set(null);

    const { correo, password } = this.form.getRawValue();

    this.auth.login(correo, password).subscribe({
      next: () => this.loading.set(false),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const body = err.error as ApiErrorBody;

        if (body?.errorCode === ErrorCode.AuthCuentaBloqueada) {
          this.errorType.set('blocked');
          this.errorMessage.set(body.message ?? 'La cuenta está bloqueada.');
          return;
        }

        if (body?.errorCode === ErrorCode.AuthCredencialesInvalidas) {
          this.errorType.set('credentials');
          this.errorMessage.set(body.message ?? 'Credenciales incorrectas.');
          return;
        }

        this.errorType.set('generic');
        this.errorMessage.set(body?.message ?? 'No fue posible iniciar sesión.');
      },
    });
  }
}
