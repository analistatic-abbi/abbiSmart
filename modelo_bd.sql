-- ============================================================================
-- MODELO DE BASE DE DATOS — Sistema de Gestión de Licitaciones (ABBI)
-- Motor: MySQL 8.0+ / MariaDB 10.x
-- Basado en: requisitos_licitaciones.csv/xlsx (102 requisitos, 13 módulos)
-- Versión 2: incorpora 5 roles, código de proceso compuesto, Empresa↔Cliente,
-- eliminación segura (soft delete + solicitud), validación multi-validador,
-- notificaciones internas, cadena de Proyecciones 1:1, países extensibles.
-- ============================================================================

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS licitaciones_abbi
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE licitaciones_abbi;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- 1. PAÍSES Y CATÁLOGOS BASE (TRX-010: extensible, hoy Colombia y Perú)
-- ============================================================================

CREATE TABLE paises (
    id      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre  VARCHAR(100) NOT NULL,
    activo  BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE KEY uk_pais_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catálogo extensible de países soportados (TRX-010)';

CREATE TABLE ubicaciones_geograficas (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pais_id             BIGINT UNSIGNED NOT NULL,
    departamento        VARCHAR(150) NOT NULL,
    municipio_provincia VARCHAR(150) NOT NULL,
    CONSTRAINT fk_ubicacion_pais FOREIGN KEY (pais_id) REFERENCES paises(id),
    UNIQUE KEY uk_ubicacion (pais_id, departamento, municipio_provincia),
    INDEX idx_ubicacion_pais_depto (pais_id, departamento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catálogo Departamento/Provincia-Municipio (REG-008)';

CREATE TABLE configuracion_sistema (
    clave               VARCHAR(100) PRIMARY KEY,
    valor               VARCHAR(255) NOT NULL,
    descripcion         VARCHAR(255) NULL,
    usuario_modifico_id BIGINT UNSIGNED NULL,
    fecha_modificacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Valores configurables por el Administrador (REL-007, TRX-014, SGP-006)';

-- ============================================================================
-- 2. USUARIOS Y AUTENTICACIÓN (PERF-001 a PERF-014)
-- ============================================================================

CREATE TABLE usuarios (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre              VARCHAR(150) NOT NULL,
    correo              VARCHAR(255) NOT NULL,
    password_hash       VARCHAR(255) NULL,
    rol                 ENUM('Administrador','Supervisor del Sistema','Operador','Visitante','Validador') NOT NULL,
    pais_id             BIGINT UNSIGNED NULL,  -- Obligatorio y fijo para Operador; NULL para los demás roles (eligen país por sesión, PERF-007)
    estado              ENUM('Inactivo','Activo','Bloqueada') NOT NULL DEFAULT 'Inactivo',
    intentos_fallidos   TINYINT UNSIGNED NOT NULL DEFAULT 0,
    fecha_creacion      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eliminado           BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_eliminacion   DATETIME NULL,
    eliminado_por_id    BIGINT UNSIGNED NULL,
    UNIQUE KEY uk_usuarios_correo (correo),
    CONSTRAINT fk_usuario_pais FOREIGN KEY (pais_id) REFERENCES paises(id),
    CONSTRAINT chk_operador_requiere_pais CHECK (rol <> 'Operador' OR pais_id IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Usuarios del sistema, 5 roles (PERF-001, PERF-004, PERF-011)';

ALTER TABLE configuracion_sistema
    ADD CONSTRAINT fk_config_usuario FOREIGN KEY (usuario_modifico_id) REFERENCES usuarios(id);

ALTER TABLE usuarios
    ADD CONSTRAINT fk_usuario_eliminador FOREIGN KEY (eliminado_por_id) REFERENCES usuarios(id);

CREATE TABLE sesiones_usuario (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id          BIGINT UNSIGNED NOT NULL,
    pais_sesion_id      BIGINT UNSIGNED NOT NULL,
    token_sesion        VARCHAR(255) NOT NULL,
    fecha_inicio        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion    DATETIME NOT NULL,
    UNIQUE KEY uk_sesion_token (token_sesion),
    CONSTRAINT fk_sesion_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    CONSTRAINT fk_sesion_pais FOREIGN KEY (pais_sesion_id) REFERENCES paises(id),
    INDEX idx_sesion_usuario_activa (usuario_id, fecha_expiracion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='País de trabajo elegido por Administrador/Supervisor del Sistema/Visitante/Validador en cada sesión (PERF-007)';

CREATE TABLE tokens_activacion (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id          BIGINT UNSIGNED NOT NULL,
    token               VARCHAR(255) NOT NULL,
    fecha_creacion      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion    DATETIME NOT NULL,
    usado               BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE KEY uk_token (token),
    CONSTRAINT fk_token_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    INDEX idx_token_usuario (usuario_id, usado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Enlaces de un solo uso para activación, restablecimiento de contraseña y desbloqueo (PERF-009, PERF-010, PERF-011)';

CREATE TABLE log_auditoria (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id          BIGINT UNSIGNED NULL,
    accion              VARCHAR(50) NOT NULL,
    entidad_tipo        VARCHAR(50) NOT NULL,
    entidad_id          BIGINT UNSIGNED NULL,
    campo               VARCHAR(100) NULL,
    valor_anterior      TEXT NULL,
    valor_nuevo         TEXT NULL,
    fecha_hora          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    INDEX idx_log_entidad (entidad_tipo, entidad_id),
    INDEX idx_log_usuario_fecha (usuario_id, fecha_hora)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Auditoría transversal de acciones y cambios (PERF-006, TRX-001)';

-- Solicitud de eliminación: Supervisor del Sistema/Operador solicitan, Administrador resuelve (TRX-012)
CREATE TABLE solicitudes_eliminacion (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    entidad_tipo            VARCHAR(50) NOT NULL,
    entidad_id              BIGINT UNSIGNED NOT NULL,
    usuario_solicitante_id  BIGINT UNSIGNED NOT NULL,
    motivo                  TEXT NOT NULL,
    estado                  ENUM('Pendiente','Aprobada','Rechazada') NOT NULL DEFAULT 'Pendiente',
    usuario_resuelve_id     BIGINT UNSIGNED NULL,
    fecha_solicitud         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion        DATETIME NULL,
    CONSTRAINT fk_solicitud_usuario_solicitante FOREIGN KEY (usuario_solicitante_id) REFERENCES usuarios(id),
    CONSTRAINT fk_solicitud_usuario_resuelve FOREIGN KEY (usuario_resuelve_id) REFERENCES usuarios(id),
    INDEX idx_solicitud_entidad (entidad_tipo, entidad_id),
    INDEX idx_solicitud_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Solicitudes de eliminación pendientes de aprobación del Administrador (TRX-012)';

-- Notificaciones internas (TRX-015): todas las alertas del sistema, excepto la de Validadores (que es por correo, VAL-006)
CREATE TABLE notificaciones (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id      BIGINT UNSIGNED NOT NULL,
    tipo            VARCHAR(50) NOT NULL,   -- 'proyeccion_proxima','proyeccion_sale_este_mes','relacionamiento_vencido', etc.
    mensaje         VARCHAR(500) NOT NULL,
    entidad_tipo    VARCHAR(50) NULL,
    entidad_id      BIGINT UNSIGNED NULL,
    leida           BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notificacion_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    INDEX idx_notificacion_usuario (usuario_id, leida)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bandeja de notificaciones dentro del sistema (TRX-015)';

CREATE TABLE carga_masiva_log (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    entidad_tipo        VARCHAR(50) NOT NULL,   -- 'proyeccion','cliente','contacto' únicamente (TRX-007)
    usuario_id          BIGINT UNSIGNED NOT NULL,
    archivo_nombre      VARCHAR(255) NOT NULL,
    fecha_carga         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    filas_exitosas      INT UNSIGNED NOT NULL DEFAULT 0,
    filas_rechazadas    INT UNSIGNED NOT NULL DEFAULT 0,
    detalle_errores     JSON NULL,
    CONSTRAINT fk_carga_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Reporte de cada carga masiva (TRX-007), limitada a Proyecciones/Clientes/Contactos';

-- ============================================================================
-- 3. PARÁMETROS FINANCIEROS (PAR-001 a PAR-007)
-- ============================================================================

CREATE TABLE parametros_financieros (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pais_id             BIGINT UNSIGNED NOT NULL,
    indicador_codigo    ENUM('KTNO','PN','ROE','ROA','MDN','IL','E','RCI') NOT NULL,
    anio                SMALLINT UNSIGNED NOT NULL,
    valor               DECIMAL(18,4) NOT NULL,
    regla_cumplimiento  ENUM('Mayor o igual al requerido','Menor o igual al requerido') NOT NULL,
    usuario_modifico_id BIGINT UNSIGNED NOT NULL,
    fecha_modificacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_parametro_pais FOREIGN KEY (pais_id) REFERENCES paises(id),
    CONSTRAINT fk_parametro_usuario FOREIGN KEY (usuario_modifico_id) REFERENCES usuarios(id),
    UNIQUE KEY uk_parametro_anio (pais_id, indicador_codigo, anio),
    INDEX idx_parametro_vigente (pais_id, indicador_codigo, anio DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Indicadores financieros por país y año; cada fila nueva es un año adicional (PAR-001 a PAR-003)';

-- ============================================================================
-- 4. CRM: CLIENTE Y CONTACTOS (CLI, CON) — se crean antes que Procesos porque
--    Empresa (REG-013) ahora referencia a Cliente.
-- ============================================================================

CREATE TABLE clientes (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    empresa             VARCHAR(255) NOT NULL,
    pais_id             BIGINT UNSIGNED NOT NULL,
    ubicacion_id        BIGINT UNSIGNED NOT NULL,
    segmento            ENUM(
                            'Acabados de Construcción','Actividades de Organizaciones Profesionales','Construcción',
                            'Consultorías y Servicios','Energía Eléctrica','Energía Renovable','Gas Natural',
                            'Hidrocarburos','Manufactura','Minería','Servicios Petroleros','Otro'
                        ) NOT NULL,  -- Aplica a ambos países (CLI-002)
    segmento_otro       VARCHAR(255) NULL,
    fecha_creacion      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eliminado           BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_eliminacion   DATETIME NULL,
    eliminado_por_id    BIGINT UNSIGNED NULL,
    CONSTRAINT fk_cliente_pais FOREIGN KEY (pais_id) REFERENCES paises(id),
    CONSTRAINT fk_cliente_ubicacion FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones_geograficas(id),
    CONSTRAINT fk_cliente_eliminador FOREIGN KEY (eliminado_por_id) REFERENCES usuarios(id),
    CONSTRAINT chk_cliente_segmento_otro CHECK (segmento <> 'Otro' OR segmento_otro IS NOT NULL),
    INDEX idx_cliente_pais (pais_id),
    INDEX idx_cliente_eliminado (eliminado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Clientes/empresas prospecto del CRM (CLI-001, CLI-002)';

CREATE TABLE contactos (
    id                          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cliente_id                  BIGINT UNSIGNED NOT NULL,
    nombre                      VARCHAR(255) NOT NULL,
    cargo                       VARCHAR(150) NULL,
    telefono                    VARCHAR(50) NULL,
    correo                      VARCHAR(255) NULL,
    ubicacion_id                BIGINT UNSIGNED NOT NULL,
    es_generico                 BOOLEAN NOT NULL DEFAULT FALSE,
    referido_por_contacto_id    BIGINT UNSIGNED NULL,
    fecha_creacion              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eliminado                   BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_eliminacion           DATETIME NULL,
    eliminado_por_id            BIGINT UNSIGNED NULL,
    CONSTRAINT fk_contacto_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    CONSTRAINT fk_contacto_ubicacion FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones_geograficas(id),
    CONSTRAINT fk_contacto_referido FOREIGN KEY (referido_por_contacto_id) REFERENCES contactos(id),
    CONSTRAINT fk_contacto_eliminador FOREIGN KEY (eliminado_por_id) REFERENCES usuarios(id),
    INDEX idx_contacto_cliente (cliente_id),
    INDEX idx_contacto_eliminado (eliminado)
    -- Nota: MySQL/MariaDB no permite un CHECK que compare contra la columna AUTO_INCREMENT
    -- de la misma tabla; evitar que un contacto se refiera a sí mismo (referido_por_contacto_id <> id)
    -- queda como validación de la aplicación, no de la base de datos.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Personas de contacto de cada Cliente, incluido el genérico automático (CON-001 a CON-003)';

-- ============================================================================
-- 5. REGISTRO DE PROCESO, FECHAS Y CÁLCULOS AUTOMÁTICOS (REG, FEC, SGP, REV)
-- ============================================================================

CREATE TABLE procesos (
    id                          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    -- Registro de Proceso (REG-001 a REG-013)
    id_digitado                 VARCHAR(50) NOT NULL,           -- Lo que el usuario escribe (REG-002)
    codigo                      VARCHAR(70) NULL,                -- [id_digitado]-[id] o [id_digitado]-d-[id]; lo completa sp_generar_codigo_proceso (REG-002)
    empresa_cliente_id          BIGINT UNSIGNED NULL,             -- Empresa = Cliente registrado (REG-013)
    empresa_otro                VARCHAR(255) NULL,                -- Solo si la entidad contratante no es un Cliente registrado (REG-013)
    pais_id                     BIGINT UNSIGNED NOT NULL,
    ubicacion_id                BIGINT UNSIGNED NOT NULL,
    portal_origen                VARCHAR(255) NULL,
    link                         VARCHAR(500) NULL,
    cuantia                      DECIMAL(18,2) NOT NULL,
    moneda                       ENUM('COP','PEN') NOT NULL,      -- Derivada automáticamente del país del usuario (REG-005)
    segmento                     ENUM('Gas Natural','Alcantarillado','Electricidad','Obra Civil','Servicios Adicionales') NOT NULL,  -- Sin 'Otro' (REG-010 retirado)
    tipo_proceso                 ENUM('Periódico','No periódico') NOT NULL,          -- REG-004
    tipo_instrumento             ENUM('RFI','Cotización','Licitación') NOT NULL,     -- REG-007
    plazo_ejecucion_meses        SMALLINT UNSIGNED NOT NULL,       -- Siempre en MESES (TRX-004)
    experiencia                  BOOLEAN NOT NULL DEFAULT FALSE,
    observacion                  TEXT NULL,
    estado                       ENUM('Por Validar','En Proceso','Descartado','En Validación','Presentado','Subsanación','Adjudicado','Cerrado') NOT NULL DEFAULT 'Por Validar',  -- REV-002
    usuario_creador_id           BIGINT UNSIGNED NOT NULL,
    fecha_creacion                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Registro de Fechas (FEC-001 a FEC-006). "Fecha de Presentación" del Excel de origen = fecha_cierre.
    fecha_apertura                DATE NOT NULL,
    fecha_manifestacion_interes   DATE NULL,
    fecha_adquisicion_derecho     DATE NULL,   -- Deshabilitada si tipo_instrumento = RFI (REG-012)
    fecha_reunion_aclaratoria     DATE NULL,
    fecha_visita_tecnica          DATE NULL,
    fecha_solicitudes_aclaracion  DATE NULL,
    fecha_respuesta_aclaracion    DATE NULL,   -- Nueva fecha (FEC-001)
    fecha_limitacion_mypymes      DATE NULL,
    fecha_cierre                  DATE NOT NULL,

    -- Seguimiento de Procesos calculado (SGP-001, SGP-002): columnas generadas, deterministas.
    fecha_inicio_ejecucion DATE GENERATED ALWAYS AS (
        DATE_ADD(fecha_cierre, INTERVAL 61 DAY)
    ) STORED,
    fecha_finalizacion DATE GENERATED ALWAYS AS (
        DATE_ADD(fecha_inicio_ejecucion, INTERVAL plazo_ejecucion_meses MONTH)
    ) STORED,

    -- Eliminación segura (TRX-011)
    eliminado            BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_eliminacion    DATETIME NULL,
    eliminado_por_id     BIGINT UNSIGNED NULL,

    CONSTRAINT fk_proceso_empresa_cliente FOREIGN KEY (empresa_cliente_id) REFERENCES clientes(id),
    CONSTRAINT fk_proceso_pais FOREIGN KEY (pais_id) REFERENCES paises(id),
    CONSTRAINT fk_proceso_ubicacion FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones_geograficas(id),
    CONSTRAINT fk_proceso_usuario_creador FOREIGN KEY (usuario_creador_id) REFERENCES usuarios(id),
    CONSTRAINT fk_proceso_eliminador FOREIGN KEY (eliminado_por_id) REFERENCES usuarios(id),
    CONSTRAINT chk_proceso_observacion CHECK (experiencia = TRUE OR observacion IS NULL),
    CONSTRAINT chk_proceso_empresa CHECK (
        (empresa_cliente_id IS NOT NULL AND empresa_otro IS NULL)
        OR (empresa_cliente_id IS NULL AND empresa_otro IS NOT NULL)
    ),
    CONSTRAINT chk_rfi_sin_derecho_participar CHECK (tipo_instrumento <> 'RFI' OR fecha_adquisicion_derecho IS NULL),
    CONSTRAINT chk_fechas_dentro_rango CHECK (
        fecha_cierre >= fecha_apertura
        AND (fecha_manifestacion_interes  IS NULL OR fecha_manifestacion_interes  BETWEEN fecha_apertura AND fecha_cierre)
        AND (fecha_adquisicion_derecho    IS NULL OR fecha_adquisicion_derecho    BETWEEN fecha_apertura AND fecha_cierre)
        AND (fecha_reunion_aclaratoria    IS NULL OR fecha_reunion_aclaratoria    BETWEEN fecha_apertura AND fecha_cierre)
        AND (fecha_visita_tecnica         IS NULL OR fecha_visita_tecnica         BETWEEN fecha_apertura AND fecha_cierre)
        AND (fecha_solicitudes_aclaracion IS NULL OR fecha_solicitudes_aclaracion BETWEEN fecha_apertura AND fecha_cierre)
        AND (fecha_respuesta_aclaracion   IS NULL OR fecha_respuesta_aclaracion   BETWEEN fecha_apertura AND fecha_cierre)
        AND (fecha_limitacion_mypymes     IS NULL OR fecha_limitacion_mypymes     BETWEEN fecha_apertura AND fecha_cierre)
    ),
    UNIQUE KEY uk_proceso_codigo (codigo),
    INDEX idx_proceso_pais_estado (pais_id, estado),
    INDEX idx_proceso_segmento (segmento),
    INDEX idx_proceso_tipo_proceso (tipo_proceso),
    INDEX idx_proceso_eliminado (eliminado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Procesos de licitación (REG, FEC, SGP, REV)';

-- Genera el Código de Proceso combinando id_digitado + id, con sufijo "d" en medio si se repite (REG-002).
-- MySQL/MariaDB no permite que un trigger AFTER INSERT actualice la misma tabla que lo disparó (error 1442),
-- por eso esto es un procedimiento almacenado: la aplicación debe llamarlo justo después de cada INSERT en
-- procesos, pasándole el id recién insertado (LAST_INSERT_ID()).
DELIMITER $$
CREATE PROCEDURE sp_generar_codigo_proceso(IN p_proceso_id BIGINT UNSIGNED)
BEGIN
    DECLARE v_id_digitado VARCHAR(50);
    DECLARE v_veces INT;
    SELECT id_digitado INTO v_id_digitado FROM procesos WHERE id = p_proceso_id;
    SELECT COUNT(*) INTO v_veces FROM procesos WHERE id_digitado = v_id_digitado;
    IF v_veces > 1 THEN
        UPDATE procesos SET codigo = CONCAT(v_id_digitado, '-d-', p_proceso_id) WHERE id = p_proceso_id;
    ELSE
        UPDATE procesos SET codigo = CONCAT(v_id_digitado, '-', p_proceso_id) WHERE id = p_proceso_id;
    END IF;
END$$
DELIMITER ;

-- Valor requerido por indicador financiero, específico de cada proceso (PAR-004, PAR-005, PAR-007)
CREATE TABLE proceso_indicadores (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    proceso_id              BIGINT UNSIGNED NOT NULL,
    indicador_codigo        ENUM('KTNO','PN','ROE','ROA','MDN','IL','E','RCI') NOT NULL,
    valor_requerido         DECIMAL(18,4) NULL,
    parametro_financiero_id BIGINT UNSIGNED NULL,
    cumple                  ENUM('Cumple','No Cumple') NULL,
    CONSTRAINT fk_indicador_proceso FOREIGN KEY (proceso_id) REFERENCES procesos(id),
    CONSTRAINT fk_indicador_parametro FOREIGN KEY (parametro_financiero_id) REFERENCES parametros_financieros(id),
    CONSTRAINT chk_indicador_coherente CHECK (
        (valor_requerido IS NULL AND parametro_financiero_id IS NULL AND cumple IS NULL)
        OR (valor_requerido IS NOT NULL AND parametro_financiero_id IS NOT NULL AND cumple IS NOT NULL)
    ),
    UNIQUE KEY uk_proceso_indicador (proceso_id, indicador_codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Valor requerido y cumplimiento por indicador y proceso, con referencia trazable al parámetro usado (PAR-004, PAR-005)';

-- Tareas de la lista de seguimiento, una fila por tarea aplicable a cada proceso (SEG-001 a SEG-005)
CREATE TABLE proceso_tareas (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    proceso_id          BIGINT UNSIGNED NOT NULL,
    tarea_codigo        ENUM(
                            'Creacion_Carpeta','Manifestacion_Interes','Adquisicion_Derecho_Participar',
                            'Preparar_Doc_Juridica','Preparar_Doc_Tecnica','Preparar_Doc_Financiera',
                            'Estructuracion_Administracion',
                            'Solicitud_Pago_Poliza','Pago_Poliza','Elaboracion_Propuesta_Economica',
                            'Validacion_Area_Tecnica','Envio_Propuesta'
                        ) NOT NULL,
    aplica              BOOLEAN NOT NULL DEFAULT TRUE,   -- FALSE para tareas de póliza si el proceso es RFI (SEG-005)
    evidencia            TEXT NULL,                       -- Obligatoria para poder completar la tarea (SEG-002)
    completada            BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_completada       DATETIME NULL,
    usuario_completo_id    BIGINT UNSIGNED NULL,
    CONSTRAINT fk_tarea_proceso FOREIGN KEY (proceso_id) REFERENCES procesos(id),
    CONSTRAINT fk_tarea_usuario FOREIGN KEY (usuario_completo_id) REFERENCES usuarios(id),
    CONSTRAINT chk_tarea_requiere_evidencia CHECK (completada = FALSE OR evidencia IS NOT NULL),
    UNIQUE KEY uk_proceso_tarea (proceso_id, tarea_codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Estado y evidencia de cada tarea de seguimiento por proceso (SEG-001, SEG-002, SEG-005)';

-- ============================================================================
-- 6. VALIDACIÓN DE PROCESOS — flujo multi-validador (VAL-001 a VAL-006)
-- ============================================================================

CREATE TABLE validaciones_proceso (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    proceso_id          BIGINT UNSIGNED NOT NULL,
    validador_id        BIGINT UNSIGNED NOT NULL,
    veredicto           ENUM('Pendiente','Aprobado','Requiere Corrección') NOT NULL DEFAULT 'Pendiente',
    comentario          TEXT NULL,   -- Obligatorio cuando veredicto = 'Requiere Corrección' (validación de aplicación)
    fecha_asignacion    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_veredicto      DATETIME NULL,
    CONSTRAINT fk_validacion_proceso FOREIGN KEY (proceso_id) REFERENCES procesos(id),
    CONSTRAINT fk_validacion_validador FOREIGN KEY (validador_id) REFERENCES usuarios(id),
    UNIQUE KEY uk_proceso_validador (proceso_id, validador_id),
    INDEX idx_validacion_validador_pendiente (validador_id, veredicto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Validadores asignados a cada proceso y su veredicto (VAL-001 a VAL-005)';

-- ============================================================================
-- 7. PROYECCIÓN DE MERCADO (PRY-001 a PRY-015)
-- ============================================================================

CREATE TABLE proyecciones (
    id                          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    proceso_origen_id           BIGINT UNSIGNED NULL,   -- NULL si la Proyección se creó manualmente (PRY-013); un proceso genera como máximo una (PRY-009)
    proceso_resultante_id       BIGINT UNSIGNED NULL,   -- El proceso en el que se convierte esta Proyección (PRY-003, PRY-015)
    anio_proyectado             SMALLINT UNSIGNED NOT NULL,
    fecha_estimada_publicacion  DATE NOT NULL,
    valor_venta                 DECIMAL(18,2) NOT NULL,
    valor_facturacion           DECIMAL(18,2) NOT NULL,
    estado                      ENUM('Lejano','Proximo','Sale este mes','Publicado','Cerrado') NOT NULL DEFAULT 'Lejano',  -- PRY-004
    mercado                     ENUM('General','Objetivo') NULL,
    fecha_creacion               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eliminado                   BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_eliminacion           DATETIME NULL,
    eliminado_por_id            BIGINT UNSIGNED NULL,
    CONSTRAINT fk_proyeccion_proceso_origen FOREIGN KEY (proceso_origen_id) REFERENCES procesos(id),
    CONSTRAINT fk_proyeccion_proceso_resultante FOREIGN KEY (proceso_resultante_id) REFERENCES procesos(id),
    CONSTRAINT fk_proyeccion_eliminador FOREIGN KEY (eliminado_por_id) REFERENCES usuarios(id),
    UNIQUE KEY uk_proyeccion_origen (proceso_origen_id),      -- Relación 1 a 1: un proceso genera como máximo una Proyección (PRY-009)
    UNIQUE KEY uk_proyeccion_resultante (proceso_resultante_id),  -- Un proceso es el resultante de, como máximo, una Proyección
    INDEX idx_proyeccion_anio (anio_proyectado),
    INDEX idx_proyeccion_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Oportunidades futuras: generadas automáticamente, manuales o cargadas masivamente (PRY-001 a PRY-015)';

-- ============================================================================
-- 8. CRM — RELACIONAMIENTOS (REL-001 a REL-011)
-- ============================================================================

CREATE TABLE relacionamientos (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    contacto_id         BIGINT UNSIGNED NOT NULL,
    emisor_usuario_id   BIGINT UNSIGNED NOT NULL,
    canal               ENUM('Correo','Llamada','Mensaje','Presencial') NOT NULL,
    mensaje             TEXT NOT NULL,
    fecha_mensaje       DATE NOT NULL,
    respuesta           TEXT NULL,
    fecha_respuesta     DATE NULL,
    resultado           ENUM('Reunión programada','Referido a tercero','Ninguno') NOT NULL,
    fecha_reunion       DATE NULL,
    eliminado            BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_eliminacion    DATETIME NULL,
    eliminado_por_id     BIGINT UNSIGNED NULL,
    CONSTRAINT fk_relacionamiento_contacto FOREIGN KEY (contacto_id) REFERENCES contactos(id),
    CONSTRAINT fk_relacionamiento_emisor FOREIGN KEY (emisor_usuario_id) REFERENCES usuarios(id),
    CONSTRAINT fk_relacionamiento_eliminador FOREIGN KEY (eliminado_por_id) REFERENCES usuarios(id),
    CONSTRAINT chk_fecha_reunion_coherente CHECK (
        (resultado = 'Reunión programada' AND fecha_reunion IS NOT NULL)
        OR (resultado <> 'Reunión programada' AND fecha_reunion IS NULL)
    ),
    INDEX idx_relacionamiento_contacto (contacto_id),
    INDEX idx_relacionamiento_sin_respuesta (fecha_mensaje, respuesta(1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Interacciones con Contactos del CRM (REL-001 a REL-011)';

-- Control de alertas ya enviadas: evita duplicados (PRY-007, REL-010, TRX-003)
CREATE TABLE alertas_enviadas (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    proyeccion_id       BIGINT UNSIGNED NULL,
    relacionamiento_id  BIGINT UNSIGNED NULL,
    umbral              VARCHAR(20) NOT NULL,   -- 'Proximo' / 'SaleEsteMes' para proyección (PRY-006); 'vencimiento' para relacionamiento
    fecha_envio         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_alerta_proyeccion FOREIGN KEY (proyeccion_id) REFERENCES proyecciones(id),
    CONSTRAINT fk_alerta_relacionamiento FOREIGN KEY (relacionamiento_id) REFERENCES relacionamientos(id),
    CONSTRAINT chk_alerta_exactamente_una_entidad CHECK (
        (proyeccion_id IS NOT NULL AND relacionamiento_id IS NULL)
        OR (proyeccion_id IS NULL AND relacionamiento_id IS NOT NULL)
    ),
    UNIQUE KEY uk_alerta_proyeccion (proyeccion_id, umbral),
    UNIQUE KEY uk_alerta_relacionamiento (relacionamiento_id, umbral)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registro de alertas ya enviadas (PRY-006/007, REL-008/010)';

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 9. VALORES INICIALES (paises, configuración)
-- ============================================================================

INSERT INTO paises (nombre) VALUES ('Colombia'), ('Perú');

INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
    ('dias_espera_respuesta_crm', '7', 'Días de espera por defecto para recibir Respuesta a un Relacionamiento antes de alertar (REL-007)'),
    ('anio_reporte_vigente', '2026', 'Año calendario usado para calcular Meses de ejecución y Facturación estimada (SGP-005, SGP-006)'),
    ('carga_masiva_habilitada', 'true', 'Activa o desactiva por completo la carga masiva de Proyecciones/Clientes/Contactos (TRX-014)');

-- Ubicaciones geográficas (REG-008): cargar con npm run seed:ubicaciones
-- Archivo: database/seeds/ubicaciones_geograficas.sql (~1123 municipios CO + ~1892 distritos PE)

-- ============================================================================
-- 10. VISTAS DE CÁLCULO — dependen de la fecha actual, no se almacenan
-- ============================================================================

CREATE VIEW vista_procesos_calculado AS
SELECT
    p.id,
    p.codigo,
    pa.nombre AS pais,
    p.estado,
    p.segmento,
    p.cuantia,
    p.plazo_ejecucion_meses,
    p.fecha_cierre,
    p.fecha_inicio_ejecucion,
    p.fecha_finalizacion,
    COALESCE(c.empresa, p.empresa_otro) AS empresa_mostrar,
    DATEDIFF(p.fecha_finalizacion, CURDATE()) AS dias_espera,
    CONCAT(DATE_FORMAT(p.fecha_finalizacion, '%M'), '-', DATE_FORMAT(p.fecha_finalizacion, '%y')) AS fecha_esperada,
    DATEDIFF(p.fecha_cierre, CURDATE()) AS dias_restantes_cierre,
    cfg.anio_reporte,
    GREATEST(0, TIMESTAMPDIFF(MONTH,
        GREATEST(p.fecha_inicio_ejecucion, MAKEDATE(cfg.anio_reporte, 1)),
        LEAST(p.fecha_finalizacion, MAKEDATE(cfg.anio_reporte + 1, 1))
    )) AS meses_ejecucion_anio_reporte,
    ROUND(
        (p.cuantia / p.plazo_ejecucion_meses) *
        GREATEST(0, TIMESTAMPDIFF(MONTH,
            GREATEST(p.fecha_inicio_ejecucion, MAKEDATE(cfg.anio_reporte, 1)),
            LEAST(p.fecha_finalizacion, MAKEDATE(cfg.anio_reporte + 1, 1))
        ))
    , 2) AS facturacion_estimada_anio_reporte
FROM procesos p
JOIN paises pa ON pa.id = p.pais_id
LEFT JOIN clientes c ON c.id = p.empresa_cliente_id
CROSS JOIN (SELECT CAST(valor AS UNSIGNED) AS anio_reporte FROM configuracion_sistema WHERE clave = 'anio_reporte_vigente') cfg
WHERE p.eliminado = FALSE;

CREATE VIEW vista_procesos_avance AS
SELECT
    proceso_id,
    SUM(CASE WHEN aplica THEN 1 ELSE 0 END) AS tareas_aplicables,
    SUM(CASE WHEN aplica AND completada THEN 1 ELSE 0 END) AS tareas_completadas,
    ROUND(100 * SUM(CASE WHEN aplica AND completada THEN 1 ELSE 0 END)
        / NULLIF(SUM(CASE WHEN aplica THEN 1 ELSE 0 END), 0), 1) AS avance_porcentaje
FROM proceso_tareas
GROUP BY proceso_id;

CREATE VIEW vista_proyecciones_calculado AS
SELECT
    py.id,
    py.proceso_origen_id,
    py.proceso_resultante_id,
    py.anio_proyectado,
    py.fecha_estimada_publicacion,
    py.valor_venta,
    py.valor_facturacion,
    py.estado,
    py.mercado,
    DATEDIFF(py.fecha_estimada_publicacion, CURDATE()) AS dias_faltantes,
    CASE
        WHEN py.estado IN ('Publicado','Cerrado') THEN py.estado
        WHEN DATEDIFF(py.fecha_estimada_publicacion, CURDATE()) > 90 THEN 'Lejano'
        WHEN DATEDIFF(py.fecha_estimada_publicacion, CURDATE()) > 30 THEN 'Proximo'
        ELSE 'Sale este mes'
    END AS estado_sugerido
FROM proyecciones py
WHERE py.eliminado = FALSE;

CREATE VIEW vista_relacionamientos_vencidos AS
SELECT
    r.id,
    r.contacto_id,
    r.emisor_usuario_id,
    r.fecha_mensaje,
    CAST(cfg.valor AS UNSIGNED) AS dias_espera_configurado,
    DATE_ADD(r.fecha_mensaje, INTERVAL CAST(cfg.valor AS UNSIGNED) DAY) AS fecha_limite_respuesta
FROM relacionamientos r
CROSS JOIN (SELECT valor FROM configuracion_sistema WHERE clave = 'dias_espera_respuesta_crm') cfg
WHERE r.respuesta IS NULL
  AND r.eliminado = FALSE
  AND CURDATE() > DATE_ADD(r.fecha_mensaje, INTERVAL CAST(cfg.valor AS UNSIGNED) DAY);

-- Vista de procesos pendientes por Validador (VAL-005)
CREATE VIEW vista_procesos_por_validar AS
SELECT
    vp.validador_id,
    p.id AS proceso_id,
    p.codigo,
    p.estado,
    COALESCE(c.empresa, p.empresa_otro) AS empresa_mostrar
FROM validaciones_proceso vp
JOIN procesos p ON p.id = vp.proceso_id
LEFT JOIN clientes c ON c.id = p.empresa_cliente_id
WHERE p.estado = 'En Validación' AND vp.veredicto = 'Pendiente' AND p.eliminado = FALSE;
