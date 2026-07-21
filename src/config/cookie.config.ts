import { registerAs } from '@nestjs/config';

export default registerAs('cookie', () => ({
  refreshName: process.env.COOKIE_REFRESH_NAME ?? 'abbi_refresh',
  refreshPath: process.env.COOKIE_REFRESH_PATH ?? '/api/v1/auth',
  refreshMaxAge: parseInt(process.env.COOKIE_REFRESH_MAX_AGE ?? '604800', 10),
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: (process.env.COOKIE_SAME_SITE ?? 'strict') as
    | 'strict'
    | 'lax'
    | 'none',
  domain: process.env.COOKIE_DOMAIN || undefined,
}));
