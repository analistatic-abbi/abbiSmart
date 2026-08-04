/**
 * Carga datos de negocio mínimos para desarrollo (Colombia + Perú).
 * Idempotente: no reinserta si ya existe el proceso DEMO-CO-001.
 * Con --force (o SEED_DEMO_FORCE=1) elimina procesos DEMO-* y vuelve a crearlos.
 *
 * Ejecutar: npm run seed:demo-data
 * Forzar:   npm run seed:demo-data -- --force
 * Requiere: esquema, ubicaciones y usuarios demo cargados.
 */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as mariadb from 'mariadb';
import {
  TAREAS_SEGUIMIENTO_ORDEN,
  tareaAplicaParaProceso,
} from '../src/common/constants/proceso-tareas.constants';
import { TipoInstrumento } from '../src/common/enums/tipo-instrumento.enum';

dotenv.config();

const DEMO_MARKER = 'DEMO-CO-001';

const ARCHIVOS_EVIDENCIA_DEMO: Record<string, { nombre: string; contenido: string }> = {
  Creacion_Carpeta: {
    nombre: 'checklist-apertura-carpeta.pdf.txt',
    contenido:
      'Checklist de apertura de carpeta\nProceso DEMO\nFecha: 2026-01-20\nResponsable: Operaciones\nEstado: Completado\n',
  },
  Manifestacion_Interes: {
    nombre: 'acuse-manifestacion-interes.pdf.txt',
    contenido:
      'Acuse de recepción - Manifestación de interés\nPortal del cliente\nFecha envío: 2026-01-20\nRadicado: MI-2026-0042\n',
  },
  Adquisicion_Derecho_Participar: {
    nombre: 'comprobante-derecho-participar.pdf.txt',
    contenido: 'Comprobante de pago derecho a participar\nRecibo: 2026-0158\nValor: según pliego\n',
  },
  Preparar_Doc_Juridica: {
    nombre: 'paquete-documentacion-juridica.pdf.txt',
    contenido: 'Índice paquete jurídico: RUT, existencia, poderes, inhabilidades.\n',
  },
  Preparar_Doc_Tecnica: {
    nombre: 'memoria-tecnica.pdf.txt',
    contenido: 'Memoria técnica y anexos de experiencia cargados.\n',
  },
  Preparar_Doc_Financiera: {
    nombre: 'estados-financieros.pdf.txt',
    contenido: 'Estados financieros 2024-2025 y carta de capacidad financiera.\n',
  },
  Estructuracion_Administracion: {
    nombre: 'cronograma-raci.pdf.txt',
    contenido: 'Cronograma interno y matriz RACI aprobados.\n',
  },
  Solicitud_Pago_Poliza: {
    nombre: 'solicitud-poliza.pdf.txt',
    contenido: 'Solicitud formal a aseguradora - póliza de seriedad de oferta.\n',
  },
  Pago_Poliza: {
    nombre: 'poliza-POL-77821.pdf.txt',
    contenido: 'Póliza emitida N.º POL-77821 y comprobante de pago.\n',
  },
  Elaboracion_Propuesta_Economica: {
    nombre: 'propuesta-economica.pdf.txt',
    contenido: 'Propuesta económica en formato oficial del cliente.\n',
  },
  Validacion_Area_Tecnica: {
    nombre: 'acta-validacion-tecnica.pdf.txt',
    contenido: 'Acta de validación técnica interna firmada.\n',
  },
  Envio_Propuesta: {
    nombre: 'radicado-envio-propuesta.pdf.txt',
    contenido: 'Captura de radicado de envío de propuesta - 2026-02-10 14:32.\n',
  },
};

const TAREAS_COMPLETADAS_DEMO = new Set([
  'Creacion_Carpeta',
  'Manifestacion_Interes',
]);

const FORCE =
  process.argv.includes('--force') ||
  process.env.SEED_DEMO_FORCE === '1';

