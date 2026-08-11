import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfiguracionService } from '../../../core/services/configuracion.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { confirmarGuardado } from '../../../core/utils/confirm-dialog.util';
import { mensajeExitoApi } from '../../../core/utils/api-error.util';
import { ConfiguracionItem } from '../../../core/models/admin.model';

type ConfigFieldType = 'text' | 'number' | 'boolean';

interface ConfigMeta {
  titulo: string;
  descripcion: string;
  tipo: ConfigFieldType;
}

const CONFIG_META: Record<string, ConfigMeta> = {
  carga_masiva_habilitada: {
    titulo: 'Carga masiva habilitada',
    descripcion: 'Activa o desactiva la carga masiva de proyecciones, clientes y contactos.',
    tipo: 'boolean',
  },
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
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

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
    return CONFIG_META[clave]?.titulo ?? clave.replaceAll('_', ' ');
  }

  protected descripcion(item: ConfiguracionItem): string {
    return CONFIG_META[item.clave]?.descripcion ?? this.limpiarDescripcion(item.descripcion);
  }

  protected tipoCampo(clave: string): ConfigFieldType {
    return CONFIG_META[clave]?.tipo ?? 'text';
  }

  private limpiarDescripcion(descripcion: string): string {
    return descripcion.replace(/\s*\([A-Z]+-\d+(?:,\s*[A-Z]+-\d+)*\)/g, '').trim();
  }

  protected updateValor(clave: string, valor: string): void {
    this.valores.update((current) => ({ ...current, [clave]: valor }));
  }

  protected guardar(clave: string): void {
    void confirmarGuardado(
      this.confirmDialog,
      `¿Desea guardar los cambios en «${this.titulo(clave)}»?`,
    ).then((ok) => {
      if (!ok) return;

      this.saving.set(clave);
      this.configuracion.update(clave, this.valores()[clave]).subscribe({
        next: (r) => {
          this.saving.set(null);
          this.toast.success(mensajeExitoApi(r, `${this.titulo(clave)} actualizado correctamente.`));
        },
        error: () => {
          this.error.set(`No fue posible actualizar ${this.titulo(clave)}.`);
          this.saving.set(null);
        },
      });
    });
  }
}
