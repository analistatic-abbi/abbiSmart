# Inventario de pantallas — Smart Licitaciones (UI)

Documento alineado al **backend actual** (DTOs, enums y requisitos). Checklist para Figma / Stitch.

## Leyenda de roles

| Sigla | Significado |
|-------|-------------|
| **Todos** | Cualquier usuario autenticado |
| **E** | Admin, Supervisor, Operador (escritura) |
| **L** | Visitante, Validador (solo lectura en CRM/procesos) |
| **Adm** | Solo Administrador |
| **Adm+Sup** | Administrador o Supervisor |
| **Val** | Validador (Admin también en veredicto) |

**Selector geográfico reutilizable** (Clientes, Contactos, Procesos): cascada **Departamento/Provincia → Municipio** (`GET /catalogos/ubicaciones/departamentos`, `GET /catalogos/ubicaciones`). El **país** viene de la **sesión activa**, no se elige en el formulario (salvo carga masiva CSV con columna País).

---

## 0. Layout global (todas las pantallas autenticadas)

| Elemento | Campos / contenido |
|----------|-------------------|
| Header | Nombre usuario, rol, país de sesión, campana notificaciones, cerrar sesión |
| Menú lateral | Ítems según rol (sección 12) |
| Paginación estándar | `page`, `limit` en todas las tablas |

---

## 1. Autenticación (públicas, sin menú)

### 1.1 Login

| Campo | Tipo | Obligatorio |
|-------|------|-------------|
| Correo | email | Sí |
| Contraseña | password | Sí |

**Acciones:** Iniciar sesión  
**Resultado:** Operador → entra directo. Admin / Sup / Visitante / Validador → pantalla 1.2.

### 1.2 Selección de país

| Campo | Tipo | Obligatorio |
|-------|------|-------------|
| País | selector (Colombia / Perú) | Sí |

**Roles:** Admin, Supervisor, Visitante, Validador (no Operador).

### 1.3 Activar cuenta (enlace del correo)

| Campo | Tipo | Obligatorio |
|-------|------|-------------|
| Token | oculto (URL) | Sí |
| Nueva contraseña | password | Sí |
| Confirmar contraseña | password | Sí (solo UI) |

**Regla contraseña:** mín. 8 caracteres, 1 mayúscula, 1 número.

### 1.4 Restablecer contraseña (enlace del correo)

Mismos campos que 1.3 (`token` + `password`).

---

## 2. Dashboard

### 2.1 Resumen general

**Roles:** Todos | **Solo lectura**

| Bloque | Contenido |
|--------|-----------|
| Tarjetas totales | Total procesos (excl. RFI) |
| Por estado | Por Validar, En Proceso, Descartado, En Validación, Presentado, Subsanación, Adjudicado, Cerrado |
| Por segmento | Gas Natural, Alcantarillado, Electricidad, Obra Civil, Servicios Adicionales |

### 2.2 Tabla procesos (REV-001)

**Roles:** Todos (L solo lectura)

| Columna |
|---------|
| Código, Empresa, Estado, Segmento, Cuantía + moneda, % avance, Días restantes cierre, Fecha inicio ejecución, Fecha finalización, Días espera, Fecha esperada (Mes-Año), Facturación estimada año |

### 2.3 Métricas proyecciones (PRY-010)

**Roles:** Todos

| Campo |
|-------|
| Año (selector), Total proyecciones activas, Suma valor venta, Suma valor facturación, Desglose por estado, Desglose por mercado (General / Objetivo / vacío) |

---

## 3. Procesos

### 3.1 Lista de procesos

**Roles:** Todos (L sin crear/editar)

**Columnas:** Código, Empresa, Estado, Segmento, Tipo proceso, Tipo instrumento, Cuantía, Moneda, % avance, Fecha cierre, Días restantes

**Filtros:** `search`, `estado`, `segmento`, `tipoProceso`, `tipoInstrumento`, `incluirEliminados` (Adm+Sup)

**Acciones (E):** Crear, ver detalle, eliminar / solicitar eliminación

### 3.2 Crear proceso

**Roles:** E

#### Paso A — Datos generales

