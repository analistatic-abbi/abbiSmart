import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { countryFlagUrl } from '../../../core/utils/country.util';

interface PaisOption {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-select-country',
  standalone: true,
  imports: [],
  templateUrl: './select-country.component.html',
  styleUrl: './select-country.component.scss',
})
export class SelectCountryComponent {
  private readonly auth = inject(AuthService);

  protected readonly paises = this.auth.getPreAuthPaises();
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isCountryChange = () => this.auth.isCountryChangeMode();

  protected readonly title = () =>
    this.isCountryChange()
      ? 'Selecciona el nuevo país en el que vas a trabajar'
      : 'Selecciona el país en el que vas a trabajar';

  protected flagUrl(pais: PaisOption): string {
    return countryFlagUrl(pais.nombre, pais.id);
  }

  protected selectPais(pais: PaisOption): void {
    if (this.loading()) return;

    this.errorMessage.set(null);
    this.auth.setPaisNombre(pais.nombre);
    this.loading.set(true);

    this.auth.selectCountry(pais.id).subscribe({
      next: () => this.loading.set(false),
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('No fue posible configurar el país de sesión.');
      },
    });
  }
}
