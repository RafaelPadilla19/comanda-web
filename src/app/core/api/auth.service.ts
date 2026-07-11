import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginResponse, PlanFeaturesDto, UserDto } from './models';

export type PlanFeature = keyof Omit<PlanFeaturesDto, 'planName'>;

const TOKEN_KEY = 'comanda_token';
const USER_KEY = 'comanda_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  readonly currentUser = signal<UserDto | null>(this.readUser());
  readonly isAuthenticated = computed(() => !!this.token());

  /** Funciones del plan del restaurante (null = sin plan cargado todavía). */
  readonly planFeatures = computed<PlanFeaturesDto | null>(() => this.currentUser()?.plan ?? null);

  /**
   * ¿El plan incluye la función? Permisivo si aún no hay plan en la sesión
   * (evita esconder todo en el primer render antes de que /auth/me responda).
   */
  hasFeature(feature: PlanFeature): boolean {
    const plan = this.planFeatures();
    return plan ? plan[feature] : true;
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.base}/auth/login`, { email, password })
      .pipe(tap((res) => this.setSession(res)));
  }

  /** Auto-registro de un restaurante (crea tenant + admin y deja la sesión iniciada). */
  register(body: { restaurantName: string; adminName: string; email: string; password: string; country: string }): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.base}/auth/register`, body)
      .pipe(tap((res) => this.setSession(res)));
  }

  me(): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.base}/auth/me`).pipe(tap((u) => this.currentUser.set(u)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.token.set(null);
    this.currentUser.set(null);
  }

  private setSession(res: LoginResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.token.set(res.token);
    this.currentUser.set(res.user);
  }

  private readUser(): UserDto | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UserDto) : null;
  }
}