| Campo | Obligatorio | Notas |
|-------|-------------|-------|
| ID digitado | Sí | Genera código final |
| Empresa | Sí | Selector clientes o "Otro" (`empresaClienteId` / `empresaOtro`) |
| Departamento + Municipio | Sí | `ubicacionId` |
| Portal de origen | No | |
| Link | No | |
| Cuantía | Sí | Moneda auto por país sesión |
| Segmento | Sí | Gas Natural, Alcantarillado, Electricidad, Obra Civil, Servicios Adicionales |
| Tipo de proceso | Sí | Periódico / No periódico |
| Tipo de instrumento | Sí | RFI, Cotización, Licitación |
| Plazo ejecución (meses) | Sí | |
| Experiencia | Sí | Sí/No |
| Observación | Condicional | Solo si Experiencia = Sí |
| Proyección a vincular | No | PRY-015 |

#### Paso B — Indicadores financieros (8 filas)

| Indicador | Valor requerido | Resultado (solo lectura) |
|-----------|-----------------|--------------------------|
| KTNO | opcional | Cumple / No Cumple |
| PN (Patrimonio Neto) | | |
| ROE | | |
| ROA | | |
| MDN (Múltiplo de Deuda) | | |
| IL (Índice de Liquidez) | | |
| E (Endeudamiento) | | |
| RCI (Razón Cobertura Intereses) | | |

**Modal PAR-007:** si hay indicadores vacíos → `confirmarIndicadoresVacios = true`.

#### Paso C — Fechas obligatorias (FEC-001)

| Campo | Obligatorio |
|-------|-------------|
| Fecha apertura | Sí |
| Fecha cierre | Sí |

### 3.3 Detalle de proceso

**Roles:** Todos

**Solo lectura:** código, ID digitado, empresa, país, ubicación, segmento, tipos, plazo, estado, usuario creador, fecha creación, indicadores + cumple, campos calculados SGP.

**Editable (E):** portal, link, cuantía, experiencia, observación. Estado vía acciones (3.6).

### 3.4 Fechas del proceso

**Ver:** Todos | **Editar:** Adm+Sup (FEC-004)

| Campo | Notas |
|-------|-------|
| Apertura, Cierre | Obligatorias, rango [Apertura, Cierre] |
| Manifestación de interés | Opcional |
| Adquisición derecho a participar | Opcional; **oculto si RFI** |
| Reunión aclaratoria, Visita técnica | Opcional |
| Solicitudes / Respuesta aclaración | Opcional |
| Limitación MyPymes | Opcional, informativo |

**Subpantalla:** Historial (campo, valor anterior, valor nuevo, usuario, fecha/hora).

### 3.5 Seguimiento de tareas (SEG-001)

**Ver:** Todos | **Completar:** E

1. Creación de carpeta
2. Manifestación de interés
3. Adquisición derecho a participar — deshabilitada sin fecha adquisición
4. Preparar doc. jurídica
5. Preparar doc. técnica
6. Preparar doc. financiera
7. Estructuración de administración
8. Solicitud de pago de póliza — no aplica RFI
9. Pago de póliza — no aplica RFI
10. Elaboración propuesta económica
11. Validación área técnica
12. Envío de propuesta

**Modal completar:** evidencia (obligatoria) + confirmar (checkbox).

**Al 100%:** botón Asignar validadores (sección 4.3).

### 3.6 Cambio de estado manual

**Roles:** E

| Desde | Puede ir a |
|-------|------------|
| Por Validar | En Proceso, Descartado |
| En Proceso | Descartado |
| Presentado | Subsanación, Adjudicado, Cerrado |
| Subsanación | Presentado, Adjudicado |
| Adjudicado | Cerrado |

**Notas:** En Validación solo por veredictos. En Proceso → En Validación solo vía asignar validadores. Adjudicado + Periódico → proyección automática.

### 3.7 Eliminar proceso

- **Adm:** eliminar directo (modal dependencias)
- **Sup/Op:** solicitar eliminación (motivo)
- **Modal:** lista dependientes + `confirmarDependientes` (Adm)

---

## 4. Validación

### 4.1 Bandeja pendientes (VAL-005)

**Roles:** Val (+ Admin/Sup consulta)

**Columnas:** ID validación, Código proceso, Empresa, Estado proceso  
**Filtro:** `search`

### 4.2 Revisión de proceso (VAL-003)

**Roles:** Val asignado

**Solo lectura:** proceso + tareas con evidencia + lista validadores/veredictos

**Formulario veredicto:**

| Campo | Obligatorio |
|-------|-------------|
| Veredicto | Aprobado / Requiere Corrección |
| Comentario | Si Requiere Corrección |

### 4.3 Asignar validadores (VAL-001)

