process.env.JWT_ACCESS_SECRET =
  'test-jwt-access-secret-minimum-32-characters-long';
process.env.COOKIE_SECURE = 'false';
// E2E corre en el host: usar 127.0.0.1 (localhost en Windows suele ir a IPv6 ::1 y Docker no lo expone).
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = process.env.DB_PORT ?? '3306';
process.env.DB_USERNAME = process.env.DB_USERNAME ?? 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? 'rootpassword';
process.env.DB_DATABASE = process.env.DB_DATABASE ?? 'licitaciones_abbi';
