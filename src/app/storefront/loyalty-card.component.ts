import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import QRCode from 'qrcode';
import { StorefrontApi } from './storefront-api.service';
import { LoyaltyLookupDto } from '@core/api/models';

const PHONE_KEY = 'comanda_customer_phone';

/** Tarjeta digital de fidelidad: el cliente pone su teléfono y ve su saldo de puntos + QR. */
@Component({
  selector: 'app-loyalty-card',
  imports: [FormsModule],
  template: `
    <div class="lc-wrap">
      <header class="lc-hd">
        <div class="lc-badge">🎁</div>
        <h1>Tarjeta de fidelidad</h1>
        <p>{{ branchName() || 'Consulta tus puntos con tu número de teléfono.' }}</p>
      </header>

      @if (!loyalty() || !loyalty()!.enabled) {
        <div class="lc-form">
          <label>Tu número de teléfono
            <input inputmode="tel" [(ngModel)]="phone" placeholder="7000-0000" (keyup.enter)="lookup()" />
          </label>
          <button (click)="lookup()" [disabled]="loading() || phone.trim().length < 4">
            {{ loading() ? 'Buscando…' : 'Ver mi tarjeta' }}
          </button>
          @if (notFound()) {
            <div class="lc-msg">Este negocio no tiene fidelización activa, o no encontramos ese teléfono todavía. Se crea tu tarjeta automáticamente en tu primer pedido.</div>
          }
        </div>
      } @else {
        <div class="lc-card">
          <div class="lc-card-top">
            <div>
              <div class="lc-label">Cliente</div>
              <div class="lc-name">{{ loyalty()!.customerName || 'Bienvenido' }}</div>
            </div>
            <button class="lc-change" (click)="reset()">Cambiar teléfono</button>
          </div>
          <div class="lc-points">
            <div class="lc-points-num">{{ loyalty()!.points }}</div>
            <div class="lc-points-label">puntos</div>
          </div>
          @if (loyalty()!.redeemableAmount > 0) {
            <div class="lc-redeem">Puedes canjear hasta <b>{{ money(loyalty()!.redeemableAmount) }}</b> en tu próximo pedido</div>
          }
          @if (qrImage()) {
            <div class="lc-qr">
              <img [src]="qrImage()" alt="Código de tu tarjeta" />
              <span>Muestra este código en caja</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: var(--bg); color: var(--text); }
    .lc-wrap { max-width: 420px; margin: 0 auto; padding: 32px 18px; }
    .lc-hd { text-align: center; margin-bottom: 24px; }
    .lc-badge {
      width: 60px; height: 60px; margin: 0 auto 14px;
      display: grid; place-items: center; font-size: 30px;
      background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
    }
    .lc-hd h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.4px; }
    .lc-hd p { font-size: 14px; color: var(--text-2); margin-top: 6px; }
    .lc-form { display: flex; flex-direction: column; gap: 12px; }
    .lc-form label { font-size: 12.5px; font-weight: 600; color: var(--text-2); display: flex; flex-direction: column; gap: 6px; }
    .lc-form input {
      height: 46px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--border);
      background: var(--surface); color: var(--text); font-size: 15px; font-family: inherit;
    }
    .lc-form button {
      height: 46px; border: none; border-radius: 12px; font-weight: 700; font-size: 14px;
      background: linear-gradient(140deg,#10B981,#059669); color: #fff; cursor: pointer; font-family: inherit;
    }
    .lc-form button:disabled { opacity: .5; cursor: not-allowed; }
    .lc-msg { font-size: 12.5px; color: var(--text-3); text-align: center; }
    .lc-card {
      background: linear-gradient(140deg,var(--primary-soft),transparent);
      border: 1px solid var(--border); border-radius: 20px; padding: 24px; box-shadow: var(--shadow-sm);
    }
    .lc-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
    .lc-label { font-size: 11.5px; color: var(--text-3); font-weight: 600; }
    .lc-name { font-size: 17px; font-weight: 800; margin-top: 2px; }
    .lc-change { border: none; background: none; color: var(--primary-text); font-size: 12px; font-weight: 700; cursor: pointer; padding: 0; }
    .lc-points { text-align: center; margin: 28px 0; }
    .lc-points-num { font-size: 56px; font-weight: 800; letter-spacing: -1.5px; line-height: 1; }
    .lc-points-label { font-size: 13px; color: var(--text-2); font-weight: 600; margin-top: 4px; }
    .lc-redeem { text-align: center; font-size: 13px; color: var(--text-2); margin-bottom: 20px; }
    .lc-qr { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .lc-qr img { width: 160px; height: 160px; border-radius: 12px; }
    .lc-qr span { font-size: 11.5px; color: var(--text-3); }
  `],
})
export class LoyaltyCardComponent implements OnInit {
  private readonly api = inject(StorefrontApi);
  private readonly route = inject(ActivatedRoute);

  protected phone = '';
  protected readonly loading = signal(false);
  protected readonly notFound = signal(false);
  protected readonly loyalty = signal<LoyaltyLookupDto | null>(null);
  protected readonly qrImage = signal<string | null>(null);
  protected readonly branchName = signal('');

  private branchId = '';

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    const saved = localStorage.getItem(PHONE_KEY);
    if (saved) this.phone = saved;

    if (!slug) return;
    this.api.branches(slug).subscribe((branches) => {
      const b = branches[0];
      if (!b) return;
      this.branchId = b.id;
      this.branchName.set(b.name);
      if (this.phone.trim().length >= 4) this.lookup();
    });
  }

  protected lookup(): void {
    const digits = this.phone.trim();
    if (!this.branchId || digits.length < 4 || this.loading()) return;
    this.loading.set(true);
    this.notFound.set(false);
    this.api.loyaltyLookup(this.branchId, digits).subscribe({
      next: (l) => {
        this.loading.set(false);
        if (!l.enabled) { this.notFound.set(true); this.loyalty.set(null); return; }
        localStorage.setItem(PHONE_KEY, digits);
        this.loyalty.set(l);
        QRCode.toDataURL(digits, { width: 320, margin: 2, errorCorrectionLevel: 'M' }).then((img) => this.qrImage.set(img));
      },
      error: () => { this.loading.set(false); this.notFound.set(true); },
    });
  }

  protected reset(): void {
    this.loyalty.set(null);
    this.qrImage.set(null);
    localStorage.removeItem(PHONE_KEY);
  }

  protected money(n: number): string {
    return `$${n.toFixed(2)}`;
  }
}