type CompletarNivel = 'none' | 'partial' | 'all';

interface ProcesoSeed {
  idDigitado: string;
  paisId: number;
  ubicacionId: number;
  empresaClienteId: number;
  estado: string;
  usuarioCreadorId: number;
  completarTareas?: CompletarNivel;
  moneda: 'COP' | 'PEN';
  cuantia: number;
  segmento?: string;
  tipoProceso?: 'Periódico' | 'No periódico';
  tipoInstrumento?: TipoInstrumento;
  fechaAdquisicionDerecho?: string | null;
}

interface PaisIds {
  colombia: number;
  peru: number;
}

interface UbicacionIds {
  medellin: number;
  lima: number;
}

interface UserIds {
  admin: number;
  validador: number;
  operadorCo: number;
}

interface ClienteIds {
  ecopetrolCo: number;
  isaCo: number;
  luzDelSurPe: number;
  southernPe: number;
}

interface ContactoIds {
  ecopetrolGenerico: number;
  ecopetrolNominal: number;
  isaGenerico: number;
  luzDelSurGenerico: number;
  luzDelSurNominal: number;
}

async function getConnection(): Promise<mariadb.Connection> {
  return mariadb.createConnection({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number.parseInt(process.env.DB_PORT ?? '3306', 10),
    user: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_DATABASE ?? 'licitaciones_abbi',
  });
}

async function resolvePaisIds(
  conn: mariadb.Connection,
): Promise<PaisIds> {
  const rows = await conn.query<Array<{ id: number; nombre: string }>>(
    `SELECT id, nombre FROM paises WHERE nombre IN ('Colombia', 'Perú')`,
  );

  const colombia = rows.find((row) => row.nombre === 'Colombia')?.id;
  const peru = rows.find((row) => row.nombre === 'Perú')?.id;

  if (!colombia || !peru) {
    throw new Error('Países Colombia/Perú no encontrados. Aplica modelo_bd.sql primero.');
  }

  return { colombia, peru };
}

async function resolveUbicacionIds(
  conn: mariadb.Connection,
  paisIds: PaisIds,
): Promise<UbicacionIds> {
  const medellinRows = await conn.query<Array<{ id: number }>>(
    `SELECT id FROM ubicaciones_geograficas
     WHERE pais_id = ? AND departamento = 'Antioquia' AND municipio_provincia = 'Medellín'
     LIMIT 1`,
    [paisIds.colombia],
  );

  const limaRows = await conn.query<Array<{ id: number }>>(
    `SELECT id FROM ubicaciones_geograficas
     WHERE pais_id = ? AND departamento = 'Lima' AND municipio_provincia = 'Lima - Lima'
     LIMIT 1`,
    [paisIds.peru],
  );

  if (!medellinRows.length) {
    throw new Error('Ubicación Medellín no encontrada. Ejecuta npm run seed:ubicaciones.');
  }

  if (!limaRows.length) {
    throw new Error('Ubicación Lima no encontrada. Ejecuta npm run seed:ubicaciones.');
  }

  return {
    medellin: medellinRows[0].id,
    lima: limaRows[0].id,
  };
}

async function resolveUserIds(conn: mariadb.Connection): Promise<UserIds> {
  const rows = await conn.query<Array<{ id: number; correo: string }>>(
    `SELECT id, correo FROM usuarios
     WHERE correo IN ('admin@abbi.com', 'validador@abbi.com', 'operador.co@abbi.com')
       AND eliminado = 0`,
  );

  const byCorreo = new Map(rows.map((row) => [row.correo, row.id]));
  const admin = byCorreo.get('admin@abbi.com');
  const validador = byCorreo.get('validador@abbi.com');
  const operadorCo = byCorreo.get('operador.co@abbi.com');

  if (!admin || !validador || !operadorCo) {
    throw new Error('Usuarios demo no encontrados. Ejecuta npm run seed:demo-users.');
  }

  return { admin, validador, operadorCo };
}

