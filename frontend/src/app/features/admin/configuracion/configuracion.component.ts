import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfiguracionService } from '../../../core/services/configuracion.service';
import { ConfiguracionItem } from '../../../core/models/admin.model';

const CONFIG_TITULOS: Record<string, string> = {
  anio_reporte_vigente: 'Año de reporte vigente',
  carga_masiva_habilitada: 'Carga masiva habilitada',
  dias_espera_respuesta_crm: 'Días de espera de respuesta CRM',
};

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './configuracion.component.html',
  styleUrl: './configuracion.component.scss',
})
export class ConfiguracionComponent implements OnInit {
  private readonly configuracion = inject(ConfiguracionService);

  protected readonly items = signal<ConfiguracionItem[]>([]);
  protected readonly valores = signal<Record<string, string>>({});
  protected readonly loading = signal(true);
  protected readonly saving = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.configuracion.list().subscribe({
      next: (r) => {
        this.items.set(r.data);
        const map: Record<string, string> = {};
        for (const item of r.data) map[item.clave] = item.valor;
        this.valores.set(map);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No fue posible cargar la configuración.');
        this.loading.set(false);
      },
    });
  }

  protected titulo(clave: string): string {
    return CONFIG_TITULOS[clave] ?? clave.replaceAll('_', ' ');
  }

  protected updateValor(clave: string, valor: string): void {
    this.valores.update((current) => ({ ...current, [clave]: valor }));
  }

  protected guardar(clave: string): void {
    this.saving.set(clave);
    this.configuracion.update(clave, this.valores()[clave]).subscribe({
      next: () => this.saving.set(null),
      error: () => {
        this.error.set(`No fue posible actualizar ${this.titulo(clave)}.`);
        this.saving.set(null);
      },
    });
  }
}
