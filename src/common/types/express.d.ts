import 'express';

import type { AuthUserPayload } from '../../modules/auth/interfaces/auth-user-payload.interface';

declare module 'express-serve-static-core' {
  interface Request {
    preAuthUserId?: number;
    preAuthToken?: string;
    user?: AuthUserPayload;
  }
}
