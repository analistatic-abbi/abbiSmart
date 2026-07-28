import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  template: `
    <section class="placeholder">
      <h1>{{ title }}</h1>
      <p>Módulo en construcción — próxima fase del plan.</p>
    </section>
  `,
  styles: `
    .placeholder h1 {
      margin: 0 0 8px;
      color: var(--color-primary);
    }
    .placeholder p {
      margin: 0;
      color: var(--color-on-surface-variant);
    }
  `,
})
export class PlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly title = this.route.snapshot.data['title'] as string;
}
