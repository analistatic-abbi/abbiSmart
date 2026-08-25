import { AuditAccion, AuditEntidadTipo } from '../enums/audit-accion.enum';

const ACCION_LABELS: Record<string, string> = {
  [AuditAccion.LOGIN]: 'Inicio de sesión',
  [AuditAccion.LOGOUT]: 'Cierre de sesión',
  [AuditAccion.LOGIN_FALLIDO]: 'Intento de inicio fallido',
  [AuditAccion.CUENTA_BLOQUEADA]: 'Cuenta bloqueada',
  [AuditAccion.ACTIVACION]: 'Activación de cuenta',
  [AuditAccion.RESET_PASSWORD]: 'Restablecimiento de contraseña',
  [AuditAccion.RESET_PASSWORD_SOLICITUD]: 'Solicitud de restablecimiento',
  [AuditAccion.USUARIO_CREAR]: 'Creación de usuario',
  [AuditAccion.USUARIO_EDITAR]: 'Edición de usuario',
  [AuditAccion.USUARIO_DESBLOQUEAR]: 'Desbloqueo de usuario',
  [AuditAccion.USUARIO_DESACTIVAR]: 'Desactivación de usuario',
  [AuditAccion.PAIS_CREAR]: 'Creación de país',
  [AuditAccion.PAIS_EDITAR]: 'Edición de país',
  [AuditAccion.PAIS_CONFIG_EDITAR]: 'Edición de configuración de país',
  [AuditAccion.PLANTILLA_TAREA_EDITAR]: 'Edición de plantilla de tarea',
  [AuditAccion.CATALOGO_PAIS_EDITAR]: 'Edición de catálogo de país',
  [AuditAccion.CATALOGO_PAIS_CREAR]: 'Creación de catálogo de país',
  [AuditAccion.UBICACION_CREAR]: 'Creación de ubicación',
  [AuditAccion.UBICACION_EDITAR]: 'Edición de ubicación',
  [AuditAccion.CONFIGURACION_EDITAR]: 'Edición de configuración',
  [AuditAccion.CLIENTE_CREAR]: 'Creación de cliente',
  [AuditAccion.CLIENTE_EDITAR]: 'Edición de cliente',
  [AuditAccion.CLIENTE_ELIMINAR]: 'Eliminación de cliente',
  [AuditAccion.CONTACTO_CREAR]: 'Creación de contacto',
  [AuditAccion.CONTACTO_EDITAR]: 'Edición de contacto',
  [AuditAccion.CONTACTO_ELIMINAR]: 'Eliminación de contacto',
  [AuditAccion.RELACIONAMIENTO_CREAR]: 'Creación de relacionamiento',
  [AuditAccion.RELACIONAMIENTO_EDITAR]: 'Edición de relacionamiento',
  [AuditAccion.RELACIONAMIENTO_ELIMINAR]: 'Eliminación de relacionamiento',
  [AuditAccion.CARGA_MASIVA]: 'Carga masiva',
  [AuditAccion.CARGA_MASIVA_REVERTIR]: 'Reversión de carga masiva',
  [AuditAccion.PARAMETRO_CREAR]: 'Creación de parámetro',
  [AuditAccion.PARAMETRO_EDITAR]: 'Edición de parámetro',
  [AuditAccion.PARAMETRO_ELIMINAR]: 'Eliminación de parámetro',
  [AuditAccion.META_ANUAL_UPSERT]: 'Actualización de meta anual',
  [AuditAccion.PROCESO_CREAR]: 'Creación de proceso',
  [AuditAccion.PROCESO_EDITAR]: 'Edición de proceso',
  [AuditAccion.PROCESO_FECHA_EDITAR]: 'Edición de fecha de proceso',
  [AuditAccion.PROCESO_CAMBIAR_ESTADO]: 'Cambio de estado de proceso',
  [AuditAccion.PROCESO_ELIMINAR]: 'Eliminación de proceso',
  [AuditAccion.TAREA_COMPLETAR]: 'Tarea completada',
  [AuditAccion.TAREA_EDITAR]: 'Tarea editada',
  [AuditAccion.VALIDACION_ASIGNAR]: 'Asignación de validador',
  [AuditAccion.VALIDACION_VEREDICTO]: 'Veredicto de validación',
  [AuditAccion.SOLICITUD_ELIMINACION_CREAR]: 'Solicitud de eliminación',
  [AuditAccion.SOLICITUD_ELIMINACION_RESOLVER]: 'Resolución de solicitud de eliminación',
  [AuditAccion.PROYECCION_CREAR]: 'Creación de proyección',
  [AuditAccion.PROYECCION_EDITAR]: 'Edición de proyección',
  [AuditAccion.PROYECCION_ELIMINAR]: 'Eliminación de proyección',
  [AuditAccion.PROYECCION_GENERAR_AUTO]: 'Generación automática de proyección',
  [AuditAccion.PROYECCION_VINCULAR_PROCESO]: 'Vinculación de proceso resultante',
  [AuditAccion.PROYECCION_CERRAR]: 'Cierre de proyección',
  [AuditAccion.PROYECCION_ASIGNAR_MERCADO]: 'Asignación de mercado',
  [AuditAccion.KAM_CREAR_AUTO]: 'Creación automática de KAM',
  [AuditAccion.KAM_RONDA_CREAR]: 'Creación de ronda KAM',
  [AuditAccion.KAM_RONDA_EDITAR]: 'Edición de ronda KAM',
  [AuditAccion.KAM_RONDA_EJECUTAR]: 'Ejecución de ronda KAM',
  [AuditAccion.KAM_RONDA_SOCIALIZAR]: 'Socialización de ronda KAM',
  [AuditAccion.KAM_ENCUESTA_CREAR]: 'Creación de encuesta KAM',
  [AuditAccion.KAM_ENCUESTA_RESPONDER]: 'Respuesta de encuesta KAM',
  [AuditAccion.FORMATO_ENCUESTA_CREAR]: 'Creación de formato de encuesta',
  [AuditAccion.FORMATO_ENCUESTA_EDITAR]: 'Edición de formato de encuesta',
  [AuditAccion.FORMATO_ENCUESTA_CLONAR]: 'Clonación de formato de encuesta',
};

