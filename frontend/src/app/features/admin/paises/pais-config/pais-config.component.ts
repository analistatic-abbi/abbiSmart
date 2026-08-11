import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogosService } from '../../../../core/services/catalogos.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Pais } from '../../../../core/models/pais.model';
import {
  CatalogoPaisItem,
  CatalogoPaisTipo,
  ConfiguracionPaisItem,
  PlantillaTareaPais,
} from '../../../../core/models/pais-config.model';
import { mensajeErrorApi, mensajeExitoApi } from '../../../../core/utils/api-error.util';
import { countryFlagUrl } from '../../../../core/utils/country.util';

type ConfigTab = 'general' | 'tareas' | 'reglas' | 'catalogos';

@Component({
  selector: 'app-pais-config',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './pais-config.component.html',
  styleUrl: './pais-config.component.scss',
})
export class PaisConfigComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogosApi = inject(CatalogosService);
  private readonly toast = inject(ToastService);

  protected readonly paisId = signal(0);
  protected readonly pais = signal<Pais | null>(null);
  protected readonly configuracion = signal<ConfiguracionPaisItem[]>([]);
  protected readonly plantilla = signal<PlantillaTareaPais[]>([]);
  protected readonly catalogoItems = signal<CatalogoPaisItem[]>([]);
  protected readonly catalogoTipoFiltro = signal<CatalogoPaisTipo | 'todos'>('todos');
  protected readonly paisesDisponibles = signal<Array<{ id: number; nombre: string }>>([]);
  protected readonly clonarOrigenId = signal<number | null>(null);
  protected readonly tab = signal<ConfigTab>('general');
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);

  protected nuevaTareaNombre = '';
  protected nuevaTareaOrden: number | null = null;
  protected nuevaTareaAplicaRfi = false;
  protected nuevaTareaRequiereFecha = false;

  protected nuevoCatalogoTipo: CatalogoPaisTipo = 'segmento_proceso';
  protected nuevoCatalogoEtiqueta = '';
  protected nuevoCatalogoOrden: number | null = null;

  protected readonly catalogoTiposCreables: CatalogoPaisTipo[] = [
    'segmento_proceso',
    'segmento_cliente',
    'indicador',
  ];

  protected readonly catalogoTipoLabels: Record<CatalogoPaisTipo, string> = {
    segmento_proceso: 'Segmentos de proceso',
    segmento_cliente: 'Segmentos de cliente',
    indicador: 'Indicadores',
    portal_origen: 'Portales de origen',
    etiqueta_geo_nivel1: 'Etiqueta geográfica nivel 1',
    etiqueta_geo_nivel2: 'Etiqueta geográfica nivel 2',
  };

  protected readonly margenCasi = computed(() => {
    const item = this.configuracion().find((row) => row.clave === 'indicador_margen_casi_pct');
    return item?.valor ?? '5';
  });

  protected readonly calificacionPorPuntos = computed(() => {
    const item = this.configuracion().find(
      (row) => row.clave === 'calificacion_por_puntos_habilitada',
    );
    return item?.valor === 'true' || item?.valor === '1';
  });

  protected readonly catalogosFiltrados = computed(() => {
    const tipo = this.catalogoTipoFiltro();
    const items = this.catalogoItems();
    if (tipo === 'todos') return items;
    return items.filter((item) => item.tipo === tipo);
  });

  protected readonly siguienteOrdenTarea = computed(() => {
    const items = this.plantilla();
    if (!items.length) return 1;
    return Math.max(...items.map((item) => item.orden)) + 1;
  });

  protected readonly siguienteOrdenCatalogo = computed(() => {
    const tipo = this.nuevoCatalogoTipo;
    const items = this.catalogoItems().filter((item) => item.tipo === tipo);
    if (!items.length) return 1;
    return Math.max(...items.map((item) => item.orden)) + 1;
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isFinite(id)) {
      this.toast.error('País no válido.');
      return;
    }

    this.paisId.set(id);
    this.cargar();
    this.cargarCatalogos();
    this.catalogosApi.getPaisesCatalogo().subscribe({
      next: (response) =>
        this.paisesDisponibles.set(
          response.data
            .filter((p) => p.id !== this.paisId())
            .map((p) => ({ id: p.id, nombre: p.nombre })),
        ),
    });
  }

  protected flagUrl(pais: Pais): string {
    return countryFlagUrl(pais.nombre, pais.id, pais.codigoIso);
  }

  protected setTab(tab: ConfigTab): void {
    this.tab.set(tab);
  }

  protected async guardarMargen(valor: string): Promise<void> {
    const parsed = Number(valor);

    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      this.toast.error('El margen debe ser un número entre 0 y 100.');
      return;
    }

    this.saving.set(true);

    this.catalogosApi
      .updateConfiguracionPais(this.paisId(), 'indicador_margen_casi_pct', String(parsed))
      .subscribe({
        next: (response) => {
          this.saving.set(false);
          this.actualizarConfigLocal(response.item);
          this.toast.success(mensajeExitoApi(response, 'Margen actualizado'));
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error(mensajeErrorApi(err, 'No fue posible actualizar el margen.'));
        },
      });
  }

  protected alternarCalificacionPorPuntos(): void {
    const nuevoValor = this.calificacionPorPuntos() ? 'false' : 'true';

    this.saving.set(true);

    this.catalogosApi
      .updateConfiguracionPais(
        this.paisId(),
        'calificacion_por_puntos_habilitada',
        nuevoValor,
      )
      .subscribe({
        next: (response) => {
          this.saving.set(false);
          this.actualizarConfigLocal(response.item);
          this.toast.success(mensajeExitoApi(response, 'Configuración actualizada'));
          this.cargarPais();
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error(mensajeErrorApi(err, 'No fue posible actualizar la configuración.'));
        },
      });
  }

  protected etiquetaTipoCatalogo(tipo: CatalogoPaisTipo): string {
    return this.catalogoTipoLabels[tipo] ?? tipo;
  }

  protected agregarTarea(): void {
    const nombre = this.nuevaTareaNombre.trim();

    if (!nombre) {
      this.toast.error('Escriba el nombre de la tarea.');
      return;
    }

    this.saving.set(true);

    this.catalogosApi
      .createPlantillaTareaPais(this.paisId(), {
        nombre,
        orden: this.nuevaTareaOrden ?? undefined,
        aplicaRfi: this.nuevaTareaAplicaRfi,
        requiereFechaAdquisicion: this.nuevaTareaRequiereFecha,
      })
      .subscribe({
        next: (response) => {
          this.saving.set(false);
          this.plantilla.update((items) =>
            [...items, response.item].sort((a, b) => a.orden - b.orden),
          );
          this.nuevaTareaNombre = '';
          this.nuevaTareaOrden = null;
          this.nuevaTareaAplicaRfi = false;
          this.nuevaTareaRequiereFecha = false;
          this.toast.success(mensajeExitoApi(response, 'Tarea agregada'));
          this.cargarPais();
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error(mensajeErrorApi(err, 'No fue posible agregar la tarea.'));
        },
      });
  }

  protected guardarNombreTarea(tarea: PlantillaTareaPais, value: string): void {
    const nombre = value.trim();

    if (!nombre) {
      this.toast.error('El nombre de la tarea no puede quedar vacío.');
      return;
    }

    if (nombre === tarea.nombre) {
      return;
    }

    this.guardarTarea(tarea, { nombre });
  }

  protected guardarOrdenTarea(tarea: PlantillaTareaPais, value: string): void {
    const orden = Number(value);

    if (!Number.isFinite(orden) || orden < 1) {
      return;
    }

    if (orden === tarea.orden) {
      return;
    }

    this.guardarTarea(tarea, { orden });
  }

  protected guardarTarea(
    tarea: PlantillaTareaPais,
    patch: Partial<
      Pick<PlantillaTareaPais, 'nombre' | 'orden' | 'aplicaRfi' | 'requiereFechaAdquisicion'>
    >,
  ): void {
    const payload: Partial<
      Pick<PlantillaTareaPais, 'nombre' | 'orden' | 'aplicaRfi' | 'requiereFechaAdquisicion'>
    > = {};

    if (patch.nombre !== undefined) {
      const nombre = patch.nombre.trim();
      if (!nombre) {
        this.toast.error('El nombre de la tarea no puede quedar vacío.');
        return;
      }
      if (nombre !== tarea.nombre) {
        payload.nombre = nombre;
      }
    }

    if (patch.orden !== undefined && patch.orden !== tarea.orden) {
      payload.orden = patch.orden;
    }

    if (patch.aplicaRfi !== undefined && patch.aplicaRfi !== tarea.aplicaRfi) {
      payload.aplicaRfi = patch.aplicaRfi;
    }

    if (
      patch.requiereFechaAdquisicion !== undefined &&
      patch.requiereFechaAdquisicion !== tarea.requiereFechaAdquisicion
    ) {
      payload.requiereFechaAdquisicion = patch.requiereFechaAdquisicion;
    }

    if (Object.keys(payload).length === 0) {
      return;
    }

    this.catalogosApi.updatePlantillaTareaPais(this.paisId(), tarea.id, payload).subscribe({
      next: (response) => {
        this.plantilla.update((items) =>
          items
            .map((item) =>
              item.id === response.item.id
                ? { ...item, ...response.item, nombre: response.item.nombre || item.nombre }
                : item,
            )
            .sort((a, b) => a.orden - b.orden),
        );
        this.toast.success('Tarea actualizada');
      },
      error: (err) => {
        this.toast.error(mensajeErrorApi(err, 'No fue posible actualizar la tarea.'));
      },
    });
  }

  protected alternarTareaActiva(tarea: PlantillaTareaPais): void {
    this.catalogosApi
      .updatePlantillaTareaPais(this.paisId(), tarea.id, { activo: !tarea.activo })
      .subscribe({
        next: (response) => {
          this.plantilla.update((items) =>
            items.map((item) =>
              item.id === response.item.id
                ? { ...item, ...response.item, nombre: response.item.nombre || item.nombre }
                : item,
            ),
          );
          this.toast.success('Tarea actualizada');
        },
        error: (err) => {
          this.toast.error(mensajeErrorApi(err, 'No fue posible actualizar la tarea.'));
        },
      });
  }

  protected agregarCatalogo(): void {
    const etiqueta = this.nuevoCatalogoEtiqueta.trim();

    if (!etiqueta) {
      this.toast.error('Escriba el nombre del ítem.');
      return;
    }

    this.saving.set(true);

    this.catalogosApi
      .createCatalogoPais(this.paisId(), {
        tipo: this.nuevoCatalogoTipo,
        etiqueta,
        orden: this.nuevoCatalogoOrden ?? undefined,
      })
      .subscribe({
        next: (response) => {
          this.saving.set(false);
          this.catalogoItems.update((items) =>
            [...items, response.item].sort((a, b) => {
              if (a.tipo !== b.tipo) return a.tipo.localeCompare(b.tipo);
              return a.orden - b.orden;
            }),
          );
          this.nuevoCatalogoEtiqueta = '';
          this.nuevoCatalogoOrden = null;
          this.toast.success(mensajeExitoApi(response, 'Ítem agregado al catálogo'));
          this.cargarPais();
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error(mensajeErrorApi(err, 'No fue posible agregar el ítem.'));
        },
      });
  }

  protected async resyncOnboarding(): Promise<void> {
    this.saving.set(true);
    this.catalogosApi.resyncOnboardingPais(this.paisId()).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.cargar();
        this.cargarCatalogos();
        this.toast.success(response.message);
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(mensajeErrorApi(err, 'No fue posible re-sincronizar.'));
      },
    });
  }

  protected clonarConfiguracion(): void {
    const origenId = this.clonarOrigenId();
    if (!origenId) {
      this.toast.error('Seleccione un país origen.');
      return;
    }

    this.saving.set(true);
    this.catalogosApi.clonarConfiguracionPais(this.paisId(), origenId).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.cargar();
        this.cargarCatalogos();
        this.toast.success(response.message);
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(mensajeErrorApi(err, 'No fue posible clonar la configuración.'));
      },
    });
  }

  protected alternarCatalogoActivo(item: CatalogoPaisItem): void {
    this.catalogosApi
      .updateCatalogoPais(this.paisId(), item.id, { activo: !item.activo })
      .subscribe({
        next: (response) => {
          this.catalogoItems.update((rows) =>
            rows.map((row) => (row.id === response.item.id ? response.item : row)),
          );
          this.toast.success('Catálogo actualizado');
        },
        error: (err) => {
          this.toast.error(mensajeErrorApi(err, 'No fue posible actualizar el catálogo.'));
        },
      });
  }

  private cargarCatalogos(): void {
    this.catalogosApi.getCatalogoPais(this.paisId()).subscribe({
      next: (response) => this.catalogoItems.set(response.data),
      error: () => this.catalogoItems.set([]),
    });
  }

  private cargar(): void {
    this.loading.set(true);

    this.catalogosApi.getPaisesCatalogo().subscribe({
      next: (response) => {
        const pais = response.data.find((item) => item.id === this.paisId()) ?? null;
        this.pais.set(pais);
      },
      error: () => this.pais.set(null),
    });

    this.catalogosApi.getConfiguracionPais(this.paisId()).subscribe({
      next: (response) => this.configuracion.set(response.data),
      error: (err) => {
        this.configuracion.set([]);
        this.toast.error(mensajeErrorApi(err, 'No fue posible cargar la configuración.'));
      },
    });

    this.catalogosApi.getPlantillaTareasPais(this.paisId()).subscribe({
      next: (response) => {
        this.plantilla.set(response.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.plantilla.set([]);
        this.loading.set(false);
        this.toast.error(mensajeErrorApi(err, 'No fue posible cargar la plantilla de tareas.'));
      },
    });
  }

  private cargarPais(): void {
    this.catalogosApi.getPaisesCatalogo().subscribe({
      next: (response) => {
        const pais = response.data.find((item) => item.id === this.paisId()) ?? null;
        this.pais.set(pais);
      },
    });
  }

  private actualizarConfigLocal(item: ConfiguracionPaisItem): void {
    this.configuracion.update((rows) => {
      const index = rows.findIndex((row) => row.clave === item.clave);

      if (index === -1) {
        return [...rows, item];
      }

      const next = [...rows];
      next[index] = item;
      return next;
    });
  }
}
