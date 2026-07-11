import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PlatformApi } from './platform-api.service';
import { PlatformAuthService } from './platform-auth.service';
import { CA_COUNTRIES, CountryPaymentMethodDto, CountryPaymentMethodUpsert, PlanDto, PlanUpsert, PlatformMetricsDto, PlatformTenantDto, SubscriptionStatus } from '../core/models';
import { money } from '../core/format';

type PfView = 'resumen' | 'planes' | 'metodos' | 'ajustes';

@Component({
  selector: 'app-platform-dashboard',
  imports: [FormsModule],
  templateUrl: './platform-dashboard.component.html',
  styleUrl: './platform-dashboard.component.css',
})
export class PlatformDashboardComponent implements OnInit {
  private readonly api = inject(PlatformApi);
  private readonly auth = inject(PlatformAuthService);
  private readonly router = inject(Router);

  protected readonly money = money;
  protected readonly adminName = this.auth.admin()?.name ?? 'Operador';
  protected readonly adminInitials = (this.auth.admin()?.name ?? 'OP')
    .split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  protected readonly view = signal<PfView>('resumen');
  protected setView(v: PfView): void { this.view.set(v); }

  protected initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
  }

  /** Degradado estable por nombre, para el avatar del restaurante. */
  protected avatar(name: string): string {
    const grads = [
      'linear-gradient(135deg,#10B981,#059669)', 'linear-gradient(135deg,#3B82F6,#2563EB)',
      'linear-gradient(135deg,#8B5CF6,#6366F1)', 'linear-gradient(135deg,#F59E0B,#D97706)',
      'linear-gradient(135deg,#EC4899,#DB2777)', 'linear-gradient(135deg,#14B8A6,#0D9488)',
    ];
    let h = 0;
    for (const ch of name) h = (h + ch.charCodeAt(0)) % grads.length;
    return grads[h];
  }

  protected readonly metrics = signal<PlatformMetricsDto | null>(null);
  protected readonly tenants = signal<PlatformTenantDto[]>([]);
  protected readonly plans = signal<PlanDto[]>([]);

  ngOnInit(): void {
    this.loadPlans();
    this.refresh();
    this.loadWompi();
    this.loadMethods();
  }

  private loadPlans(): void { this.api.plans().subscribe((p) => this.plans.set(p)); }

  private refresh(): void {
    this.api.metrics().subscribe((m) => this.metrics.set(m));
    this.api.tenants().subscribe((t) => this.tenants.set(t));
  }

  protected changePlan(t: PlatformTenantDto, planId: string): void {
    if (!planId || planId === t.planId) return;
    this.api.assignPlan(t.id, planId).subscribe(() => this.refresh());
  }

  protected setStatus(t: PlatformTenantDto, status: SubscriptionStatus): void {
    this.api.setStatus(t.id, status).subscribe(() => this.refresh());
  }

  protected statusColor(s: SubscriptionStatus): string {
    return s === 'Active' ? 'var(--primary)' : s === 'Trial' ? 'var(--blue, #3B82F6)'
      : s === 'Suspended' || s === 'PastDue' ? 'var(--red, #ef4444)' : 'var(--text-3)';
  }
  protected statusLabel(s: SubscriptionStatus): string {
    return { Active: 'Activo', Trial: 'Prueba', Suspended: 'Suspendido', Cancelled: 'Cancelado', PastDue: 'Vencido' }[s] ?? s;
  }

  protected lim(n: number): string { return n <= 0 ? '∞' : String(n); }

  // ---- Editor de planes ----
  protected readonly editing = signal<PlanUpsert | null>(null);
  protected readonly saving = signal(false);

  private blank(): PlanUpsert {
    return {
      name: '', priceMonthly: 0, maxBranches: 1, maxProducts: 50, maxUsers: 3, maxOrdersMonth: 50,
      overagePrice: 0, retentionMonths: 12, onlinePayments: false, coupons: false, loyalty: false,
      advancedReports: false, inventory: false, sortOrder: this.plans().length, isActive: true,
    };
  }

  protected newPlan(): void { this.editing.set(this.blank()); }
  protected editPlan(p: PlanDto): void { this.editing.set({ ...p }); }
  protected closeEditor(): void { this.editing.set(null); }

  protected savePlan(): void {
    const p = this.editing();
    if (!p || !p.name.trim() || this.saving()) return;
    this.saving.set(true);
    const done = () => { this.saving.set(false); this.editing.set(null); this.loadPlans(); this.refresh(); };
    const fail = () => this.saving.set(false);
    (p.id ? this.api.updatePlan(p) : this.api.createPlan(p)).subscribe({ next: done, error: fail });
  }

  protected deletePlan(p: PlanDto): void {
    if (!confirm(`¿Eliminar el plan «${p.name}»? Si está en uso, se desactivará en su lugar.`)) return;
    this.api.deletePlan(p.id).subscribe(() => this.loadPlans());
  }

  // ---- Credenciales Wompi de plataforma ----
  protected readonly wompiConnected = signal(false);
  protected readonly wompiAppId = signal('');
  protected readonly wompiSecret = signal('');
  protected readonly wompiSaving = signal(false);
  protected readonly wompiMsg = signal('');

  private loadWompi(): void {
    this.api.wompi().subscribe((w) => { this.wompiConnected.set(w.connected); this.wompiAppId.set(w.appId); });
  }

  protected saveWompi(): void {
    if (this.wompiSaving()) return;
    this.wompiSaving.set(true);
    this.wompiMsg.set('');
    this.api.saveWompi(this.wompiAppId().trim(), this.wompiSecret().trim()).subscribe({
      next: (w) => {
        this.wompiSaving.set(false);
        this.wompiConnected.set(w.connected);
        this.wompiSecret.set('');
        this.wompiMsg.set(w.connected ? 'Credenciales guardadas.' : 'Pagos de plataforma desconectados.');
      },
      error: () => { this.wompiSaving.set(false); this.wompiMsg.set('No se pudo guardar.'); },
    });
  }

  // ---- Catálogo de métodos de pago por país ----
  protected readonly countries = CA_COUNTRIES;
  protected readonly methods = signal<CountryPaymentMethodDto[]>([]);
  protected readonly editingMethod = signal<CountryPaymentMethodUpsert | null>(null);
  protected readonly savingMethod = signal(false);

  private loadMethods(): void { this.api.paymentMethods().subscribe((m) => this.methods.set(m)); }

  protected countryName(code: string): string {
    return this.countries.find((c) => c.code === code)?.name ?? code;
  }
  protected methodsByCountry(code: string): CountryPaymentMethodDto[] {
    return this.methods().filter((m) => m.country === code);
  }

  protected newMethod(country: string): void {
    this.editingMethod.set({
      country, key: '', label: '', description: '', emoji: '💳',
      isOnline: false, defaultEnabled: true, sortOrder: this.methodsByCountry(country).length, isActive: true,
    });
  }
  protected editMethod(m: CountryPaymentMethodDto): void { this.editingMethod.set({ ...m }); }
  protected closeMethod(): void { this.editingMethod.set(null); }

  protected saveMethod(): void {
    const m = this.editingMethod();
    if (!m || !m.key.trim() || !m.label.trim() || this.savingMethod()) return;
    this.savingMethod.set(true);
    const done = () => { this.savingMethod.set(false); this.editingMethod.set(null); this.loadMethods(); };
    const fail = () => this.savingMethod.set(false);
    (m.id ? this.api.updatePaymentMethod(m) : this.api.createPaymentMethod(m)).subscribe({ next: done, error: fail });
  }

  protected deleteMethod(m: CountryPaymentMethodDto): void {
    if (!confirm(`¿Eliminar «${m.label}» de ${this.countryName(m.country)}?`)) return;
    this.api.deletePaymentMethod(m.id).subscribe(() => this.loadMethods());
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
