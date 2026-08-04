import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ProcesosService, ProcesoComentario } from '../../../core/services/procesos.service';
import { ProyeccionesService } from '../../../core/services/proyecciones.service';
import { SolicitudesEliminacionService } from '../../../core/services/solicitudes-eliminacion.service';
import { ValidacionService, ValidadorOption } from '../../../core/services/validacion.service';
import { Rol } from '../../../core/models/rol.enum';
import {
  EstadoProceso,
  MotivoPerdidaProceso,
  MOTIVOS_PERDIDA,
  Proceso,
  ProcesoTarea,
  ResultadoIndicador,
  requiereMotivoBackfill,
  requiereMotivoPerdida,
  TipoProceso,
  TRANSICIONES_ESTADO,
} from '../../../core/models/proceso.model';
import { labelTarea } from '../../../core/constants/tarea-labels';
import { mensajeErrorApi } from '../../../core/utils/api-error.util';
import { formatFechaHora } from '../../../core/utils/date.util';
import { FormatosCalificacionService } from '../../../core/services/formatos-calificacion.service';
import { ParametrosService } from '../../../core/services/parametros.service';
import {
  FormatoCalificacionListItem,
  ProcesoCalificacion,
} from '../../../core/models/formato-calificacion.model';
import { IndicadorCodigo } from '../../../core/models/proceso.model';
import { formatCuantiaConMoneda, formatCurrencyFull } from '../../../core/utils/currency.util';
import { formatParametroValor, formatRangoIndicador, parametroValorTitle } from '../../../core/utils/parametro.util';
import { FijarEntidadButtonComponent } from '../../../shared/components/fijar-entidad-button/fijar-entidad-button.component';

type Tab = 'info' | 'fechas' | 'tareas' | 'comentarios';

interface FechasForm {
  fechaApertura: string;
  fechaCierre: string;
  fechaManifestacionInteres: string;
  fechaAdquisicionDerecho: string;
  fechaReunionAclaratoria: string;
  fechaVisitaTecnica: string;
  fechaSolicitudesAclaracion: string;
  fechaRespuestaAclaracion: string;
  fechaLimitacionMypymes: string;
}

interface FechaHistorialItem {
  id: number;
  campo: string | null;
  valorAnterior: string | null;
  valorNuevo: string | null;
  fecha: string;
}

interface DependenciaItem {
  tipo: string;
  id: number;
  descripcion: string;
}

