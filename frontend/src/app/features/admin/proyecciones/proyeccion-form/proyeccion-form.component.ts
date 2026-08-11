import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProyeccionesService } from '../../../../core/services/proyecciones.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CatalogosService } from '../../../../core/services/catalogos.service';
import { CatalogoPaisItem } from '../../../../core/models/pais-config.model';
import { mensajeErrorApi, mensajeExitoApi } from '../../../../core/utils/api-error.util';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { confirmarCreacion } from '../../../../core/utils/confirm-dialog.util';
import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-proyeccion-form',
  standalone: true,
  imports: [FormsModule, RouterLink, SearchableSelectComponent],
  templateUrl: './proyeccion-form.component.html',
  styleUrl: './proyeccion-form.component.scss',
})
export class ProyeccionFormComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly proyecciones = inject(ProyeccionesService);
  private readonly catalogos = inject(CatalogosService);
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly segmentos = signal<CatalogoPaisItem[]>([]);
  protected readonly clientes = signal<Array<{ id: number; empresa: string }>>([]);
  protected readonly clienteOptions = computed(() =>
    this.clientes().map((cliente) => ({
      value: cliente.id,
      label: cliente.empresa,
    })),
  );

  protected readonly anioProyectado = signal(new Date().getFullYear());
  protected readonly fechaEstimadaPublicacion = signal('');
  protected readonly valorVenta = signal(0);
  protected readonly valorFacturacion = signal(0);
  protected readonly procesoOrigenId = signal<number | null>(null);
  protected readonly usarEmpresaOtro = signal(false);
  protected readonly empresaClienteId = signal<number | null>(null);
  protected readonly empresaOtro = signal('');
  protected readonly segmento = signal('');
  protected readonly objeto = signal('');

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.catalogos.getClientes().subscribe((r) => this.clientes.set(r.data));
    this.catalogos.getCatalogoSesion('segmento_proceso').subscribe({
      next: (r) => {
        this.segmentos.set(r.data);
        if (r.data.length) {
          this.segmento.set(r.data[0].codigo);
        }
      },
    });
  }

  protected guardar(): void {
    if (!this.auth.puedeEscribir()) {
      this.error.set('No tiene permisos para crear proyecciones.');
      return;
    }

    if (!this.fechaEstimadaPublicacion()) {
      this.error.set('Complete la fecha estimada de publicación.');
      return;
    }

    const esManual = !this.procesoOrigenId();
    if (esManual) {
      if (this.usarEmpresaOtro() && !this.empresaOtro().trim()) {
        this.error.set('Indique la empresa en texto libre.');
        return;
      }
      if (!this.usarEmpresaOtro() && !this.empresaClienteId()) {
        this.error.set('Seleccione un cliente.');
        return;
      }
    }

    const payload = {
      anioProyectado: this.anioProyectado(),
      fechaEstimadaPublicacion: this.fechaEstimadaPublicacion(),
      valorVenta: this.valorVenta(),
      valorFacturacion: this.valorFacturacion(),
      ...(this.procesoOrigenId() ? { procesoOrigenId: this.procesoOrigenId()! } : {}),
      ...(esManual
        ? {
            segmento: this.segmento(),
            ...(this.usarEmpresaOtro()
              ? { empresaOtro: this.empresaOtro().trim() }
              : { empresaClienteId: this.empresaClienteId()! }),
          }
        : {}),
      ...(this.objeto().trim() ? { objeto: this.objeto().trim() } : {}),
    };

    void confirmarCreacion(this.confirmDialog, '¿Desea crear la proyección?').then((ok) => {
      if (!ok) return;

      this.loading.set(true);
      this.error.set(null);

      this.proyecciones.create(payload).subscribe({
        next: (r) => {
          this.toast.success(mensajeExitoApi(r, 'Proyección creada correctamente.'));
          void this.router.navigate(['/proyecciones', r.proyeccion.id]);
        },
        error: (err) => {
          this.error.set(mensajeErrorApi(err, 'No fue posible crear la proyección.'));
          this.loading.set(false);
        },
      });
    });
  }
}
