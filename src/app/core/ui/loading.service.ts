import { Injectable, computed, signal } from '@angular/core';

/** Cuenta peticiones HTTP en vuelo para mostrar una barra de carga global. */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly pending = signal(0);
  readonly active = computed(() => this.pending() > 0);

  start(): void { this.pending.update((n) => n + 1); }
  stop(): void { this.pending.update((n) => Math.max(0, n - 1)); }
}
