import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PlatformAuthService } from './platform-auth.service';
import { ApiError } from '../core/models';

@Component({
  selector: 'app-platform-login',
  imports: [FormsModule],
  template: `
    <div class="login-wrap" data-theme="light">
      <div class="login-card">
        <div class="brand">
          <div class="logo" style="background:linear-gradient(140deg,#6366F1,#4F46E5);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h18M9 21V9"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
          </div>
          <div>
            <div class="brand-name">Comanda</div>
            <div class="brand-sub">Consola de operador</div>
          </div>
        </div>
        <h1 class="title">Panel de plataforma</h1>
        <p class="subtitle">Acceso exclusivo del operador del SaaS.</p>
        <form (ngSubmit)="submit()">
          <label class="field"><span>Correo</span>
            <input type="email" name="email" [ngModel]="email()" (ngModelChange)="email.set($event)" autocomplete="username" placeholder="admin@comanda.sv" required /></label>
          <label class="field"><span>Contraseña</span>
            <input type="password" name="password" [ngModel]="password()" (ngModelChange)="password.set($event)" autocomplete="current-password" placeholder="••••••••" required /></label>
          @if (error()) { <div class="error">{{ error() }}</div> }
          <button type="submit" class="submit" [disabled]="loading()">{{ loading() ? 'Ingresando…' : 'Entrar' }}</button>
        </form>
      </div>
    </div>
  `,
  styleUrl: './login.css',
})
export class PlatformLoginComponent {
  private readonly auth = inject(PlatformAuthService);
  private readonly router = inject(Router);

  protected email = signal('admin@comanda.sv');
  protected password = signal('');
  protected loading = signal(false);
  protected error = signal<string | null>(null);

  protected submit(): void {
    if (this.loading()) return;
    this.error.set(null);
    this.loading.set(true);
    this.auth.login(this.email().trim(), this.password()).subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: (err) => {
        this.error.set((err?.error as ApiError | undefined)?.mensaje ?? 'No se pudo iniciar sesión.');
        this.loading.set(false);
      },
    });
  }
}