async function isDemoLoaded(conn: mariadb.Connection): Promise<boolean> {
  const proceso = await conn.query<Array<{ id: number }>>(
    `SELECT id FROM procesos WHERE id_digitado = ? AND eliminado = 0 LIMIT 1`,
    [DEMO_MARKER],
  );
  if (proceso.length > 0) {
    return true;
  }

  const cliente = await conn.query<Array<{ id: number }>>(
    `SELECT id FROM clientes WHERE empresa = 'DEMO - Ecopetrol CO' AND eliminado = 0 LIMIT 1`,
  );
  return cliente.length > 0;
}

async function insertParametros(
  conn: mariadb.Connection,
  paisIds: PaisIds,
  adminId: number,
): Promise<void> {
  const parametros = [
    { paisId: paisIds.colombia, indicador: 'KTNO', valor: 1.5 },
    { paisId: paisIds.colombia, indicador: 'ROE', valor: 12.0 },
    { paisId: paisIds.peru, indicador: 'KTNO', valor: 1.2 },
    { paisId: paisIds.peru, indicador: 'ROE', valor: 10.5 },
  ];

  for (const param of parametros) {
    await conn.query(
      `INSERT IGNORE INTO parametros_financieros
         (pais_id, indicador_codigo, anio, valor, regla_cumplimiento, usuario_modifico_id)
       VALUES (?, ?, 2026, ?, 'Mayor o igual al requerido', ?)`,
      [param.paisId, param.indicador, param.valor, adminId],
    );
  }

  console.log('✓ Parámetros financieros (2026, CO + PE)');
}

async function insertClientes(
  conn: mariadb.Connection,
  paisIds: PaisIds,
  ubicaciones: UbicacionIds,
): Promise<ClienteIds> {
  const clientes = [
    {
      key: 'ecopetrolCo',
      empresa: 'DEMO - Ecopetrol CO',
      paisId: paisIds.colombia,
      ubicacionId: ubicaciones.medellin,
      segmento: 'Minería',
    },
    {
      key: 'isaCo',
      empresa: 'DEMO - ISA Interconexión CO',
      paisId: paisIds.colombia,
      ubicacionId: ubicaciones.medellin,
      segmento: 'Energía Eléctrica',
    },
    {
      key: 'luzDelSurPe',
      empresa: 'DEMO - Luz del Sur PE',
      paisId: paisIds.peru,
      ubicacionId: ubicaciones.lima,
      segmento: 'Energía Eléctrica',
    },
    {
      key: 'southernPe',
      empresa: 'DEMO - Southern Peru PE',
      paisId: paisIds.peru,
      ubicacionId: ubicaciones.lima,
      segmento: 'Minería',
    },
  ] as const;

  const ids = {} as ClienteIds;

  for (const cliente of clientes) {
    const result = await conn.query(
      `INSERT INTO clientes (empresa, pais_id, ubicacion_id, segmento, eliminado)
       VALUES (?, ?, ?, ?, FALSE)`,
      [cliente.empresa, cliente.paisId, cliente.ubicacionId, cliente.segmento],
    );
    ids[cliente.key] = Number(result.insertId);
  }

  console.log('✓ Clientes demo (2 CO + 2 PE)');
  return ids;
}