**Roles:** E (al 100% tareas)

| Campo | Tipo |
|-------|------|
| Validadores | multi-select (rol Validador) |

Dispara correo a cada validador (VAL-006).

---

## 5. CRM — Clientes

### 5.1 Lista

**Columnas:** Empresa, País, Región, Segmento, Fecha creación  
**Filtros:** `search`, `segmento`, `incluirEliminados` (Adm+Sup)

### 5.2 Crear / editar

| Campo | Obligatorio |
|-------|-------------|
| Empresa | Sí |
| Región (ubicación) | Sí |
| Segmento | Sí — catálogo CLI-002 + Otro |
| Segmento otro | Si Segmento = Otro |

Al crear → contacto genérico automático (CON-002).

**Catálogo segmento cliente:** Acabados de Construcción, Actividades de Organizaciones Profesionales, Construcción, Consultorías y Servicios, Energía Eléctrica, Energía Renovable, Gas Natural, Hidrocarburos, Manufactura, Minería, Servicios Petroleros, Otro.

### 5.3 Detalle cliente

Datos + contactos + **Adm:** reasignar procesos (`nuevoClienteId`).

### 5.4 Carga masiva

**Columnas CSV:** Empresa, País, Región/Departamento, Segmento (+ opc. segmento_otro, ubicacion_id)  
**Resultado:** exitosas, rechazadas, errores por fila.

---

## 6. CRM — Contactos

### 6.1 Lista

**Columnas:** Nombre, Empresa, Cargo, Teléfono, Correo, Región, Es genérico, Referido por  
**Filtros:** `search`, `clienteId`, `esGenerico`

### 6.2 Crear / editar

| Campo | Obligatorio |
|-------|-------------|
| Cliente | Sí (en creación) |
| Nombre | Sí |
| Región | Sí |
| Cargo, Teléfono, Correo | No |
| Referido por | No |

**Solo lectura en detalle:** `esGenerico`, fecha creación.

### 6.3 Carga masiva

**Columnas:** Cliente (empresa o cliente_id), Nombre, Región, Cargo, Teléfono, Correo (+ referido_por_nombre)

---

## 7. CRM — Relacionamientos

### 7.1 Lista

**Columnas:** Contacto, Canal, Mensaje, Fecha mensaje, Respuesta, Fecha respuesta, Resultado, Emisor  
**Filtros:** `contactoId`, `canal`, `resultado`, `search`

### 7.2 Crear

| Campo | Catálogo / condición |
|-------|---------------------|
| Contacto | obligatorio |
| Canal | Correo, Llamada, Mensaje, Presencial |
| Mensaje, Fecha mensaje | obligatorios |
| Resultado | Reunión programada, Referido a tercero, Ninguno |
| Fecha reunión | si Reunión programada |
| Contacto referido (nombre, cargo, teléfono, correo, región) | si Referido a tercero |

**Emisor:** usuario autenticado (solo lectura).

### 7.3 Editar / responder

Respuesta, Fecha respuesta + campos editables del create.

### 7.4 Vencidos

Lista + `diasEsperaConfigurado`, `fechaLimiteRespuesta`.

---

## 8. Proyecciones (PRY-012)

### 8.1 Lista

**Columnas:** Proceso origen, Empresa, Año proyectado, Fecha est. publicación, Valor venta, Valor facturación, Días faltantes, Estado (con color), Mercado  
**Filtros:** `estado`, `anioProyectado`, `mercado`, `search`, `incluirEliminados`

**Estados:** Lejano, Próximo, Sale este mes, Publicado, Cerrado

### 8.2 Crear manual (PRY-013)

| Campo | Obligatorio |
|-------|-------------|
| Proceso origen | No |
| Año proyectado | Sí |
| Fecha estimada publicación | Sí |
| Valor venta / facturación | Sí |

### 8.3 Editar / vincular / cerrar

- Editar: año, fechas, valores (Adm+Sup cierra)
- Vincular proceso resultante → estado Publicado (PRY-015)

### 8.4 Asignación mercado anual (PRY-011)

**Adm+Sup:** año + tabla con General / Objetivo por proyección.

### 8.5 Carga masiva

**Columnas:** anio_proyectado, fecha_estimada_publicacion, valor_venta, valor_facturacion

---

## 9. Parámetros (PAR-001)

**CRUD:** Adm | **Ver:** Todos

