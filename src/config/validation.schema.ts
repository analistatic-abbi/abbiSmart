import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(3306),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').default(''),
  DB_DATABASE: Joi.string().default('licitaciones_abbi'),

  CORS_ORIGINS: Joi.string().default('http://localhost:4200'),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
    .default('info'),

  BCRYPT_ROUNDS: Joi.number().integer().min(10).max(15).default(12),
  ACTIVATION_TOKEN_EXPIRES_HOURS: Joi.number().integer().min(1).max(168).default(48),
  ADMIN_DEV_KEY: Joi.string().allow('').default(''),

  MAX_LOGIN_ATTEMPTS: Joi.number().integer().min(1).max(20).default(5),
  SESSION_EXPIRES_DAYS: Joi.number().integer().min(1).max(90).default(7),
  PRE_AUTH_EXPIRES_MINUTES: Joi.number().integer().min(1).max(60).default(15),
  THROTTLE_TTL: Joi.number().integer().min(1).default(60),
  THROTTLE_LIMIT: Joi.number().integer().min(1).default(10),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  COOKIE_REFRESH_NAME: Joi.string().default('abbi_refresh'),
  COOKIE_REFRESH_PATH: Joi.string().default('/api/v1/auth'),
  COOKIE_REFRESH_MAX_AGE: Joi.number().integer().min(60).default(604800),
  COOKIE_SECURE: Joi.boolean().default(false),
  COOKIE_SAME_SITE: Joi.string()
    .valid('strict', 'lax', 'none')
    .default('strict'),
  COOKIE_DOMAIN: Joi.string().allow('').default(''),

  MAIL_HOST: Joi.string().allow('').default(''),
  MAIL_PORT: Joi.number().port().default(587),
  MAIL_USER: Joi.string().allow('').default(''),
  MAIL_PASSWORD: Joi.string().allow('').default(''),
  MAIL_FROM: Joi.string().email().default('noreply@abbi.com'),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:4200'),

  SWAGGER_ENABLED: Joi.boolean().default(true),
  SWAGGER_PATH: Joi.string().default('api/docs'),
  SWAGGER_TITLE: Joi.string().default('Smart Licitaciones API'),
  SWAGGER_DESCRIPTION: Joi.string().default(
    'API backend del sistema de gestión de licitaciones ABBI',
  ),
  SWAGGER_VERSION: Joi.string().default('1.0'),
});
