import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LOGO_ABBI } from '../../../core/constants/branding';

@Component({
  selector: 'app-activate-account',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './activate-account.component.html',
  styleUrl: './activate-account.component.scss',
})
export class ActivateAccountComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  protected readonly logoUrl = LOGO_ABBI;
  protected readonly loading = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly tokenInvalido = signal(false);

  private token = '';

  protected readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirm: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.token = params.get('token')?.trim() ?? '';
      this.tokenInvalido.set(!this.token);
      if (!this.token) {
        this.error.set('El enlace de activación no es válido o está incompleto.');
      }
    });
  }

  protected submit(): void {
    if (this.tokenInvalido()) {
      return;
    }

    if (this.form.invalid || this.form.value.password !== this.form.value.confirm) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.auth.activate(this.token, this.form.value.password!).subscribe({
      next: (r) => {
        this.message.set(r.message);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No fue posible activar la cuenta. Verifique que el enlace no haya expirado.');
        this.loading.set(false);
      },
    });
  }
}
