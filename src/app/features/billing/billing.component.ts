import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ComandaApi } from '@core/api/comanda-api.service';
import { BillingDto, PlanDto, SubscriptionStatus } from '@core/api/models';
import { money } from '@shared/format';

@Component({
  selector: 'app-billing',
  templateUrl: './billing.component.html',
})
export class BillingComponent implements OnInit {
  private readonly api = inject(ComandaApi);
  protected readonly money = money;

  protected readonly billing = signal<BillingDto | null>(null);
  protected readonly plans = signal<PlanDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly processing = signal(false);
  protected readonly changingId = signal<string | null>(null);
  protected readonly msg = signal<string | null>(null);
  /** Link de pago cuando el navegador bloqueó la ventana emergente (evita que el usuario reintente y duplique el cobro). */
  protected readonly blockedPayUrl = signal<string | null>(null);

  /** Abre la URL de pago; si el navegador bloquea el popup, deja el link visible en vez de fallar en silencio. */
  private openPayment(url: string): void {
    this.blockedPayUrl.set(null);
    const win = window.open(url, '_blank');
    if (!win || win.closed) {
      this.blockedPayUrl.set(url);
      this.msg.set('Tu navegador bloqueó la ventana de pago. Usa el enlace de abajo para continuar.');
    }
  }

  ngOnInit(): void {
    this.load();
    this.api.billingPlans().subscribe((p) => this.plans.set(p));
  }

  private load(): void {
    this.api.billing().subscribe({
      next: (b) => { this.billing.set(b); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  /** Días para el vencimiento (negativo = ya venció). Null si no hay vigencia. */
  protected readonly daysLeft = computed(() => {
    const iso = this.billing()?.subscriptionEndsAt;
    if (!iso) return null;
    return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  });

  /** Aviso de renovación: 'pastdue' (vencido) | 'soon' (por vencer) | null. */
  protected readonly renewalAlert = computed<'pastdue' | 'soon' | null>(() => {
    const b = this.billing();
    if (!b) return null;
    if (b.status === 'PastDue') return 'pastdue';
    const d = this.daysLeft();
    if (b.priceMonthly > 0 && b.status === 'Active' && d !== null && d <= 3) return 'soon';
    return null;
  });

  protected isCurrent(p: PlanDto): boolean { return p.name === this.billing()?.planName; }

  /** Mejora/cambia a un plan: gratis se activa al instante; pago abre el checkout de Wompi. */
  protected choosePlan(p: PlanDto): void {
    if (this.isTrial() || this.changingId() || this.isCurrent(p)) return;
    this.changingId.set(p.id);
    this.msg.set(null);
    this.api.billingCheckout(window.location.href, p.id).subscribe({
      next: (r) => {
        this.changingId.set(null);
        if (r.paid) { this.msg.set(r.message || 'Plan actualizado.'); this.load(); }
        else if (r.paymentUrl) this.openPayment(r.paymentUrl);
      },
      error: (e) => {
        this.changingId.set(null);
        this.msg.set(e?.error?.mensaje ?? 'No se pudo cambiar el plan.');
      },
    });
  }

  /** Overage pendiente de cobro este ciclo (US$). */
  protected readonly pendingOverage = computed(() => this.billing()?.usage?.overageAmount ?? 0);
  /** Total del próximo cobro: mensualidad + overage pendiente. */
  protected readonly nextChargeTotal = computed(() => (this.billing()?.priceMonthly ?? 0) + this.pendingOverage());

  protected readonly overageSaving = signal(false);

  /** Activa/desactiva los pedidos extra (overage) del restaurante. */
  protected toggleOverage(): void {
    const u = this.billing()?.usage;
    if (!u || this.overageSaving()) return;
    this.overageSaving.set(true);
    this.msg.set(null);
    this.api.setOverage(!u.allowOverage).subscribe({
      next: (usage) => {
        this.overageSaving.set(false);
        this.billing.update((b) => (b ? { ...b, usage } : b));
      },
      error: (e) => {
        this.overageSaving.set(false);
        this.msg.set(e?.error?.mensaje ?? 'No se pudo actualizar los pedidos extra.');
      },
    });
  }

  protected readonly statusLabel = computed(() => {
    const map: Record<SubscriptionStatus, string> = {
      Trial: 'Período de prueba', Active: 'Activa', Suspended: 'Suspendida', Cancelled: 'Cancelada', PastDue: 'Vencida',
    };
    return map[this.billing()?.status ?? 'Trial'];
  });
  protected readonly statusColor = computed(() => {
    const s = this.billing()?.status;
    return s === 'Active' ? 'var(--primary)' : s === 'Suspended' || s === 'PastDue' ? '#ef4444' : s === 'Trial' ? '#3B82F6' : 'var(--text-3)';
  });

  /** Campaña de lanzamiento: acceso Premium gratis, sin tarjeta. El pago se muestra pero deshabilitado. */
  protected readonly isTrial = computed(() => this.billing()?.status === 'Trial');
  protected readonly trialEndsLabel = computed(() => this.fmtDate(this.billing()?.trialEndsAt ?? null));

  protected pct(n: number, max: number): number {
    return max <= 0 ? 0 : Math.min(100, Math.round((n / max) * 100));
  }

  protected fmtDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /** Rango de fechas que cubre un pago confirmado, ej. "21 jun – 21 jul 2026". Null si aún no se confirma. */
  protected periodRange(p: { periodEndsAt: string | null; periodMonths: number }): string | null {
    if (!p.periodEndsAt) return null;
    const end = new Date(p.periodEndsAt);
    const start = new Date(end);
    start.setMonth(start.getMonth() - (p.periodMonths || 1));
    return `${this.fmtDate(start.toISOString())} – ${this.fmtDate(end.toISOString())}`;
  }

  protected pay(): void {
    if (this.isTrial() || this.processing()) return;
    this.processing.set(true);
    this.msg.set(null);
    this.api.billingCheckout(window.location.href).subscribe({
      next: (r) => {
        this.processing.set(false);
        if (r.paid) { this.msg.set(r.message || 'Plan activado.'); this.load(); }
        else if (r.paymentUrl) this.openPayment(r.paymentUrl);
      },
      error: (e) => {
        this.processing.set(false);
        this.msg.set(e?.error?.mensaje ?? 'No se pudo iniciar el cobro.');
      },
    });
  }
}
