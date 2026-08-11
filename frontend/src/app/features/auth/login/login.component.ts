import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
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
import { ThemeService, ThemeMode } from '../../../core/services/theme.service';
import { ScrollRevealDirective } from '../../../shared/directives/scroll-reveal.directive';
import { animateCountUp } from '../../../core/utils/count-up.util';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ScrollRevealDirective],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly themeService = inject(ThemeService);

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
  protected readonly statYear = signal(2003);

  private cancelCountUp: (() => void) | null = null;
  private statCounterStarted = false;
  private previousTheme: ThemeMode | null = null;

  ngOnInit(): void {
    this.previousTheme = this.themeService.theme();
    if (this.previousTheme === 'dark') {
      this.themeService.set('light');
    }

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

  protected onStatReveal(): void {
    if (this.statCounterStarted) return;
    this.statCounterStarted = true;

    this.cancelCountUp?.();
    this.cancelCountUp = animateCountUp(1995, 2003, 900, (value) => this.statYear.set(value));
  }

  ngOnDestroy(): void {
    this.cancelCountUp?.();

    if (this.previousTheme === 'dark') {
      this.themeService.set('dark');
    }
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