async function insertContactos(
  conn: mariadb.Connection,
  clientes: ClienteIds,
  ubicaciones: UbicacionIds,
): Promise<ContactoIds> {
  const contactos: Array<{
    key: keyof ContactoIds;
    clienteId: number;
    nombre: string;
    ubicacionId: number;
    esGenerico: boolean;
    cargo?: string;
    correo?: string;
  }> = [
    {
      key: 'ecopetrolGenerico',
      clienteId: clientes.ecopetrolCo,
      nombre: 'Contacto General - DEMO - Ecopetrol CO',
      ubicacionId: ubicaciones.medellin,
      esGenerico: true,
    },
    {
      key: 'ecopetrolNominal',
      clienteId: clientes.ecopetrolCo,
      nombre: 'María Gómez',
      ubicacionId: ubicaciones.medellin,
      esGenerico: false,
      cargo: 'Gerente de Compras',
      correo: 'maria.gomez@demo.local',
    },
    {
      key: 'isaGenerico',
      clienteId: clientes.isaCo,
      nombre: 'Contacto General - DEMO - ISA Interconexión CO',
      ubicacionId: ubicaciones.medellin,
      esGenerico: true,
    },
    {
      key: 'luzDelSurGenerico',
      clienteId: clientes.luzDelSurPe,
      nombre: 'Contacto General - DEMO - Luz del Sur PE',
      ubicacionId: ubicaciones.lima,
      esGenerico: true,
    },
    {
      key: 'luzDelSurNominal',
      clienteId: clientes.luzDelSurPe,
      nombre: 'Carlos Mendoza',
      ubicacionId: ubicaciones.lima,
      esGenerico: false,
      cargo: 'Jefe de Licitaciones',
      correo: 'carlos.mendoza@demo.local',
    },
  ];

  const ids = {} as ContactoIds;

  for (const contacto of contactos) {
    const result = await conn.query(
      `INSERT INTO contactos
         (cliente_id, nombre, cargo, correo, ubicacion_id, es_generico, eliminado)
       VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
      [
        contacto.clienteId,
        contacto.nombre,
        contacto.cargo ?? null,
        contacto.correo ?? null,
        contacto.ubicacionId,
        contacto.esGenerico,
      ],
    );
    ids[contacto.key] = Number(result.insertId);
  }

  console.log('✓ Contactos demo');
  return ids;
}

interface ProcesoSeed {
  idDigitado: string;
  paisId: number;
  ubicacionId: number;
  empresaClienteId: number;
  estado: string;
  usuarioCreadorId: number;
  completarTareas?: CompletarNivel;
  moneda: 'COP' | 'PEN';
  cuantia: number;
  segmento?: string;
  tipoProceso?: 'Periódico' | 'No periódico';
  tipoInstrumento?: TipoInstrumento;
  fechaAdquisicionDerecho?: string | null;
}

async function clearDemoProcesos(conn: mariadb.Connection): Promise<void> {
  await conn.query(`
    DELETE FROM validaciones_proceso
    WHERE proceso_id IN (SELECT id FROM procesos WHERE id_digitado LIKE 'DEMO-%')
  `);
  await conn.query(`
    DELETE FROM proceso_tareas
    WHERE proceso_id IN (SELECT id FROM procesos WHERE id_digitado LIKE 'DEMO-%')
  `);
  await conn.query(`
    DELETE FROM proceso_indicadores
    WHERE proceso_id IN (SELECT id FROM procesos WHERE id_digitado LIKE 'DEMO-%')
  `);
  await conn.query(`
    UPDATE proyecciones
    SET proceso_origen_id = NULL, proceso_resultante_id = NULL
    WHERE proceso_origen_id IN (SELECT id FROM procesos WHERE id_digitado LIKE 'DEMO-%')
       OR proceso_resultante_id IN (SELECT id FROM procesos WHERE id_digitado LIKE 'DEMO-%')
  `);
  await conn.query(`
    DELETE FROM solicitudes_eliminacion
    WHERE entidad_tipo = 'proceso'
      AND entidad_id IN (SELECT id FROM procesos WHERE id_digitado LIKE 'DEMO-%')
  `);
  await conn.query(`DELETE FROM procesos WHERE id_digitado LIKE 'DEMO-%'`);
  console.log('✓ Procesos demo anteriores eliminados');
}

async function insertProceso(
  conn: mariadb.Connection,
  proceso: ProcesoSeed,
): Promise<number> {
  const moneda = proceso.moneda;
  const tipoInstrumento = proceso.tipoInstrumento ?? TipoInstrumento.LICITACION;
  const tipoProceso = proceso.tipoProceso ?? 'Periódico';
  const segmento = proceso.segmento ?? 'Gas Natural';
  const fechaAdquisicion = proceso.fechaAdquisicionDerecho ?? null;
  const completarNivel = proceso.completarTareas ?? 'none';

  const result = await conn.query(
    `INSERT INTO procesos (
       id_digitado, empresa_cliente_id, pais_id, ubicacion_id,
       cuantia, moneda, segmento, tipo_proceso, tipo_instrumento,
       plazo_ejecucion_meses, experiencia, estado, usuario_creador_id,
       fecha_apertura, fecha_cierre, fecha_adquisicion_derecho, eliminado
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 12, FALSE, ?, ?, ?, ?, ?, FALSE)`,
    [
      proceso.idDigitado,
      proceso.empresaClienteId,
      proceso.paisId,
      proceso.ubicacionId,
      proceso.cuantia,
      moneda,
      segmento,
      tipoProceso,
      tipoInstrumento,
      proceso.estado,
      proceso.usuarioCreadorId,
      '2026-01-15',
      '2026-06-30',
      fechaAdquisicion,
    ],
  );

  const procesoId = Number(result.insertId);
  await conn.query(
    `UPDATE procesos SET codigo = CONCAT(id_digitado, '-', id) WHERE id = ?`,
    [procesoId],
  );

  for (const tareaCodigo of TAREAS_SEGUIMIENTO_ORDEN) {
    const aplica = tareaAplicaParaProceso(
      tareaCodigo,
      tipoInstrumento,
      fechaAdquisicion,
    );
    const completada =
      aplica &&
      (completarNivel === 'all' ||
        (completarNivel === 'partial' &&
          TAREAS_COMPLETADAS_DEMO.has(tareaCodigo)));

    let evidenciaArchivoNombre: string | null = null;
    let evidenciaArchivoRuta: string | null = null;

    if (completada) {
      const archivo = ARCHIVOS_EVIDENCIA_DEMO[tareaCodigo];
      if (archivo) {
        const dirRelativo = path.join(
          'uploads',
          'evidencias',
          String(procesoId),
          'seed',
        );
        const dirAbsoluto = path.join(process.cwd(), dirRelativo);
        fs.mkdirSync(dirAbsoluto, { recursive: true });
        const nombreDisco = `${tareaCodigo}-${archivo.nombre}`;
        const rutaAbsoluta = path.join(dirAbsoluto, nombreDisco);
        fs.writeFileSync(rutaAbsoluta, archivo.contenido, 'utf8');
        evidenciaArchivoNombre = archivo.nombre;
        evidenciaArchivoRuta = path
          .join(dirRelativo, nombreDisco)
          .replace(/\\/g, '/');
      }
    }

    await conn.query(
      `INSERT INTO proceso_tareas
         (proceso_id, tarea_codigo, aplica, evidencia, evidencia_archivo_nombre, evidencia_archivo_ruta, completada, fecha_completada, usuario_completo_id)
       VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
      [
        procesoId,
        tareaCodigo,
        aplica,
        evidenciaArchivoNombre,
        evidenciaArchivoRuta,
        completada,
        completada ? new Date() : null,
        completada ? proceso.usuarioCreadorId : null,
      ],
    );
  }

  return procesoId;
}

