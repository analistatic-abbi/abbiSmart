import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { SupportUiService } from '../../../core/services/support-ui.service';
import { SUPPORT_FAQ_ITEMS, SUPPORT_JOTFORM_URL } from './support-faq';

@Component({
  selector: 'app-support-center',
  standalone: true,
  templateUrl: './support-center.component.html',
  styleUrl: './support-center.component.scss',
})
export class SupportCenterComponent {
  private readonly supportUi = inject(SupportUiService);
  private readonly auth = inject(AuthService);

  protected readonly isOpen = this.supportUi.isOpen;
  protected readonly faqItems = SUPPORT_FAQ_ITEMS;
  protected readonly jotformUrl = SUPPORT_JOTFORM_URL;
  protected readonly expandedFaq = signal<string | null>(null);

  protected close(): void {
    this.supportUi.close();
  }

  protected toggleFaq(id: string): void {
    this.expandedFaq.update((current) => (current === id ? null : id));
  }

  protected openHelpDesk(): void {
    window.open(this.jotformUrl, '_blank', 'noopener,noreferrer');
  }

  protected usuarioNombre(): string {
    return this.auth.usuario()?.nombre ?? '';
  }
}
