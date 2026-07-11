import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { PlatformAuthService } from './platform/platform-auth.service';

/** Adjunta el token de super-admin a todas las llamadas; 401 → vuelve al login del operador. */
export const platformInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(PlatformAuthService);
  const isLogin = req.url.includes('/platform/auth/login');
  const token = auth.token();
  const authReq = token && !isLogin ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((err) => {
      if (err?.status === 401 && !isLogin) { auth.logout(); router.navigateByUrl('/login'); }
      return throwError(() => err);
    }),
  );
};
