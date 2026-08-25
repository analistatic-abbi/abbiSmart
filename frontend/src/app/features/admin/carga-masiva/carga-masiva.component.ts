import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CargaMasivaService } from '../../../core/services/carga-masiva.service';
import { AuthService } from '../../../core/services/auth.service';
import { Rol } from '../../../core/models/rol.enum';
import {
  AvisoCargaMasivaTipo,
  CargaMasivaDetalleCreado,
  CargaMasivaFilaError,
  CargaMasivaLog,
  CargaMasivaResult,
  LogPanelExpandido,
} from '../../../core/models/carga-masiva.model';
import {
  mensajeResumenCargaMasiva,
  sugerenciaLocalCargaMasiva,
  tituloAvisoCargaMasiva,
} from '../../../core/utils/carga-masiva-error.util';
import {
  etiquetaEntidadCarga,
  requiereConfirmacionDependientes,
  rutaRegistroCreado,
} from '../../../core/utils/carga-masiva-navigation.util';
import { esErrorCodigo, mensajeErrorApi, mensajeExitoApi } from '../../../core/utils/api-error.util';
import { formatFechaHora } from '../../../core/utils/date.util';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { confirmarAccion } from '../../../core/utils/confirm-dialog.util';

type Entidad = 'clientes' | 'contactos' | 'proyecciones';

interface ColumnaGuia {
  nombre: string;
  obligatoria: boolean;
  descripcion: string;
}

interface GuiaCargaMasiva {
  titulo: string;
  intro: string;
  encabezado: string;
  columnas: ColumnaGuia[];
  notas: string[];
}

interface ResumenCarga {
  filasExitosas: number;
  filasRechazadas: number;
}

const ENTIDAD_API: Record<Entidad, string> = {
  clientes: 'cliente',
  contactos: 'contacto',
  proyecciones: 'proyeccion',
};

