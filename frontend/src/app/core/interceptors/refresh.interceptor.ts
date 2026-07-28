import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let refreshInFlight = false;

export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (
        err.status !== 401 ||
        req.url.includes('/auth/login') ||
        req.url.includes('/auth/refresh') ||
        req.url.includes('/auth/select-country') ||
        req.url.includes('/auth/prepare-country-change')
      ) {
        return throwError(() => err);
      }

      if (refreshInFlight) {
        return throwError(() => err);
      }

      refreshInFlight = true;

      return auth.refresh().pipe(
        switchMap(() => {
          refreshInFlight = false;
          const token = auth.accessToken();
          return next(
            req.clone({
              setHeaders: token ? { Authorization: `Bearer ${token}` } : {},
              withCredentials: true,
            }),
          );
        }),
        catchError((refreshErr) => {
          refreshInFlight = false;
          auth.forceLogout();
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};
