import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ConfiguracionService } from '../services/configuracion.service';
import { map, catchError, of } from 'rxjs';

export const cargaMasivaGuard: CanActivateFn = () => {
  const configuracion = inject(ConfiguracionService);
  const router = inject(Router);

  return configuracion.list().pipe(
    map((r) => {
      const habilitada = r.data.find((item) => item.clave === 'carga_masiva_habilitada')?.valor === 'true';
      if (habilitada) return true;
      return router.createUrlTree(['/dashboard'], { queryParams: { sinPermiso: '1' } });
    }),
    catchError(() => of(router.createUrlTree(['/dashboard']))),
  );
};
