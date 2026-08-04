import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProyeccionesService } from '../../../../core/services/proyecciones.service';
import { ProcesosService } from '../../../../core/services/procesos.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CatalogosService } from '../../../../core/services/catalogos.service';
import { Proyeccion } from '../../../../core/models/admin.model';
import { ProcesoListItem, SegmentoProceso } from '../../../../core/models/proceso.model';
import { mensajeErrorApi } from '../../../../core/utils/api-error.util';
import { claseBadgeEstadoProyeccion } from '../../../../core/utils/proyeccion-ui.util';
import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select.component';
import { FijarEntidadButtonComponent } from '../../../../shared/components/fijar-entidad-button/fijar-entidad-button.component';

@Component({
  selector: 'app-proyeccion-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, SearchableSelectComponent, FijarEntidadButtonComponent],
  templateUrl: './proyeccion-detail.component.html',
  styleUrl: './proyeccion-detail.component.scss',
})
export class ProyeccionDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly proyecciones = inject(ProyeccionesService);
  private readonly procesos = inject(ProcesosService);
  private readonly catalogos = inject(CatalogosService);
  protected readonly auth = inject(AuthService);

  protected readonly segmentos = Object.values(SegmentoProceso);
  protected readonly clientes = signal<Array<{ id: number; empresa: string }>>([]);
  protected readonly clienteOptions = computed(() =>
    this.clientes().map((cliente) => ({
      value: cliente.id,
      label: cliente.empresa,
    })),
  );

  protected readonly proyeccion = signal<Proyeccion | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showVincularModal = signal(false);
  protected readonly busquedaProceso = signal('');
  protected readonly procesosBusqueda = signal<ProcesoListItem[]>([]);
  protected readonly buscandoProcesos = signal(false);

  protected readonly anioProyectado = signal(0);
  protected readonly fechaEstimadaPublicacion = signal('');
  protected readonly valorVenta = signal(0);
  protected readonly valorFacturacion = signal(0);
  protected readonly procesoResultanteId = signal<number | null>(null);
  protected readonly usarEmpresaOtro = signal(false);
  protected readonly empresaClienteId = signal<number | null>(null);
  protected readonly empresaOtro = signal('');
  protected readonly segmento = signal<SegmentoProceso>(SegmentoProceso.GasNatural);
  protected readonly objeto = signal('');

  protected readonly puedeEscribir = () => this.auth.puedeEscribir();
  protected readonly puedeCerrar = () => this.auth.puedeCerrarProyeccion();
  protected readonly esManual = computed(() => !this.proyeccion()?.procesoOrigenId);

  protected readonly puedeVincular = computed(() => {
    const p = this.proyeccion();
    return (
      this.puedeEscribir() &&
      !!p &&
      p.estado !== 'Publicado' &&
      p.estado !== 'Cerrado' &&
      !p.procesoResultanteId
    );
  });

  protected readonly badgeClass = (estado: string) => claseBadgeEstadoProyeccion(estado);

  private proyeccionId = 0;

  ngOnInit(): void {
    this.proyeccionId = Number(this.route.snapshot.paramMap.get('id'));
    this.catalogos.getClientes().subscribe((r) => this.clientes.set(r.data));
    this.cargar();
  }

  protected cargar(): void {
    this.loading.set(true);
    this.proyecciones.getById(this.proyeccionId).subscribe({
      next: (r) => {
        const p = r.proyeccion;
        this.proyeccion.set(p);
        this.anioProyectado.set(p.anioProyectado);
        this.fechaEstimadaPublicacion.set(p.fechaEstimadaPublicacion);
        this.valorVenta.set(Number(p.valorVenta));
        this.valorFacturacion.set(Number(p.valorFacturacion));
        this.procesoResultanteId.set(p.procesoResultanteId);
        this.usarEmpresaOtro.set(Boolean(p.empresaOtro));
        this.empresaClienteId.set(p.empresaClienteId ?? null);
        this.empresaOtro.set(p.empresaOtro ?? '');
        this.segmento.set((p.segmento as SegmentoProceso) ?? SegmentoProceso.GasNatural);
        this.objeto.set(p.objeto ?? '');
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No fue posible cargar la proyección.');
        this.loading.set(false);
      },
    });
  }

  protected guardar(): void {
    if (!this.puedeEscribir()) return;

    this.saving.set(true);
    this.error.set(null);

    const payload: Record<string, unknown> = {
      anioProyectado: this.anioProyectado(),
      fechaEstimadaPublicacion: this.fechaEstimadaPublicacion(),
      valorVenta: this.valorVenta(),
      valorFacturacion: this.valorFacturacion(),
      objeto: this.objeto().trim() || null,
    };

    if (this.esManual()) {
      payload['segmento'] = this.segmento();
      if (this.usarEmpresaOtro()) {
        payload['empresaOtro'] = this.empresaOtro().trim();
        payload['empresaClienteId'] = null;
      } else {
        payload['empresaClienteId'] = this.empresaClienteId();
        payload['empresaOtro'] = null;
      }
    }

    this.proyecciones.update(this.proyeccionId, payload).subscribe({
      next: (r) => {
        this.proyeccion.set(r.proyeccion);
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(mensajeErrorApi(err, 'No fue posible actualizar.'));
        this.saving.set(false);
      },
    });
  }

  protected cerrar(): void {
    if (!this.puedeCerrar()) return;

    this.error.set(null);
    this.proyecciones.cerrar(this.proyeccionId).subscribe({
      next: (r) => this.proyeccion.set(r.proyeccion),
      error: (err) =>
        this.error.set(mensajeErrorApi(err, 'No fue posible cerrar la proyección.')),
    });
  }

  protected abrirVincular(): void {
    this.showVincularModal.set(true);
    this.busquedaProceso.set('');
    this.procesosBusqueda.set([]);
  }

  protected buscarProcesos(): void {
    const q = this.busquedaProceso().trim();
    if (!q) {
      this.procesosBusqueda.set([]);
      return;
    }

    this.buscandoProcesos.set(true);
    this.procesos.list({ page: 1, limit: 20, search: q }).subscribe({
      next: (r) => {
        this.procesosBusqueda.set(r.data);
        this.buscandoProcesos.set(false);
      },
      error: () => {
        this.procesosBusqueda.set([]);
        this.buscandoProcesos.set(false);
      },
    });
  }

  protected seleccionarProcesoResultante(proceso: ProcesoListItem): void {
    this.procesoResultanteId.set(proceso.id);
    this.vincular();
  }

  protected vincular(): void {
    const procesoId = this.procesoResultanteId();
    if (!procesoId || !this.puedeVincular()) return;

    this.error.set(null);
    this.proyecciones.vincularProceso(this.proyeccionId, procesoId).subscribe({
      next: (r) => {
        this.proyeccion.set(r.proyeccion);
        this.showVincularModal.set(false);
      },
      error: (err) =>
        this.error.set(mensajeErrorApi(err, 'No fue posible vincular el proceso.')),
    });
  }
}
