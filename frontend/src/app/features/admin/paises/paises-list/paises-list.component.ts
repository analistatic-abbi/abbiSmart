import { Component, HostListener, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogosService } from '../../../../core/services/catalogos.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Pais, PaisReferencia } from '../../../../core/models/pais.model';
import { mensajeErrorApi, mensajeExitoApi } from '../../../../core/utils/api-error.util';
import {
  confirmarAccion,
  confirmarCreacion,
} from '../../../../core/utils/confirm-dialog.util';
import { countryFlagUrl } from '../../../../core/utils/country.util';

@Component({
  selector: 'app-paises-list',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './paises-list.component.html',
  styleUrl: './paises-list.component.scss',
})
export class PaisesListComponent implements OnInit {
  private readonly catalogos = inject(CatalogosService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly items = signal<Pais[]>([]);
  protected readonly referencia = signal<PaisReferencia[]>([]);
  protected readonly loading = signal(true);
  protected readonly referenciaLoading = signal(true);
  protected readonly saving = signal(false);
  protected readonly busqueda = signal('');
  protected readonly seleccionIso = signal('');
  protected readonly filtroActivo = signal<'todos' | 'activos' | 'inactivos'>('todos');
  protected readonly menuAbiertoId = signal<number | null>(null);

  protected readonly referenciaFiltrada = computed(() => {
    const term = this.busqueda().trim().toLowerCase();
    const habilitados = new Set(
      this.items()
        .map((p) => p.codigoIso?.toUpperCase())
        .filter((iso): iso is string => !!iso),
    );

    return this.referencia()
      .filter((pais) => !habilitados.has(pais.iso))
      .filter((pais) => {
        if (!term) return true;
        return (
          pais.nombre.toLowerCase().includes(term) ||
          pais.iso.toLowerCase().includes(term) ||
          pais.codigoMoneda.toLowerCase().includes(term)
        );
      })
      .slice(0, 80);
  });

  protected readonly paisSeleccionado = computed(() => {
    const iso = this.seleccionIso();
    if (!iso) return null;
    return this.referencia().find((pais) => pais.iso === iso) ?? null;
  });

  @HostListener('document:click')
  protected cerrarMenus(): void {
    this.menuAbiertoId.set(null);
  }

  ngOnInit(): void {
    this.cargar();
    this.cargarReferencia();
  }

  protected flagUrl(pais: { nombre: string; codigoIso?: string | null; id?: number }): string {
    return countryFlagUrl(pais.nombre, pais.id, pais.codigoIso);
  }

  protected itemsFiltrados(): Pais[] {
    const filtro = this.filtroActivo();
    const items = this.items();

    if (filtro === 'activos') {
      return items.filter((p) => p.activo);
    }

    if (filtro === 'inactivos') {
      return items.filter((p) => !p.activo);
    }

    return items;
  }

  protected seleccionarReferencia(pais: PaisReferencia): void {
    this.seleccionIso.set(pais.iso);
    this.busqueda.set(pais.nombre);
  }

  protected limpiarSeleccion(): void {
    this.seleccionIso.set('');
    this.busqueda.set('');
  }

  protected toggleMenu(id: number, event: MouseEvent): void {
    event.stopPropagation();
    this.menuAbiertoId.set(this.menuAbiertoId() === id ? null : id);
  }

  protected menuAbierto(id: number): boolean {
    return this.menuAbiertoId() === id;
  }

  protected async habilitarPais(): Promise<void> {
    const pais = this.paisSeleccionado();
    if (!pais) {
      this.toast.error('Seleccione un país del catálogo mundial.');
      return;
    }

    const confirmado = await confirmarCreacion(
      this.confirmDialog,
      `¿Desea habilitar ${pais.nombre} (${pais.iso}) en el sistema?`,
      'Habilitar país',
    );

    if (!confirmado) return;

    this.saving.set(true);

    this.catalogos
      .createPais({
        codigoIso: pais.iso,
        nombre: pais.nombre,
        activo: true,
      })
      .subscribe({
        next: (response) => {
          this.saving.set(false);
          this.limpiarSeleccion();
          this.cargar();
          this.toast.success(
            response.message ||
              mensajeExitoApi(response, 'País habilitado correctamente'),
          );
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error(mensajeErrorApi(err, 'No fue posible habilitar el país.'));
        },
      });
  }

  protected async cargarUbicaciones(pais: Pais): Promise<void> {
    this.menuAbiertoId.set(null);

    const confirmado = await confirmarAccion(this.confirmDialog, {
      title: 'Cargar ubicaciones',
      message: `¿Desea cargar las divisiones geográficas de "${pais.nombre}"?`,
      confirmLabel: 'Cargar',
      variant: 'primary',
    });

    if (!confirmado) return;

    this.saving.set(true);

    this.catalogos.sincronizarUbicacionesPais(pais.id).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.cargar();
        this.toast.success(response.message);
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(mensajeErrorApi(err, 'No fue posible cargar las ubicaciones.'));
      },
    });
  }

  protected async alternarEstado(pais: Pais): Promise<void> {
    this.menuAbiertoId.set(null);
    const accion = pais.activo ? 'desactivar' : 'activar';

    const confirmado = await confirmarAccion(this.confirmDialog, {
      title: pais.activo ? 'Desactivar país' : 'Activar país',
      message: `¿Desea ${accion} el país "${pais.nombre}"?`,
      confirmLabel: pais.activo ? 'Desactivar' : 'Activar',
      variant: pais.activo ? 'danger' : 'primary',
    });

    if (!confirmado) return;

    this.saving.set(true);

    this.catalogos.updatePais(pais.id, { activo: !pais.activo }).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.cargar();
        this.toast.success(mensajeExitoApi(response, 'País actualizado correctamente'));
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(mensajeErrorApi(err, `No fue posible ${accion} el país.`));
      },
    });
  }

  private cargar(): void {
    this.loading.set(true);

    this.catalogos.getPaisesCatalogo().subscribe({
      next: (response) => {
        this.loading.set(false);
        this.items.set(response.data);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(mensajeErrorApi(err, 'No fue posible cargar los países.'));
      },
    });
  }

  private cargarReferencia(): void {
    this.referenciaLoading.set(true);

    this.catalogos.getPaisesReferencia().subscribe({
      next: (response) => {
        this.referenciaLoading.set(false);
        this.referencia.set(response.data);
      },
      error: (err) => {
        this.referenciaLoading.set(false);
        this.toast.error(mensajeErrorApi(err, 'No fue posible cargar el catálogo mundial.'));
      },
    });
  }
}
