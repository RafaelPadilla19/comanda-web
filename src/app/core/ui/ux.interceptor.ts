import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, throwError } from 'rxjs';
import { LoadingService } from './loading.service';
import { ToastService } from './toast.service';
import { ApiError } from '@core/api/models';

/**
 * UX transversal para todas las peticiones HTTP:
 *  - barra de carga global (cuenta peticiones en vuelo),
 *  - toast de error automático con el mensaje del API (en español).
 * El 401 lo maneja authInterceptor (cierre de sesión), así que aquí se omite.
 */
export const uxInterceptor: HttpInterceptorFn = (req, next) => {
  const loading = inject(LoadingService);
  const toast = inject(ToastService);

  loading.start();

  return next(req).pipe(
    catchError((err) => {
      const status = err?.status ?? 0;
      // 401 lo maneja authInterceptor. 0 = sin conexión con el servidor.
      if (status !== 401) {
        const msg = (err?.error as ApiError | undefined)?.mensaje
          ?? (status === 0 ? 'No hay conexión con el servidor.' : 'Ocurrió un error. Intenta de nuevo.');
        toast.error(msg);
      }
      return throwError(() => err);
    }),
    finalize(() => loading.stop()),
  );
};
