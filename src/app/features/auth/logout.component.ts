import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../../core/api/auth.service';

/**
 * Logout por link, para una app que embebe Comanda en un WebView:
 * https://comanda.innovacors.com/logout
 *
 * Cierra la sesión actual (y revoca su refresh token) y muestra el mismo mensaje
 * que login-by-token cuando no hay sesión — nunca un formulario de login.
 */
@Component({
  selector: 'app-logout',
  template: `
    <div class="lo-wrap">
      <p class="lo-msg">Debes iniciar sesión</p>
    </div>
  `,
  styles: [`
    .lo-wrap { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: var(--bg, #f5f5f7); }
    .lo-msg { font-size: 15px; font-weight: 600; color: var(--text-2, #555); }
  `],
})
export class LogoutComponent implements OnInit {
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    this.auth.logout();
  }
}
