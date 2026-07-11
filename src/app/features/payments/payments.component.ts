import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ComandaApi } from '@core/api/comanda-api.service';
import { AuthService } from '@core/api/auth.service';
import { CA_COUNTRIES, PaymentMethodDto } from '@core/api/models';
import { swStyle, swKnob } from '@shared/ui';

@Component({
  selector: 'app-payments',
  imports: [FormsModule, RouterLink],
  templateUrl: './payments.component.html',
})
export class PaymentsComponent implements OnInit {
  private readonly api = inject(ComandaApi);
  private readonly auth = inject(AuthService);

  /** ¿El plan incluye pago en línea? */
  protected readonly canOnline = computed(() => this.auth.hasFeature('onlinePayments'));
  protected readonly planName = computed(() => this.auth.planFeatures()?.planName ?? '');

  protected readonly countries = CA_COUNTRIES;
  protected readonly country = signal('');
  protected readonly countrySaved = signal(false);

  private readonly paymentsRaw = signal<PaymentMethodDto[]>([]);

  // Wompi (llaves del propio restaurante)
  protected readonly wAppId = signal('');
  protected readonly wSecret = signal('');
  protected readonly wConnected = signal(false);
  protected readonly wSaved = signal(false);

  ngOnInit(): void {
    this.api.getCountry().subscribe((c) => this.country.set(c.country));
    this.loadMethods();
    this.api.wompiConfig().subscribe((w) => { this.wAppId.set(w.appId); this.wConnected.set(w.connected); });
  }

  private loadMethods(): void {
    this.api.listPaymentMethods().subscribe((p) => this.paymentsRaw.set(p));
  }

  protected readonly countryName = computed(() =>
    this.countries.find((c) => c.code === this.country())?.name ?? this.country());
  protected readonly countryFlag = computed(() =>
    this.countries.find((c) => c.code === this.country())?.flag ?? '🌎');

  protected readonly hasOnlineMethod = computed(() => this.paymentsRaw().some((p) => p.isOnline));

  private toCfg(p: PaymentMethodDto) {
    return {
      key: p.key, label: p.label, desc: p.description, emoji: p.emoji, isOnline: p.isOnline, isEnabled: p.isEnabled,
      switchStyle: swStyle(p.isEnabled), knobStyle: swKnob(p.isEnabled),
    };
  }
  protected readonly onlineMethods = computed(() => this.paymentsRaw().filter((p) => p.isOnline).map((p) => this.toCfg(p)));
  protected readonly manualMethods = computed(() => this.paymentsRaw().filter((p) => !p.isOnline).map((p) => this.toCfg(p)));
  protected readonly enabledCount = computed(() => this.paymentsRaw().filter((p) => p.isEnabled).length);

  protected changeCountry(code: string): void {
    if (!code || code === this.country()) return;
    this.api.setCountry(code).subscribe((c) => {
      this.country.set(c.country);
      this.countrySaved.set(true); setTimeout(() => this.countrySaved.set(false), 2500);
      this.loadMethods();
    });
  }

  protected saveWompi(): void {
    this.api.saveWompiConfig({ appId: this.wAppId().trim(), apiSecret: this.wSecret().trim() }).subscribe((w) => {
      this.wAppId.set(w.appId); this.wConnected.set(w.connected); this.wSecret.set('');
      this.wSaved.set(true); setTimeout(() => this.wSaved.set(false), 2500);
    });
  }

  protected togglePayment(key: string): void {
    const cur = this.paymentsRaw().find((p) => p.key === key);
    if (!cur) return;
    this.api.setPaymentMethod(key, !cur.isEnabled).subscribe((updated) =>
      this.paymentsRaw.update((list) => list.map((p) => (p.key === key ? updated : p))),
    );
  }
}