const ENTIDAD_LABELS: Record<string, string> = {
  [AuditEntidadTipo.AUTH]: 'Autenticación',
  [AuditEntidadTipo.USUARIO]: 'Usuario',
  [AuditEntidadTipo.PAIS]: 'País',
  [AuditEntidadTipo.UBICACION_GEOGRAFICA]: 'Ubicación geográfica',
  [AuditEntidadTipo.CONFIGURACION_SISTEMA]: 'Configuración del sistema',
  [AuditEntidadTipo.CONFIGURACION_PAIS]: 'Configuración de país',
  [AuditEntidadTipo.CATALOGO_PAIS]: 'Catálogo de país',
  [AuditEntidadTipo.PLANTILLA_TAREA_PAIS]: 'Plantilla de tarea por país',
  [AuditEntidadTipo.CLIENTE]: 'Cliente',
  [AuditEntidadTipo.CONTACTO]: 'Contacto',
  [AuditEntidadTipo.RELACIONAMIENTO]: 'Relacionamiento',
  [AuditEntidadTipo.CARGA_MASIVA]: 'Carga masiva',
  [AuditEntidadTipo.PARAMETRO_FINANCIERO]: 'Parámetro financiero',
  [AuditEntidadTipo.META_ANUAL]: 'Meta anual',
  [AuditEntidadTipo.PROCESO]: 'Proceso',
  [AuditEntidadTipo.PROCESO_TAREA]: 'Tarea de proceso',
  [AuditEntidadTipo.VALIDACION_PROCESO]: 'Validación de proceso',
  [AuditEntidadTipo.SOLICITUD_ELIMINACION]: 'Solicitud de eliminación',
  [AuditEntidadTipo.PROYECCION]: 'Proyección',
  [AuditEntidadTipo.KAM]: 'KAM',
  [AuditEntidadTipo.FORMATO_ENCUESTA]: 'Formato de encuesta',
  [AuditEntidadTipo.NOTIFICACION]: 'Notificación',
};

const CAMPO_LABELS: Record<string, string> = {
  fechaApertura: 'Fecha apertura',
  fechaCierre: 'Fecha cierre',
  fechaManifestacionInteres: 'Manifestación de interés',
  fechaAdquisicionDerecho: 'Adquisición de derecho',
  fechaReunionAclaratoria: 'Reunión aclaratoria',
  fechaVisitaTecnica: 'Visita técnica',
  fechaSolicitudesAclaracion: 'Solicitudes de aclaración',
  fechaRespuestaAclaracion: 'Respuesta a aclaración',
  fechaLimitacionMypymes: 'Limitación MyPymes',
  estado: 'Estado',
  mercado: 'Mercado',
  motivoPerdida: 'Motivo de pérdida',
  valorRequerido: 'Valor requerido',
  valor: 'Valor',
  reglaCumplimiento: 'Regla de cumplimiento',
  anio: 'Año',
  metaAdjudicacion: 'Meta de adjudicación',
  metaFacturacion: 'Meta de facturación',
  pais_sesion: 'País de sesión',
  cambio_pais_sesion: 'Cambio de país de sesión',
  pais_id: 'País',
};

const CAMPOS_PAIS = new Set(['pais_sesion', 'cambio_pais_sesion', 'pais_id']);

function isCampoPais(campo: string | null | undefined): boolean {
  if (!campo) return false;
  return CAMPOS_PAIS.has(campo.trim().toLowerCase());
}

function resolvePaisNombre(
  value: string | null | undefined,
  paisNombres?: Record<string, string>,
): string | null | undefined {
  if (!value || !paisNombres) {
    return value;
  }

  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    return value;
  }

  return paisNombres[normalized] ?? paisNombres[String(Number(normalized))] ?? value;
}

