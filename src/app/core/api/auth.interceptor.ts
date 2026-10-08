import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

// Endpoints públicos del propio flujo de auth: un 401 ahí significa "credenciales/token
// inválidos", no "tu sesión expiró en otro lado" — cada uno ya maneja su propio error en
// pantalla (LoginComponent, LoginByTokenComponent). Si el interceptor también redirigiera a
// /login para estos, login-token mostraría el formulario de login en vez de "Debes iniciar
// sesión" cuando el token viene inválido/vencido — justo lo que el requisito prohíbe.
const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh-token', '/auth/revoke-token'];

/** Adjunta el JWT del restaurante; ante 401 cierra sesión y va a /login (salvo en los
 * endpoints públicos de auth, que manejan su propio error). */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const isPublicAuthCall = PUBLIC_AUTH_PATHS.some((p) => req.url.includes(p));
  const token = auth.token();
  const authReq =
    token && !isPublicAuthCall
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((err) => {
      if (err?.status === 401 && !isPublicAuthCall) {
        auth.logout();
        router.navigateByUrl('/login');
      }
      return throwError(() => err);
    }),
  );
};