**Lista:** Indicador, Año, Valor, Regla cumplimiento, Usuario, Fecha  
**Filtros:** `indicadorCodigo`, `anio`, `search`

**Formulario:**

| Campo | Catálogo |
|-------|----------|
| Indicador | KTNO, PN, ROE, ROA, MDN, IL, E, RCI |
| Año | entero |
| Valor | número |
| Regla cumplimiento | Mayor o igual al requerido / Menor o igual al requerido |

**Historial:** PAR-003  
**Nota:** tabla por país de sesión.

---

## 10. Administración

### 10.1 Usuarios (Adm)

**Lista:** nombre, correo, rol, estado, país, fecha creación  
**Filtros:** `search`, `rol`, `paisId`

**Crear:**

| Campo | Obligatorio |
|-------|-------------|
| Nombre | Sí |
| Correo | Sí |
| Rol | Administrador, Supervisor del Sistema, Operador, Visitante, Validador |
| País | Sí (Colombia o Perú) |

**Acciones por fila:** editar (nombre, rol, país), restablecer contraseña, reenviar activación, desactivar, desbloquear.

**Estados usuario:** Inactivo, Activo, Bloqueada

### 10.2 Solicitudes eliminación

- **Adm:** listar, aprobar, rechazar (+ comentario)
- **Sup/Op:** crear (entidad tipo, entidad ID, motivo)

### 10.3 Auditoría (Adm)

**Filtros:** usuarioId, entidadTipo, entidadId, accion, fechaDesde, fechaHasta  
**Columnas:** usuario, acción, entidad, campo, valor anterior, valor nuevo, fecha/hora

### 10.4 Configuración (Adm)

| Clave | UI |
|-------|-----|
| `dias_espera_respuesta_crm` | número 1–365 |
| `carga_masiva_habilitada` | toggle true/false |

### 10.5 Logs carga masiva

Entidad, archivo, usuario, fecha, filas exitosas, filas rechazadas, detalle errores

### 10.6 Catálogo países (opcional / futuro)

Adm: nombre, activo. Ubicaciones geográficas = solo lectura (sembradas).

---

## 11. Notificaciones (TRX-015)

**Roles:** Todos

| Campo |
|-------|
| Tipo, mensaje, entidad vinculada, leída, fecha |

**Acciones:** marcar leída, marcar todas leídas.

Tipos: alertas proyección (Lejano→Próximo, Próximo→Sale este mes), relacionamiento vencido.

---

## 12. Menú por rol

| Ítem | Adm | Sup | Op | Vis | Val |
|------|-----|-----|----|----|-----|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Procesos | ✓ | ✓ | ✓ | ✓ | ✓ |
| Validación | ✓ | ✓ | — | — | ✓ |
| Proyecciones | ✓ | ✓ | ✓ | ✓ | ✓ |
| Clientes | ✓ | ✓ | ✓ | ✓ | ✓ |
| Contactos | ✓ | ✓ | ✓ | ✓ | ✓ |
| Relacionamientos | ✓ | ✓ | ✓ | ✓ | ✓ |
| Parámetros | ✓ | ver | ver | ver | ver |
| Usuarios | ✓ | — | — | — | — |
| Solicitudes eliminación | ✓ | crear | crear | — | — |
| Auditoría | ✓ | — | — | — | — |
| Configuración | ✓ | — | — | — | — |
| Carga masiva | ✓* | ✓* | ✓* | — | — |
| Notificaciones | ✓ | ✓ | ✓ | ✓ | ✓ |

\*Si `carga_masiva_habilitada = true`

---

## 13. Modales transversales

| Modal | Campos / contenido |
|-------|-------------------|
| Confirmar indicadores vacíos (PAR-007) | Mensaje + Aceptar / Cancelar |
| Completar tarea (SEG-002) | Evidencia + checkbox confirmar |
| Dependencias al eliminar (TRX-013) | Lista dependientes, sugerencias, confirmar |
| Solicitar eliminación | Motivo (texto) |
| Errores de sesión | Credenciales incorrectas, cuenta bloqueada, sin permiso |

---

## Prioridad para Stitch (10 frames)

1. Login + Selección país
2. Dashboard resumen
3. Lista procesos
4. Crear proceso (wizard 3 pasos)
5. Detalle proceso (tabs: info, fechas, tareas)
6. Bandeja validación
7. Lista proyecciones
8. Lista clientes + formulario
9. Usuarios (Admin)
10. Notificaciones (drawer)
