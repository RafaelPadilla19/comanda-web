import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { PlatformAdminDto, PlatformLoginResponse } from '../core/models';

const TOKEN_KEY = 'comanda_platform_token';
const ADMIN_KEY = 'comanda_platform_admin';

/** Sesión del super-admin de la plataforma, separada de la sesión de restaurante. */
@Injectable({ providedIn: 'root' })
export class PlatformAuthService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  readonly admin = signal<PlatformAdminDto | null>(this.readAdmin());
  readonly isAuthenticated = computed(() => !!this.token());

  login(email: string, password: string): Observable<PlatformLoginResponse> {
    return this.http.post<PlatformLoginResponse>(`${this.base}/platform/auth/login`, { email, password })
      .pipe(tap((res) => {
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(ADMIN_KEY, JSON.stringify(res.admin));
        this.token.set(res.token);
        this.admin.set(res.admin);
      }));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
    this.token.set(null);
    this.admin.set(null);
  }

  private readAdmin(): PlatformAdminDto | null {
    const raw = localStorage.getItem(ADMIN_KEY);
    return raw ? (JSON.parse(raw) as PlatformAdminDto) : null;
  }
}