async function insertProcesos(
  conn: mariadb.Connection,
  paisIds: PaisIds,
  ubicaciones: UbicacionIds,
  clientes: ClienteIds,
  users: UserIds,
): Promise<void> {
  const seeds: ProcesoSeed[] = [
    {
      idDigitado: 'DEMO-CO-001',
      paisId: paisIds.colombia,
      ubicacionId: ubicaciones.medellin,
      empresaClienteId: clientes.ecopetrolCo,
      estado: 'Por Validar',
      usuarioCreadorId: users.admin,
      moneda: 'COP',
      cuantia: 500000000,
      segmento: 'Gas Natural',
    },
    {
      idDigitado: 'DEMO-CO-002',
      paisId: paisIds.colombia,
      ubicacionId: ubicaciones.medellin,
      empresaClienteId: clientes.isaCo,
      estado: 'En Proceso',
      usuarioCreadorId: users.admin,
      completarTareas: 'partial',
      moneda: 'COP',
      cuantia: 750000000,
      segmento: 'Electricidad',
    },
    {
      idDigitado: 'DEMO-CO-003',
      paisId: paisIds.colombia,
      ubicacionId: ubicaciones.medellin,
      empresaClienteId: clientes.ecopetrolCo,
      estado: 'En Proceso',
      usuarioCreadorId: users.operadorCo,
      completarTareas: 'all',
      moneda: 'COP',
      cuantia: 920000000,
      segmento: 'Obra Civil',
      fechaAdquisicionDerecho: '2026-02-10',
    },
    {
      idDigitado: 'DEMO-CO-004',
      paisId: paisIds.colombia,
      ubicacionId: ubicaciones.medellin,
      empresaClienteId: clientes.isaCo,
      estado: 'En Validación',
      usuarioCreadorId: users.admin,
      completarTareas: 'all',
      moneda: 'COP',
      cuantia: 1100000000,
      segmento: 'Alcantarillado',
    },
    {
      idDigitado: 'DEMO-CO-005',
      paisId: paisIds.colombia,
      ubicacionId: ubicaciones.medellin,
      empresaClienteId: clientes.ecopetrolCo,
      estado: 'Presentado',
      usuarioCreadorId: users.admin,
      completarTareas: 'all',
      moneda: 'COP',
      cuantia: 430000000,
      tipoProceso: 'No periódico',
      segmento: 'Servicios Adicionales',
    },
    {
      idDigitado: 'DEMO-CO-006',
      paisId: paisIds.colombia,
      ubicacionId: ubicaciones.medellin,
      empresaClienteId: clientes.isaCo,
      estado: 'Adjudicado',
      usuarioCreadorId: users.admin,
      completarTareas: 'all',
      moneda: 'COP',
      cuantia: 680000000,
      segmento: 'Gas Natural',
    },
    {
      idDigitado: 'DEMO-PE-001',
      paisId: paisIds.peru,
      ubicacionId: ubicaciones.lima,
      empresaClienteId: clientes.luzDelSurPe,
      estado: 'En Proceso',
      usuarioCreadorId: users.admin,
      completarTareas: 'partial',
      moneda: 'PEN',
      cuantia: 1500000,
      segmento: 'Electricidad',
    },
    {
      idDigitado: 'DEMO-PE-002',
      paisId: paisIds.peru,
      ubicacionId: ubicaciones.lima,
      empresaClienteId: clientes.southernPe,
      estado: 'Por Validar',
      usuarioCreadorId: users.admin,
      moneda: 'PEN',
      cuantia: 2100000,
      segmento: 'Obra Civil',
      tipoInstrumento: TipoInstrumento.COTIZACION,
    },
    {
      idDigitado: 'DEMO-PE-003',
      paisId: paisIds.peru,
      ubicacionId: ubicaciones.lima,
      empresaClienteId: clientes.luzDelSurPe,
      estado: 'Presentado',
      usuarioCreadorId: users.admin,
      completarTareas: 'all',
      moneda: 'PEN',
      cuantia: 3200000,
      segmento: 'Gas Natural',
    },
    {
      idDigitado: 'DEMO-PE-004',
      paisId: paisIds.peru,
      ubicacionId: ubicaciones.lima,
      empresaClienteId: clientes.southernPe,
      estado: 'Subsanación',
      usuarioCreadorId: users.admin,
      completarTareas: 'all',
      moneda: 'PEN',
      cuantia: 1850000,
      segmento: 'Electricidad',
    },
  ];

  const idsByDigitado = new Map<string, number>();
  for (const seed of seeds) {
    const id = await insertProceso(conn, seed);
    idsByDigitado.set(seed.idDigitado, id);
  }

  const enValidacionId = idsByDigitado.get('DEMO-CO-004');
  if (enValidacionId) {
    await conn.query(
      `INSERT INTO validaciones_proceso (proceso_id, validador_id, veredicto)
       VALUES (?, ?, 'Pendiente')`,
      [enValidacionId, users.validador],
    );
  }

  console.log(`✓ Procesos demo (${seeds.length}), validación pendiente en DEMO-CO-004`);
}

