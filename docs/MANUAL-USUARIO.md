# Manual de Usuario — Sistema de Gestión de Licitaciones ABBI

**Versión del documento:** 1.0  
**Producto:** ABBI Bid Management — *construyendo progreso*  
**Ámbito:** Operaciones de licitaciones públicas en **Colombia** y **Perú**

---

## Tabla de contenidos

1. [Introducción](#1-introducción)
2. [Requisitos y acceso](#2-requisitos-y-acceso)
3. [Interfaz general](#3-interfaz-general)
4. [Roles y permisos](#4-roles-y-permisos)
5. [Inicio de sesión y cuenta](#5-inicio-de-sesión-y-cuenta)
6. [Panel de Control](#6-panel-de-control)
7. [Calendario unificado](#7-calendario-unificado)
8. [Procesos](#8-procesos)
9. [Validación](#9-validación)
10. [Mi bandeja personal](#10-mi-bandeja-personal)
11. [Notificaciones](#11-notificaciones)
12. [CRM — Clientes](#12-crm--clientes)
13. [CRM — Contactos](#13-crm--contactos)
14. [CRM — Relacionamientos](#14-crm--relacionamientos)
15. [KAM (Key Account Management)](#15-kam-key-account-management)
16. [Formatos de encuesta KAM](#16-formatos-de-encuesta-kam)
17. [Proyecciones](#17-proyecciones)
18. [Asignación de mercado y efectividad](#18-asignación-de-mercado-y-efectividad)
19. [Parámetros financieros](#19-parámetros-financieros)
20. [Formatos de calificación](#20-formatos-de-calificación)
21. [Usuarios](#21-usuarios)
22. [Países y configuración por país](#22-países-y-configuración-por-país)
23. [Carga masiva](#23-carga-masiva)
24. [Solicitudes de eliminación](#24-solicitudes-de-eliminación)
25. [Auditoría](#25-auditoría)
26. [Centro de soporte](#26-centro-de-soporte)
27. [Uso en dispositivos móviles](#27-uso-en-dispositivos-móviles)
28. [Preguntas frecuentes](#28-preguntas-frecuentes)
29. [Glosario](#29-glosario)

---

## 1. Introducción

### 1.1 ¿Qué es este sistema?

El **Sistema de Gestión de Licitaciones** de ABBI centraliza la operación comercial de licitaciones públicas: desde la **planeación** de oportunidades futuras hasta el **seguimiento post-adjudicación** con clientes clave (KAM).

El sistema permite:

- Registrar y dar seguimiento a **procesos de licitación**
- Gestionar la **relación comercial** (clientes, contactos, relacionamientos)
- **Validar** procesos antes de su avance
- **Proyectar** oportunidades de mercado
- Operar el ciclo **KAM** (rondas, encuestas, reuniones)
- Consultar un **calendario unificado** de fechas y eventos
- Mantener una **bandeja personal** con los ítems más importantes
- Recibir **notificaciones** de eventos relevantes
- Administrar usuarios, países, parámetros y auditoría (según rol)

### 1.2 Concepto clave: país de sesión

Cada usuario trabaja dentro de un **país de sesión** (Colombia o Perú). Los datos, catálogos, reglas y parámetros dependen del país seleccionado. No es un filtro cosmético: cambiar de país cambia el contexto operativo completo.

### 1.3 Ciclo operativo resumido

En términos generales, la operación sigue este flujo:

**Proyección** → **Proceso** → **Validación** → **Presentación** → **Adjudicación** → **KAM**

En paralelo, el **CRM** (clientes, contactos y relacionamientos) acompaña todo el ciclo comercial.

---

## 2. Requisitos y acceso

### 2.1 Requisitos

- Navegador web moderno (Chrome, Edge, Firefox o Safari actualizado)
- Conexión a la red corporativa o VPN, según política de ABBI
- Cuenta activa creada por un **Administrador**

### 2.2 Acceso al sistema

Ingrese con la dirección web que le haya proporcionado su administrador o el área de tecnología de ABBI.

### 2.3 Credenciales

- **Correo electrónico** corporativo registrado
- **Contraseña** definida al activar la cuenta

Si es su primer ingreso, revise el correo de **activación de cuenta** enviado por el sistema.

---

## 3. Interfaz general

Tras iniciar sesión y seleccionar país, la aplicación muestra tres zonas principales:

### 3.1 Barra superior

| Elemento | Función |
|---|---|
| **Menú** (☰) | En móvil, abre/cierra el menú lateral |
| **Logo ABBI** | Identidad visual |
| **Bandera / país** | Muestra el país de sesión. Clic → **Cambiar país** (si su rol lo permite) |
| **Rol** | Muestra su rol actual (oculto en pantallas muy pequeñas) |
| **Modo claro/oscuro** | Alterna el tema visual |
| **Campana** | Abre el panel de notificaciones |
| **Avatar / nombre** | Identifica al usuario conectado |
| **Cerrar sesión** | Finaliza la sesión |

Al iniciar sesión aparece un mensaje de bienvenida con su nombre y su rol.

### 3.2 Menú lateral

Organizado en secciones colapsables:

| Sección | Módulos |
|---|---|
| **Inicio** | Panel de Control, Calendario, Procesos |
| **Operación** | Validación, Mi bandeja, Notificaciones |
| **CRM** | Clientes, Contactos, Relacionamientos |
| **KAM** | KAM, Calendario KAM, Formatos de encuesta |
| **Planeación** | Proyecciones, Asignar mercado, Efectividad de mercado |
| **Configuración** | Parámetros, Formatos de calificación |
| **Administración** | Usuarios, Países, Carga masiva, Solicitudes eliminación, Auditoría |

Al pie del menú: **Soporte** y **Cerrar sesión**.

> **Nota:** Los ítems visibles dependen de su rol. Un Visitante no verá opciones de escritura; un Validador verá Validación pero no Administración.

### 3.3 Área de contenido

Cada módulo ocupa el panel central. La mayoría de listas incluyen:

- **Filtros** en la parte superior
- **Tabla** de resultados con desplazamiento horizontal en móvil
- **Paginación** al pie: *Mostrando X–Y de Z*, selector de filas (10, 20, 50, 100) y botones **Anterior** / **Siguiente**

### 3.4 Mensajes y confirmaciones

- **Mensajes temporales** en pantalla confirman acciones exitosas o avisan de errores
- **Ventanas de confirmación** aparecen antes de eliminar, publicar o cambiar estados importantes

---

## 4. Roles y permisos

El sistema define cinco roles:

| Rol | Descripción general |
|---|---|
| **Administrador** | Acceso total. Gestiona usuarios, países, parámetros, eliminaciones directas y auditoría |
| **Supervisor del Sistema** | Operación completa de escritura. Puede cerrar proyecciones, asignar mercado, ver eliminados y solicitar eliminaciones |
| **Operador** | Operación diaria de escritura. País **fijo** (no puede cambiarlo). Solicita eliminaciones en lugar de eliminar directamente |
| **Validador** | Solo lectura general, pero puede emitir **veredictos** en la bandeja de validación |
| **Visitante** | Solo lectura. No puede crear ni editar registros |

### 4.1 Matriz de permisos principales

| Acción | Admin | Supervisor | Operador | Validador | Visitante |
|---|---|---|---|---|---|
| Crear/editar procesos, CRM, proyecciones, KAM | ✓ | ✓ | ✓ | — | — |
| Cambiar país de sesión | ✓ | ✓ | — | ✓ | ✓ |
| Ver registros eliminados | ✓ | ✓ | — | — | — |
| Eliminar directamente | ✓ | — | — | — | — |
| Solicitar eliminación | — | ✓ | ✓ | — | — |
| Editar fechas de proceso | ✓ | ✓ | — | — | — |
| Asignar mercado / cerrar proyección | ✓ | ✓ | — | — | — |
| Editar parámetros financieros | ✓ | — | — | — | — |
| Emitir veredicto de validación | — | — | — | ✓ | — |
| Revertir carga masiva | ✓ | — | — | — | — |
| Gestionar usuarios y países | ✓ | — | — | — | — |

---

## 5. Inicio de sesión y cuenta

### 5.1 Iniciar sesión

1. Abra la URL del sistema
2. Ingrese su **correo electrónico** y **contraseña**
3. Pulse **Iniciar sesión**
4. Si tiene acceso a varios países, seleccione el país en el que va a trabajar
5. Será redirigido al **Panel de Control**

### 5.2 Seleccionar país

- **Primer ingreso:** *«Selecciona el país en el que vas a trabajar»*
- **Cambio de país:** desde la barra superior → **Cambiar país**
- **Operadores:** su país está fijado; no ven la opción de cambiar

### 5.3 Activar cuenta (primer acceso)

1. Reciba el correo de activación (revise spam si no lo ve)
2. Haga clic en el enlace del correo
3. Defina su contraseña en la pantalla **Activar cuenta**
4. Inicie sesión con sus nuevas credenciales

### 5.4 Recuperar contraseña

1. En la pantalla de login, pulse **¿Olvidaste tu contraseña?**
2. Ingrese su correo y pulse **Enviar instrucciones**
3. Revise su bandeja de entrada y siga el enlace
4. Defina la nueva contraseña en **Restablecer contraseña**

### 5.5 Cuenta bloqueada

Tras varios intentos fallidos de inicio de sesión, la cuenta se **bloquea por seguridad**. En ese caso:

- El restablecimiento automático **no envía correo**
- Debe contactar a un **Administrador** para desbloquearla

### 5.6 Cerrar sesión

Use **Cerrar sesión** en la barra superior o en el pie del menú lateral.

---

## 6. Panel de Control

**Menú:** Inicio → **Panel de Control**

### 6.1 Propósito

Vista ejecutiva del estado de los procesos en el país de sesión. Resume totales, distribución por estado y segmento, y permite consultar procesos con los mismos filtros de la pestaña Procesos.

### 6.2 Elementos principales

- **Total procesos:** contador general
- **Distribución por estado:** tarjetas con cantidad y porcentaje por cada estado
- **Por segmento:** desglose por segmento de negocio
- **Tabla de procesos:** listado filtrable con enlace al detalle
- **Exportar:** descarga los procesos filtrados (formato XLSX)

### 6.3 Filtros disponibles

Los mismos que en **Procesos**:

- Búsqueda por código, objeto o ID digitado
- Estado, segmento, tipo de proceso, instrumento, portal de origen
- Empresa (cliente)
- Fechas de cierre (desde / hasta)

Pulse **Filtrar** para aplicar. Use **Limpiar** para restablecer.

### 6.4 Exportar

1. Aplique los filtros deseados
2. Pulse **Exportar**
3. El archivo se descargará automáticamente

---

## 7. Calendario unificado

**Menú:** Inicio → **Calendario**

### 7.1 Propósito

Visualiza en un solo lugar las fechas relevantes de proyecciones, procesos, relacionamientos y reuniones KAM.

### 7.2 Vistas

| Vista | Descripción |
|---|---|
| **Año** | Panorama anual; opción **Ocultar meses vacíos** |
| **Mes** | Detalle mensual |
| **Agenda** | Lista cronológica de eventos |

Use **Hoy** para volver a la fecha actual.

### 7.3 Filtros de tipo de evento

Active o desactive:

- **Proyecciones**
- **Procesos**
- **Relacionamientos**
- **Reuniones KAM**
- **Reunión aclaratoria**

**Validadores** ven además: **Solo procesos donde soy validador**

### 7.4 Interacción

- Clic en un evento → navega al detalle del registro correspondiente
- Los colores y etiquetas distinguen el tipo de evento

---

## 8. Procesos

**Menú:** Inicio → **Procesos**

### 8.1 Lista de procesos

**Título:** Panel de procesos

**Botón principal:** **Crear proceso** (roles con escritura)

**Filtros:**

| Filtro | Opciones |
|---|---|
| Búsqueda | Código, objeto o ID digitado |
| Estado | Ver tabla de estados abajo |
| Segmento | Catálogo del país |
| Tipo | Periódico, No periódico |
| Instrumento | RFI, Cotización, Licitación |
| Portal | licitaciones.info, suplos, strateggi, invitación directa, otro |
| Empresa | Selector buscable |
| Cierre | Desde / Hasta |
| Eliminados | Solo activos / Activos y eliminados / Solo eliminados (Admin/Supervisor) |

**Acciones:** **Filtrar**, **Limpiar**, **Exportar**

**Columnas:** Código, Objeto, Empresa, Estado, Segmento, Tipo, Instrumento, Cuantía, **Ver detalle**

#### Estados de un proceso

| Estado | Significado operativo |
|---|---|
| **Por Validar** | Recién creado, pendiente de iniciar gestión |
| **En Proceso** | En gestión activa (tareas, indicadores) |
| **Descartado** | Descartado con motivo |
| **En Validación** | Enviado a validadores |
| **Presentado** | Propuesta presentada |
| **Subsanación** | En subsanación |
| **Adjudicado** | Ganado; habilita ciclo KAM |
| **Cerrado** | Finalizado sin adjudicación o tras cierre |

**Badge adicional:** **Devuelto** — el validador solicitó correcciones.

### 8.2 Crear un proceso


Asistente en **3 pasos**:

#### Paso 1 — Datos generales

| Campo | Notas |
|---|---|
| ID digitado | Obligatorio, identificador interno |
| Empresa | Seleccione cliente o marque **Empresa "Otro"** |
| Contactos del proceso | Mínimo uno; necesarios para encuestas KAM |
| Ubicación | Departamento y municipio (etiquetas según país) |
| Cuantía | Máximo 16 dígitos enteros |
| Objeto | Descripción del objeto contractual |
| Segmento, portal, tipo, instrumento | Según catálogos |
| Plazo ejecución (meses) | Numérico |
| Requiere experiencia | Opcional, con observación |

#### Paso 2 — Indicadores

- Seleccione el **Año de parámetros de referencia**
- Complete la tabla de indicadores financieros (KTNO, PN, ROE, ROA, MDN, IL, E, RCI)
- Si deja indicadores vacíos, el sistema pedirá confirmación

#### Paso 3 — Fechas

- **Fecha apertura** y **Fecha cierre** (obligatorias)

**Navegación:** **Anterior** / **Siguiente** / **Crear proceso**

### 8.3 Detalle de un proceso


**Acciones del encabezado:**

- **Fijar en mi bandeja**
- **Ver KAM** (si adjudicado)
- **Asignar validadores** / **Añadir validadores**
- **Cambiar estado** / **Descartar proceso**
- **Eliminar** (Admin) / **Solicitar eliminación** (Operador/Supervisor)

#### Pestañas

**Información**
- Datos generales del proceso
- Contactos del proceso (editable)
- Indicadores financieros con resultado (Aprobado, Casi Aprobado, Casi Desaprobado, No Aprobado)
- Calificación por puntos (si el país lo habilita): evaluar contra formatos

**Fechas**
- Calendario completo del proceso (apertura, cierre, manifestación de interés, adquisición del derecho, reunión aclaratoria, visita técnica, solicitudes/respuestas de aclaración, limitación Mypymes)
- **Editar fechas** (Admin/Supervisor)
- **Historial de cambios**

**Tareas**
- Checklist operativo del proceso
- Estados: **Completada**, **Pendiente**, **No aplica**
- Adjuntar evidencia (archivo o nota)

**Comentarios**
- Notas internas del equipo
- **Agregar comentario**

#### Flujo operativo típico

1. Crear proceso → estado **Por Validar**
2. Completar tareas e indicadores → **En Proceso**
3. Al 100% de tareas → **Asignar validadores** → **En Validación**
4. Validadores emiten veredicto → avance según resultado
5. **Presentado** → **Subsanación** / **Adjudicado** / **Cerrado**
6. Si **Adjudicado** → operar ciclo KAM

#### Motivos de no adjudicación

Al cerrar sin adjudicación: Precio no competitivo, Incumplimiento de indicador financiero, La entidad canceló el proceso, No se alcanzó a presentar propuesta, Otro.

---

## 9. Validación

**Menú:** Operación → **Validación**  
**Roles:** Administrador, Supervisor del Sistema, Validador

### 9.1 Bandeja de validación

Lista procesos pendientes de revisión.

| Columna | Descripción |
|---|---|
| ID validación | Identificador interno |
| Código | Código del proceso |
| Empresa | Cliente |
| Validador | Visible para Admin/Supervisor |
| Estado | Estado actual |
| Acción | **Revisar** (Validador) / **Ver** (otros) |

Filtro: campo de búsqueda + **Filtrar**

### 9.2 Revisión de un proceso


**Secciones:**

- Datos del proceso
- **Evidencias adjuntas** — **Ver evidencia**
- **Detalle de todas las tareas**
- Advertencia si hay tareas pendientes

**Veredicto** (solo Validador asignado):

| Campo | Opciones |
|---|---|
| Resultado | **Aprobado**, **Requiere Corrección** |
| Comentario | Texto libre |
| Acción | **Registrar veredicto** |

Admin y Supervisor ven la revisión en **solo lectura**.

---

## 10. Mi bandeja personal

**Menú:** Operación → **Mi bandeja**

### 10.1 Propósito

Espacio personal donde el usuario fija los registros que más le importan, agrupados por tipo y prioridad.

### 10.2 Resumen (tarjetas)

- **Total fijados**
- **Urgentes (≤ 7 días)**
- **Vencidos**
- **Procesos**, **Proyecciones**, **Relacionamientos**, **KAMs**

### 10.3 Cómo fijar un ítem

1. Abra el detalle de un proceso, proyección, relacionamiento o KAM
2. Pulse **Fijar en mi bandeja**
3. El ítem aparecerá en **Mi bandeja**
4. Para desfijar, pulse **Fijado** (icono activo)

### 10.4 Grupos y urgencia

Los ítems se organizan por tipo y subgrupo de urgencia (alta, media, baja, vencido). Clic en una tarjeta → navega al detalle.

---

## 11. Notificaciones

**Menú:** Operación → **Notificaciones**

### 11.1 Panel rápido (barra superior)

- Clic en la **campana** → panel desplegable
- **Ver todas** → pantalla completa
- **Marcar todas** → marca todas como leídas

### 11.2 Pantalla completa

- Botón **Marcar todas como leídas**
- Checkbox **Solo no leídas**
- Lista de notificaciones con tipo, tiempo relativo y mensaje
- Clic en una notificación → navega al registro y la marca como leída

**Tipos comunes:** nueva proyección, cambios de estado, alertas de vencimiento, validaciones.

---

## 12. CRM — Clientes

**Menú:** CRM → **Clientes**

### 12.1 Lista

**Botón:** **Nuevo cliente**

**Filtros:** búsqueda por empresa, segmento, estado eliminados, **Filtrar**

**Columnas:** Empresa, Segmento, Fecha creación, **Ver detalle**

### 12.2 Crear / editar cliente

| Campo | Notas |
|---|---|
| Empresa | Nombre de la organización |
| Ubicación | Departamento, municipio |
| Segmento | Catálogo; si «Otro», especificar |
| Alerta duplicados | El sistema advierte posibles duplicados |

**Acciones:** **Cancelar**, **Guardar**

### 12.3 Vista 360 del cliente


**KPIs:** Procesos activos, Cuantía activa, Proyecciones abiertas, Relacionamientos vencidos, Contactos

**Pestañas:**

| Pestaña | Contenido |
|---|---|
| **Resumen** | Datos generales |
| **Procesos** | Procesos vinculados |
| **Proyecciones** | Proyecciones del cliente |
| **Relacionamientos** | Historial de interacciones |
| **Contactos** | Personas de contacto |
| **Historial** | Línea de tiempo de eventos |

**Acciones:** **Editar**, **Nuevo contacto**, **Reasignar procesos** (Admin), **Eliminar** / **Solicitar eliminación**

---

## 13. CRM — Contactos

**Menú:** CRM → **Contactos**

### 13.1 Lista

**Botón:** **Nuevo contacto**

**Filtros:**

- Búsqueda por nombre, cargo, correo o empresa
- Filtro por empresa
- Tipo: **Todos los contactos** / **Solo específicos** / **Solo genéricos**

**Columnas:** Nombre, Empresa, Cargo, Teléfono, Correo, **Referido**, Genérico, **Editar**

### 13.2 Crear / editar contacto

| Campo | Notas |
|---|---|
| Cliente | Obligatorio al crear |
| Nombre, cargo, teléfono, correo | Datos de contacto |
| Ubicación | Departamento, municipio |
| Referido | Badge si fue referido por otro contacto |

---

## 14. CRM — Relacionamientos

**Menú:** CRM → **Relacionamientos**

### 14.1 Propósito

Registra interacciones comerciales con contactos: correos, llamadas, mensajes, visitas presenciales.

### 14.2 Vistas

- **Todos** — listado completo con filtros
- **Vencidos** — relacionamientos sin respuesta dentro del plazo

### 14.3 Filtros (vista Todos)

- Fechas de mensaje (desde / hasta)
- Búsqueda libre
- Canal, resultado
- **Filtrar**, **Limpiar**

**Canales:** Correo, Llamada, Mensaje, Presencial  
**Resultados:** Reunión programada, Referido a tercero, Ninguno

### 14.4 Crear relacionamiento

| Campo | Notas |
|---|---|
| Contacto | Persona con quien se interactuó |
| Canal | Medio de contacto |
| Mensaje | Contenido de la interacción |
| Fecha mensaje | Cuándo ocurrió |
| Fecha de alerta sin respuesta | Cuándo notificar si no hay respuesta |

### 14.5 Detalle

**Secciones:**

1. **Interacción** — datos del contacto inicial
2. **Respuesta** — registro de la respuesta recibida
3. **Resultado oficial** — desenlace final

Si el resultado es **Reunión programada** → registrar **Fecha reunión**  
Si es **Referido a tercero** → registrar datos del contacto referido

**Acciones:** **Fijar en mi bandeja**, **Guardar cambios**

---

## 15. KAM (Key Account Management)

**Menú:** KAM → **KAM**

### 15.1 Propósito

Gestiona el seguimiento post-adjudicación: rondas de contacto, encuestas de satisfacción y reuniones de cierre con el cliente.

### 15.2 Lista KAM

**Vistas:** tabla / calendario (toggle)  
**Enlace:** **Formatos de encuesta**

**Filtros:**

- Búsqueda por proceso, objeto o cliente
- Estado de ronda
- Toggle: **Adjudicados sin reunión agendada**

**Columnas:** Proceso, Objeto, Cliente, Ronda actual, Estado ronda, **Ver detalle**

**Estados de ronda:** Pendiente, Ejecutado, Socializado

### 15.3 Detalle KAM


**Acciones:** **Fijar en mi bandeja**, **Nueva ronda**

**Contactos del proceso:** lista de contactos asignados (se gestionan desde el detalle del proceso)

#### Rondas (acordeón)

Cada ronda contiene:

| Sección | Descripción |
|---|---|
| **Bitácora** | Comentarios cronológicos — **Agregar comentario** |
| **Correspondencia** | Archivos adjuntos (solo en ronda Pendiente) |
| **Encuestas** | Encuestas asignadas por contacto — **Asignar formato a contacto** |
| **Resumen de ronda** | Categoría, % global, puntos, veredicto |
| **Acciones de fase** | Según estado de la ronda |

**Flujo de ronda:**

1. **Pendiente** → asignar encuestas, completar respuestas → **Marcar fase de encuestas como completa**
2. **Ejecutado** → **Agendar reunión** o **Marcar como realizada**
3. **Socializado** → ronda cerrada

### 15.4 Responder encuesta


- Ítems con calificación: escala **1–5**
- Ítems de solo observación: campo **Observación requerida** (obligatorio)
- **Guardar respuestas** / **Guardar veredicto**

Solo editable si tiene permiso de escritura y la ronda está **Pendiente**.

### 15.5 Calendario KAM

**Menú:** KAM → **Calendario KAM**

Muestra reuniones KAM agendadas. Use **Ir a lista KAM** para volver al listado.

---

## 16. Formatos de encuesta KAM

**Menú:** KAM → **Formatos de encuesta**  
**Roles:** Administrador, Supervisor del Sistema, Operador

### 16.1 Crear formato

Tres modos:

| Modo | Descripción |
|---|---|
| **Importar Excel** | Suba archivo con columnas: sección, pregunta, subsección, requiere_calificacion |
| **Clonar formato** | Copie un formato existente |
| **Crear manual** | Arme secciones y preguntas en pantalla |

### 16.2 Estructura

- **Secciones** → **Preguntas** → opción **Requiere calificación 1–5**
- Las preguntas sin calificación son solo de observación

### 16.3 Gestión

Lista con: Nombre, cantidad de ítems, estado (**Activo** / **Inactivo**)

Acciones: **Ver / editar**, **Clonar**, **Activar** / **Desactivar**

> Si un formato está **En uso**, debe clonarlo para modificar la estructura.

---

## 17. Proyecciones

**Menú:** Planeación → **Proyecciones**

### 17.1 Propósito

Registra oportunidades futuras de licitación antes de convertirse en procesos formales.

### 17.2 Lista

**Acciones principales:**

- **Nueva proyección**
- **Asignar mercado** (Admin/Supervisor)
- **Efectividad de mercado**
- Toggle vista tabla / calendario

**Filtros:** búsqueda, estado, mercado, año, eliminados

**Estados:** Lejano, Proximo, Sale este mes, Publicado, Cerrado  
**Mercados:** General, Objetivo

**Columnas:** Proceso origen, Objeto, Empresa, Año, Fecha est. publicación, Valor venta, Valor facturación, Estado, Mercado, Días faltantes, **Ver detalle**

### 17.3 Crear proyección

| Campo | Notas |
|---|---|
| Proceso origen | Opcional; vincula a un proceso existente |
| Año | Año proyectado |
| Fecha est. publicación | Fecha estimada |
| Valores venta / facturación | Montos proyectados |
| Empresa / Cliente | Igual que en procesos |
| Segmento, Objeto | Descripción |

### 17.4 Detalle

**Acciones:** **Fijar en mi bandeja**, **Cerrar** (Admin/Supervisor)

**Cadena de proyección:** muestra origen → esta → resultante → siguiente

**Vincular proceso resultante:** busque por código o ID

Campos editables (escritura): año, fecha, valores, objeto. Mercado y días faltantes son calculados.

### 17.5 Calendario de proyecciones


Vista calendario de fechas estimadas de publicación.

---

## 18. Asignación de mercado y efectividad

### 18.1 Asignar mercado

**Roles:** Administrador, Supervisor del Sistema

**Título:** Asignación de mercado anual

1. Seleccione el **Año proyectado**
2. Opcional: **Solo sin mercado asignado**
3. Asigne **General** u **Objetivo** a cada proyección
4. Pulse **Guardar asignaciones**

### 18.2 Efectividad de mercado


Panel **Cómo funciona** explica las clasificaciones:

| Clasificación | Significado |
|---|---|
| **Ganada** | Se materializó y ABBI ganó |
| **Se materializó no se ganó** | Hubo proceso pero no se adjudicó |
| **Nunca se materializó** | No llegó a proceso |
| **Pendiente/en curso** | Aún en seguimiento |

Muestra métricas comparativas **General vs Objetivo** y gráfico de % ganadas.

---

## 19. Parámetros financieros

**Menú:** Configuración → **Parámetros**

### 19.1 Propósito

Define los valores de referencia de indicadores financieros por año. Estos valores se usan al evaluar procesos.

### 19.2 Uso

1. Seleccione el **Año** (2000 – año actual + 5)
2. Complete la tabla:

| Indicador | Regla |
|---|---|
| KTNO, PN, ROE, ROA, MDN, IL, E, RCI | **Mayor o igual** o **Menor o igual** al requerido |

3. Pulse **Guardar año** (solo **Administrador** puede editar)
4. Use **Historial** para ver cambios anteriores de un indicador

Otros roles pueden **consultar** pero no modificar.

---

## 20. Formatos de calificación

**Menú:** Configuración → **Formatos de calificación**  
**Roles:** Administrador (solo visible si el país tiene **calificación por puntos** habilitada)

### 20.1 Crear formato

1. Ingrese **Nombre** y **Puntaje mínimo**
2. Suba archivo Excel/CSV con rangos de calificación
3. Pulse **Importar formato**

### 20.2 Gestión

Lista: Nombre, Puntaje mín., Indicadores, Estado (**Activo** / **Inactivo**)

Acciones: **Ver rangos**, **Activar** / **Desactivar**

Los formatos activos se usan en el detalle de procesos para evaluación por puntos.

---

## 21. Usuarios

**Menú:** Administración → **Usuarios**  
**Rol:** Administrador

### 21.1 Lista

**Botón:** **Nuevo usuario**

**Filtros:** búsqueda, rol, país, **Filtrar**

**Columnas:** Nombre, Correo, Rol, País, Estado, **Acciones**

### 21.2 Acciones por usuario

| Acción | Cuándo |
|---|---|
| **Editar** | Modificar datos |
| **Restablecer contraseña** | Envía correo de reset |
| **Reenviar activación** | Si la cuenta no se activó |
| **Desbloquear cuenta** | Si está bloqueada |
| **Desactivar usuario** | Deshabilitar acceso |

### 21.3 Crear usuario

| Campo | Notas |
|---|---|
| Nombre | Nombre completo |
| Correo | Se envía invitación de activación |
| Rol | Administrador, Supervisor del Sistema, Operador, Validador, Visitante |
| País | País asignado (fijo para Operador) |

---

## 22. Países y configuración por país

**Menú:** Administración → **Países**  
**Rol:** Administrador

### 22.1 Lista de países

**Habilitar país:** busque y pulse **Habilitar país**

**Filtros:** Todos, Activos, Inactivos

**Columnas:** País, ISO, Moneda, Ubicaciones, Tareas, Listo, Estado

**Acciones:** **Configurar país**, **Cargar ubicaciones**, **Activar** / **Desactivar**

> Al habilitar un país se cargan automáticamente sus divisiones geográficas.

### 22.2 Configuración por país


#### Pestaña General

- Checklist operativo (ubicaciones, tareas, catálogos)
- Advertencias de configuración incompleta
- **Re-sincronizar**
- **Clonar configuración desde otro país**

#### Pestaña Tareas

Plantilla de tareas del proceso:

| Campo | Descripción |
|---|---|
| Nombre | Nombre de la tarea |
| Orden | Posición en el checklist |
| Aplica solo para procesos RFI | Checkbox |
| Requiere fecha de adquisición del derecho | Checkbox |
| Estado | Activa / Inactiva |

**Agregar tarea** para nuevas entradas.

#### Pestaña Reglas

- **Calificación por puntos:** Habilitada / Deshabilitada
- **Margen % Casi Aprobado / Casi Desaprobado**

#### Pestaña Catálogos

Gestiona catálogos del país:

- Segmentos de proceso y cliente
- Indicadores
- Portales de origen
- Etiquetas geográficas

Filtro por tipo. Estados: **Activo** / **Inactivo**

---

## 23. Carga masiva

**Menú:** Administración → **Carga masiva**  
**Roles:** Administrador, Supervisor del Sistema, Operador

### 23.1 Propósito

Importa registros masivamente desde archivos CSV o XLSX.

### 23.2 Entidades soportadas

- **Clientes**
- **Contactos**
- **Proyecciones**

### 23.3 Procedimiento

1. Seleccione la **Entidad**
2. Pulse **Descargar plantilla CSV** para ver el formato esperado
3. Prepare su archivo (.csv o .xlsx)
4. Suba el archivo con **Subir archivo**
5. Revise el resultado:
   - **Registros creados en esta carga**
   - **Corrija estas filas en su archivo** (errores por fila)
   - **Historial de cargas**

### 23.4 Revertir importación

Solo **Administrador** puede **Eliminar todo lo importado** o **Eliminar importados** de una carga anterior.

Si hay dependencias vinculadas, debe confirmar: *«Confirmo eliminar aunque existan dependencias vinculadas»*

---

## 24. Solicitudes de eliminación

**Menú:** Administración → **Solicitudes eliminación**  
**Rol:** Administrador

### 24.1 Propósito

Operadores y Supervisores no pueden eliminar directamente. Envían **solicitudes** que el Administrador aprueba o rechaza.

### 24.2 Bandeja

**Columnas:** Entidad, ID, Motivo, Fecha

**Acciones:**

- **Aprobar** — elimina el registro
- **Rechazar** — solicita comentario de rechazo

Vacío: *«No hay solicitudes pendientes.»*

---

## 25. Auditoría

**Menú:** Administración → **Auditoría**  
**Rol:** Administrador

### 25.1 Propósito

Registro de acciones realizadas en el sistema para trazabilidad y cumplimiento.

### 25.2 Consulta

**Filtros:**

- **Día**
- Tipo de entidad (por ejemplo: proceso, cliente, proyección)
- Acción (por ejemplo: edición de fechas, cambio de estado)
- **Filtrar**

**Columnas:** Fecha, Usuario, Acción, Entidad, Detalle

Incluye paginación estándar.

---

## 26. Centro de soporte

Acceso: menú lateral → **Soporte**

### 26.1 Contenido

- Saludo personalizado con su nombre
- **Preguntas frecuentes**
- **Solicitar soporte** → **Ir al HelpDesk TIC**

### 26.2 FAQ en login

El botón **?** en la pantalla de login abre un panel de preguntas frecuentes con los mismos temas de acceso, contraseña, activación y bloqueo.

---

## 27. Uso en dispositivos móviles

El sistema puede usarse desde celular o tableta.

### 27.1 Navegación móvil

- Pulse el icono de **menú** (tres líneas) para abrir el menú lateral
- El menú aparece como panel deslizante
- Para cerrarlo, pulse el menú de nuevo, toque fuera del panel o use la tecla **Escape** en teclado
- Al elegir una opción del menú, este se cierra solo

### 27.2 Qué cambia en pantalla pequeña

- La barra superior muestra iconos principales; el nombre y el rol pueden no verse para ganar espacio
- Las tablas se desplazan horizontalmente si tienen muchas columnas
- Los filtros se organizan en vertical
- Los botones son más grandes para facilitar el toque
- Las notificaciones y mensajes del sistema se adaptan al ancho de la pantalla

---

## 28. Preguntas frecuentes

### ¿Cómo accedo al sistema?
Use el correo corporativo registrado por su administrador y la contraseña definida al activar la cuenta.

### ¿Olvidé mi contraseña?
Use **¿Olvidaste tu contraseña?** en la pantalla de login. Si el correo está registrado y la cuenta no está bloqueada, recibirá un enlace.

### ¿No recibí el correo de activación?
Revise spam. Si la cuenta sigue inactiva, pida al administrador que reenvíe la invitación.

### ¿Mi cuenta está bloqueada?
Tras varios intentos fallidos, la cuenta se bloquea. Contacte a un administrador; no hay restablecimiento automático por correo.

### ¿Por qué no veo ciertas opciones del menú?
El menú se adapta a su rol. Un Visitante no verá botones de creación; un Operador no verá Administración.

### ¿Puedo cambiar de país?
Sí, excepto si es **Operador** (país fijo). Use la bandera en la barra superior → **Cambiar país**.

### ¿Cómo fijo un registro en mi bandeja?
Abra el detalle y pulse **Fijar en mi bandeja**.

### ¿Por qué no puedo editar una encuesta KAM?
Las encuestas solo se editan si tiene permiso de escritura y la ronda está en estado **Pendiente**.

### ¿Quién puede eliminar registros?
Solo el **Administrador** elimina directamente. Operadores y Supervisores **solicitan eliminación**.

### ¿Dónde llegan los correos del sistema?
A la bandeja de entrada del correo electrónico registrado en su cuenta. Revise también la carpeta de spam si no encuentra un mensaje de activación o recuperación de contraseña.

---

## 29. Glosario

| Término | Definición |
|---|---|
| **Proceso** | Expediente de una licitación pública en gestión |
| **Proyección** | Oportunidad futura de licitación aún no publicada |
| **KAM** | Key Account Management — seguimiento post-adjudicación |
| **Ronda KAM** | Ciclo de contacto/encuesta/reunión con el cliente |
| **Validación** | Revisión formal por validadores antes de avanzar |
| **Relacionamiento** | Registro de interacción comercial con un contacto |
| **Bandeja personal** | Espacio donde el usuario fija sus ítems prioritarios |
| **País de sesión** | País operativo activo (Colombia o Perú) |
| **Calificación por puntos** | Evaluación numérica de procesos según formatos |
| **Mercado General/Objetivo** | Clasificación estratégica de proyecciones |
| **Carga masiva** | Importación de registros desde CSV/XLSX |
| **Auditoría** | Registro de acciones para trazabilidad |
| **RFI** | Request for Information — tipo de instrumento |
| **Indicador financiero** | Métrica evaluada contra parámetros (KTNO, PN, ROE, etc.) |

---

## Anexo — Primeros pasos recomendados

Si es nuevo en el sistema, este recorrido le ayuda a familiarizarse con las funciones principales:

1. Inicie sesión y seleccione su país de trabajo
2. Revise el **Panel de Control** para ver el estado general
3. Explore **Procesos** y abra el detalle de uno
4. Visite **Mi bandeja** y fije un registro que le interese
5. Consulte el **Calendario** para ver fechas próximas
6. Revise **Clientes** y la vista completa de un cliente
7. Si su rol lo permite, cree un **Relacionamiento** o una **Proyección**
8. Configure **Notificaciones** y el **Centro de soporte** si necesita ayuda

Según su rol, también tendrá acceso a **Validación**, **KAM**, **Administración** u otras secciones descritas en este manual.

---

*Manual de usuario — ABBI Bid Management, Sistema de Gestión de Licitaciones.*

