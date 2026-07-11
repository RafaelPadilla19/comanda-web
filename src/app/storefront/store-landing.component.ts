import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StorefrontApi } from './storefront-api.service';
import { BranchDto } from '@core/api/models';

/** Página pública para elegir sucursal cuando el QR no apunta a una específica. */
@Component({
  selector: 'app-store-landing',
  imports: [RouterLink],
  template: `
    <div class="lp-wrap">
      <header class="lp-hd">
        <div class="lp-badge">🍽️</div>
        <h1>Elige tu sucursal</h1>
        <p>Pide en línea para comer aquí, llevar o a domicilio.</p>
      </header>

      @if (loading()) {
        <p class="lp-msg">Cargando sucursales…</p>
      } @else if (branches().length === 0) {
        <p class="lp-msg">No hay sucursales disponibles por ahora.</p>
      } @else {
        <div class="lp-list">
          @for (b of branches(); track b.id) {
            <a class="lp-card" [routerLink]="['/t', b.id]">
              <div class="lp-card-emoji">📍</div>
              <div class="lp-card-body">
                <h3>{{ b.name }}</h3>
                <p>{{ b.address }}</p>
                <span>🕒 {{ b.hours }}</span>
              </div>
              <span class="lp-arrow">›</span>
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: var(--bg); color: var(--text); }
    .lp-wrap { max-width: 560px; margin: 0 auto; padding: 32px 18px; }
    .lp-hd { text-align: center; margin-bottom: 24px; }
    .lp-badge {
      width: 60px; height: 60px; margin: 0 auto 14px;
      display: grid; place-items: center; font-size: 30px;
      background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
    }
    .lp-hd h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.4px; }
    .lp-hd p { font-size: 14px; color: var(--text-2); margin-top: 6px; }
    .lp-msg { text-align: center; color: var(--text-3); padding: 40px; }
    .lp-list { display: flex; flex-direction: column; gap: 12px; }
    .lp-card {
      display: flex; gap: 14px; align-items: center;
      padding: 16px; background: var(--surface);
      border: 1px solid var(--border); border-radius: 14px;
      text-decoration: none; color: inherit;
      transition: border-color 0.12s, transform 0.12s;
    }
    .lp-card:hover { border-color: var(--primary); transform: translateY(-1px); }
    .lp-card-emoji {
      width: 46px; height: 46px; flex: none;
      display: grid; place-items: center; font-size: 22px;
      background: var(--primary-soft); border-radius: 12px;
    }
    .lp-card-body { flex: 1; min-width: 0; }
    .lp-card-body h3 { font-size: 15px; font-weight: 700; }
    .lp-card-body p { font-size: 13px; color: var(--text-2); margin: 2px 0; }
    .lp-card-body span { font-size: 12px; color: var(--text-3); }
    .lp-arrow { font-size: 24px; color: var(--text-3); }
  `],
})
export class StoreLandingComponent implements OnInit {
  private readonly api = inject(StorefrontApi);
  private readonly route = inject(ActivatedRoute);
  protected readonly branches = signal<BranchDto[]>([]);
  protected readonly loading = signal(true);

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    if (!slug) { this.loading.set(false); return; }
    this.api.branches(slug).subscribe({
      next: (b) => { this.branches.set(b); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
