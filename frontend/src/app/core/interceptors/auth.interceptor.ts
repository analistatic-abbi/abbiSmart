import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.accessToken();

  if (!token || req.url.includes('/auth/login') || req.url.includes('/auth/refresh')) {
    return next(req.clone({ withCredentials: true }));
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
      withCredentials: true,
    }),
  );
};
