import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormatosEncuestaService } from '../../../../core/services/formatos-encuesta.service';
import {
  FormatoEncuestaDetail,
  FormatoEncuestaListItem,
  FormatoEncuestaSeccion,
  FormatoEncuestaSeccionInput,
} from '../../../../core/models/formato-encuesta.model';
import { mensajeErrorApi, mensajeExitoApi } from '../../../../core/utils/api-error.util';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { confirmarAccion } from '../../../../core/utils/confirm-dialog.util';
import { formatFechaHora } from '../../../../core/utils/date.util';
import { TablePaginationComponent } from '../../../../shared/components/table-pagination/table-pagination.component';

type ModoNuevo = 'importar' | 'clonar' | 'manual';

interface ItemEditable {
  subseccion: string;
  requiereCalificacion: boolean;
}

interface PreguntaEditable {
  texto: string;
  items: ItemEditable[];
}

interface SeccionEditable {
  titulo: string;
  preguntas: PreguntaEditable[];
  abierta: boolean;
}

@Component({
  selector: 'app-formatos-encuesta-list',
  standalone: true,
  imports: [FormsModule, RouterLink, TablePaginationComponent],
  templateUrl: './formatos-encuesta-list.component.html',
  styleUrl: './formatos-encuesta-list.component.scss',
})
export class FormatosEncuestaListComponent implements OnInit {
  private readonly formatosService = inject(FormatosEncuestaService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly formatos = signal<FormatoEncuestaListItem[]>([]);
  protected readonly detalle = signal<FormatoEncuestaDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly uploadLoading = signal(false);
  protected readonly actionLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly feedback = signal<string | null>(null);
  protected readonly menuAbiertoId = signal<number | null>(null);
  protected readonly modoNuevo = signal<ModoNuevo>('importar');
  protected readonly mostrarFormulario = signal(false);
  protected readonly search = signal('');
  protected readonly page = signal(1);
  protected readonly limit = signal(20);
  protected readonly nombre = signal('');
  protected readonly archivo = signal<File | null>(null);
  protected readonly seccionesNuevo = signal<SeccionEditable[]>([]);
  protected readonly usarEstructuraDefault = signal(true);
  protected readonly clonarDesdeId = signal<number | null>(null);
  protected readonly nombreClon = signal('');
  protected readonly seccionesClon = signal<SeccionEditable[]>([]);
  protected readonly editando = signal(false);
  protected readonly nombreEdicion = signal('');
  protected readonly seccionesEdicion = signal<SeccionEditable[]>([]);
  protected readonly formatFechaHora = formatFechaHora;
  protected readonly dragOver = signal(false);

  protected readonly formatosFiltrados = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.formatos();
    return this.formatos().filter((f) => f.nombre.toLowerCase().includes(term));
  });

  protected readonly totalFiltrados = computed(() => this.formatosFiltrados().length);

  protected readonly formatosPaginados = computed(() => {
    const start = (this.page() - 1) * this.limit();
    return this.formatosFiltrados().slice(start, start + this.limit());
  });

  @HostListener('document:click')
  protected cerrarMenus(): void {
    this.menuAbiertoId.set(null);
  }

  ngOnInit(): void {
    this.cargarFormatos();
    this.syncRoute();
    this.route.paramMap.subscribe(() => this.syncRoute());
  }

  protected setModoNuevo(modo: ModoNuevo): void {
    this.modoNuevo.set(modo);
    this.error.set(null);
    this.mostrarFormulario.set(true);
  }

  protected abrirNuevo(modo: ModoNuevo = 'importar'): void {
    void this.router.navigate(['/admin/formatos-encuesta/nuevo'], { queryParams: { tab: modo } });
  }

  protected onSearchChange(): void {
    this.page.set(1);
  }

  protected onPageChange(page: number): void {
    this.page.set(page);
  }

  protected onLimitChange(limit: number): void {
    this.limit.set(limit);
    this.page.set(1);
  }

  protected descargarPlantilla(): void {
    const contenido = [
      'seccion,pregunta,subseccion,requiere_calificacion',
      'Sección I: Evaluación del servicio,¿Cómo calificarías el cumplimiento de ANS?,,si',
      'Sección II: Calidad de la comunicación,¿Cómo calificarías la comunicación con el jefe de proyecto?,Disponibilidad,si',
      'Sección II: Calidad de la comunicación,¿Cómo calificarías la comunicación con el jefe de proyecto?,Capacidad de respuesta,si',
      'Sección II: Calidad de la comunicación,¿Cómo calificarías la comunicación con el jefe de proyecto?,Capacidad de resolución,si',
      'Sección V: Observaciones,¿Qué aspectos positivos destacaría del servicio?,,no',
    ].join('\n');
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla-formato-encuesta.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivo.set(input.files?.[0] ?? null);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.archivo.set(file);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  protected onDragLeave(): void {
    this.dragOver.set(false);
  }

  protected toggleUsarDefault(value: boolean): void {
    this.usarEstructuraDefault.set(value);
    if (!value && !this.seccionesNuevo().length) {
      this.seccionesNuevo.set([this.seccionVacia(true)]);
    }
  }

  protected onClonarOrigenChange(id: number): void {
    this.clonarDesdeId.set(id || null);
    if (!id) {
      this.seccionesClon.set([]);
      return;
    }

    this.formatosService.getById(id).subscribe({
      next: (res) => {
        this.seccionesClon.set(this.fromDetalleSecciones(res.data.secciones));
        if (!this.nombreClon().trim()) {
          this.nombreClon.set(`${res.data.nombre} (copia)`);
        }
      },
      error: () => this.seccionesClon.set([]),
    });
  }

  protected crearManual(): void {
    const nombre = this.nombre().trim();
    if (!nombre) {
      this.error.set('Indique el nombre del formato.');
      return;
    }

    if (this.usarEstructuraDefault()) {
      this.guardarNuevo(() => this.formatosService.create(nombre));
      return;
    }

    const secciones = this.normalizarSecciones(this.seccionesNuevo());
    if (!secciones.length) {
      this.error.set('Agregue al menos una sección con preguntas e ítems.');
      return;
    }
    this.guardarNuevo(() => this.formatosService.create(nombre, secciones));
  }

  protected confirmarClonarNuevo(): void {
    const id = this.clonarDesdeId();
    const nombre = this.nombreClon().trim();
    if (!id || !nombre) {
      this.error.set('Seleccione formato origen y nombre.');
      return;
    }

    const secciones = this.normalizarSecciones(this.seccionesClon());
    if (!secciones.length) {
      this.error.set('El formato origen debe tener al menos una sección.');
      return;
    }
    this.guardarNuevo(() => this.formatosService.clonar(id, nombre, secciones));
  }

  protected subir(): void {
    const file = this.archivo();
    const nombre = this.nombre().trim();
    if (!nombre || !file) {
      this.error.set('Complete nombre y archivo.');
      return;
    }

    void confirmarAccion(this.confirmDialog, {
      title: 'Confirmar importación',
      message: `¿Desea importar el formato «${nombre}»?`,
      confirmLabel: 'Importar',
    }).then((ok) => {
      if (!ok) return;

      this.uploadLoading.set(true);
      this.error.set(null);
      this.formatosService.importFormato(nombre, file).subscribe({
        next: (res) => {
          this.toast.success(mensajeExitoApi(res, res.message));
          this.resetFormulario();
          this.uploadLoading.set(false);
          this.cargarFormatos();
          void this.router.navigate(['/admin/formatos-encuesta', res.data.id, 'editar']);
        },
        error: (err) => {
          this.error.set(mensajeErrorApi(err, 'No fue posible importar el formato.'));
          this.uploadLoading.set(false);
        },
      });
    });
  }

  protected verDetalle(id: number): void {
    void this.router.navigate(['/admin/formatos-encuesta', id, 'editar']);
  }

  protected cerrarDetalle(): void {
    this.detalle.set(null);
    this.editando.set(false);
    void this.router.navigate(['/admin/formatos-encuesta']);
  }

  protected iniciarEdicion(): void {
    const d = this.detalle();
    if (!d || d.enUso) return;
    this.nombreEdicion.set(d.nombre);
    this.seccionesEdicion.set(this.fromDetalleSecciones(d.secciones));
    this.editando.set(true);
  }

  protected cancelarEdicion(): void {
    this.editando.set(false);
  }

  protected guardarEdicion(): void {
    const d = this.detalle();
    if (!d || d.enUso) return;

    const nombre = this.nombreEdicion().trim();
    const secciones = this.normalizarSecciones(this.seccionesEdicion());
    if (!nombre || !secciones.length) {
      this.toast.error('Nombre y al menos una sección son obligatorios.');
      return;
    }

    void confirmarAccion(this.confirmDialog, {
      title: 'Guardar formato',
      message: `¿Desea guardar los cambios del formato «${nombre}»?`,
      confirmLabel: 'Guardar formato',
    }).then((ok) => {
      if (!ok) return;
      this.actionLoading.set(true);

      const nombreCambio = nombre !== d.nombre;
      const finalizar = () => {
        this.actionLoading.set(false);
        this.editando.set(false);
        this.cargarFormatos();
        this.cargarDetalle(d.id);
      };

      const guardarEstructura = () => {
        this.formatosService.updateEstructura(d.id, secciones).subscribe({
          next: (res) => {
            this.toast.success(mensajeExitoApi(res, res.message));
            finalizar();
          },
          error: (err) => {
            this.toast.error(mensajeErrorApi(err, 'No fue posible actualizar la estructura.'));
            this.actionLoading.set(false);
          },
        });
      };

      if (nombreCambio) {
        this.formatosService.update(d.id, { nombre }).subscribe({
          next: (res) => {
            this.toast.success(mensajeExitoApi(res, res.message));
            guardarEstructura();
          },
          error: (err) => {
            this.toast.error(mensajeErrorApi(err, 'No fue posible actualizar el nombre.'));
            this.actionLoading.set(false);
          },
        });
        return;
      }
      guardarEstructura();
    });
  }

  protected toggleActivo(formato: FormatoEncuestaListItem): void {
    this.menuAbiertoId.set(null);
    const activar = !formato.activo;
    void confirmarAccion(this.confirmDialog, {
      title: activar ? 'Confirmar activación' : 'Confirmar desactivación',
      message: activar
        ? `¿Desea activar el formato «${formato.nombre}»?`
        : `¿Desea desactivar el formato «${formato.nombre}»?`,
      confirmLabel: activar ? 'Activar' : 'Desactivar',
      variant: activar ? 'primary' : 'danger',
    }).then((ok) => {
      if (!ok) return;
      this.actionLoading.set(true);
      this.formatosService.update(formato.id, { activo: activar }).subscribe({
        next: (res) => {
          this.toast.success(mensajeExitoApi(res, res.message));
          this.actionLoading.set(false);
          this.cargarFormatos();
          if (this.detalle()?.id === formato.id) this.cargarDetalle(formato.id);
        },
        error: (err) => {
          this.toast.error(mensajeErrorApi(err, 'No fue posible actualizar el formato.'));
          this.actionLoading.set(false);
        },
      });
    });
  }

  protected abrirClonarDesdeLista(formato: FormatoEncuestaListItem): void {
    this.menuAbiertoId.set(null);
    this.modoNuevo.set('clonar');
    this.mostrarFormulario.set(true);
    this.clonarDesdeId.set(formato.id);
    this.nombreClon.set(`${formato.nombre} (copia)`);
    this.onClonarOrigenChange(formato.id);
    void this.router.navigate(['/admin/formatos-encuesta/nuevo'], { queryParams: { tab: 'clonar' } });
  }

  protected toggleMenu(formatoId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.menuAbiertoId.set(this.menuAbiertoId() === formatoId ? null : formatoId);
  }

  protected menuAbierto(formatoId: number): boolean {
    return this.menuAbiertoId() === formatoId;
  }

  protected toggleSeccion(target: 'nuevo' | 'clon' | 'edicion', index: number): void {
    const signalRef = this.seccionesSignal(target);
    signalRef.update((items) =>
      items.map((item, i) => (i === index ? { ...item, abierta: !item.abierta } : item)),
    );
  }

  protected agregarSeccion(target: 'nuevo' | 'clon' | 'edicion'): void {
    this.seccionesSignal(target).update((items) => [...items, this.seccionVacia(true)]);
  }

  protected eliminarSeccion(target: 'nuevo' | 'clon' | 'edicion', index: number): void {
    this.seccionesSignal(target).update((items) =>
      items.length <= 1 ? items : items.filter((_, i) => i !== index),
    );
  }

  protected actualizarTituloSeccion(
    target: 'nuevo' | 'clon' | 'edicion',
    index: number,
    titulo: string,
  ): void {
    this.seccionesSignal(target).update((items) =>
      items.map((item, i) => (i === index ? { ...item, titulo } : item)),
    );
  }

  protected agregarPregunta(target: 'nuevo' | 'clon' | 'edicion', seccionIndex: number): void {
    this.seccionesSignal(target).update((items) =>
      items.map((seccion, i) =>
        i === seccionIndex
          ? { ...seccion, preguntas: [...seccion.preguntas, this.preguntaVacia()] }
          : seccion,
      ),
    );
  }

  protected eliminarPregunta(
    target: 'nuevo' | 'clon' | 'edicion',
    seccionIndex: number,
    preguntaIndex: number,
  ): void {
    this.seccionesSignal(target).update((items) =>
      items.map((seccion, i) => {
        if (i !== seccionIndex) return seccion;
        if (seccion.preguntas.length <= 1) return seccion;
        return {
          ...seccion,
          preguntas: seccion.preguntas.filter((_, pi) => pi !== preguntaIndex),
        };
      }),
    );
  }

  protected actualizarTextoPregunta(
    target: 'nuevo' | 'clon' | 'edicion',
    seccionIndex: number,
    preguntaIndex: number,
    texto: string,
  ): void {
    this.seccionesSignal(target).update((items) =>
      items.map((seccion, i) => {
        if (i !== seccionIndex) return seccion;
        return {
          ...seccion,
          preguntas: seccion.preguntas.map((pregunta, pi) =>
            pi === preguntaIndex ? { ...pregunta, texto } : pregunta,
          ),
        };
      }),
    );
  }

  protected agregarItem(
    target: 'nuevo' | 'clon' | 'edicion',
    seccionIndex: number,
    preguntaIndex: number,
  ): void {
    this.seccionesSignal(target).update((items) =>
      items.map((seccion, i) => {
        if (i !== seccionIndex) return seccion;
        return {
          ...seccion,
          preguntas: seccion.preguntas.map((pregunta, pi) =>
            pi === preguntaIndex
              ? {
                  ...pregunta,
                  items: [...pregunta.items, this.itemVacio()],
                }
              : pregunta,
          ),
        };
      }),
    );
  }

  protected eliminarItem(
    target: 'nuevo' | 'clon' | 'edicion',
    seccionIndex: number,
    preguntaIndex: number,
    itemIndex: number,
  ): void {
    this.seccionesSignal(target).update((items) =>
      items.map((seccion, i) => {
        if (i !== seccionIndex) return seccion;
        return {
          ...seccion,
          preguntas: seccion.preguntas.map((pregunta, pi) => {
            if (pi !== preguntaIndex) return pregunta;
            if (pregunta.items.length <= 1) return pregunta;
            return {
              ...pregunta,
              items: pregunta.items.filter((_, ii) => ii !== itemIndex),
            };
          }),
        };
      }),
    );
  }

  protected actualizarItemSubseccion(
    target: 'nuevo' | 'clon' | 'edicion',
    seccionIndex: number,
    preguntaIndex: number,
    itemIndex: number,
    subseccion: string,
  ): void {
    this.patchItem(target, seccionIndex, preguntaIndex, itemIndex, { subseccion });
  }

  protected actualizarItemRequiere(
    target: 'nuevo' | 'clon' | 'edicion',
    seccionIndex: number,
    preguntaIndex: number,
    itemIndex: number,
    requiereCalificacion: boolean,
  ): void {
    this.patchItem(target, seccionIndex, preguntaIndex, itemIndex, { requiereCalificacion });
  }

  protected contarItemsDetalle(d: FormatoEncuestaDetail): number {
    return (d.secciones ?? []).reduce(
      (acc, seccion) =>
        acc +
        seccion.preguntas.reduce((pAcc, pregunta) => pAcc + (pregunta.items?.length ?? 0), 0),
      0,
    );
  }

  private patchItem(
    target: 'nuevo' | 'clon' | 'edicion',
    seccionIndex: number,
    preguntaIndex: number,
    itemIndex: number,
    patch: Partial<ItemEditable>,
  ): void {
    this.seccionesSignal(target).update((items) =>
      items.map((seccion, i) => {
        if (i !== seccionIndex) return seccion;
        return {
          ...seccion,
          preguntas: seccion.preguntas.map((pregunta, pi) => {
            if (pi !== preguntaIndex) return pregunta;
            return {
              ...pregunta,
              items: pregunta.items.map((item, ii) =>
                ii === itemIndex ? { ...item, ...patch } : item,
              ),
            };
          }),
        };
      }),
    );
  }

  private seccionesSignal(target: 'nuevo' | 'clon' | 'edicion') {
    if (target === 'nuevo') return this.seccionesNuevo;
    if (target === 'clon') return this.seccionesClon;
    return this.seccionesEdicion;
  }

  private seccionVacia(abierta = true): SeccionEditable {
    return {
      titulo: '',
      abierta,
      preguntas: [this.preguntaVacia()],
    };
  }

  private preguntaVacia(): PreguntaEditable {
    return {
      texto: '',
      items: [this.itemVacio()],
    };
  }

  private itemVacio(): ItemEditable {
    return { subseccion: '', requiereCalificacion: true };
  }

  private fromDetalleSecciones(secciones: FormatoEncuestaSeccion[]): SeccionEditable[] {
    if (!secciones?.length) return [this.seccionVacia(true)];
    return secciones.map((seccion, index) => ({
      titulo: seccion.titulo,
      abierta: index === 0,
      preguntas: seccion.preguntas.map((pregunta) => ({
        texto: pregunta.texto,
        items: (pregunta.items?.length ? pregunta.items : [{ orden: 1, subseccion: null, requiereCalificacion: true }]).map(
          (item) => ({
            subseccion: item.subseccion ?? '',
            requiereCalificacion: item.requiereCalificacion,
          }),
        ),
      })),
    }));
  }

  private normalizarSecciones(items: SeccionEditable[]): FormatoEncuestaSeccionInput[] {
    return items
      .map((seccion, seccionIndex) => {
        const titulo = seccion.titulo.trim();
        const preguntas = seccion.preguntas
          .map((pregunta, preguntaIndex) => {
            const texto = pregunta.texto.trim();
            const itemsNorm = pregunta.items.map((item, itemIndex) => ({
              orden: itemIndex + 1,
              subseccion: item.subseccion.trim() || null,
              requiereCalificacion: item.requiereCalificacion,
            }));
            if (!texto || !itemsNorm.length) return null;
            return {
              orden: preguntaIndex + 1,
              texto,
              items: itemsNorm,
            };
          })
          .filter((p): p is NonNullable<typeof p> => p !== null);

        if (!titulo || !preguntas.length) return null;
        return {
          orden: seccionIndex + 1,
          titulo,
          preguntas,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);
  }

  private guardarNuevo(factory: () => ReturnType<FormatosEncuestaService['create']>): void {
    void confirmarAccion(this.confirmDialog, {
      title: 'Guardar formato',
      message: '¿Desea guardar el nuevo formato de encuesta?',
      confirmLabel: 'Guardar formato',
    }).then((ok) => {
      if (!ok) return;
      this.actionLoading.set(true);
      this.error.set(null);
      factory().subscribe({
        next: (res) => {
          this.toast.success(mensajeExitoApi(res, res.message));
          this.actionLoading.set(false);
          this.resetFormulario();
          this.cargarFormatos();
          void this.router.navigate(['/admin/formatos-encuesta', res.data.id, 'editar']);
        },
        error: (err) => {
          this.error.set(mensajeErrorApi(err, 'No fue posible guardar el formato.'));
          this.actionLoading.set(false);
        },
      });
    });
  }

  private resetFormulario(): void {
    this.nombre.set('');
    this.archivo.set(null);
    this.seccionesNuevo.set([]);
    this.usarEstructuraDefault.set(true);
    this.clonarDesdeId.set(null);
    this.nombreClon.set('');
    this.seccionesClon.set([]);
    this.mostrarFormulario.set(false);
  }

  private syncRoute(): void {
    const modo = this.route.snapshot.data['modoFormato'] as string | undefined;
    const idParam = this.route.snapshot.paramMap.get('id');
    const tab = this.route.snapshot.queryParamMap.get('tab') as ModoNuevo | null;

    if (modo === 'nuevo') {
      this.mostrarFormulario.set(true);
      if (tab === 'manual' || tab === 'clonar' || tab === 'importar') {
        this.modoNuevo.set(tab);
      }
      this.detalle.set(null);
      this.editando.set(false);
      return;
    }

    if (modo === 'editar' && idParam) {
      this.mostrarFormulario.set(false);
      this.cargarDetalle(Number(idParam));
      return;
    }

    this.mostrarFormulario.set(false);
    this.detalle.set(null);
    this.editando.set(false);
  }

  private cargarDetalle(id: number): void {
    this.formatosService.getById(id).subscribe({
      next: (res) => {
        this.detalle.set(res.data);
        this.editando.set(false);
        this.nombreEdicion.set(res.data.nombre);
        this.seccionesEdicion.set(this.fromDetalleSecciones(res.data.secciones));
      },
      error: () => this.detalle.set(null),
    });
  }

  private cargarFormatos(): void {
    this.loading.set(true);
    this.formatosService.list(false).subscribe({
      next: (res) => {
        this.formatos.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(mensajeErrorApi(err, 'No fue posible cargar los formatos.'));
        this.loading.set(false);
      },
    });
  }
}
