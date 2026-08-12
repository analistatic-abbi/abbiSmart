import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CatalogosService } from '../../../core/services/catalogos.service';
import { ContactosService } from '../../../core/services/contactos.service';
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
  ProcesoContacto,
  ProcesoTarea,
  ResultadoIndicador,
  requiereMotivoBackfill,
  requiereMotivoPerdida,
  TipoProceso,
  TRANSICIONES_ESTADO,
} from '../../../core/models/proceso.model';
import { AuditLog } from '../../../core/models/admin.model';
import { Contacto } from '../../../core/models/crm.model';
import { labelTarea } from '../../../core/constants/tarea-labels';
import { mensajeErrorApi, mensajeExitoApi } from '../../../core/utils/api-error.util';
import { formatFechaHora } from '../../../core/utils/date.util';
import { claseBadgeEstadoProceso } from '../../../core/utils/proceso-ui.util';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { confirmarGuardado } from '../../../core/utils/confirm-dialog.util';
import { FormatosCalificacionService } from '../../../core/services/formatos-calificacion.service';
import { KamService } from '../../../core/services/kam.service';
import { ParametrosService } from '../../../core/services/parametros.service';
import {
  FormatoCalificacionListItem,
  ProcesoCalificacion,
} from '../../../core/models/formato-calificacion.model';
import { IndicadorCodigo } from '../../../core/models/proceso.model';
import { formatCuantiaConMoneda, formatCurrencyFull } from '../../../core/utils/currency.util';
import { formatParametroValor, formatRangoIndicador, parametroValorTitle } from '../../../core/utils/parametro.util';
import { FijarEntidadButtonComponent } from '../../../shared/components/fijar-entidad-button/fijar-entidad-button.component';
import { AuditHistorialListComponent } from '../../../shared/components/audit-historial-list/audit-historial-list.component';

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

interface DependenciaItem {
  tipo: string;
  id: number;
  descripcion: string;
}

