import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SoporteService } from '../../../core/services/soporte.service';
import { SupportUiService } from '../../../core/services/support-ui.service';
import { SUPPORT_CATEGORIAS, SUPPORT_FAQ_ITEMS } from './support-faq';

@Component({
  selector: 'app-support-center',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './support-center.component.html',
  styleUrl: './support-center.component.scss',
})
export class SupportCenterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly soporte = inject(SoporteService);
  private readonly supportUi = inject(SupportUiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isOpen = this.supportUi.isOpen;
  protected readonly faqItems = SUPPORT_FAQ_ITEMS;
  protected readonly categorias = SUPPORT_CATEGORIAS;
  protected readonly expandedFaq = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    categoria: [this.categorias[0], Validators.required],
    asunto: ['', [Validators.maxLength(200)]],
    mensaje: ['', [Validators.required, Validators.minLength(10)]],
  });

  protected close(): void {
    this.supportUi.close();
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.form.reset({
      categoria: this.categorias[0],
      asunto: '',
      mensaje: '',
    });
  }

  protected toggleFaq(id: string): void {
    this.expandedFaq.update((current) => (current === id ? null : id));
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    const { categoria, asunto, mensaje } = this.form.getRawValue();

    this.soporte
      .enviarMensaje({
        categoria,
        asunto: asunto.trim() || undefined,
        mensaje: mensaje.trim(),
        paginaActual: this.router.url,
      })
      .subscribe({
        next: (response) => {
          this.successMessage.set(response.message);
          this.loading.set(false);
          this.form.reset({
            categoria: this.categorias[0],
            asunto: '',
            mensaje: '',
          });
        },
        error: () => {
          this.errorMessage.set('No fue posible enviar su mensaje. Intente más tarde.');
          this.loading.set(false);
        },
      });
  }

  protected usuarioNombre(): string {
    return this.auth.usuario()?.nombre ?? '';
  }
}