async function insertProyecciones(
  conn: mariadb.Connection,
  paisIds: PaisIds,
): Promise<void> {
  const proyecciones = [
  {
      paisId: paisIds.colombia,
      anio: 2026,
      fecha: '2026-03-10',
      estado: 'Lejano',
      venta: 800000000,
      facturacion: 600000000,
    },
    {
      paisId: paisIds.colombia,
      anio: 2026,
      fecha: '2026-06-15',
      estado: 'Proximo',
      venta: 1200000000,
      facturacion: 900000000,
    },
    {
      paisId: paisIds.colombia,
      anio: 2026,
      fecha: '2026-08-20',
      estado: 'Sale este mes',
      venta: 950000000,
      facturacion: 700000000,
    },
    {
      paisId: paisIds.peru,
      anio: 2026,
      fecha: '2026-04-05',
      estado: 'Lejano',
      venta: 2500000,
      facturacion: 1800000,
    },
    {
      paisId: paisIds.peru,
      anio: 2026,
      fecha: '2026-07-12',
      estado: 'Proximo',
      venta: 3200000,
      facturacion: 2400000,
    },
    {
      paisId: paisIds.peru,
      anio: 2026,
      fecha: '2026-09-18',
      estado: 'Sale este mes',
      venta: 2800000,
      facturacion: 2100000,
    },
  ];

  for (const proyeccion of proyecciones) {
    await conn.query(
      `INSERT INTO proyecciones
         (pais_id, anio_proyectado, fecha_estimada_publicacion, valor_venta, valor_facturacion, estado, mercado, eliminado)
       VALUES (?, ?, ?, ?, ?, ?, 'General', FALSE)`,
      [
        proyeccion.paisId,
        proyeccion.anio,
        proyeccion.fecha,
        proyeccion.venta,
        proyeccion.facturacion,
        proyeccion.estado,
      ],
    );
  }

  console.log('✓ Proyecciones demo (6)');
}