const GUIAS_CARGA_MASIVA: Record<Entidad, GuiaCargaMasiva> = {
  clientes: {
    titulo: 'Clientes',
    intro:
      'Use siempre el mismo conjunto de columnas en la primera fila. Las columnas opcionales pueden dejarse vacías en cada fila.',
    encabezado: 'empresa, segmento, pais, departamento, municipio, segmento_otro',
    columnas: [
      { nombre: 'empresa', obligatoria: true, descripcion: 'Nombre de la empresa cliente.' },
      {
        nombre: 'segmento',
        obligatoria: true,
        descripcion: 'Valor del catálogo (ej. Gas Natural, Minería, Construcción, Otro).',
      },
      {
        nombre: 'pais',
        obligatoria: false,
        descripcion: 'Solo si necesita validar el país; debe coincidir con su sesión. Vacío = país de sesión.',
      },
      {
        nombre: 'departamento',
        obligatoria: false,
        descripcion:
          'Departamento o región. También acepta la columna region. Vacío = ubicación genérica del país.',
      },
      {
        nombre: 'municipio',
        obligatoria: false,
        descripcion:
          'Municipio o ciudad. Para Bogotá use departamento "Cundinamarca" y municipio "Bogotá".',
      },
      {
        nombre: 'segmento_otro',
        obligatoria: false,
        descripcion: 'Texto libre solo si segmento es Otro.',
      },
    ],
    notas: [
      'Ejemplo con solo país: empresa y segmento obligatorios; pais con valor; departamento y municipio vacíos.',
      'Para Bogotá use departamento "Cundinamarca" y municipio "Bogotá".',
    ],
  },
  contactos: {
    titulo: 'Contactos',
    intro:
      'Use siempre el mismo conjunto de columnas en la primera fila. Cada fila es un contacto de un cliente ya registrado.',
    encabezado:
      'empresa, nombre, departamento, municipio, cargo, telefono, correo, referido_por',
    columnas: [
      { nombre: 'empresa', obligatoria: true, descripcion: 'Debe coincidir con un cliente existente.' },
      { nombre: 'nombre', obligatoria: true, descripcion: 'Nombre completo del contacto.' },
      {
        nombre: 'departamento',
        obligatoria: false,
        descripcion: 'Departamento o región. También acepta region. Vacío = ubicación genérica del país.',
      },
      { nombre: 'municipio', obligatoria: false, descripcion: 'Municipio o ciudad del contacto.' },
      { nombre: 'cargo', obligatoria: false, descripcion: 'Cargo del contacto.' },
      { nombre: 'telefono', obligatoria: false, descripcion: 'Teléfono de contacto.' },
      { nombre: 'correo', obligatoria: false, descripcion: 'Correo electrónico.' },
      {
        nombre: 'referido_por',
        obligatoria: false,
        descripcion: 'Nombre de otro contacto del mismo cliente que lo refirió.',
      },
    ],
    notas: [
      'Para Bogotá use departamento "Cundinamarca" y municipio "Bogotá".',
    ],
  },
  proyecciones: {
    titulo: 'Proyecciones',
    intro:
      'Solo proyecciones manuales. Las vinculadas a un proceso se generan automáticamente desde el proceso. Use siempre el mismo conjunto de columnas en la primera fila.',
    encabezado:
      'anio_proyectado, fecha_estimada_publicacion, valor_venta, valor_facturacion, segmento, empresa, empresa_otro, objeto, mercado',
    columnas: [
      { nombre: 'anio_proyectado', obligatoria: true, descripcion: 'Año en que se proyecta la oportunidad.' },
      {
        nombre: 'fecha_estimada_publicacion',
        obligatoria: true,
        descripcion: 'Fecha estimada de publicación (AAAA-MM-DD).',
      },
      { nombre: 'valor_venta', obligatoria: true, descripcion: 'Valor estimado de venta (número, sin símbolos).' },
      {
        nombre: 'valor_facturacion',
        obligatoria: true,
        descripcion: 'Valor estimado de facturación (número, sin símbolos).',
      },
      {
        nombre: 'segmento',
        obligatoria: true,
        descripcion: 'Gas Natural, Alcantarillado, Electricidad, Obra Civil o Servicios Adicionales.',
      },
      {
        nombre: 'empresa',
        obligatoria: false,
        descripcion: 'Cliente registrado. Use este campo o empresa_otro, no ambos.',
      },
      {
        nombre: 'empresa_otro',
        obligatoria: false,
        descripcion: 'Nombre de empresa en texto libre si no está registrada como cliente.',
      },
      {
        nombre: 'objeto',
        obligatoria: false,
        descripcion: 'Descripción breve de la oportunidad.',
      },
      { nombre: 'mercado', obligatoria: false, descripcion: 'General u Objetivo.' },
    ],
    notas: [
      'Cada fila debe indicar empresa o empresa_otro (uno de los dos, obligatorio).',
      'No use proceso_codigo: las proyecciones con proceso origen no se importan por aquí.',
    ],
  },
};

