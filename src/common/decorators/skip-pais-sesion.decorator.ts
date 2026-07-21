import { SetMetadata } from '@nestjs/common';

export const SKIP_PAIS_SESION_KEY = 'skipPaisSesion';

export const SkipPaisSesion = () => SetMetadata(SKIP_PAIS_SESION_KEY, true);
