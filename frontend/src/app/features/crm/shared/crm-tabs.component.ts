import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export type CrmTab = 'clientes' | 'contactos' | 'relacionamientos';

@Component({
  selector: 'app-crm-tabs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="crm-tabs">
      <a routerLink="/crm/clientes" routerLinkActive="active" [class.active]="active() === 'clientes'">Clientes</a>
      <a routerLink="/crm/contactos" routerLinkActive="active" [class.active]="active() === 'contactos'">Contactos</a>
      <a routerLink="/crm/relacionamientos" routerLinkActive="active" [class.active]="active() === 'relacionamientos'">Relacionamientos</a>
    </nav>
  `,
  styles: `
    .crm-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;

      a {
        border: 1px solid var(--color-outline-variant);
        background: var(--color-surface-container-lowest);
        border-radius: var(--radius-prime);
        padding: 8px 14px;
        text-decoration: none;
        color: inherit;
        font-size: 14px;

        &.active {
          background: var(--color-secondary-container);
          color: var(--color-primary);
          font-weight: 600;
        }
      }
    }

    @media (max-width: 768px) {
      .crm-tabs {
        flex-wrap: nowrap;
        padding-bottom: 8px;
        overflow-x: auto;
        scroll-snap-type: inline proximity;
        overscroll-behavior-inline: contain;

        a {
          flex: 0 0 auto;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          scroll-snap-align: start;
        }
      }
    }
  `,
})
export class CrmTabsComponent {
  readonly active = input<CrmTab>('clientes');
}
