# Matriz de trazabilidad — Requisitos vs. implementación (backend)

Solo requisitos con lógica de API, servicios, jobs o validaciones. UI excluida.

## Decisiones de negocio confirmadas

| Tema | Decisión |
|------|----------|
| CLI-002 / CLI-004 | Segmento de cliente aplica a **Colombia y Perú** |
| PERF-003 / PERF-007 | **Operador**: país fijo por registro. **Resto de roles**: acceso a ambos países, eligen país al iniciar sesión |
| FEC-001 / FEC-003 | Al crear proceso: **apertura y cierre obligatorias**; fechas opcionales vía `PATCH /procesos/:id/fechas` dentro del rango |
| TRX-007 / TRX-014 | Carga masiva solo para **Clientes, Contactos y Proyecciones** |
| REG-008 | Catálogo geográfico sembrado (`database/seeds/ubicaciones_geograficas.sql`, `npm run seed:ubicaciones`) |

## Proyecciones

| ID | Endpoint / Job | Test |
|----|----------------|------|
| PRY-002 | Auto-gen desde `vista_procesos_calculado` | `test/proyecciones.e2e-spec.ts` |
| PRY-003–015 | CRUD, filtros, mercado, cerrar, vincular | `test/proyecciones.e2e-spec.ts` |
| PRY-014 | Carga masiva CSV/Excel columnas legibles | `test/carga-masiva.e2e-spec.ts` |

## Procesos

| ID | Endpoint | Test |
|----|----------|------|
| FEC-001 | `fechaApertura` + `fechaCierre` obligatorias en `POST /procesos` | `test/procesos.e2e-spec.ts` |
| FEC-002/005 | Rango [apertura, cierre] + historial fechas | `test/procesos.e2e-spec.ts` |
| FEC-003 | Indicadores en alta; fechas secundarias en `PATCH .../fechas` | `test/procesos.e2e-spec.ts` |
| REV-002, SEG-002/003, VAL-003–005 | Flujo estados, tareas, validación | `test/procesos.e2e-spec.ts` |

## CRM

| ID | Endpoint | Test |
|----|----------|------|
| CLI-004 | Carga masiva con país, región, segmento | `test/carga-masiva.e2e-spec.ts` |
| CON-003 | Carga masiva + `referido_por_nombre` | `test/carga-masiva.e2e-spec.ts` |
| CON-002, REL-005, TRX-012/013 | CRM manual y eliminaciones | `test/crm.e2e-spec.ts` |

## Usuarios y permisos

| ID | Endpoint | Test |
|----|----------|------|
| PERF-003/007 | Login + `select-country` (no operador) | `test/auth-login.e2e-spec.ts` |
| PERF-004 | `paisId` obligatorio; listado con filtros | `test/users-admin.e2e-spec.ts` |
| PERF-009–012 | Activación, reset, bloqueo, mensaje login | `test/users-admin.e2e-spec.ts`, `test/auth-login.e2e-spec.ts` |
| PERF-013/014 | RBAC validador/visitante | `test/rbac.e2e-spec.ts` |

## Transversal

| ID | Endpoint / Servicio | Test |
|----|---------------------|------|
| TRX-006 | Filtros/search en listados (incl. `GET /parametros?search=`) | e2e por módulo |
| TRX-007/014 | `CargaMasivaService` reutilizable + flag configuración | `test/carga-masiva.e2e-spec.ts` |
| TRX-011–013 | Soft delete, solicitudes, dependencias | `test/crm.e2e-spec.ts` |
| PAR-003 | Historial parámetros | `test/procesos.e2e-spec.ts` |
| PERF-006 | `GET /audit?entidadId=` | `test/audit.e2e-spec.ts` |

## Migraciones de base de datos

Ejecutar en orden:

1. `src/database/migrations/001_proyeccion_pais_y_vistas.sql`
2. `src/database/migrations/002_proceso_fechas_nullable.sql` (solo si aplica desde versión intermedia)
3. `src/database/migrations/003_proceso_fechas_required.sql` — apertura/cierre NOT NULL (FEC-001)

Esquema de referencia: `modelo_bd.sql` (sincronizado con migraciones).
