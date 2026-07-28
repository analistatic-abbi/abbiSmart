import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Rol } from '../models/rol.enum';

export const roleGuard = (allowed: Rol[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const rol = auth.rol();

    if (rol && allowed.includes(rol)) {
      return true;
    }

    return router.createUrlTree(['/dashboard'], { queryParams: { sinPermiso: '1' } });
  };
};