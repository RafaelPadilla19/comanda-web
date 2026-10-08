import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/api/auth.service';

/**
 * Login por link, para una app que embebe Comanda en un WebView:
 * https://comanda.innovacors.com/login-token/{token}
 *
 * {token} es el refreshToken de una sesión ya existente (lo emite /auth/login,
 * /auth/register o el propio /auth/refresh-token). Si es válido, deja al usuario
 * logueado sin pedirle nada — nunca muestra un formulario de login.
 */
@Component({
  selector: 'app-login-by-token',
  template: `
    <div class="lt-wrap">
      @if (checking()) {
        <p class="lt-msg">Iniciando sesión…</p>
      } @else {
        <p class="lt-msg">Debes iniciar sesión</p>
      }
    </div>
  `,
  styles: [`
    .lt-wrap { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: var(--bg, #f5f5f7); }
    .lt-msg { font-size: 15px; font-weight: 600; color: var(--text-2, #555); }
  `],
})
export class LoginByTokenComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  protected readonly checking = signal(true);

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.checking.set(false);
      return;
    }

    // Por si el navegador/WebView ya traía una sesión de otro usuario: este link siempre
    // representa "entra como este" — arranca limpio para no mezclar sesiones.
    this.auth.logout();

    this.auth.loginWithToken(token).subscribe({
      next: () => this.router.navigateByUrl('/dashboard'),
      error: () => this.checking.set(false),
    });
  }
}
