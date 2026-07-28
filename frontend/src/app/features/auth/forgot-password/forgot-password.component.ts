import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LOGO_ABBI } from '../../../core/constants/branding';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly logoUrl = LOGO_ABBI;
  protected readonly loading = signal(false);
  protected readonly submitted = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.auth.forgotPassword(this.form.getRawValue().correo).subscribe({
      next: (response) => {
        this.message.set(response.message);
        this.submitted.set(true);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No fue posible procesar la solicitud. Intente más tarde.');
        this.loading.set(false);
      },
    });
  }
}
