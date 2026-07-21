import { registerAs } from '@nestjs/config';

export default registerAs('security', () => ({
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
  activationTokenExpiresHours: parseInt(
    process.env.ACTIVATION_TOKEN_EXPIRES_HOURS ?? '48',
    10,
  ),
  adminDevKey: process.env.ADMIN_DEV_KEY ?? '',
  maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS ?? '5', 10),
  sessionExpiresDays: parseInt(process.env.SESSION_EXPIRES_DAYS ?? '7', 10),
  preAuthExpiresMinutes: parseInt(
    process.env.PRE_AUTH_EXPIRES_MINUTES ?? '15',
    10,
  ),
}));
