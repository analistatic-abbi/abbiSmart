import { registerAs } from '@nestjs/config';

export default registerAs('swagger', () => ({
  enabled: process.env.SWAGGER_ENABLED !== 'false',
  path: process.env.SWAGGER_PATH ?? 'api/docs',
  title: process.env.SWAGGER_TITLE ?? 'Smart Licitaciones API',
  description:
    process.env.SWAGGER_DESCRIPTION ??
    'API backend del sistema de gestión de licitaciones ABBI',
  version: process.env.SWAGGER_VERSION ?? '1.0',
}));