@Component({
  selector: 'app-proceso-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, FijarEntidadButtonComponent],
  templateUrl: './proceso-detail.component.html',
  styleUrl: './proceso-detail.component.scss',
})
export class ProcesoDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly procesos = inject(ProcesosService);
  private readonly proyecciones = inject(ProyeccionesService);
  private readonly validacion = inject(ValidacionService);
  private readonly solicitudes = inject(SolicitudesEliminacionService);
  private readonly auth = inject(AuthService);
  private readonly formatosCalificacion = inject(FormatosCalificacionService);
  private readonly parametrosService = inject(ParametrosService);

  protected readonly proceso = signal<Proceso | null>(null);
  protected readonly tareas = signal<ProcesoTarea[]>([]);
  protected readonly tab = signal<Tab>('info');
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly actionLoading = signal(false);
  protected readonly proyeccionRecienGeneradaId = signal<number | null>(null);
  protected readonly proyeccionAsociadaId = signal<number | null>(null);

  protected readonly showEstadoModal = signal(false);
  protected readonly nuevoEstado = signal<EstadoProceso | null>(null);
  protected readonly motivoPerdida = signal<MotivoPerdidaProceso | null>(null);
  protected readonly motivoPerdidaOtro = signal('');
  protected readonly showMotivoBackfillModal = signal(false);
  protected readonly motivosPerdida = MOTIVOS_PERDIDA;
  protected readonly evidencia = signal('');
  protected readonly archivoEvidencia = signal<File | null>(null);
  protected readonly tareaSeleccionada = signal<ProcesoTarea | null>(null);
  protected readonly editandoTarea = signal(false);

  protected readonly editandoFechas = signal(false);
  protected readonly fechasForm = signal<FechasForm>(this.emptyFechasForm());
  protected readonly fechasError = signal<string | null>(null);
  protected readonly historialFechas = signal<FechaHistorialItem[]>([]);

  protected readonly comentarios = signal<ProcesoComentario[]>([]);
  protected readonly comentarioTexto = signal('');
  protected readonly comentarioLoading = signal(false);
  protected readonly comentarioError = signal<string | null>(null);

  protected readonly calificaciones = signal<ProcesoCalificacion[]>([]);
  protected readonly calificacionesLoading = signal(false);
  protected readonly calificacionEvaluando = signal(false);
  protected readonly calificacionError = signal<string | null>(null);
  protected readonly calificacionExito = signal<string | null>(null);
  protected readonly formatosActivos = signal<FormatoCalificacionListItem[]>([]);
  protected readonly formatoSeleccionadoId = signal<number | null>(null);
  protected readonly anioParametrosCalificacion = signal(new Date().getFullYear() - 1);
  protected readonly anioActual = new Date().getFullYear();
  protected readonly parametrosAbbiVivos = signal<
    Record<number, Partial<Record<IndicadorCodigo, string>>>
  >({});

  protected readonly formatFechaHora = formatFechaHora;
  protected readonly formatCuantia = formatCuantiaConMoneda;
  protected readonly formatCuantiaTitle = (value: string | number | null | undefined) =>
    formatCurrencyFull(value, 2);

  protected resultadoBadgeClass(resultado: string | null): string {
    switch (resultado) {
      case ResultadoIndicador.Aprobado:
        return 'badge--aprobado';
      case ResultadoIndicador.CasiAprobado:
        return 'badge--casi-aprobado';
      case ResultadoIndicador.CasiDesaprobado:
        return 'badge--casi-desaprobado';
      case ResultadoIndicador.NoAprobado:
        return 'badge--no-aprobado';
      default:
        return '';
    }
  }

  protected calificacionBadgeClass(resultado: string): string {
    return resultado === 'Aprobado' ? 'badge--aprobado' : 'badge--no-aprobado';
  }

  protected calificacionVeredicto(cal: ProcesoCalificacion): string {
    if (cal.puntajeTotal >= cal.puntajeMinimo) {
      return `Aprobado (${cal.puntajeTotal} ≥ ${cal.puntajeMinimo})`;
    }
    return `No Aprobado (${cal.puntajeTotal} < ${cal.puntajeMinimo})`;
  }

  protected sumaPuntosDetalle(cal: ProcesoCalificacion): number {
    return cal.detalle.reduce((sum, item) => sum + item.puntosObtenidos, 0);
  }

  protected formatoValorAbbi(indicadorCodigo: string, valor: string | null): string {
    return formatParametroValor(indicadorCodigo as IndicadorCodigo, valor);
  }

  protected formatoValorAbbiTitle(indicadorCodigo: string, valor: string | null): string {
    return parametroValorTitle(indicadorCodigo as IndicadorCodigo, valor);
  }

  protected valorAbbiVivo(
    anioParametros: number,
    indicadorCodigo: string,
    fallback: string | null,
  ): string | null {
    const vivo =
      this.parametrosAbbiVivos()[anioParametros]?.[indicadorCodigo as IndicadorCodigo];
    return vivo ?? fallback;
  }

  protected formatoRangoLabel(
    indicadorCodigo: string,
    min: string | null,
    max: string | null,
  ): string {
    return formatRangoIndicador(indicadorCodigo as IndicadorCodigo, min, max);
  }

  protected evaluarCalificaciones(): void {
    const formatoId = this.formatoSeleccionadoId();
    if (!formatoId) {
      return;
    }

    this.calificacionEvaluando.set(true);
    this.calificacionError.set(null);
    this.calificacionExito.set(null);

    this.formatosCalificacion
      .evaluarProceso(this.procesoId, {
        formatoIds: [formatoId],
        anioParametros: this.anioParametrosCalificacion(),
      })
      .subscribe({
        next: (res) => {
          this.calificaciones.set(res.data);
          this.cargarParametrosAbbiVivos(res.data.map((cal) => cal.anioParametros));
          this.formatoSeleccionadoId.set(null);
          this.calificacionExito.set(res.message);
          this.calificacionEvaluando.set(false);
        },
        error: (err) => {
          this.calificacionError.set(
            mensajeErrorApi(err, 'No fue posible evaluar el proceso.'),
          );
          this.calificacionEvaluando.set(false);
        },
      });
  }

  protected readonly showValidadoresModal = signal(false);
  protected readonly validadores = signal<ValidadorOption[]>([]);
  protected readonly validadoresSeleccionados = signal<number[]>([]);
  protected readonly validadoresError = signal<string | null>(null);

  protected readonly showEliminarModal = signal(false);
  protected readonly dependencias = signal<DependenciaItem[]>([]);
  protected readonly confirmarDependientes = signal(false);
  protected readonly motivoEliminacion = signal('');

  protected readonly rol = computed(() => this.auth.rol());

  protected readonly puedeEscribir = computed(() => this.auth.puedeEscribir());

  protected readonly puedeGestionarTareas = computed(() => {
    if (!this.puedeEscribir()) return false;
    const estado = this.proceso()?.estado;
    return estado === EstadoProceso.EnProceso || estado === EstadoProceso.PorValidar;
  });

  protected readonly mostrarDevolucionValidacion = computed(() => {
    const proceso = this.proceso();
    return Boolean(
      proceso?.devueltoValidacion && proceso.estado === EstadoProceso.EnProceso,
    );
  });

  protected readonly puedeEditarFechas = computed(() => {
    const rol = this.rol();
    return rol === Rol.Administrador || rol === Rol.SupervisorSistema;
  });

  protected readonly puedeEliminarDirecto = computed(() => this.rol() === Rol.Administrador);

  protected readonly puedeSolicitarEliminacion = computed(() => {
    const rol = this.rol();
    return rol === Rol.Operador || rol === Rol.SupervisorSistema;
  });

  protected readonly necesitaMotivoBackfill = computed(() => {
    const p = this.proceso();
    return p ? requiereMotivoBackfill(p) : false;
  });

  protected readonly estadoModalRequiereMotivo = computed(() => {
    const p = this.proceso();
    const estado = this.nuevoEstado();
    if (!p || !estado) return false;
    return requiereMotivoPerdida(p.estado, estado);
  });

  protected readonly puedeConfirmarEstado = computed(() => {
    const estado = this.nuevoEstado();
    if (!estado) return false;
    if (!this.estadoModalRequiereMotivo()) return true;
    const motivo = this.motivoPerdida();
    if (!motivo) return false;
    if (motivo === MotivoPerdidaProceso.Otro) {
      return this.motivoPerdidaOtro().trim().length > 0;
    }
    return true;
  });

  protected readonly tareasAplicables = computed(() =>
    this.tareas().filter((t) => Boolean(t.aplica)),
  );

  protected readonly tareasCompletadas = computed(() =>
    this.tareasAplicables().filter((t) => Boolean(t.completada)),
  );

  protected readonly tareasPendientes = computed(() =>
    this.tareasAplicables().filter((t) => !t.completada),
  );

  /** Preferir cálculo local desde tareas (se actualiza al completar); fallback al valor del API. */
  protected readonly avancePorcentaje = computed(() => {
    const aplicables = this.tareasAplicables();
    if (aplicables.length > 0) {
      return Math.round((1000 * this.tareasCompletadas().length) / aplicables.length) / 10;
    }
    return Number(this.proceso()?.avancePorcentaje ?? 0);
  });

  protected readonly puedeAsignarValidadores = computed(() => {
    if (!this.puedeEscribir()) return false;
    const p = this.proceso();
    if (!p) return false;
    return p.estado === EstadoProceso.EnProceso && this.avancePorcentaje() >= 100;
  });

  protected readonly guiaSiguientePaso = computed(() => {
    if (!this.puedeEscribir()) return null;
    const p = this.proceso();
    if (!p) return null;

    if (p.estado === EstadoProceso.PorValidar) {
      return 'Siguiente paso: use «Cambiar estado» para pasar a En Proceso (o Descartado).';
    }

    if (p.estado === EstadoProceso.EnProceso) {
      if (p.devueltoValidacion && p.estado === EstadoProceso.EnProceso) {
        return 'El validador devolvió este proceso. Revise el comentario, corrija y vuelva a asignar validadores.';
      }
      if (this.avancePorcentaje() < 100) {
        const pendientes = this.tareasPendientes().length;
        const total = this.tareasAplicables().length;
        return pendientes > 0
          ? `Para enviar a validación debe completar el 100% de tareas aplicables (${this.tareasCompletadas().length}/${total}). Pendientes: ${pendientes}.`
          : `Avance actual: ${this.avancePorcentaje()}%. Complete todas las tareas aplicables para habilitar «Asignar validadores».`;
      }
      return 'Tareas al 100%. Use «Asignar validadores» para pasar a En Validación. «Cambiar estado» solo permite Descartar.';
    }

    if (p.estado === EstadoProceso.EnValidacion) {
      return 'Este estado solo cambia con los veredictos de los validadores (no con «Cambiar estado»).';
    }

    if (p.estado === EstadoProceso.Presentado) {
      return 'Puede pasar a Subsanación, Adjudicado o Cerrado con «Cambiar estado». Si es Periódico y pasa a Adjudicado, se genera la proyección.';
    }

    return null;
  });

  protected readonly labelTarea = labelTarea;

  private procesoId = 0;

  ngOnInit(): void {
    this.procesoId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadProceso();
    this.loadTareas();
    this.loadCalificaciones();
    this.loadFormatosActivos();
  }

  protected setTab(tab: Tab): void {
    this.tab.set(tab);

    if (tab === 'info') {
      this.refrescarResultadosParametros();
    }

    if (tab === 'tareas') {
      this.loadTareas();
    }

    if (tab === 'fechas') {
      this.procesos.getFechasHistorial(this.procesoId).subscribe({
        next: (r) => this.historialFechas.set(r.data),
        error: () => this.historialFechas.set([]),
      });
    }

    if (tab === 'comentarios') {
      this.loadComentarios();
    }
  }

  protected guardarComentario(): void {
    const texto = this.comentarioTexto().trim();
    if (!texto || !this.puedeEscribir()) return;

    this.comentarioLoading.set(true);
    this.comentarioError.set(null);
    this.procesos.crearComentario(this.procesoId, texto).subscribe({
      next: (r) => {
        this.comentarios.update((items) => [...items, r.comentario]);
        this.comentarioTexto.set('');
        this.comentarioLoading.set(false);
      },
      error: (err) => {
        this.comentarioError.set(mensajeErrorApi(err, 'No fue posible guardar el comentario.'));
        this.comentarioLoading.set(false);
      },
    });
  }

  private loadComentarios(): void {
    this.procesos.getComentarios(this.procesoId).subscribe({
      next: (r) => this.comentarios.set(r.data),
      error: () => this.comentarios.set([]),
    });
  }

  protected estadosPermitidos(): EstadoProceso[] {
    if (!this.puedeEscribir()) return [];
    const p = this.proceso();
    if (!p) return [];
    return TRANSICIONES_ESTADO[p.estado] ?? [];
  }

  protected soloPuedeDescartar(): boolean {
    const permitidos = this.estadosPermitidos();
    return permitidos.length === 1 && permitidos[0] === EstadoProceso.Descartado;
  }

  protected estadoTareaLabel(tarea: ProcesoTarea): string {
    if (!tarea.aplica) return 'No aplica';
    return tarea.completada ? 'Completada' : 'Pendiente';
  }

  protected abrirCambioEstado(): void {
    const permitidos = this.estadosPermitidos();
    if (permitidos.length === 0) return;
    this.nuevoEstado.set(permitidos[0]);
    this.motivoPerdida.set(null);
    this.motivoPerdidaOtro.set('');
    this.showEstadoModal.set(true);
  }

  protected abrirMotivoBackfill(): void {
    this.motivoPerdida.set(null);
    this.motivoPerdidaOtro.set('');
    this.showMotivoBackfillModal.set(true);
  }

  protected confirmarMotivoBackfill(): void {
    const motivo = this.motivoPerdida();
    if (!motivo) return;
    if (motivo === MotivoPerdidaProceso.Otro && !this.motivoPerdidaOtro().trim()) return;

    this.actionLoading.set(true);
    this.procesos
      .registrarMotivoPerdida(
        this.procesoId,
        motivo,
        motivo === MotivoPerdidaProceso.Otro ? this.motivoPerdidaOtro().trim() : undefined,
      )
      .subscribe({
        next: (r) => {
          this.proceso.set(r.proceso);
          this.showMotivoBackfillModal.set(false);
          this.actionLoading.set(false);
          this.error.set(null);
        },
        error: (err) => {
          this.error.set(mensajeErrorApi(err, 'No fue posible registrar el motivo.'));
          this.actionLoading.set(false);
        },
      });
  }

  protected confirmarCambioEstado(): void {
    const estado = this.nuevoEstado();
    if (!estado || !this.puedeConfirmarEstado()) return;

    const p = this.proceso();
    const motivo = this.estadoModalRequiereMotivo() ? this.motivoPerdida() : null;
    const motivoOtro =
      motivo === MotivoPerdidaProceso.Otro ? this.motivoPerdidaOtro().trim() : undefined;

    this.actionLoading.set(true);
    this.procesos
      .cambiarEstado(
        this.procesoId,
        estado,
        motivo ?? undefined,
        motivoOtro,
      )
      .subscribe({
      next: (r) => {
        this.proceso.set(r.proceso);
        this.showEstadoModal.set(false);
        this.actionLoading.set(false);
        this.error.set(null);
        if (r.proyeccionGenerada?.id) {
          this.proyeccionRecienGeneradaId.set(r.proyeccionGenerada.id);
          this.proyeccionAsociadaId.set(r.proyeccionGenerada.id);
        } else if (
          estado === EstadoProceso.Adjudicado &&
          r.proceso.tipoProceso === TipoProceso.Periodico
        ) {
          this.cargarProyeccionAsociada((id) => this.proyeccionRecienGeneradaId.set(id));
        }
        this.loadProceso();
      },
      error: (err) => {
        this.error.set(mensajeErrorApi(err, 'No fue posible cambiar el estado.'));
        this.actionLoading.set(false);
      },
    });
  }

  private cargarProyeccionAsociada(onFound?: (id: number) => void): void {
    this.proyecciones
      .list({ procesoOrigenId: this.procesoId, limit: 1 })
      .subscribe({
        next: (r) => {
          const id = r.data[0]?.id ?? null;
          this.proyeccionAsociadaId.set(id);
          if (id !== null) {
            onFound?.(id);
          }
        },
        error: () => this.proyeccionAsociadaId.set(null),
      });
  }

  protected iniciarEdicionFechas(): void {
    const p = this.proceso();
    if (!p) return;

    this.fechasForm.set({
      fechaApertura: p.fechaApertura ?? '',
      fechaCierre: p.fechaCierre ?? '',
      fechaManifestacionInteres: p.fechaManifestacionInteres ?? '',
      fechaAdquisicionDerecho: p.fechaAdquisicionDerecho ?? '',
      fechaReunionAclaratoria: p.fechaReunionAclaratoria ?? '',
      fechaVisitaTecnica: p.fechaVisitaTecnica ?? '',
      fechaSolicitudesAclaracion: p.fechaSolicitudesAclaracion ?? '',
      fechaRespuestaAclaracion: p.fechaRespuestaAclaracion ?? '',
      fechaLimitacionMypymes: p.fechaLimitacionMypymes ?? '',
    });
    this.fechasError.set(null);
    this.editandoFechas.set(true);
  }

  protected cancelarEdicionFechas(): void {
    this.fechasError.set(null);
    this.editandoFechas.set(false);
  }

  protected updateFecha(campo: keyof FechasForm, valor: string): void {
    this.fechasForm.update((current) => ({ ...current, [campo]: valor }));
  }

  protected guardarFechas(): void {
    const form = this.fechasForm();
    const payload: Record<string, string | null> = {};

    if (form.fechaApertura) payload['fechaApertura'] = form.fechaApertura;
    if (form.fechaCierre) payload['fechaCierre'] = form.fechaCierre;
    payload['fechaManifestacionInteres'] = form.fechaManifestacionInteres || null;
    payload['fechaAdquisicionDerecho'] = form.fechaAdquisicionDerecho || null;
    payload['fechaReunionAclaratoria'] = form.fechaReunionAclaratoria || null;
    payload['fechaVisitaTecnica'] = form.fechaVisitaTecnica || null;
    payload['fechaSolicitudesAclaracion'] = form.fechaSolicitudesAclaracion || null;
    payload['fechaRespuestaAclaracion'] = form.fechaRespuestaAclaracion || null;
    payload['fechaLimitacionMypymes'] = form.fechaLimitacionMypymes || null;

    const validacionLocal = this.validarFechasFormulario(form);
    if (validacionLocal) {
      this.fechasError.set(validacionLocal);
      return;
    }

    this.fechasError.set(null);
    this.actionLoading.set(true);
    this.procesos.updateFechas(this.procesoId, payload).subscribe({
      next: (r) => {
        this.proceso.set(r.proceso);
        this.editandoFechas.set(false);
        this.actionLoading.set(false);
        this.loadTareas();
      },
      error: (err) => {
        this.fechasError.set(
          mensajeErrorApi(
            err,
            'No fue posible actualizar las fechas. Verifique que sean coherentes y estén dentro del rango de apertura y cierre.',
          ),
        );
        this.actionLoading.set(false);
      },
    });
  }

  protected abrirValidadores(): void {
    this.validadoresSeleccionados.set([]);
    this.validadoresError.set(null);
    this.validacion.listValidadores().subscribe({
      next: (r) => {
        this.validadores.set(r.data);
        this.showValidadoresModal.set(true);
      },
      error: (err) =>
        this.error.set(mensajeErrorApi(err, 'No fue posible cargar los validadores.')),
    });
  }

  protected toggleValidador(id: number, checked: boolean): void {
    this.validadoresError.set(null);
    this.validadoresSeleccionados.update((current) => {
      if (checked) {
        return current.includes(id) ? current : [...current, id];
      }
      return current.filter((item) => item !== id);
    });
  }

  protected isValidadorSeleccionado(id: number): boolean {
    return this.validadoresSeleccionados().includes(id);
  }

  protected confirmarValidadores(): void {
    const ids = this.validadoresSeleccionados();
    if (ids.length === 0) {
      this.validadoresError.set('Seleccione al menos un validador.');
      return;
    }

    this.validadoresError.set(null);
    this.actionLoading.set(true);
    this.validacion.asignarValidadores(this.procesoId, ids).subscribe({
      next: () => {
        this.showValidadoresModal.set(false);
        this.actionLoading.set(false);
        this.loadProceso();
      },
      error: (err) => {
        this.validadoresError.set(
          mensajeErrorApi(err, 'No fue posible asignar validadores.'),
        );
        this.actionLoading.set(false);
      },
    });
  }

  protected abrirEliminar(): void {
    this.confirmarDependientes.set(false);
    this.motivoEliminacion.set('');
    this.dependencias.set([]);

    if (this.puedeEliminarDirecto()) {
      this.procesos.getDependencias(this.procesoId).subscribe({
        next: (r) => {
          this.dependencias.set(r.data.dependientes);
          this.showEliminarModal.set(true);
        },
        error: () => this.error.set('No fue posible consultar dependencias.'),
      });
      return;
    }

    this.showEliminarModal.set(true);
  }

  protected confirmarEliminacion(): void {
    if (this.puedeEliminarDirecto()) {
      this.actionLoading.set(true);
      this.procesos.eliminar(this.procesoId, this.confirmarDependientes()).subscribe({
        next: () => {
          this.actionLoading.set(false);
          void this.router.navigate(['/procesos']);
        },
        error: () => {
          this.error.set('No fue posible eliminar el proceso.');
          this.actionLoading.set(false);
        },
      });
      return;
    }

    const motivo = this.motivoEliminacion().trim();
    if (motivo.length < 5) return;

    this.actionLoading.set(true);
    this.solicitudes.solicitar('proceso', this.procesoId, motivo).subscribe({
      next: () => {
        this.showEliminarModal.set(false);
        this.actionLoading.set(false);
      },
      error: () => {
        this.error.set('No fue posible registrar la solicitud de eliminación.');
        this.actionLoading.set(false);
      },
    });
  }

  protected onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoEvidencia.set(input.files?.[0] ?? null);
  }

  protected abrirModalCompletarTarea(tarea: ProcesoTarea): void {
    this.editandoTarea.set(false);
    this.evidencia.set('');
    this.archivoEvidencia.set(null);
    this.tareaSeleccionada.set(tarea);
  }

  protected abrirModalEditarTarea(tarea: ProcesoTarea): void {
    this.editandoTarea.set(true);
    this.evidencia.set(tarea.evidencia?.trim() ?? '');
    this.archivoEvidencia.set(null);
    this.tareaSeleccionada.set(tarea);
  }

  protected cerrarModalTarea(): void {
    this.tareaSeleccionada.set(null);
    this.editandoTarea.set(false);
    this.evidencia.set('');
    this.archivoEvidencia.set(null);
  }

  protected guardarTarea(tarea: ProcesoTarea): void {
    const evidencia = this.evidencia().trim();
    const archivo = this.archivoEvidencia();
    const conservaEvidenciaExistente =
      this.editandoTarea() &&
      !evidencia &&
      !archivo &&
      Boolean(tarea.evidenciaArchivoNombre || tarea.evidencia?.trim());

    if (!evidencia && !archivo && !conservaEvidenciaExistente) {
      this.error.set('Debe adjuntar un archivo o escribir una evidencia.');
      return;
    }

    this.actionLoading.set(true);
    this.error.set(null);
    this.procesos.completarTarea(this.procesoId, tarea.id, evidencia, archivo).subscribe({
      next: (r) => {
        this.cerrarModalTarea();
        this.actionLoading.set(false);
        this.tareas.update((list) =>
          list.map((item) => (item.id === tarea.id ? { ...item, ...r.tarea } : item)),
        );
        if (r.tarea.avancePorcentaje !== undefined) {
          this.proceso.update((p) =>
            p ? { ...p, avancePorcentaje: r.tarea.avancePorcentaje ?? p.avancePorcentaje } : p,
          );
        }
        this.loadTareas();
        this.loadProceso();
      },
      error: () => {
        this.error.set(
          this.editandoTarea()
            ? 'No fue posible actualizar la tarea.'
            : 'No fue posible completar la tarea.',
        );
        this.actionLoading.set(false);
      },
    });
  }

  protected descargarEvidencia(tarea: ProcesoTarea): void {
    if (!tarea.evidenciaArchivoNombre) return;
    this.procesos.descargarEvidencia(
      this.procesoId,
      tarea.id,
      tarea.evidenciaArchivoNombre,
    );
  }

  private loadCalificaciones(): void {
    this.calificacionesLoading.set(true);
    this.formatosCalificacion.getCalificacionesProceso(this.procesoId).subscribe({
      next: (res) => {
        this.calificaciones.set(res.data);
        this.cargarParametrosAbbiVivos(res.data.map((cal) => cal.anioParametros));
        this.calificacionesLoading.set(false);
      },
      error: () => {
        this.calificaciones.set([]);
        this.calificacionesLoading.set(false);
      },
    });
  }

  private refrescarResultadosParametros(): void {
    this.loadCalificaciones();
    this.procesos.getById(this.procesoId).subscribe({
      next: (r) => this.proceso.set(r.proceso),
    });
  }

  private cargarParametrosAbbiVivos(anios: number[]): void {
    const unicos = [...new Set(anios.filter((anio) => Number.isFinite(anio)))];
    for (const anio of unicos) {
      this.parametrosService.getPorAnio(anio).subscribe({
        next: (res) => {
          const mapa: Partial<Record<IndicadorCodigo, string>> = {};
          for (const item of res.data.indicadores) {
            if (item.valor !== null) {
              mapa[item.indicadorCodigo] = item.valor;
            }
          }
          this.parametrosAbbiVivos.update((actual) => ({ ...actual, [anio]: mapa }));
        },
      });
    }
  }

  private loadFormatosActivos(): void {
    this.formatosCalificacion.list(true).subscribe({
      next: (res) => this.formatosActivos.set(res.data),
      error: () => this.formatosActivos.set([]),
    });
  }

  private loadProceso(): void {
    this.procesos.getById(this.procesoId).subscribe({
      next: (r) => {
        this.proceso.set(r.proceso);
        if (r.proceso.anioParametros) {
          this.anioParametrosCalificacion.set(r.proceso.anioParametros);
        }
        this.loading.set(false);
        if (
          r.proceso.estado === EstadoProceso.Adjudicado &&
          r.proceso.tipoProceso === TipoProceso.Periodico
        ) {
          this.cargarProyeccionAsociada();
        } else {
          this.proyeccionAsociadaId.set(null);
        }
      },
      error: () => {
        this.error.set('No fue posible cargar el proceso.');
        this.loading.set(false);
      },
    });
  }

  private loadTareas(): void {
    this.procesos.getTareas(this.procesoId).subscribe({
      next: (r) => this.tareas.set(r.data),
      error: () => this.tareas.set([]),
    });
  }

  private validarFechasFormulario(form: FechasForm): string | null {
    if (!form.fechaApertura || !form.fechaCierre) {
      return 'Debe registrar la fecha de apertura y la fecha de cierre.';
    }

    if (form.fechaCierre < form.fechaApertura) {
      return `La fecha de cierre (${this.formatFecha(form.fechaCierre)}) no puede ser anterior a la de apertura (${this.formatFecha(form.fechaApertura)}).`;
    }

    const opcionales: Array<[string, string]> = [
      ['Manifestación de interés', form.fechaManifestacionInteres],
      ['Adquisición de derecho', form.fechaAdquisicionDerecho],
      ['Reunión aclaratoria', form.fechaReunionAclaratoria],
      ['Visita técnica', form.fechaVisitaTecnica],
      ['Solicitudes de aclaración', form.fechaSolicitudesAclaracion],
      ['Respuesta a aclaración', form.fechaRespuestaAclaracion],
      ['Limitación MyPymes', form.fechaLimitacionMypymes],
    ];

    for (const [label, valor] of opcionales) {
      if (!valor) continue;

      if (valor < form.fechaApertura || valor > form.fechaCierre) {
        return `La fecha de ${label} (${this.formatFecha(valor)}) debe estar entre la apertura (${this.formatFecha(form.fechaApertura)}) y el cierre (${this.formatFecha(form.fechaCierre)}).`;
      }
    }

    return null;
  }

  private formatFecha(value: string): string {
    const [anio, mes, dia] = value.split('-');
    return `${dia}/${mes}/${anio}`;
  }

  private emptyFechasForm(): FechasForm {
    return {
      fechaApertura: '',
      fechaCierre: '',
      fechaManifestacionInteres: '',
      fechaAdquisicionDerecho: '',
      fechaReunionAclaratoria: '',
      fechaVisitaTecnica: '',
      fechaSolicitudesAclaracion: '',
      fechaRespuestaAclaracion: '',
      fechaLimitacionMypymes: '',
    };
  }
}