async function insertRelacionamientos(
  conn: mariadb.Connection,
  contactos: ContactoIds,
  operadorCoId: number,
): Promise<void> {
  const haceQuinceDias = new Date();
  haceQuinceDias.setDate(haceQuinceDias.getDate() - 15);
  const fechaVencida = haceQuinceDias.toISOString().slice(0, 10);
  const fechaAlertaVencida = new Date();
  fechaAlertaVencida.setDate(fechaAlertaVencida.getDate() - 1);
  const fechaAlertaVencidaStr = fechaAlertaVencida.toISOString().slice(0, 10);

  await conn.query(
    `INSERT INTO relacionamientos
       (contacto_id, emisor_usuario_id, canal, mensaje, fecha_mensaje, fecha_alerta_respuesta, respuesta, fecha_respuesta, resultado, fecha_reunion, eliminado)
     VALUES (?, ?, 'Correo', 'Seguimiento demo con respuesta recibida.', '2026-02-01', '2026-02-08', 'Cliente interesado en reunión.', '2026-02-05', 'Reunión programada', '2026-02-12', FALSE)`,
    [contactos.ecopetrolNominal, operadorCoId],
  );

  await conn.query(
    `INSERT INTO relacionamientos
       (contacto_id, emisor_usuario_id, canal, mensaje, fecha_mensaje, fecha_alerta_respuesta, resultado, eliminado)
     VALUES (?, ?, 'Llamada', 'Seguimiento demo sin respuesta (vencido).', ?, ?, 'Ninguno', FALSE)`,
    [contactos.luzDelSurNominal, operadorCoId, fechaVencida, fechaAlertaVencidaStr],
  );

  console.log('✓ Relacionamientos demo (2, 1 vencido)');
}

