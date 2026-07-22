# Postman — Smart Licitaciones Backend

## Importar

1. Abre Postman → **Import**
2. Importa el entorno: `Smart-Licitaciones-Local.postman_environment.json`
3. Importa las colecciones (recomendado en este orden):
   - `Smart-Licitaciones-Verificacion-Release.postman_collection.json` ← **verificación completa antes de subir**
   - `Smart-Licitaciones-Auth.postman_collection.json`
   - `Smart-Licitaciones-Fase-C.postman_collection.json`
   - `Smart-Licitaciones-Fase-D.postman_collection.json`
   - `Smart-Licitaciones-Fase-E.postman_collection.json`
4. Selecciona el entorno **Smart Licitaciones — Local**

## Antes de ejecutar

```bash
# API en marcha
npm run start:dev

# Catálogo geográfico (Colombia + Perú)
npm run seed:ubicaciones

# Migraciones aplicadas (001, 003 como mínimo)
```

Variables del entorno:

| Variable | Valor por defecto | Notas |
|----------|-------------------|--------|
| `baseUrl` | `http://localhost:3000/api/v1` | |
| `adminDevKey` | `dev-secret-change-me` | Debe coincidir con `.env` |
| `adminPassword` | `Password1` | |
| `paisId` | `1` | Colombia (ajustar si difiere en BD) |

Requisitos API en desarrollo: `MAIL_HOST` vacío y `NODE_ENV=development` para recibir `devActivationToken` en crear usuario.

## Verificación de release (recomendado)

**Collection Runner** → carpeta `▶ RUN — Verificación completa` de **Smart Licitaciones — Verificación Release** → **Run**.

Cubre:

- Auth + selección de país (PERF-007)
- Usuarios con `paisId` obligatorio (PERF-004)
- Filtros TRX-006 (contactos, clientes, relacionamientos, usuarios, parámetros)
- Carga masiva clientes / contactos / proyecciones (CLI-004, CON-003, PRY-014)
- Proceso con `fechaApertura` + `fechaCierre` obligatorias (FEC-001)
- Historial de fechas (FEC-005)
- Operador con país fijo (sin `select-country`)

## CSV de ejemplo (carga masiva)

| Archivo | Uso |
|---------|-----|
| `clientes-carga-ejemplo.csv` | `POST /carga-masiva/clientes` |
| `contactos-carga-ejemplo.csv` | `POST /carga-masiva/contactos` |
| `proyecciones-carga-ejemplo.csv` | `POST /carga-masiva/proyecciones` |

En Postman: Body → **form-data** → `file` (tipo File) o `content` (tipo Text con el CSV).
