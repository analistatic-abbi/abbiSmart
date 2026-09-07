# Smart Licitaciones (ABBI)

API NestJS 11 + frontend Angular + MariaDB.

## Despliegue (Docker)

```bash
cp .env.docker.example .env
# Completar secretos reales: JWT_ACCESS_SECRET, DB_PASSWORD, SMTP, etc.
# COOKIE_SECURE=true si sirves por HTTPS

npm run docker:prod
```

| Servicio | URL |
|----------|-----|
| Aplicación | http://localhost:4200 |
| API | http://localhost:3000/api/v1 |
| Health | http://localhost:3000/api/v1/health |

Detener:

```bash
npm run docker:prod:down
```

### Primer acceso

En el **primer arranque** del volumen MariaDB se cargan esquema, ubicaciones geográficas y un administrador:

| Campo | Valor |
|-------|--------|
| Correo | `admin@abbi.com` |
| Contraseña | `Admin1234` |

**Cambia la contraseña inmediatamente** tras el primer login.

Países nuevos y sus ubicaciones se gestionan desde la aplicación (Admin → Países); no hace falta reinyectar SQL.

### Variables sensibles

El archivo `.env` **no** debe subirse a Git. En producción usa secretos distintos a los de desarrollo (JWT, DB, SMTP, Monday, etc.).