@Component({
  selector: 'app-proceso-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, FijarEntidadButtonComponent, AuditHistorialListComponent],
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
  private readonly catalogos = inject(CatalogosService);
  private readonly contactos = inject(ContactosService);
  private readonly formatosCalificacion = inject(FormatosCalificacionService);
  private readonly kamService = inject(KamService);
  private readonly parametrosService = inject(ParametrosService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly proceso = signal<Proceso | null>(null);
  protected readonly tareas = signal<ProcesoTarea[]>([]);
  protected readonly tab = signal<Tab>('info');
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly actionLoading = signal(false);
  protected readonly proyeccionRecienGeneradaId = signal<number | null>(null);
  protected readonly proyeccionAsociadaId = signal<number | null>(null);
  protected readonly kamAsociadoId = signal<number | null>(null);

  protected readonly contactosEditando = signal(false);
  protected readonly contactosDisponibles = signal<Contacto[]>([]);
  protected readonly contactosSeleccionados = signal<number[]>([]);
  protected readonly contactosLoading = signal(false);
  protected readonly contactosGuardando = signal(false);
  protected readonly contactosError = signal<string | null>(null);

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
  protected readonly tareaError = signal<string | null>(null);

  protected readonly editandoFechas = signal(false);
  protected readonly fechasForm = signal<FechasForm>(this.emptyFechasForm());
  protected readonly fechasError = signal<string | null>(null);
  protected readonly historialFechas = signal<AuditLog[]>([]);
  protected readonly historialFechasLoading = signal(false);
  protected readonly historialFechasError = signal<string | null>(null);

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
  protected readonly calificacionPorPuntosHabilitada = signal(false);
  protected readonly formatoSeleccionadoId = signal<number | null>(null);
  protected readonly anioParametrosCalificacion = signal(new Date().getFullYear() - 1);
  protected readonly anioActual = new Date().getFullYear();
  protected readonly parametrosAbbiVivos = signal<
    Record<number, Record<string, string>>
  >({});

  protected readonly formatFechaHora = formatFechaHora;
  protected readonly formatCuantia = formatCuantiaConMoneda;
  protected readonly badgeClass = (estado: string) => claseBadgeEstadoProceso(estado);
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
    return formatParametroValor(indicadorCodigo, valor);
  }

  protected formatoValorAbbiTitle(indicadorCodigo: string, valor: string | null): string {
    return parametroValorTitle(indicadorCodigo, valor);
  }

  protected valorAbbiVivo(
    anioParametros: number,
    indicadorCodigo: string,
    fallback: string | null,
  ): string | null {
    const vivo =
      this.parametrosAbbiVivos()[anioParametros]?.[indicadorCodigo];
    return vivo ?? fallback;
  }

  protected formatoRangoLabel(
    indicadorCodigo: string,
    min: string | null,
    max: string | null,
  ): string {
    return formatRangoIndicador(indicadorCodigo, min, max);
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
  protected readonly validadoresYaAsignados = signal<number[]>([]);
  protected readonly validadoresError = signal<string | null>(null);
  protected readonly modoAmpliacionValidadores = signal(false);
  protected readonly validacionesAsignadas = signal<
    Array<{
      id: number;
      validadorId: number;
      validadorNombre: string | null;
      veredicto: string;
      comentario: string | null;
    }>
  >([]);

  protected readonly showEliminarModal = signal(false);
  protected readonly dependencias = signal<DependenciaItem[]>([]);
  protected readonly confirmarDependientes = signal(false);
  protected readonly motivoEliminacion = signal('');

  protected readonly rol = computed(() => this.auth.rol());

  protected readonly puedeEscribir = computed(() => this.auth.puedeEscribir());

  protected readonly procesoTieneCliente = computed(() =>
    Boolean(this.proceso()?.empresaClienteId),
  );

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

  protected readonly puedeAnadirValidadores = computed(() => {
    if (!this.puedeEscribir()) return false;
    const p = this.proceso();
    if (!p || p.estado !== EstadoProceso.EnValidacion) return false;
    const asignadas = this.validacionesAsignadas();
    if (asignadas.length === 0) return false;
    return asignadas.every((item) => item.veredicto === 'Pendiente');
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
      if (this.puedeAnadirValidadores()) {
        return 'El proceso espera veredictos. Puede añadir más validadores mientras ninguno haya confirmado.';
      }
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
    this.catalogos.getCapabilitiesSesion().subscribe({
      next: (response) => {
        const habilitada = response.data.calificacionPorPuntos;
        this.calificacionPorPuntosHabilitada.set(habilitada);

        if (habilitada) {
          this.loadCalificaciones();
          this.loadFormatosActivos();
        }
      },
      error: () => this.calificacionPorPuntosHabilitada.set(false),
    });
  }

  protected setTab(tab: Tab): void {
    this.tab.set(tab);

    if (tab === 'info' && this.calificacionPorPuntosHabilitada()) {
      this.refrescarResultadosParametros();
    }

    if (tab === 'tareas') {
      this.loadTareas();
    }

    if (tab === 'fechas') {
      this.historialFechasLoading.set(true);
      this.historialFechasError.set(null);
      this.procesos.getFechasHistorial(this.procesoId).subscribe({
        next: (r) => {
          this.historialFechas.set(r.data);
          this.historialFechasLoading.set(false);
        },
        error: () => {
          this.historialFechas.set([]);
          this.historialFechasLoading.set(false);
          this.historialFechasError.set('No fue posible cargar el historial de fechas.');
        },
      });
    }

    if (tab === 'comentarios') {
      this.loadComentarios();
    }
  }

  protected iniciarEdicionContactos(): void {
    const proceso = this.proceso();
    if (!proceso?.empresaClienteId) return;

    this.contactosError.set(null);
    this.contactosSeleccionados.set(
      (proceso.contactos ?? []).map((item) => item.contactoId),
    );
    this.contactosEditando.set(true);
    this.loadContactosDisponibles(proceso.empresaClienteId);
  }

  protected cancelarEdicionContactos(): void {
    this.contactosEditando.set(false);
    this.contactosError.set(null);
    this.contactosDisponibles.set([]);
    this.contactosSeleccionados.set([]);
  }

  protected toggleContactoDetalle(contactoId: number, checked: boolean): void {
    this.contactosSeleccionados.update((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(contactoId);
      } else {
        next.delete(contactoId);
      }
      return [...next];
    });
  }

  protected isContactoDetalleSelected(contactoId: number): boolean {
    return this.contactosSeleccionados().includes(contactoId);
  }

  protected guardarContactos(): void {
    if (!this.contactosSeleccionados().length) {
      this.contactosError.set('Debe seleccionar al menos un contacto.');
      return;
    }

    void confirmarGuardado(
      this.confirmDialog,
      '¿Desea actualizar los contactos vinculados al proceso?',
    ).then((ok) => {
      if (!ok) return;

      this.contactosGuardando.set(true);
      this.contactosError.set(null);

      this.procesos.setContactos(this.procesoId, this.contactosSeleccionados()).subscribe({
        next: (response) => {
          this.contactosGuardando.set(false);
          this.contactosEditando.set(false);
          this.proceso.update((actual) =>
            actual ? { ...actual, contactos: response.data } : actual,
          );
          this.toast.success('Contactos del proceso actualizados correctamente.');
        },
        error: (err) => {
          this.contactosGuardando.set(false);
          this.contactosError.set(mensajeErrorApi(err, 'No fue posible actualizar los contactos.'));
        },
      });
    });
  }

  protected guardarComentario(): void {
    const texto = this.comentarioTexto().trim();
    if (!texto || !this.puedeEscribir()) return;

    void confirmarGuardado(
      this.confirmDialog,
      '¿Desea publicar este comentario en la bitácora del proceso?',
      'Publicar',
    ).then((ok) => {
      if (!ok) return;

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
          this.toast.success('Motivo registrado correctamente.');
        },
        error: (err) => {
          this.toast.error(mensajeErrorApi(err, 'No fue posible registrar el motivo.'));
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
        this.toast.success('Estado actualizado correctamente.');
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
        this.toast.error(mensajeErrorApi(err, 'No fue posible cambiar el estado.'));
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

  private cargarKamAsociado(): void {
    this.kamService.getByProcesoId(this.procesoId).subscribe({
      next: (r) => this.kamAsociadoId.set(r.data?.id ?? null),
      error: () => this.kamAsociadoId.set(null),
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

    void confirmarGuardado(
      this.confirmDialog,
      '¿Desea guardar los cambios en las fechas del proceso?',
    ).then((ok) => {
      if (!ok) return;

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
    });
  }

  protected abrirValidadores(ampliacion = false): void {
    this.modoAmpliacionValidadores.set(ampliacion);
    this.validadoresError.set(null);

    const yaAsignados = this.validacionesAsignadas().map((item) => Number(item.validadorId));
    this.validadoresYaAsignados.set(ampliacion ? yaAsignados : []);
    this.validadoresSeleccionados.set(ampliacion ? [...yaAsignados] : []);

    this.validacion.listValidadores().subscribe({
      next: (r) => {
        this.validadores.set(r.data);
        this.showValidadoresModal.set(true);
      },
      error: (err) =>
        this.toast.error(mensajeErrorApi(err, 'No fue posible cargar los validadores.')),
    });
  }

  protected toggleValidador(id: number, checked: boolean): void {
    if (this.validadoresYaAsignados().includes(id) && !checked) {
      return;
    }

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

  protected isValidadorBloqueado(id: number): boolean {
    return this.validadoresYaAsignados().includes(id);
  }

  protected confirmarValidadores(): void {
    const ids = this.validadoresSeleccionados();
    if (ids.length === 0) {
      this.validadoresError.set('Seleccione al menos un validador.');
      return;
    }

    if (this.modoAmpliacionValidadores()) {
      const yaAsignados = this.validadoresYaAsignados();
      const nuevos = ids.filter((id) => !yaAsignados.includes(id));
      if (nuevos.length === 0) {
        this.validadoresError.set('Seleccione al menos un validador adicional.');
        return;
      }
    }

    this.validadoresError.set(null);
    this.actionLoading.set(true);
    this.validacion.asignarValidadores(this.procesoId, ids).subscribe({
      next: () => {
        this.showValidadoresModal.set(false);
        this.actionLoading.set(false);
        this.toast.success(
          this.modoAmpliacionValidadores()
            ? 'Validadores adicionales asignados correctamente.'
            : 'Validadores asignados correctamente.',
        );
        this.loadProceso();
        this.loadValidaciones();
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
        error: () => this.toast.error('No fue posible consultar dependencias.'),
      });
      return;
    }

    this.showEliminarModal.set(true);
  }

  protected confirmarEliminacion(): void {
    if (this.puedeEliminarDirecto()) {
      this.actionLoading.set(true);
      this.procesos.eliminar(this.procesoId, this.confirmarDependientes()).subscribe({
        next: (r) => {
          this.actionLoading.set(false);
          this.toast.success(mensajeExitoApi(r, 'Proceso eliminado correctamente.'));
          void this.router.navigate(['/procesos']);
        },
        error: () => {
          this.toast.error('No fue posible eliminar el proceso.');
          this.actionLoading.set(false);
        },
      });
      return;
    }

    const motivo = this.motivoEliminacion().trim();
    if (motivo.length < 5) return;

    this.actionLoading.set(true);
    this.solicitudes.solicitar('proceso', this.procesoId, motivo).subscribe({
      next: (r) => {
        this.showEliminarModal.set(false);
        this.actionLoading.set(false);
        this.toast.success(mensajeExitoApi(r, 'Solicitud de eliminación registrada.'));
      },
      error: () => {
        this.toast.error('No fue posible registrar la solicitud de eliminación.');
        this.actionLoading.set(false);
      },
    });
  }

  protected onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoEvidencia.set(input.files?.[0] ?? null);
    this.tareaError.set(null);
  }

  protected onEvidenciaNotaChange(value: string): void {
    this.evidencia.set(value);
    this.tareaError.set(null);
  }

  protected abrirModalCompletarTarea(tarea: ProcesoTarea): void {
    this.editandoTarea.set(false);
    this.evidencia.set('');
    this.archivoEvidencia.set(null);
    this.tareaError.set(null);
    this.tareaSeleccionada.set(tarea);
  }

  protected abrirModalEditarTarea(tarea: ProcesoTarea): void {
    this.editandoTarea.set(true);
    this.evidencia.set(tarea.evidencia?.trim() ?? '');
    this.archivoEvidencia.set(null);
    this.tareaError.set(null);
    this.tareaSeleccionada.set(tarea);
  }

  protected cerrarModalTarea(): void {
    this.tareaSeleccionada.set(null);
    this.editandoTarea.set(false);
    this.evidencia.set('');
    this.archivoEvidencia.set(null);
    this.tareaError.set(null);
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
      const mensaje = 'Debe adjuntar un archivo o escribir una evidencia.';
      this.tareaError.set(mensaje);
      this.toast.error(mensaje);
      return;
    }

    const mensaje = this.editandoTarea()
      ? '¿Desea guardar los cambios de esta tarea?'
      : '¿Desea marcar esta tarea como completada?';

    void confirmarGuardado(this.confirmDialog, mensaje).then((ok) => {
      if (!ok) return;

      this.actionLoading.set(true);
      this.tareaError.set(null);
      const eraEdicion = this.editandoTarea();
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
          this.toast.success(
            eraEdicion
              ? 'Tarea actualizada correctamente.'
              : 'Tarea completada correctamente.',
          );
        },
        error: (err) => {
          const msg = mensajeErrorApi(
            err,
            eraEdicion
              ? 'No fue posible actualizar la tarea.'
              : 'No fue posible completar la tarea.',
          );
          this.tareaError.set(msg);
          this.toast.error(msg);
          this.actionLoading.set(false);
        },
      });
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
    if (!this.calificacionPorPuntosHabilitada()) {
      return;
    }

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
          const mapa: Record<string, string> = {};
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
    if (!this.calificacionPorPuntosHabilitada()) {
      return;
    }

    this.formatosCalificacion.list(true).subscribe({
      next: (res) => this.formatosActivos.set(res.data),
      error: () => this.formatosActivos.set([]),
    });
  }

  private loadContactosDisponibles(clienteId: number): void {
    this.contactosLoading.set(true);
    this.contactos.listByCliente(clienteId).subscribe({
      next: (response) => {
        this.contactosDisponibles.set(response.data);
        this.contactosLoading.set(false);
      },
      error: () => {
        this.contactosDisponibles.set([]);
        this.contactosLoading.set(false);
        this.contactosError.set('No fue posible cargar los contactos del cliente.');
      },
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
        this.loadValidaciones();
        if (
          r.proceso.estado === EstadoProceso.Adjudicado &&
          r.proceso.tipoProceso === TipoProceso.Periodico
        ) {
          this.cargarProyeccionAsociada();
        } else {
          this.proyeccionAsociadaId.set(null);
        }

        if (
          r.proceso.estado === EstadoProceso.Adjudicado &&
          r.proceso.empresaClienteId
        ) {
          this.cargarKamAsociado();
        } else {
          this.kamAsociadoId.set(null);
        }
      },
      error: () => {
        this.error.set('No fue posible cargar el proceso.');
        this.loading.set(false);
      },
    });
  }

  private loadValidaciones(): void {
    this.validacion.getValidacionesProceso(this.procesoId).subscribe({
      next: (r) => this.validacionesAsignadas.set(r.data ?? []),
      error: () => this.validacionesAsignadas.set([]),
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