function formatValorAuditoria(
  value: string | null | undefined,
  options?: { campo?: string | null; paisNombres?: Record<string, string> },
): string {
  const resolved =
    isCampoPais(options?.campo)
      ? resolvePaisNombre(value, options?.paisNombres)
      : value;

  if (resolved === null || resolved === undefined || resolved === '') {
    return '—';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(resolved)) {
    const [anio, mes, dia] = resolved.split('-');
    return `${dia}/${mes}/${anio}`;
  }

  if (resolved.startsWith('{') || resolved.startsWith('[')) {
    return 'registro actualizado';
  }

  return resolved.length > 120 ? `${resolved.slice(0, 117)}...` : resolved;
}

export function labelAccionAuditoria(accion: string): string {
  return ACCION_LABELS[accion] ?? accion.replaceAll('_', ' ');
}

export function labelEntidadAuditoria(
  entidadTipo: string,
  entidadId?: number | null,
): string {
  const tipo = ENTIDAD_LABELS[entidadTipo] ?? entidadTipo.replaceAll('_', ' ');
  return entidadId ? `${tipo} #${entidadId}` : tipo;
}

export function labelCampoAuditoria(campo: string | null | undefined): string | null {
  if (!campo) return null;
  const normalized = campo.trim().toLowerCase();
  return CAMPO_LABELS[normalized] ?? CAMPO_LABELS[campo] ?? campo.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

function parseJsonObject(raw?: string | null): Record<string, unknown> | null {
  if (!raw?.trim() || !raw.trim().startsWith('{')) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function isParametroSnapshot(snapshot: Record<string, unknown> | null): boolean {
  if (!snapshot) {
    return false;
  }

  return (
    typeof snapshot.indicadorCodigo === 'string'
    || (Object.hasOwn(snapshot, 'valor') && Object.hasOwn(snapshot, 'reglaCumplimiento'))
  );
}

function formatParametroCampo(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return String(value);
}

function formatParametroHistorialDetalle(
  valorAnterior?: string | null,
  valorNuevo?: string | null,
): string | null {
  const anterior = parseJsonObject(valorAnterior);
  const nuevo = parseJsonObject(valorNuevo);

  if (!isParametroSnapshot(anterior) && !isParametroSnapshot(nuevo)) {
    return null;
  }

  const campos: Array<[string, string]> = [
    ['valor', 'Valor'],
    ['reglaCumplimiento', 'Regla'],
    ['anio', 'Año'],
  ];

  if (anterior && nuevo) {
    const cambios = campos
      .filter(([campo]) => String(anterior[campo] ?? '') !== String(nuevo[campo] ?? ''))
      .map(
        ([campo, label]) =>
          `${label}: ${formatParametroCampo(anterior[campo])} → ${formatParametroCampo(nuevo[campo])}`,
      );

    return cambios.length ? cambios.join(' · ') : 'Parámetro actualizado';
  }

  if (nuevo && !anterior) {
    const partes = campos
      .map(([campo, label]) => {
        const valor = nuevo[campo];
        if (valor === null || valor === undefined || valor === '') {
          return null;
        }

        return `${label}: ${formatParametroCampo(valor)}`;
      })
      .filter((parte): parte is string => Boolean(parte));

    return partes.length ? partes.join(' · ') : 'Parámetro creado';
  }

  if (anterior && !nuevo) {
    return `Valor eliminado: ${formatParametroCampo(anterior.valor)}`;
  }

  return null;
}

export function formatDetalleAuditoria(
  input: {
    accion: string;
    campo?: string | null;
    valorAnterior?: string | null;
    valorNuevo?: string | null;
  },
  paisNombres?: Record<string, string>,
): string | null {
  const parametroDetalle = formatParametroHistorialDetalle(
    input.valorAnterior,
    input.valorNuevo,
  );
  if (parametroDetalle) {
    return parametroDetalle;
  }

  const campoLabel = labelCampoAuditoria(input.campo);
  const formatOptions = { campo: input.campo, paisNombres };

  if (campoLabel) {
    const anterior = formatValorAuditoria(input.valorAnterior, formatOptions);
    const nuevo = formatValorAuditoria(input.valorNuevo, formatOptions);
    return `${campoLabel}: ${anterior} → ${nuevo}`;
  }

  if (input.accion === AuditAccion.PROCESO_EDITAR && input.valorNuevo?.startsWith('{')) {
    return 'Se actualizaron los datos del proceso.';
  }

  if (input.valorAnterior || input.valorNuevo) {
    const anterior = formatValorAuditoria(input.valorAnterior, formatOptions);
    const nuevo = formatValorAuditoria(input.valorNuevo, formatOptions);
    if (anterior !== '—' || nuevo !== '—') {
      return `${anterior} → ${nuevo}`;
    }
  }

  return null;
}