async function insertSolicitudEliminacion(
  conn: mariadb.Connection,
  clienteId: number,
  operadorCoId: number,
): Promise<void> {
  await conn.query(
    `INSERT INTO solicitudes_eliminacion
       (entidad_tipo, entidad_id, usuario_solicitante_id, motivo, estado)
     VALUES ('cliente', ?, ?, 'Solicitud demo para revisión de permisos de administrador.', 'Pendiente')`,
    [clienteId, operadorCoId],
  );

  console.log('✓ Solicitud de eliminación pendiente');
}

async function resolveClienteIds(conn: mariadb.Connection): Promise<ClienteIds | null> {
  const rows = await conn.query<Array<{ id: number; empresa: string }>>(
    `SELECT id, empresa FROM clientes
     WHERE empresa IN (
       'DEMO - Ecopetrol CO',
       'DEMO - ISA Interconexión CO',
       'DEMO - Luz del Sur PE',
       'DEMO - Southern Peru PE'
     )
       AND eliminado = 0`,
  );

  const byEmpresa = new Map(rows.map((row) => [row.empresa, row.id]));
  const ecopetrolCo = byEmpresa.get('DEMO - Ecopetrol CO');
  const isaCo = byEmpresa.get('DEMO - ISA Interconexión CO');
  const luzDelSurPe = byEmpresa.get('DEMO - Luz del Sur PE');
  const southernPe = byEmpresa.get('DEMO - Southern Peru PE');

  if (!ecopetrolCo || !isaCo || !luzDelSurPe || !southernPe) {
    return null;
  }

  return { ecopetrolCo, isaCo, luzDelSurPe, southernPe };
}

async function main(): Promise<void> {
  const conn = await getConnection();

  try {
    const paisIds = await resolvePaisIds(conn);
    const ubicaciones = await resolveUbicacionIds(conn, paisIds);
    const users = await resolveUserIds(conn);

    if (FORCE) {
      await clearDemoProcesos(conn);
      let clientes = await resolveClienteIds(conn);
      if (!clientes) {
        await insertParametros(conn, paisIds, users.admin);
        clientes = await insertClientes(conn, paisIds, ubicaciones);
        const contactos = await insertContactos(conn, clientes, ubicaciones);
        await insertProyecciones(conn, paisIds);
        await insertRelacionamientos(conn, contactos, users.operadorCo);
        await insertSolicitudEliminacion(conn, clientes.southernPe, users.operadorCo);
      }
      await insertProcesos(conn, paisIds, ubicaciones, clientes, users);
      console.log('\n✓ Procesos demo regenerados (--force).');
      return;
    }

    if (await isDemoLoaded(conn)) {
      console.log('Demo ya cargado (proceso DEMO-CO-001 existe). Usa --force para regenerar procesos.');
      return;
    }

    await insertParametros(conn, paisIds, users.admin);
    const clientes = await insertClientes(conn, paisIds, ubicaciones);
    const contactos = await insertContactos(conn, clientes, ubicaciones);
    await insertProcesos(conn, paisIds, ubicaciones, clientes, users);
    await insertProyecciones(conn, paisIds);
    await insertRelacionamientos(conn, contactos, users.operadorCo);
    await insertSolicitudEliminacion(conn, clientes.southernPe, users.operadorCo);

    console.log('\n✓ Dataset demo cargado correctamente.');
  } finally {
    await conn.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
