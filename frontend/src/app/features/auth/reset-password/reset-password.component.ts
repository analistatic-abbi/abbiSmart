import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LOGO_ABBI } from '../../../core/constants/branding';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  protected readonly logoUrl = LOGO_ABBI;
  protected readonly loading = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  private readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';

  protected readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirm: ['', [Validators.required]],
  });

  protected submit(): void {
    if (this.form.invalid || this.form.value.password !== this.form.value.confirm) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.auth.resetPassword(this.token, this.form.value.password!).subscribe({
      next: (r) => {
        this.message.set(r.message);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No fue posible restablecer la contraseña.');
        this.loading.set(false);
      },
    });
  }
}
