import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Bloquea rutas de creación/edición para roles de solo lectura (Visitante, Validador). */
export const writeAccessGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.puedeEscribir()) {
    return true;
  }

  return router.createUrlTree(['/dashboard'], { queryParams: { sinPermiso: '1' } });
};