@Component({
  selector: 'app-carga-masiva',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './carga-masiva.component.html',
  styleUrl: './carga-masiva.component.scss',
})
export class CargaMasivaComponent implements OnInit {
  private readonly cargaMasiva = inject(CargaMasivaService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly logs = signal<CargaMasivaLog[]>([]);
  protected readonly entidad = signal<Entidad>('clientes');
  protected readonly archivo = signal<File | null>(null);
  protected readonly resumen = signal<ResumenCarga | null>(null);
  protected readonly errorGeneral = signal<string | null>(null);
  protected readonly erroresDetalle = signal<CargaMasivaFilaError[]>([]);
  protected readonly detalleCreados = signal<CargaMasivaDetalleCreado[]>([]);
  protected readonly logIdActual = signal<number | null>(null);
  protected readonly entidadTipoActual = signal<string | null>(null);
  protected readonly archivoValidado = signal<File | null>(null);
  protected readonly entidadValidada = signal<Entidad | null>(null);
  protected readonly esVistaPrevia = signal(false);
  protected readonly loading = signal(false);
  protected readonly logExpandido = signal<{ id: number; panel: LogPanelExpandido } | null>(null);
  protected readonly revertModalLog = signal<CargaMasivaLog | null>(null);
  protected readonly revertConfirmDependientes = signal(false);
  protected readonly revertLoading = signal(false);
  protected readonly revertError = signal<string | null>(null);
  protected readonly revertExito = signal<string | null>(null);
  protected readonly formatFecha = formatFechaHora;

  protected readonly puedeRevertir = computed(
    () => this.auth.rol() === Rol.Administrador,
  );

  protected readonly guia = computed(() => GUIAS_CARGA_MASIVA[this.entidad()]);
  protected readonly puedeConfirmar = computed(() => {
    const resumen = this.resumen();
    return (
      !!resumen &&
      resumen.filasExitosas > 0 &&
      resumen.filasRechazadas === 0 &&
      this.archivoValidado() === this.archivo() &&
      this.entidadValidada() === this.entidad()
    );
  });

  protected readonly avisoTipo = computed((): AvisoCargaMasivaTipo | null => {
    const resumen = this.resumen();
    if (!resumen) {
      return null;
    }

    if (resumen.filasRechazadas === 0) {
      return 'success';
    }

    if (resumen.filasExitosas === 0) {
      return 'error';
    }

    return 'warning';
  });

  protected readonly avisoTitulo = computed(() => {
    const resumen = this.resumen();
    if (!resumen) {
      return '';
    }

    if (this.esVistaPrevia()) {
      return resumen.filasRechazadas === 0
        ? 'Archivo validado correctamente'
        : 'La validación encontró errores';
    }

    return tituloAvisoCargaMasiva(resumen.filasExitosas, resumen.filasRechazadas);
  });

  protected readonly avisoMensaje = computed(() => {
    const resumen = this.resumen();
    if (!resumen) {
      return '';
    }

    if (this.esVistaPrevia()) {
      return resumen.filasRechazadas === 0
        ? `${resumen.filasExitosas} fila(s) están listas para importar. Confirme la importación para guardar los registros.`
        : `${resumen.filasExitosas} fila(s) válidas y ${resumen.filasRechazadas} fila(s) con errores. Corrija el archivo y vuelva a validarlo.`;
    }

    return mensajeResumenCargaMasiva(resumen.filasExitosas, resumen.filasRechazadas);
  });

  ngOnInit(): void {
    this.cargaMasiva.getLogs().subscribe((r) => this.logs.set(this.normalizarLogs(r.data)));
  }

  protected erroresLog(log: CargaMasivaLog): CargaMasivaFilaError[] {
    return this.normalizarDetalle<CargaMasivaFilaError>(log.detalleErrores);
  }

  protected creadosLog(log: CargaMasivaLog): CargaMasivaDetalleCreado[] {
    return this.normalizarDetalle<CargaMasivaDetalleCreado>(log.detalleCreados);
  }

  protected tieneErroresDetalle(log: CargaMasivaLog): boolean {
    return log.filasRechazadas > 0;
  }

  protected tieneCreadosDetalle(log: CargaMasivaLog): boolean {
    return this.creadosLog(log).length > 0;
  }

  protected descargarPlantilla(): void {
    const encabezado = this.guia().encabezado;
    const contenido = `${encabezado}\n`;
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plantilla-${this.entidad()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivo.set(input.files?.[0] ?? null);
    this.invalidarValidacion();
  }

  protected onEntidadChange(entidad: Entidad): void {
    this.entidad.set(entidad);
    this.invalidarValidacion();
  }

  protected sugerenciaFila(error: CargaMasivaFilaError): string | null {
    return sugerenciaLocalCargaMasiva(error);
  }

  protected entidadEtiqueta(tipo: string): string {
    return etiquetaEntidadCarga(tipo);
  }

  protected rutaCreado(
    entidadTipo: string,
    item: CargaMasivaDetalleCreado,
  ): string | null {
    return rutaRegistroCreado(entidadTipo, item);
  }

  protected requiereConfirmDependientes(entidadTipo: string): boolean {
    return requiereConfirmacionDependientes(entidadTipo);
  }

  protected isLogPanelOpen(logId: number, panel: LogPanelExpandido): boolean {
    const current = this.logExpandido();
    return current?.id === logId && current.panel === panel;
  }

  protected toggleLogPanel(logId: number, panel: LogPanelExpandido): void {
    this.logExpandido.update((current) =>
      current?.id === logId && current.panel === panel
        ? null
        : { id: logId, panel },
    );
  }

  protected abrirRevertir(log: CargaMasivaLog): void {
    this.revertModalLog.set(log);
    this.revertConfirmDependientes.set(false);
    this.revertError.set(null);
  }

  protected abrirRevertirActual(): void {
    const logId = this.logIdActual();
    if (!logId) {
      return;
    }

    this.abrirRevertir({
      id: logId,
      entidadTipo: this.entidadTipoActual() ?? ENTIDAD_API[this.entidad()],
      archivoNombre: this.archivo()?.name ?? 'Archivo importado',
      filasExitosas: this.detalleCreados().length,
      filasRechazadas: this.erroresDetalle().length,
      fechaCarga: new Date().toISOString(),
      detalleCreados: this.detalleCreados(),
      revertida: false,
    });
  }

  protected cerrarRevertir(): void {
    if (this.revertLoading()) {
      return;
    }

    this.revertModalLog.set(null);
    this.revertConfirmDependientes.set(false);
    this.revertError.set(null);
  }

  protected confirmarRevertir(): void {
    const log = this.revertModalLog();
    if (!log) {
      return;
    }

    this.revertLoading.set(true);
    this.revertError.set(null);

    this.cargaMasiva
      .revertirCarga(log.id, this.revertConfirmDependientes())
      .subscribe({
        next: (r) => {
          const mensaje = `${mensajeExitoApi(r, 'Carga masiva procesada.')}: ${r.eliminados} registro(s) eliminado(s).`;
          this.revertExito.set(mensaje);
          this.toast.success(mensaje);
          this.revertLoading.set(false);
          this.revertModalLog.set(null);
          this.detalleCreados.set([]);
          this.logIdActual.set(null);
          this.cargaMasiva.getLogs().subscribe((res) => this.logs.set(this.normalizarLogs(res.data)));
        },
        error: (err) => {
          this.revertError.set(
            mensajeErrorApi(err, 'No se pudo revertir la carga masiva.'),
          );
          if (esErrorCodigo(err, 'ELIMINACION_CON_DEPENDENCIAS')) {
            this.revertConfirmDependientes.set(true);
          }
          this.revertLoading.set(false);
        },
      });
  }

  protected validarArchivo(): void {
    const file = this.archivo();
    if (!file) return;

    const entidad = this.entidad();
    this.prepararSolicitud(true);
    this.importar(file, entidad, true).subscribe({
      next: (r) => {
        this.aplicarResultado(r, true);
        if (
          r.filasExitosas > 0 &&
          r.filasRechazadas === 0 &&
          this.archivo() === file &&
          this.entidad() === entidad
        ) {
          this.archivoValidado.set(file);
          this.entidadValidada.set(entidad);
          this.toast.success(
            `Archivo validado: ${r.filasExitosas} fila(s) lista(s) para importar.`,
          );
        } else {
          this.archivoValidado.set(null);
          this.entidadValidada.set(null);
        }
        this.loading.set(false);
      },
      error: (err) => this.manejarError(err, 'No fue posible validar el archivo.'),
    });
  }

  protected confirmarImportacion(): void {
    const file = this.archivo();
    const entidad = this.entidad();
    if (!file || !this.puedeConfirmar()) return;

    void confirmarAccion(this.confirmDialog, {
      title: 'Confirmar importación',
      message: `¿Desea importar las filas validadas del archivo «${file.name}» para ${etiquetaEntidadCarga(entidad)}?`,
      confirmLabel: 'Confirmar importación',
    }).then((ok) => {
      if (!ok) return;

      if (
        this.archivo() !== file ||
        this.entidad() !== entidad ||
        this.archivoValidado() !== file ||
        this.entidadValidada() !== entidad
      ) {
        this.invalidarValidacion();
        return;
      }

      this.prepararSolicitud(false);
      this.importar(file, entidad, false).subscribe({
        next: (r) => {
          this.aplicarResultado(r, false);
          this.archivoValidado.set(null);
          this.entidadValidada.set(null);
          this.toast.success(
            mensajeExitoApi(
              r,
              r.filasRechazadas > 0
                ? `Carga completada: ${r.filasExitosas} fila(s) importada(s), ${r.filasRechazadas} rechazada(s).`
                : `Carga completada: ${r.filasExitosas} fila(s) importada(s).`,
            ),
          );
          this.loading.set(false);
          this.cargaMasiva.getLogs().subscribe((res) => this.logs.set(this.normalizarLogs(res.data)));
        },
        error: (err) => this.manejarError(err, 'No fue posible importar el archivo.'),
      });
    });
  }

  private importar(file: File, entidad: Entidad, dryRun: boolean) {
    return entidad === 'clientes'
      ? this.cargaMasiva.importClientes(file, dryRun)
      : entidad === 'contactos'
        ? this.cargaMasiva.importContactos(file, dryRun)
        : this.cargaMasiva.importProyecciones(file, dryRun);
  }

  private prepararSolicitud(esVistaPrevia: boolean): void {
    this.loading.set(true);
    this.resumen.set(null);
    this.errorGeneral.set(null);
    this.erroresDetalle.set([]);
    this.detalleCreados.set([]);
    this.logIdActual.set(null);
    this.entidadTipoActual.set(ENTIDAD_API[this.entidad()]);
    this.esVistaPrevia.set(esVistaPrevia);
    this.revertExito.set(null);
  }

  private aplicarResultado(r: CargaMasivaResult, esVistaPrevia: boolean): void {
    this.resumen.set({
      filasExitosas: r.filasExitosas,
      filasRechazadas: r.filasRechazadas,
    });
    this.erroresDetalle.set(r.detalleErrores ?? []);
    this.detalleCreados.set(r.detalleCreados ?? []);
    this.logIdActual.set(r.logId ?? null);
    this.esVistaPrevia.set(esVistaPrevia);
  }

  private manejarError(error: unknown, fallback: string): void {
    const mensaje = mensajeErrorApi(error, fallback);
    this.errorGeneral.set(mensaje);
    this.toast.error(mensaje);
    this.loading.set(false);
    this.archivoValidado.set(null);
    this.entidadValidada.set(null);
  }

  private invalidarValidacion(): void {
    this.archivoValidado.set(null);
    this.entidadValidada.set(null);
    this.resumen.set(null);
    this.errorGeneral.set(null);
    this.erroresDetalle.set([]);
    this.detalleCreados.set([]);
    this.logIdActual.set(null);
    this.entidadTipoActual.set(null);
    this.esVistaPrevia.set(false);
  }

  private normalizarLogs(logs: CargaMasivaLog[]): CargaMasivaLog[] {
    return logs.map((log) => ({
      ...log,
      detalleErrores: this.normalizarDetalle<CargaMasivaFilaError>(log.detalleErrores),
      detalleCreados: this.normalizarDetalle<CargaMasivaDetalleCreado>(log.detalleCreados),
    }));
  }

  private normalizarDetalle<T>(value: unknown): T[] {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value as T[];
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown;
        return Array.isArray(parsed) ? (parsed as T[]) : [];
      } catch {
        return [];
      }
    }

    return [];
  }
}
