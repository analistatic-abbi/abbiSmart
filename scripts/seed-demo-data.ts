/**
 * Carga datos de negocio mínimos para desarrollo (Colombia + Perú).
 * Idempotente: no reinserta si ya existe el proceso DEMO-CO-001.
 * Con --force (o SEED_DEMO_FORCE=1) elimina TODO el dataset DEMO
 * (clientes, contactos, procesos, proyecciones demo, etc.) y lo recrea.
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
  operadorPe: number;
}

type ClienteKey =
  | 'ecopetrolCo'
  | 'isaCo'
  | 'emgesaCo'
  | 'cenitCo'
  | 'luzDelSurPe'
  | 'southernPe'
  | 'enelPe'
  | 'repPe';

type ClienteIds = Record<ClienteKey, number>;

interface ContactoBundle {
  generico: number;
  nominales: number[];
}

type ContactosByCliente = Record<ClienteKey, ContactoBundle>;

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
     WHERE correo IN (
       'admin@abbi.com',
       'validador@abbi.com',
       'operador.co@abbi.com',
       'operador.pe@abbi.com'
     )
       AND eliminado = 0`,
  );

  const byCorreo = new Map(rows.map((row) => [row.correo, row.id]));
  const admin = byCorreo.get('admin@abbi.com');
  const validador = byCorreo.get('validador@abbi.com');
  const operadorCo = byCorreo.get('operador.co@abbi.com');
  const operadorPe = byCorreo.get('operador.pe@abbi.com');

  if (!admin || !validador || !operadorCo || !operadorPe) {
    throw new Error('Usuarios demo no encontrados. Ejecuta npm run seed:demo-users.');
  }

  return { admin, validador, operadorCo, operadorPe };
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
  const clientes: Array<{
    key: ClienteKey;
    empresa: string;
    paisId: number;
    ubicacionId: number;
    segmento: string;
  }> = [
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
      key: 'emgesaCo',
      empresa: 'DEMO - Emgesa CO',
      paisId: paisIds.colombia,
      ubicacionId: ubicaciones.medellin,
      segmento: 'Energía Eléctrica',
    },
    {
      key: 'cenitCo',
      empresa: 'DEMO - Cenit Transporte CO',
      paisId: paisIds.colombia,
      ubicacionId: ubicaciones.medellin,
      segmento: 'Gas Natural',
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
    {
      key: 'enelPe',
      empresa: 'DEMO - Enel Distribución PE',
      paisId: paisIds.peru,
      ubicacionId: ubicaciones.lima,
      segmento: 'Energía Eléctrica',
    },
    {
      key: 'repPe',
      empresa: 'DEMO - Red de Energía del Perú',
      paisId: paisIds.peru,
      ubicacionId: ubicaciones.lima,
      segmento: 'Electricidad',
    },
  ];

  const ids = {} as ClienteIds;

  for (const cliente of clientes) {
    const result = await conn.query(
      `INSERT INTO clientes (empresa, pais_id, ubicacion_id, segmento, eliminado)
       VALUES (?, ?, ?, ?, FALSE)`,
      [cliente.empresa, cliente.paisId, cliente.ubicacionId, cliente.segmento],
    );
    ids[cliente.key] = Number(result.insertId);
  }

  console.log(`✓ Clientes demo (${clientes.length}: 4 CO + 4 PE)`);
  return ids;
}

async function insertContactos(
  conn: mariadb.Connection,
  clientes: ClienteIds,
  ubicaciones: UbicacionIds,
): Promise<ContactosByCliente> {
  const plantillas: Array<{
    clienteKey: ClienteKey;
    ubicacionId: number;
    genericoNombre: string;
    nominales: Array<{ nombre: string; cargo: string; correo: string; telefono: string }>;
  }> = [
    {
      clienteKey: 'ecopetrolCo',
      ubicacionId: ubicaciones.medellin,
      genericoNombre: 'Contacto General - DEMO - Ecopetrol CO',
      nominales: [
        {
          nombre: 'María Gómez',
          cargo: 'Gerente de Compras',
          correo: 'maria.gomez@demo.local',
          telefono: '3001110001',
        },
        {
          nombre: 'Andrés Pérez',
          cargo: 'Coordinador de Contratación',
          correo: 'andres.perez@demo.local',
          telefono: '3001110002',
        },
        {
          nombre: 'Sofía Ramírez',
          cargo: 'Analista de Proveedores',
          correo: 'sofia.ramirez@demo.local',
          telefono: '3001110003',
        },
      ],
    },
    {
      clienteKey: 'isaCo',
      ubicacionId: ubicaciones.medellin,
      genericoNombre: 'Contacto General - DEMO - ISA Interconexión CO',
      nominales: [
        {
          nombre: 'Laura Restrepo',
          cargo: 'Líder de Abastecimiento',
          correo: 'laura.restrepo@demo.local',
          telefono: '3002220001',
        },
        {
          nombre: 'Julián Castro',
          cargo: 'Analista de Licitaciones',
          correo: 'julian.castro@demo.local',
          telefono: '3002220002',
        },
        {
          nombre: 'Camila Hoyos',
          cargo: 'Ingeniera de Proyectos',
          correo: 'camila.hoyos@demo.local',
          telefono: '3002220003',
        },
      ],
    },
    {
      clienteKey: 'emgesaCo',
      ubicacionId: ubicaciones.medellin,
      genericoNombre: 'Contacto General - DEMO - Emgesa CO',
      nominales: [
        {
          nombre: 'Ricardo Mejía',
          cargo: 'Jefe de Compras',
          correo: 'ricardo.mejia@demo.local',
          telefono: '3003330001',
        },
        {
          nombre: 'Valentina López',
          cargo: 'Especialista Técnica',
          correo: 'valentina.lopez@demo.local',
          telefono: '3003330002',
        },
        {
          nombre: 'Esteban Quintero',
          cargo: 'Coordinador Comercial',
          correo: 'esteban.quintero@demo.local',
          telefono: '3003330003',
        },
      ],
    },
    {
      clienteKey: 'cenitCo',
      ubicacionId: ubicaciones.medellin,
      genericoNombre: 'Contacto General - DEMO - Cenit Transporte CO',
      nominales: [
        {
          nombre: 'Diana Vargas',
          cargo: 'Gerente de Contratación',
          correo: 'diana.vargas@demo.local',
          telefono: '3004440001',
        },
        {
          nombre: 'Felipe Rojas',
          cargo: 'Líder HSE',
          correo: 'felipe.rojas@demo.local',
          telefono: '3004440002',
        },
        {
          nombre: 'Natalia Suárez',
          cargo: 'Analista de Costos',
          correo: 'natalia.suarez@demo.local',
          telefono: '3004440003',
        },
      ],
    },
    {
      clienteKey: 'luzDelSurPe',
      ubicacionId: ubicaciones.lima,
      genericoNombre: 'Contacto General - DEMO - Luz del Sur PE',
      nominales: [
        {
          nombre: 'Carlos Mendoza',
          cargo: 'Jefe de Licitaciones',
          correo: 'carlos.mendoza@demo.local',
          telefono: '9001110001',
        },
        {
          nombre: 'Patricia Rojas',
          cargo: 'Especialista Comercial',
          correo: 'patricia.rojas@demo.local',
          telefono: '9001110002',
        },
        {
          nombre: 'Luis Aliaga',
          cargo: 'Ingeniero de Redes',
          correo: 'luis.aliaga@demo.local',
          telefono: '9001110003',
        },
      ],
    },
    {
      clienteKey: 'southernPe',
      ubicacionId: ubicaciones.lima,
      genericoNombre: 'Contacto General - DEMO - Southern Peru PE',
      nominales: [
        {
          nombre: 'Diego Quispe',
          cargo: 'Jefe de Proyectos',
          correo: 'diego.quispe@demo.local',
          telefono: '9002220001',
        },
        {
          nombre: 'Ana Torres',
          cargo: 'Coordinadora de Compras',
          correo: 'ana.torres@demo.local',
          telefono: '9002220002',
        },
        {
          nombre: 'Miguel Salas',
          cargo: 'Supervisor de Obra',
          correo: 'miguel.salas@demo.local',
          telefono: '9002220003',
        },
      ],
    },
    {
      clienteKey: 'enelPe',
      ubicacionId: ubicaciones.lima,
      genericoNombre: 'Contacto General - DEMO - Enel Distribución PE',
      nominales: [
        {
          nombre: 'Rosa Paredes',
          cargo: 'Jefa de Abastecimiento',
          correo: 'rosa.paredes@demo.local',
          telefono: '9003330001',
        },
        {
          nombre: 'Jorge Huamán',
          cargo: 'Analista de Contratos',
          correo: 'jorge.huaman@demo.local',
          telefono: '9003330002',
        },
        {
          nombre: 'Elena Cruz',
          cargo: 'Coordinadora Técnica',
          correo: 'elena.cruz@demo.local',
          telefono: '9003330003',
        },
      ],
    },
    {
      clienteKey: 'repPe',
      ubicacionId: ubicaciones.lima,
      genericoNombre: 'Contacto General - DEMO - Red de Energía del Perú',
      nominales: [
        {
          nombre: 'Pedro Salinas',
          cargo: 'Gerente de Proyectos',
          correo: 'pedro.salinas@demo.local',
          telefono: '9004440001',
        },
        {
          nombre: 'Lucía Vega',
          cargo: 'Especialista de Licitaciones',
          correo: 'lucia.vega@demo.local',
          telefono: '9004440002',
        },
        {
          nombre: 'Héctor Ramos',
          cargo: 'Ingeniero Eléctrico',
          correo: 'hector.ramos@demo.local',
          telefono: '9004440003',
        },
      ],
    },
  ];

  const byCliente = {} as ContactosByCliente;
  let total = 0;

  for (const plantilla of plantillas) {
    const genericoResult = await conn.query(
      `INSERT INTO contactos
         (cliente_id, nombre, cargo, correo, telefono, ubicacion_id, es_generico, eliminado)
       VALUES (?, ?, NULL, NULL, NULL, ?, TRUE, FALSE)`,
      [clientes[plantilla.clienteKey], plantilla.genericoNombre, plantilla.ubicacionId],
    );
    const generico = Number(genericoResult.insertId);
    total += 1;

    const nominales: number[] = [];
    for (const nominal of plantilla.nominales) {
      const result = await conn.query(
        `INSERT INTO contactos
           (cliente_id, nombre, cargo, correo, telefono, ubicacion_id, es_generico, eliminado)
         VALUES (?, ?, ?, ?, ?, ?, FALSE, FALSE)`,
        [
          clientes[plantilla.clienteKey],
          nominal.nombre,
          nominal.cargo,
          nominal.correo,
          nominal.telefono,
          plantilla.ubicacionId,
        ],
      );
      nominales.push(Number(result.insertId));
      total += 1;
    }

    byCliente[plantilla.clienteKey] = { generico, nominales };
  }

  console.log(`✓ Contactos demo (${total}, 4 por cliente)`);
  return byCliente;
}

async function tableExists(
  conn: mariadb.Connection,
  tableName: string,
): Promise<boolean> {
  const rows = await conn.query<Array<{ cnt: number }>>(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [tableName],
  );
  return Number(rows[0]?.cnt ?? 0) > 0;
}

async function clearDemoDataset(conn: mariadb.Connection): Promise<void> {
  // Limpieza total de datos de negocio (deja usuarios, países, ubicaciones, catálogos).
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');

  const tables = [
    'kam_encuesta_respuestas',
    'kam_encuesta_contactos',
    'kam_encuestas',
    'kam_ronda_bitacora',
    'kam_ronda_correspondencias',
    'kam_rondas',
    'kams',
    'proceso_contactos',
    'proceso_comentarios',
    'proceso_calificacion_detalle',
    'proceso_calificaciones',
    'proceso_tareas',
    'proceso_indicadores',
    'validaciones_proceso',
    'alertas_enviadas',
    'usuario_fijaciones',
    'solicitudes_eliminacion',
    'relacionamientos',
    'notificaciones',
    'proyecciones',
    'procesos',
    'contactos',
    'clientes',
    'carga_masiva_log',
    'reportes_generados',
  ];

  for (const table of tables) {
    if (await tableExists(conn, table)) {
      await conn.query(`DELETE FROM \`${table}\``);
    }
  }

  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('✓ Datos de negocio anteriores eliminados (procesos, clientes, contactos, etc.)');
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
       fecha_apertura, fecha_cierre, fecha_adquisicion_derecho, anio_parametros, eliminado
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 12, FALSE, ?, ?, ?, ?, ?, 2026, FALSE)`,
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
  contactos: ContactosByCliente,
  users: UserIds,
): Promise<void> {
  const pickContactos = (clienteKey: ClienteKey, cantidad: number): number[] => {
    const bundle = contactos[clienteKey];
    const pool = [bundle.generico, ...bundle.nominales];
    return pool.slice(0, Math.min(cantidad, pool.length));
  };

  type SeedDef = ProcesoSeed & {
    clienteKey: ClienteKey;
    contactosCount: number;
  };

  const defs: SeedDef[] = [
    // Colombia — Ecopetrol
    {
      idDigitado: 'DEMO-CO-001',
      clienteKey: 'ecopetrolCo',
      paisId: paisIds.colombia,
      ubicacionId: ubicaciones.medellin,
      empresaClienteId: clientes.ecopetrolCo,
      estado: 'Por Validar',
      usuarioCreadorId: users.admin,
      moneda: 'COP',
      cuantia: 500000000,
      segmento: 'Gas Natural',
      contactosCount: 2,
    },
    {
      idDigitado: 'DEMO-CO-002',
      clienteKey: 'ecopetrolCo',
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
      contactosCount: 3,
    },
    {
      idDigitado: 'DEMO-CO-003',
      clienteKey: 'ecopetrolCo',
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
      contactosCount: 2,
    },
    {
      idDigitado: 'DEMO-CO-004',
      clienteKey: 'ecopetrolCo',
      paisId: paisIds.colombia,
      ubicacionId: ubicaciones.medellin,
      empresaClienteId: clientes.ecopetrolCo,
      estado: 'Descartado',
      usuarioCreadorId: users.operadorCo,
      moneda: 'COP',
      cuantia: 210000000,
      segmento: 'Minería',
      contactosCount: 2,
    },
    // Colombia — ISA
    {
      idDigitado: 'DEMO-CO-005',
      clienteKey: 'isaCo',
      paisId: paisIds.colombia,
      ubicacionId: ubicaciones.medellin,
      empresaClienteId: clientes.isaCo,
      estado: 'En Proceso',
      usuarioCreadorId: users.admin,
      completarTareas: 'partial',
      moneda: 'COP',
      cuantia: 750000000,
      segmento: 'Electricidad',
      contactosCount: 2,
    },
    {
      idDigitado: 'DEMO-CO-006',
      clienteKey: 'isaCo',
      paisId: paisIds.colombia,
      ubicacionId: ubicaciones.medellin,
      empresaClienteId: clientes.isaCo,
      estado: 'En Validación',
      usuarioCreadorId: users.admin,
      completarTareas: 'all',
      moneda: 'COP',
      cuantia: 1100000000,
      segmento: 'Alcantarillado',
      contactosCount: 2,
    },
    {
      idDigitado: 'DEMO-CO-007',
      clienteKey: 'isaCo',
      paisId: paisIds.colombia,
      ubicacionId: ubicaciones.medellin,
      empresaClienteId: clientes.isaCo,
      estado: 'Adjudicado',
      usuarioCreadorId: users.admin,
      completarTareas: 'all',
      moneda: 'COP',
      cuantia: 680000000,
      segmento: 'Gas Natural',
      contactosCount: 3,
    },
    {
      idDigitado: 'DEMO-CO-008',
      clienteKey: 'isaCo',
      paisId: paisIds.colombia,
      ubicacionId: ubicaciones.medellin,
      empresaClienteId: clientes.isaCo,
      estado: 'Cerrado',
      usuarioCreadorId: users.operadorCo,
      completarTareas: 'all',
      moneda: 'COP',
      cuantia: 390000000,
      segmento: 'Electricidad',
      contactosCount: 2,
    },
    // Colombia — Emgesa
    {
      idDigitado: 'DEMO-CO-009',
      clienteKey: 'emgesaCo',
      paisId: paisIds.colombia,
      ubicacionId: ubicaciones.medellin,
      empresaClienteId: clientes.emgesaCo,
      estado: 'Por Validar',
      usuarioCreadorId: users.admin,
      moneda: 'COP',
      cuantia: 560000000,
      segmento: 'Electricidad',
      contactosCount: 2,
    },
    {
      idDigitado: 'DEMO-CO-010',
      clienteKey: 'emgesaCo',
      paisId: paisIds.colombia,
      ubicacionId: ubicaciones.medellin,
      empresaClienteId: clientes.emgesaCo,
      estado: 'En Proceso',
      usuarioCreadorId: users.operadorCo,
      completarTareas: 'partial',
      moneda: 'COP',
      cuantia: 870000000,
      segmento: 'Obra Civil',
      contactosCount: 3,
    },
    {
      idDigitado: 'DEMO-CO-011',
      clienteKey: 'emgesaCo',
      paisId: paisIds.colombia,
      ubicacionId: ubicaciones.medellin,
      empresaClienteId: clientes.emgesaCo,
      estado: 'Presentado',
      usuarioCreadorId: users.admin,
      completarTareas: 'all',
      moneda: 'COP',
      cuantia: 640000000,
      segmento: 'Servicios Adicionales',
      contactosCount: 2,
    },
    {
      idDigitado: 'DEMO-CO-012',
      clienteKey: 'emgesaCo',
      paisId: paisIds.colombia,
      ubicacionId: ubicaciones.medellin,
      empresaClienteId: clientes.emgesaCo,
      estado: 'Subsanación',
      usuarioCreadorId: users.admin,
      completarTareas: 'all',
      moneda: 'COP',
      cuantia: 455000000,
      segmento: 'Electricidad',
      contactosCount: 3,
    },
    // Colombia — Cenit
    {
      idDigitado: 'DEMO-CO-013',
      clienteKey: 'cenitCo',
      paisId: paisIds.colombia,
      ubicacionId: ubicaciones.medellin,
      empresaClienteId: clientes.cenitCo,
      estado: 'En Proceso',
      usuarioCreadorId: users.operadorCo,
      completarTareas: 'partial',
      moneda: 'COP',
      cuantia: 980000000,
      segmento: 'Gas Natural',
      contactosCount: 2,
    },
    {
      idDigitado: 'DEMO-CO-014',
      clienteKey: 'cenitCo',
      paisId: paisIds.colombia,
      ubicacionId: ubicaciones.medellin,
      empresaClienteId: clientes.cenitCo,
      estado: 'En Validación',
      usuarioCreadorId: users.admin,
      completarTareas: 'all',
      moneda: 'COP',
      cuantia: 1250000000,
      segmento: 'Gas Natural',
      contactosCount: 3,
    },
    {
      idDigitado: 'DEMO-CO-015',
      clienteKey: 'cenitCo',
      paisId: paisIds.colombia,
      ubicacionId: ubicaciones.medellin,
      empresaClienteId: clientes.cenitCo,
      estado: 'Adjudicado',
      usuarioCreadorId: users.admin,
      completarTareas: 'all',
      moneda: 'COP',
      cuantia: 720000000,
      segmento: 'Obra Civil',
      contactosCount: 2,
    },
    {
      idDigitado: 'DEMO-CO-016',
      clienteKey: 'cenitCo',
      paisId: paisIds.colombia,
      ubicacionId: ubicaciones.medellin,
      empresaClienteId: clientes.cenitCo,
      estado: 'Por Validar',
      usuarioCreadorId: users.admin,
      moneda: 'COP',
      cuantia: 305000000,
      tipoInstrumento: TipoInstrumento.COTIZACION,
      segmento: 'Servicios Adicionales',
      contactosCount: 2,
    },
    // Perú — Luz del Sur
    {
      idDigitado: 'DEMO-PE-001',
      clienteKey: 'luzDelSurPe',
      paisId: paisIds.peru,
      ubicacionId: ubicaciones.lima,
      empresaClienteId: clientes.luzDelSurPe,
      estado: 'En Proceso',
      usuarioCreadorId: users.operadorPe,
      completarTareas: 'partial',
      moneda: 'PEN',
      cuantia: 1500000,
      segmento: 'Electricidad',
      contactosCount: 2,
    },
    {
      idDigitado: 'DEMO-PE-002',
      clienteKey: 'luzDelSurPe',
      paisId: paisIds.peru,
      ubicacionId: ubicaciones.lima,
      empresaClienteId: clientes.luzDelSurPe,
      estado: 'Presentado',
      usuarioCreadorId: users.admin,
      completarTareas: 'all',
      moneda: 'PEN',
      cuantia: 3200000,
      segmento: 'Gas Natural',
      contactosCount: 3,
    },
    {
      idDigitado: 'DEMO-PE-003',
      clienteKey: 'luzDelSurPe',
      paisId: paisIds.peru,
      ubicacionId: ubicaciones.lima,
      empresaClienteId: clientes.luzDelSurPe,
      estado: 'Por Validar',
      usuarioCreadorId: users.operadorPe,
      moneda: 'PEN',
      cuantia: 980000,
      segmento: 'Servicios Adicionales',
      contactosCount: 2,
    },
    {
      idDigitado: 'DEMO-PE-004',
      clienteKey: 'luzDelSurPe',
      paisId: paisIds.peru,
      ubicacionId: ubicaciones.lima,
      empresaClienteId: clientes.luzDelSurPe,
      estado: 'Cerrado',
      usuarioCreadorId: users.admin,
      completarTareas: 'all',
      moneda: 'PEN',
      cuantia: 2100000,
      segmento: 'Electricidad',
      contactosCount: 2,
    },
    // Perú — Southern
    {
      idDigitado: 'DEMO-PE-005',
      clienteKey: 'southernPe',
      paisId: paisIds.peru,
      ubicacionId: ubicaciones.lima,
      empresaClienteId: clientes.southernPe,
      estado: 'Por Validar',
      usuarioCreadorId: users.admin,
      moneda: 'PEN',
      cuantia: 2100000,
      segmento: 'Obra Civil',
      tipoInstrumento: TipoInstrumento.COTIZACION,
      contactosCount: 2,
    },
    {
      idDigitado: 'DEMO-PE-006',
      clienteKey: 'southernPe',
      paisId: paisIds.peru,
      ubicacionId: ubicaciones.lima,
      empresaClienteId: clientes.southernPe,
      estado: 'Subsanación',
      usuarioCreadorId: users.operadorPe,
      completarTareas: 'all',
      moneda: 'PEN',
      cuantia: 1850000,
      segmento: 'Electricidad',
      contactosCount: 3,
    },
    {
      idDigitado: 'DEMO-PE-007',
      clienteKey: 'southernPe',
      paisId: paisIds.peru,
      ubicacionId: ubicaciones.lima,
      empresaClienteId: clientes.southernPe,
      estado: 'En Proceso',
      usuarioCreadorId: users.admin,
      completarTareas: 'partial',
      moneda: 'PEN',
      cuantia: 2750000,
      segmento: 'Minería',
      contactosCount: 2,
    },
    {
      idDigitado: 'DEMO-PE-008',
      clienteKey: 'southernPe',
      paisId: paisIds.peru,
      ubicacionId: ubicaciones.lima,
      empresaClienteId: clientes.southernPe,
      estado: 'Adjudicado',
      usuarioCreadorId: users.admin,
      completarTareas: 'all',
      moneda: 'PEN',
      cuantia: 4100000,
      segmento: 'Obra Civil',
      contactosCount: 3,
    },
    // Perú — Enel
    {
      idDigitado: 'DEMO-PE-009',
      clienteKey: 'enelPe',
      paisId: paisIds.peru,
      ubicacionId: ubicaciones.lima,
      empresaClienteId: clientes.enelPe,
      estado: 'En Proceso',
      usuarioCreadorId: users.operadorPe,
      completarTareas: 'partial',
      moneda: 'PEN',
      cuantia: 1650000,
      segmento: 'Electricidad',
      contactosCount: 2,
    },
    {
      idDigitado: 'DEMO-PE-010',
      clienteKey: 'enelPe',
      paisId: paisIds.peru,
      ubicacionId: ubicaciones.lima,
      empresaClienteId: clientes.enelPe,
      estado: 'En Validación',
      usuarioCreadorId: users.admin,
      completarTareas: 'all',
      moneda: 'PEN',
      cuantia: 2900000,
      segmento: 'Electricidad',
      contactosCount: 3,
    },
    {
      idDigitado: 'DEMO-PE-011',
      clienteKey: 'enelPe',
      paisId: paisIds.peru,
      ubicacionId: ubicaciones.lima,
      empresaClienteId: clientes.enelPe,
      estado: 'Presentado',
      usuarioCreadorId: users.operadorPe,
      completarTareas: 'all',
      moneda: 'PEN',
      cuantia: 1340000,
      segmento: 'Servicios Adicionales',
      contactosCount: 2,
    },
    {
      idDigitado: 'DEMO-PE-012',
      clienteKey: 'enelPe',
      paisId: paisIds.peru,
      ubicacionId: ubicaciones.lima,
      empresaClienteId: clientes.enelPe,
      estado: 'Descartado',
      usuarioCreadorId: users.admin,
      moneda: 'PEN',
      cuantia: 760000,
      segmento: 'Gas Natural',
      contactosCount: 2,
    },
    // Perú — REP
    {
      idDigitado: 'DEMO-PE-013',
      clienteKey: 'repPe',
      paisId: paisIds.peru,
      ubicacionId: ubicaciones.lima,
      empresaClienteId: clientes.repPe,
      estado: 'Por Validar',
      usuarioCreadorId: users.operadorPe,
      moneda: 'PEN',
      cuantia: 2480000,
      segmento: 'Electricidad',
      contactosCount: 2,
    },
    {
      idDigitado: 'DEMO-PE-014',
      clienteKey: 'repPe',
      paisId: paisIds.peru,
      ubicacionId: ubicaciones.lima,
      empresaClienteId: clientes.repPe,
      estado: 'En Proceso',
      usuarioCreadorId: users.admin,
      completarTareas: 'all',
      moneda: 'PEN',
      cuantia: 3650000,
      segmento: 'Obra Civil',
      fechaAdquisicionDerecho: '2026-03-01',
      contactosCount: 3,
    },
    {
      idDigitado: 'DEMO-PE-015',
      clienteKey: 'repPe',
      paisId: paisIds.peru,
      ubicacionId: ubicaciones.lima,
      empresaClienteId: clientes.repPe,
      estado: 'Subsanación',
      usuarioCreadorId: users.operadorPe,
      completarTareas: 'all',
      moneda: 'PEN',
      cuantia: 1980000,
      segmento: 'Electricidad',
      contactosCount: 2,
    },
    {
      idDigitado: 'DEMO-PE-016',
      clienteKey: 'repPe',
      paisId: paisIds.peru,
      ubicacionId: ubicaciones.lima,
      empresaClienteId: clientes.repPe,
      estado: 'Adjudicado',
      usuarioCreadorId: users.admin,
      completarTareas: 'all',
      moneda: 'PEN',
      cuantia: 4520000,
      segmento: 'Electricidad',
      contactosCount: 3,
    },
  ];

  const idsByDigitado = new Map<string, number>();
  let vinculosInsertados = 0;

  for (const def of defs) {
    const { clienteKey, contactosCount, ...proceso } = def;
    const procesoId = await insertProceso(conn, proceso);
    idsByDigitado.set(proceso.idDigitado, procesoId);

    for (const contactoId of pickContactos(clienteKey, contactosCount)) {
      await conn.query(
        `INSERT IGNORE INTO proceso_contactos (proceso_id, contacto_id)
         VALUES (?, ?)`,
        [procesoId, contactoId],
      );
      vinculosInsertados += 1;
    }
  }

  for (const digitado of ['DEMO-CO-006', 'DEMO-CO-014', 'DEMO-PE-010'] as const) {
    const procesoId = idsByDigitado.get(digitado);
    if (!procesoId) {
      continue;
    }
    await conn.query(
      `INSERT INTO validaciones_proceso (proceso_id, validador_id, veredicto)
       VALUES (?, ?, 'Pendiente')`,
      [procesoId, users.validador],
    );
  }

  console.log(
    `✓ Procesos demo (${defs.length}), ${vinculosInsertados} vínculos proceso↔contacto, 3 en validación pendiente`,
  );
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
      fecha: '2026-04-22',
      estado: 'Lejano',
      venta: 450000000,
      facturacion: 320000000,
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
      fecha: '2026-07-05',
      estado: 'Proximo',
      venta: 670000000,
      facturacion: 510000000,
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
      paisId: paisIds.colombia,
      anio: 2026,
      fecha: '2026-09-12',
      estado: 'Sale este mes',
      venta: 530000000,
      facturacion: 410000000,
    },
    {
      paisId: paisIds.peru,
      anio: 2026,
      fecha: '2026-03-28',
      estado: 'Lejano',
      venta: 1900000,
      facturacion: 1400000,
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
      fecha: '2026-08-08',
      estado: 'Proximo',
      venta: 1750000,
      facturacion: 1300000,
    },
    {
      paisId: paisIds.peru,
      anio: 2026,
      fecha: '2026-09-18',
      estado: 'Sale este mes',
      venta: 2800000,
      facturacion: 2100000,
    },
    {
      paisId: paisIds.peru,
      anio: 2026,
      fecha: '2026-10-02',
      estado: 'Sale este mes',
      venta: 2100000,
      facturacion: 1600000,
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

  console.log(`✓ Proyecciones demo (${proyecciones.length})`);
}

async function insertRelacionamientos(
  conn: mariadb.Connection,
  contactos: ContactosByCliente,
  users: UserIds,
): Promise<void> {
  const haceQuinceDias = new Date();
  haceQuinceDias.setDate(haceQuinceDias.getDate() - 15);
  const fechaVencida = haceQuinceDias.toISOString().slice(0, 10);
  const fechaAlertaVencida = new Date();
  fechaAlertaVencida.setDate(fechaAlertaVencida.getDate() - 1);
  const fechaAlertaVencidaStr = fechaAlertaVencida.toISOString().slice(0, 10);

  const items: Array<{
    contactoId: number;
    emisorId: number;
    canal: string;
    mensaje: string;
    fechaMensaje: string;
    fechaAlerta: string;
    respuesta?: string;
    fechaRespuesta?: string;
    resultado: string;
    fechaReunion?: string;
  }> = [
    {
      contactoId: contactos.ecopetrolCo.nominales[0],
      emisorId: users.operadorCo,
      canal: 'Correo',
      mensaje: 'Seguimiento demo con respuesta recibida.',
      fechaMensaje: '2026-02-01',
      fechaAlerta: '2026-02-08',
      respuesta: 'Cliente interesado en reunión.',
      fechaRespuesta: '2026-02-05',
      resultado: 'Reunión programada',
      fechaReunion: '2026-02-12',
    },
    {
      contactoId: contactos.luzDelSurPe.nominales[0],
      emisorId: users.operadorPe,
      canal: 'Llamada',
      mensaje: 'Seguimiento demo sin respuesta (vencido).',
      fechaMensaje: fechaVencida,
      fechaAlerta: fechaAlertaVencidaStr,
      resultado: 'Ninguno',
    },
    {
      contactoId: contactos.isaCo.nominales[0],
      emisorId: users.operadorCo,
      canal: 'Presencial',
      mensaje: 'Visita comercial DEMO ISA.',
      fechaMensaje: '2026-02-18',
      fechaAlerta: '2026-02-25',
      respuesta: 'Se acordó enviar información técnica.',
      fechaRespuesta: '2026-02-20',
      resultado: 'Ninguno',
    },
    {
      contactoId: contactos.southernPe.nominales[0],
      emisorId: users.operadorPe,
      canal: 'Mensaje',
      mensaje: 'Consulta DEMO Southern sobre cronograma.',
      fechaMensaje: '2026-02-22',
      fechaAlerta: '2026-03-01',
      resultado: 'Ninguno',
    },
    {
      contactoId: contactos.emgesaCo.nominales[1],
      emisorId: users.operadorCo,
      canal: 'Correo',
      mensaje: 'Envío de capacidad técnica DEMO Emgesa.',
      fechaMensaje: '2026-02-10',
      fechaAlerta: '2026-02-17',
      respuesta: 'Solicitan visita a planta.',
      fechaRespuesta: '2026-02-14',
      resultado: 'Reunión programada',
      fechaReunion: '2026-02-28',
    },
    {
      contactoId: contactos.cenitCo.nominales[0],
      emisorId: users.admin,
      canal: 'Llamada',
      mensaje: 'Aclaración de alcance DEMO Cenit.',
      fechaMensaje: '2026-02-12',
      fechaAlerta: '2026-02-19',
      resultado: 'Referido a tercero',
    },
    {
      contactoId: contactos.enelPe.nominales[0],
      emisorId: users.operadorPe,
      canal: 'Correo',
      mensaje: 'Presentación comercial DEMO Enel.',
      fechaMensaje: '2026-02-15',
      fechaAlerta: '2026-02-22',
      respuesta: 'Interesados en cotización.',
      fechaRespuesta: '2026-02-18',
      resultado: 'Ninguno',
    },
    {
      contactoId: contactos.repPe.nominales[1],
      emisorId: users.operadorPe,
      canal: 'Presencial',
      mensaje: 'Reunión técnica DEMO REP.',
      fechaMensaje: '2026-02-20',
      fechaAlerta: '2026-02-27',
      resultado: 'Ninguno',
    },
  ];

  for (const item of items) {
    await conn.query(
      `INSERT INTO relacionamientos
         (contacto_id, emisor_usuario_id, canal, mensaje, fecha_mensaje, fecha_alerta_respuesta,
          respuesta, fecha_respuesta, resultado, fecha_reunion, eliminado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
      [
        item.contactoId,
        item.emisorId,
        item.canal,
        item.mensaje,
        item.fechaMensaje,
        item.fechaAlerta,
        item.respuesta ?? null,
        item.fechaRespuesta ?? null,
        item.resultado,
        item.fechaReunion ?? null,
      ],
    );
  }

  console.log(`✓ Relacionamientos demo (${items.length})`);
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

async function main(): Promise<void> {
  const conn = await getConnection();

  try {
    const paisIds = await resolvePaisIds(conn);
    const ubicaciones = await resolveUbicacionIds(conn, paisIds);
    const users = await resolveUserIds(conn);

    if (FORCE) {
      await clearDemoDataset(conn);
    } else if (await isDemoLoaded(conn)) {
      console.log(
        'Demo ya cargado (proceso DEMO-CO-001 o clientes DEMO existen). Usa --force para regenerar todo el dataset.',
      );
      return;
    }

    await insertParametros(conn, paisIds, users.admin);
    const clientes = await insertClientes(conn, paisIds, ubicaciones);
    const contactos = await insertContactos(conn, clientes, ubicaciones);
    await insertProcesos(conn, paisIds, ubicaciones, clientes, contactos, users);
    await insertProyecciones(conn, paisIds);
    await insertRelacionamientos(conn, contactos, users);
    await insertSolicitudEliminacion(conn, clientes.southernPe, users.operadorCo);

    console.log(
      FORCE
        ? '\n✓ Dataset demo regenerado (--force).'
        : '\n✓ Dataset demo cargado correctamente.',
    );
  } finally {
    await conn.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
