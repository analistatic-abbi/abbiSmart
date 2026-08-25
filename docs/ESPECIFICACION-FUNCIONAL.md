# Especificación funcional — ABBI Bid Management

**Versión:** 1.0  
**Producto:** Sistema de Gestión de Licitaciones ABBI  
**Ámbito:** Operación comercial de licitaciones públicas en **Colombia** y **Perú**

Este documento describe **qué hace el programa** y **cómo funciona** desde el punto de vista del negocio y del usuario. No incluye detalles técnicos de implementación.

---

## Tabla de contenidos

1. [Visión general](#1-visión-general)
2. [Conceptos fundamentales](#2-conceptos-fundamentales)
3. [Roles y permisos](#3-roles-y-permisos)
4. [Acceso y sesión](#4-acceso-y-sesión)
5. [Módulos del sistema](#5-módulos-del-sistema)
6. [Procesos de licitación](#6-procesos-de-licitación)
7. [Validación](#7-validación)
8. [CRM — Relación comercial](#8-crm--relación-comercial)
9. [Proyecciones de mercado](#9-proyecciones-de-mercado)
10. [KAM — Seguimiento post-adjudicación](#10-kam--seguimiento-post-adjudicación)
11. [Panel de control y analítica](#11-panel-de-control-y-analítica)
12. [Calendario, bandeja y notificaciones](#12-calendario-bandeja-y-notificaciones)
13. [Configuración y administración](#13-configuración-y-administración)
14. [Reglas transversales](#14-reglas-transversales)
15. [Glosario](#15-glosario)

---

## 1. Visión general

### 1.1 Propósito

ABBI Bid Management centraliza la operación comercial de licitaciones públicas de ABBI. Cubre todo el ciclo desde la **identificación de oportunidades futuras** hasta el **seguimiento con el cliente** después de ganar un contrato.

### 1.2 Qué permite hacer el sistema

| Área | Capacidades |
|------|-------------|
| **Planeación** | Registrar proyecciones de oportunidades, asignar mercado (General/Objetivo), medir efectividad |
| **Operación** | Gestionar procesos de licitación, tareas, fechas, indicadores y validación |
| **Comercial** | Mantener clientes, contactos e historial de relacionamientos |
| **Post-adjudicación** | Operar ciclos KAM con encuestas, reuniones y bitácora |
| **Visibilidad** | Dashboard, analítica con KPIs y gráficos, calendario unificado |
| **Control** | Notificaciones, auditoría, solicitudes de eliminación, administración de usuarios |

### 1.3 Ciclo operativo principal

```
Proyección → Proceso → Validación → Presentación → Adjudicación → KAM
                    ↑                                    ↓
              Descartado / Cerrado              (sin adjudicación)
```

En paralelo, el **CRM** acompaña todo el ciclo: los clientes y contactos alimentan los procesos, y los relacionamientos documentan la interacción comercial.

---

## 2. Conceptos fundamentales

### 2.1 País de sesión

- El sistema opera en **Colombia** y **Perú** de forma independiente.
- Cada usuario trabaja en un **país de sesión** activo.
- Al cambiar de país cambian: datos visibles, catálogos, parámetros financieros, moneda y reglas locales.
- **Operadores** tienen un país fijo asignado; no pueden cambiarlo.
- **Administrador, Supervisor, Validador y Visitante** eligen país al iniciar sesión (o lo cambian después).

### 2.2 Moneda

- Colombia opera en **COP** (peso colombiano).
- Perú opera en **PEN** (sol peruano).
- La moneda se asigna automáticamente según el país; no hay conversión entre países.

### 2.3 Soft delete (eliminación lógica)

- Los registros importantes no se borran físicamente de inmediato.
- **Administrador** puede eliminar directamente.
- **Supervisor y Operador** solicitan eliminación; el Administrador aprueba o rechaza.
- Admin y Supervisor pueden consultar registros eliminados.

### 2.4 Auditoría

- Las acciones relevantes quedan registradas: quién hizo qué, cuándo y sobre qué registro.
- Aplica especialmente a cambios de fechas, parámetros, metas anuales y estados.

---

## 3. Roles y permisos

### 3.1 Los cinco roles

| Rol | Descripción |
|-----|-------------|
| **Administrador** | Control total: usuarios, países, parámetros, eliminaciones directas, metas anuales, auditoría |
| **Supervisor del Sistema** | Operación completa de escritura; puede cerrar proyecciones, asignar mercado, solicitar eliminaciones |
| **Operador** | Operación diaria; país fijo; solicita eliminaciones en lugar de eliminar |
| **Validador** | Solo lectura general + emitir veredictos en procesos en validación |
| **Visitante** | Solo lectura en todo lo permitido por su rol |

### 3.2 Matriz resumida de permisos

| Acción | Admin | Supervisor | Operador | Validador | Visitante |
|--------|:-----:|:----------:|:--------:|:---------:|:---------:|
| Crear/editar procesos, CRM, proyecciones, KAM | ✓ | ✓ | ✓ | — | — |
| Cambiar país de sesión | ✓ | ✓ | — | ✓ | ✓ |
| Eliminar directamente | ✓ | — | — | — | — |
| Solicitar eliminación | — | ✓ | ✓ | — | — |
| Editar fechas de proceso | ✓ | ✓ | — | — | — |
| Asignar mercado / cerrar proyección | ✓ | ✓ | — | — | — |
| Definir metas anuales (analítica) | ✓ | — | — | — | — |
| Editar parámetros financieros | ✓ | — | — | — | — |
| Emitir veredicto de validación | ✓ | — | — | ✓ | — |
| Gestionar usuarios y países | ✓ | — | — | — | — |
| Consultar dashboard, reportes, analítica | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 4. Acceso y sesión

### 4.1 Primer acceso

1. Un Administrador crea la cuenta (nombre, correo, rol, país).
2. El sistema envía un correo con enlace de **activación** (un solo uso, con vencimiento).
3. El usuario define su contraseña y queda activo.

### 4.2 Inicio de sesión

- Credenciales: correo + contraseña.
- Tras 5 intentos fallidos consecutivos la cuenta se **bloquea**; solo un Administrador puede reactivarla.
- Los mensajes de error son genéricos (“Credenciales incorrectas”) por seguridad.

### 4.3 Selección de país

- Roles con acceso a ambos países ven una pantalla de selección tras el login.
- Operadores entran directamente al país asignado.

### 4.4 Recuperación de contraseña

- Flujo “¿Olvidaste tu contraseña?” envía enlace al correo registrado.
- Cuentas bloqueadas no se recuperan por este medio; requieren intervención del Administrador.

---

## 5. Módulos del sistema

El menú lateral organiza el sistema en estas secciones:

| Sección | Módulos |
|---------|---------|
| **Inicio** | Panel de Control, Analítica, Calendario, Procesos |
| **Operación** | Validación, Mi bandeja, Notificaciones |
| **CRM** | Clientes, Contactos, Relacionamientos |
| **KAM** | KAM, Calendario KAM, Formatos de encuesta |
| **Planeación** | Proyecciones, Asignar mercado, Efectividad de mercado |
| **Configuración** | Parámetros, Formatos de calificación |
| **Administración** | Usuarios, Países, Carga masiva, Solicitudes eliminación, Auditoría |

Los ítems visibles dependen del rol del usuario.

---

## 6. Procesos de licitación

### 6.1 Qué es un proceso

Un **proceso** es el expediente de una licitación pública en gestión. Representa la oportunidad desde que ABBI la identifica hasta su cierre o adjudicación.

### 6.2 Datos principales de un proceso

| Campo / grupo | Descripción |
|---------------|-------------|
| Identificación | Código (generado automáticamente), ID digitado, objeto contractual |
| Cliente | Empresa contratante (cliente del CRM o “Otro”) |
| Ubicación | Departamento/provincia y municipio |
| Clasificación | Segmento, tipo de proceso (Periódico/No periódico), tipo de instrumento (RFI/Cotización/Licitación) |
| Económico | Cuantía, moneda (automática por país), plazo de ejecución en meses |
| Origen | Portal de origen, enlace |
| Contactos | Personas vinculadas al proceso (necesarias para KAM) |
| Indicadores | Valores requeridos por la licitación vs parámetros de la empresa |
| Fechas | Apertura, cierre y fechas opcionales del calendario del proceso |
| Tareas | Checklist operativo con evidencias |

### 6.3 Segmentos de proceso

Catálogo cerrado: Gas Natural, Alcantarillado, Electricidad, Obra Civil, Servicios Adicionales.

### 6.4 Estados de un proceso

| Estado | Significado |
|--------|-------------|
| **Por Validar** | Recién creado; indicadores en revisión |
| **En Proceso** | En gestión activa (tareas, seguimiento) |
| **Descartado** | ABBI decide no presentar propuesta |
| **En Validación** | Enviado a validadores para revisión formal |
| **Presentado** | Propuesta presentada al cliente |
| **Subsanación** | En subsanación (puede volver a Presentado) |
| **Adjudicado** | Ganado; habilita ciclo KAM |
| **Cerrado** | Finalizado sin adjudicación o tras cierre del contrato |

**Flujo de estados:**

```
Por Validar → En Proceso → En Validación → Presentado → Adjudicado → Cerrado
                ↓              ↓              ↓
            Descartado    (corrección)    Subsanación
```

- Al completar el 100 % de tareas aplicables, el proceso puede enviarse a **En Validación**.
- Si un validador requiere corrección, vuelve a **En Proceso** con comentario visible.
- Badge **Devuelto** indica que el validador pidió correcciones.

### 6.5 Creación de un proceso (asistente en 3 pasos)

1. **Datos generales:** empresa, ubicación, cuantía, segmento, contactos, etc.
2. **Indicadores:** año de referencia y tabla de indicadores financieros (KTNO, PN, ROE, ROA, MDN, IL, E, RCI). Indicadores vacíos requieren confirmación explícita.
3. **Fechas:** apertura y cierre obligatorias; el resto se puede completar después.

### 6.6 Indicadores financieros

- Al registrar el proceso se ingresan los valores **requeridos por la licitación**.
- El sistema los compara contra los **Parámetros** vigentes del país (valores de referencia de ABBI).
- Resultado por indicador: **Cumple** / **No Cumple** / **Casi Aprobado** / **Casi Desaprobado** (según márgenes configurados).
- Solo se evalúan indicadores con valor ingresado.

### 6.7 Fechas del proceso

| Fecha | Obligatoria al crear | Editable después |
|-------|:--------------------:|:----------------:|
| Apertura | Sí | Admin/Supervisor |
| Cierre | Sí | Admin/Supervisor |
| Manifestación de interés, adquisición derecho, reunión aclaratoria, visita técnica, solicitudes/respuestas aclaración, limitación Mypymes | No | Admin/Supervisor |

**Reglas:**
- Todas las fechas deben estar dentro del rango [Apertura, Cierre].
- Toda modificación queda en historial (usuario, fecha, valor anterior/nuevo).
- Procesos **RFI** no usan la fecha de adquisición de derecho.

### 6.8 Tareas de seguimiento

Lista fija de hitos para todos los procesos:

1. Creación de Carpeta  
2. Manifestación de Interés  
3. Adquisición de derecho a participar  
4. Preparar Doc. Jurídica  
5. Preparar Doc. Técnica  
6. Preparar Doc. Financiera  
7. Estructuración de administración  
8. Solicitud de pago de póliza  
9. Pago de póliza  
10. Elaboración de propuesta económica  
11. Validación desde área técnica  
12. Envío de propuesta  

**Reglas:**
- Cada tarea requiere **evidencia escrita** para marcarse completada.
- El **avance %** = tareas completadas / tareas aplicables.
- Procesos **RFI** excluyen las tareas de póliza del avance.
- La tarea “Adquisición de derecho” solo se habilita si existe fecha de adquisición.

### 6.9 Cálculos automáticos del proceso

| Campo calculado | Fórmula / regla |
|-----------------|-----------------|
| Fecha inicio ejecución | Fecha de cierre + 61 días |
| Fecha finalización | Inicio ejecución + plazo en meses |
| Días de espera | Finalización − hoy (puede ser negativo) |
| Facturación estimada del año | (Cuantía / duración meses) × meses de ejecución en el año |
| Código de proceso | `[id_digitado]-[id_autoincremental]`; sufijo `d` si ID duplicado |

### 6.10 Exclusión RFI

Los procesos con tipo de instrumento **RFI** se excluyen de:
- Proyecciones de mercado
- Análisis de seguimiento y metas comerciales
- Resúmenes del dashboard (donuts, embudo)

### 6.11 Motivos de no adjudicación

Al cerrar sin adjudicación: Precio no competitivo, Incumplimiento indicador financiero, Entidad canceló el proceso, No se alcanzó a presentar, Otro.

### 6.12 Calificación por puntos (opcional por país)

Si el país tiene habilitada la calificación por puntos:
- Existen formatos de calificación con rangos e indicadores.
- En el detalle del proceso se puede evaluar contra un formato activo.
- Solo Administrador gestiona los formatos.

---

## 7. Validación

### 7.1 Propósito

Revisión formal por **validadores** designados antes de que un proceso avance a **Presentado**.

### 7.2 Cuándo entra en validación

- El proceso está en **En Proceso** con 100 % de tareas completadas.
- Un usuario con permiso de escritura **asigna validadores** y envía a **En Validación**.

### 7.3 Bandeja de validación

Lista procesos pendientes de revisión con: código, empresa, validador asignado, estado.

### 7.4 Revisión

El validador asignado ve:
- Datos del proceso
- Evidencias adjuntas de tareas
- Detalle de todas las tareas
- Advertencia si hay tareas pendientes

**Veredicto** (solo el validador asignado):
- **Aprobado** → el proceso puede avanzar según reglas de consenso
- **Requiere Corrección** → vuelve a En Proceso con comentario

Admin y Supervisor ven la revisión en solo lectura.

---

## 8. CRM — Relación comercial

### 8.1 Clientes

**Qué registra:** empresas prospecto o contratantes.

| Campo | Reglas |
|-------|--------|
| Empresa | Obligatorio |
| Ubicación | Departamento/provincia, municipio |
| Segmento | Catálogo cerrado (11 opciones + “Otro”) |

**Vista 360 del cliente:** KPIs (procesos activos, cuantía, proyecciones, relacionamientos vencidos, contactos) y pestañas: Resumen, Procesos, Proyecciones, Relacionamientos, Contactos, Historial.

**Contacto genérico automático:** al crear un cliente se genera un contacto “Contacto General – [Empresa]” marcado como genérico, con región heredada del cliente.

**Carga masiva:** Excel/CSV con Empresa, País, Región, Segmento.

### 8.2 Contactos

Personas vinculadas a un cliente.

| Campo | Reglas |
|-------|--------|
| Cliente | Obligatorio |
| Nombre, cargo, teléfono, correo | Datos de contacto |
| Región | Independiente de la del cliente |
| Es genérico | Sí/No; distingue contacto automático vs persona real |
| Referido por | Si fue referido por otro contacto |

**Carga masiva:** Cliente, Nombre, Cargo, Teléfono, Correo, Región.

### 8.3 Relacionamientos

Registro de interacciones comerciales con un contacto.

| Campo | Reglas |
|-------|--------|
| Contacto | Obligatorio |
| Canal | Correo, Llamada, Mensaje, Presencial |
| Mensaje | Contenido de la interacción |
| Fecha mensaje | Cuándo ocurrió |
| Respuesta / Fecha respuesta | Se completan al recibir respuesta |
| Resultado | Reunión programada, Referido a tercero, Ninguno |

**Reglas de resultado:**
- **Reunión programada** → obligatorio registrar fecha de reunión.
- **Referido a tercero** → se crea un nuevo contacto en el mismo cliente, marcado como referido.

**Alertas de vencimiento:**
- Plazo de respuesta = fecha mensaje + días de espera (parámetro global, default 7 días, solo Admin configura).
- Si no hay respuesta a tiempo, notificación al emisor del relacionamiento.
- La alerta se envía **una sola vez** por relacionamiento.

**Vistas:** Todos (con filtros) y Vencidos (sin respuesta fuera de plazo).

---

## 9. Proyecciones de mercado

### 9.1 Qué es una proyección

Oportunidad de licitación **futura** que aún no es un proceso formal. Permite planificar el pipeline comercial.

### 9.2 Origen de las proyecciones

| Origen | Cuándo |
|--------|--------|
| **Automática** | Al adjudicar un proceso **Periódico** (no RFI) |
| **Manual** | Usuario crea proyección sin proceso origen |
| **Carga masiva** | Excel/CSV |

Solo procesos **Periódicos** generan proyección automática. Máximo **una proyección por proceso origen**.

### 9.3 Datos de una proyección

| Campo | Descripción |
|-------|-------------|
| Año proyectado | Año de la oportunidad |
| Proceso origen | Proceso que la generó (opcional si es manual) |
| Proceso resultante | Proceso al que se vincula cuando sale a licitar (vacío hasta entonces) |
| Fecha est. publicación | Cuándo se espera que salga la licitación |
| Valor venta / Valor facturación | Montos proyectados |
| Días faltantes | Calculado automáticamente (fecha est. − hoy); se actualiza diariamente |
| Estado | Lejano, Próximo, Sale este mes, Publicado, Cerrado |
| Mercado | General u Objetivo (asignado anualmente) |

### 9.4 Estados de proyección

| Estado | Criterio |
|--------|----------|
| **Lejano** | Más de 90 días para publicación |
| **Próximo** | Entre 31 y 90 días |
| **Sale este mes** | 30 días o menos |
| **Publicado** | Se vinculó a un proceso resultante |
| **Cerrado** | Ciclo de la proyección concluido |

**Notificaciones automáticas** al cambiar: Lejano → Próximo, y Próximo → Sale este mes (una vez por transición).

### 9.5 Mercado (General / Objetivo)

- No se captura al crear el proceso.
- A fin de año, Admin o Supervisor asignan mercado a las proyecciones del **año siguiente**.
- Pantalla dedicada: **Asignar mercado**.

### 9.6 Vincular proceso resultante

Al registrar un nuevo proceso, se puede vincular como **Proceso resultante** de una proyección existente. La proyección pasa a estado **Publicado** y queda ligada a ese proceso.

### 9.7 Efectividad de mercado

Mide qué tan bien se materializan y ganan las proyecciones:

| Clasificación | Significado |
|---------------|-------------|
| **Ganada** | Se materializó y ABBI ganó |
| **Se materializó no se ganó** | Hubo proceso pero no adjudicación |
| **Nunca se materializó** | No llegó a proceso |
| **Pendiente/en curso** | Aún en seguimiento |

Comparativo **General vs Objetivo** con % de ganadas sobre materializadas.

### 9.8 Vistas

- **Tabla:** filtros por estado, mercado, año, búsqueda.
- **Calendario:** fechas estimadas de publicación.

---

## 10. KAM — Seguimiento post-adjudicación

### 10.1 Qué es KAM

**Key Account Management:** seguimiento post-adjudicación con el cliente. Incluye rondas de contacto, encuestas de satisfacción y reuniones de cierre.

### 10.2 Cuándo aplica

Un proceso en estado **Adjudicado** habilita un registro KAM vinculado.

### 10.3 Estructura

| Elemento | Descripción |
|----------|-------------|
| **KAM** | Vinculado a un proceso adjudicado |
| **Ronda** | Ciclo de contacto (Pendiente → Ejecutado → Socializado) |
| **Encuesta** | Formato asignado por contacto del proceso |
| **Bitácora** | Comentarios cronológicos por ronda |
| **Correspondencia** | Archivos adjuntos (solo ronda Pendiente) |
| **Reunión** | Agendamiento o registro de reunión de socialización |

### 10.4 Flujo de una ronda

1. **Pendiente:** asignar encuestas a contactos, completar respuestas → marcar fase de encuestas completa.
2. **Ejecutado:** agendar reunión o marcar como realizada.
3. **Socializado:** ronda cerrada.

### 10.5 Encuestas

- Formatos configurables con secciones y preguntas.
- Preguntas con calificación 1–5 u observación obligatoria.
- Resumen de ronda: categoría, % global, puntos, veredicto.
- Solo editable en ronda **Pendiente** y con permiso de escritura.

### 10.6 Formatos de encuesta

- Crear manual, importar Excel o clonar existente.
- Estados: Activo / Inactivo.
- Si un formato está en uso, se clona para modificar.

---

## 11. Panel de control y analítica

### 11.1 Panel de Control

Vista ejecutiva del estado de procesos en el país de sesión.

| Elemento | Contenido |
|----------|-----------|
| Total procesos | Contador general (excl. RFI) |
| Por estado | Cantidad y % por cada estado |
| Por segmento | Desglose por segmento de negocio |
| Tabla de procesos | Listado filtrable con enlace al detalle |
| Exportar | Descarga Excel de procesos filtrados |

Filtros: búsqueda, estado, segmento, tipo, instrumento, portal, empresa, fechas de cierre.

### 11.2 Analítica

Módulo de inteligencia de negocio con **tres pestañas**: Procesos, Proyecciones, CRM.

#### Filtros globales

| Filtro | Aplica en | Efecto |
|--------|-----------|--------|
| **Año** | Procesos, Proyecciones | Filtra por año fiscal |
| **Desde / Hasta** | Todas las pestañas | Acota por rango de fechas (apertura, publicación est., mensaje CRM) |
| **Limpiar** | Fechas | Quita filtro de fechas |

> Los **velocímetros de metas** usan solo el año, no el filtro de fechas.

#### Pestaña Procesos

**KPIs:** procesos activos, cierres próx. 30 días, validaciones pendientes, adjudicados.

**Velocímetros (4):** Adjudicación Real, Adjudicación Proyectada, Facturación Real, Facturación Proyectada — cada uno muestra avance % vs meta anual.

**Metas anuales (solo Admin):** definir meta de adjudicación y facturación por año y país.

**Gráficos:**
- Embudo comercial (proyecciones activas → en proceso → validación → presentado/subsanación → adjudicado)
- Cierres próximos por ventana (0–30, 31–60, 61–90 días)
- Donut por estado de proceso
- Pie por segmento

Clic en KPIs, embudo o gráficos navega al listado filtrado correspondiente.

#### Pestaña Proyecciones

**KPIs:** proyecciones activas, valor venta, valor facturación, % ganadas Objetivo.

**Gráficos:**
- Proyecciones por estado (General vs Objetivo)
- Efectividad de mercado (% ganadas)
- Proyecciones por mercado

#### Pestaña CRM

**KPIs:** clientes activos, contactos, relacionamientos, vencidos, reuniones programadas.

**Gráficos:**
- Relacionamientos por canal y por resultado
- Clientes por segmento
- Estado de respuesta (con respuesta, pendientes, vencidos)
- Actividad de relacionamiento por ventana temporal

---

## 12. Calendario, bandeja y notificaciones

### 12.1 Calendario unificado

Unifica fechas de: proyecciones, procesos, relacionamientos, reuniones KAM, reuniones aclaratorias.

**Vistas:** Año, Mes, Agenda. Filtros por tipo de evento. Validadores pueden filtrar “solo procesos donde soy validador”.

Clic en evento → navega al detalle del registro.

### 12.2 Mi bandeja personal

Espacio donde el usuario **fija** registros prioritarios (procesos, proyecciones, relacionamientos, KAM).

**Resumen:** total fijados, urgentes (≤ 7 días), vencidos, desglose por tipo.

Organización por urgencia: alta, media, baja, vencido.

### 12.3 Notificaciones

| Origen | Ejemplos |
|--------|----------|
| Proyecciones | Cambio Lejano→Próximo, Próximo→Sale este mes |
| Procesos | Cambios de estado, validaciones |
| CRM | Relacionamiento vencido sin respuesta |
| Sistema | Alertas configuradas |

Panel rápido en campana + pantalla completa con filtro “solo no leídas”. Clic marca como leída y navega al registro.

---

## 13. Configuración y administración

### 13.1 Parámetros financieros

Valores de referencia de indicadores por **año** y **país**:

| Indicador | Regla típica |
|-----------|--------------|
| KTNO, PN, ROE, ROA, MDN, IL, E, RCI | Mayor o igual / Menor o igual al requerido |

- Solo **Administrador** edita.
- Historial de cambios consultable.
- Se usan al evaluar indicadores de procesos nuevos.

### 13.2 Formatos de calificación

Solo si el país tiene calificación por puntos habilitada. Importación Excel/CSV con rangos. Admin gestiona activación/desactivación.

### 13.3 Usuarios

Admin crea, edita, desactiva, restablece contraseña, reenvía activación, desbloquea cuentas.

Campos: nombre, correo, rol, país.

### 13.4 Países

Admin habilita países, configura plantilla de tareas, catálogos, reglas (calificación por puntos, márgenes casi aprobado/desaprobado), ubicaciones geográficas.

### 13.5 Carga masiva

Entidades: **Clientes**, **Contactos**, **Proyecciones**. Plantilla CSV descargable, reporte de filas OK/rechazadas. Solo Admin puede revertir importaciones.

### 13.6 Solicitudes de eliminación

Operador/Supervisor solicita → Admin aprueba (elimina) o rechaza (con comentario).

### 13.7 Auditoría

Registro consultable de acciones: usuario, fecha, acción, entidad, detalle. Filtros por día, tipo de entidad, acción.

Incluye, entre otras: cambios de fechas, parámetros, metas anuales (`META_ANUAL_UPSERT`), estados, eliminaciones.

---

## 14. Reglas transversales

### 14.1 Visibilidad por país

- Operador: solo su país asignado.
- Resto de roles: el país elegido en sesión.
- No hay permisos por creador: quien tiene acceso al país ve todos los registros de ese país.

### 14.2 Búsqueda y filtros

Listados principales incluyen búsqueda de texto y filtros por columnas relevantes. Paginación estándar (10, 20, 50, 100 filas).

### 14.3 Unidades de tiempo

- **Meses:** duración de contrato, plazo ejecución, facturación por periodo.
- **Días:** plazos cortos, alertas, días faltantes de proyección, cierres próximos.

### 14.4 Independencia proyección ↔ proceso origen

Modificar una proyección **no altera** el proceso histórico que la originó.

### 14.5 Centro de soporte

Acceso desde menú lateral: FAQ y enlace a HelpDesk TIC.

---

## 15. Glosario

| Término | Definición |
|---------|------------|
| **Proceso** | Expediente de una licitación pública en gestión |
| **Proyección** | Oportunidad futura de licitación aún no publicada |
| **KAM** | Key Account Management — seguimiento post-adjudicación |
| **Ronda KAM** | Ciclo contacto → encuesta → reunión con el cliente |
| **Validación** | Revisión formal por validadores antes de presentar |
| **Relacionamiento** | Registro de interacción comercial con un contacto |
| **País de sesión** | País operativo activo (Colombia o Perú) |
| **Mercado General/Objetivo** | Clasificación estratégica anual de proyecciones |
| **Meta anual** | Objetivo de adjudicación o facturación por año y país |
| **Velocímetro** | Indicador visual de avance Real o Proyectado vs meta |
| **Embudo comercial** | Visualización del pipeline desde proyección hasta adjudicación |
| **RFI** | Request for Information — excluido de proyecciones y metas |
| **Indicador financiero** | Métrica evaluada vs parámetros (KTNO, PN, ROE, etc.) |
| **Bandeja personal** | Espacio de ítems fijados por el usuario |
| **Soft delete** | Eliminación lógica con posibilidad de consulta (Admin/Supervisor) |
| **Carga masiva** | Importación de registros desde CSV/Excel |
| **Auditoría** | Registro de acciones para trazabilidad |

---

*Documento de especificación funcional — ABBI Bid Management. Para uso interno, capacitación e integración con asistentes de IA.*
