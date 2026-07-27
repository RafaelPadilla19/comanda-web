import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import QRCode from 'qrcode';
import { ComandaStore } from '@core/store';
import { ComandaApi } from '@core/api/comanda-api.service';
import { AuthService } from '@core/api/auth.service';
import { ModalComponent } from '@shared/modal.component';
import { LocationPickerComponent } from '@shared/location-picker.component';
import { BranchDto, CouponDto, DeliveryZoneDto, DiscountType, DriverDto, LoyaltyConfigDto, PrinterDto, UserDto, UserRole } from '@core/api/models';
import { badge, swStyle, swKnob } from '@shared/ui';

type Tab = 'usuarios' | 'impresoras' | 'sucursales' | 'entregas' | 'promociones';

@Component({
  selector: 'app-settings',
  imports: [ModalComponent, FormsModule, RouterLink, LocationPickerComponent],
  templateUrl: './settings.component.html',
})
export class SettingsComponent implements OnInit {
  protected readonly store = inject(ComandaStore);
  private readonly api = inject(ComandaApi);
  private readonly auth = inject(AuthService);

  // Gating por plan (permisivo si aún no hay plan en la sesión).
  protected readonly canCoupons = computed(() => this.auth.hasFeature('coupons'));
  protected readonly canLoyalty = computed(() => this.auth.hasFeature('loyalty'));
  protected readonly planName = computed(() => this.auth.planFeatures()?.planName ?? '');

  private readonly usersRaw = signal<UserDto[]>([]);
  private readonly branchesRaw = signal<BranchDto[]>([]);
  private readonly printersRaw = signal<PrinterDto[]>([]);
  protected readonly zonesRaw = signal<DeliveryZoneDto[]>([]);
  protected readonly driversRaw = signal<DriverDto[]>([]);
  protected readonly couponsRaw = signal<CouponDto[]>([]);

  ngOnInit(): void {
    this.api.listUsers().subscribe((u) => this.usersRaw.set(u));
    this.api.listBranches().subscribe((b) => this.branchesRaw.set(b));
    this.api.listPrinters().subscribe((p) => this.printersRaw.set(p));
    this.refreshZones();
    this.refreshDrivers();
    this.refreshCoupons();
    this.api.loyaltyConfig().subscribe((c) => {
      this.loyEnabled.set(c.enabled); this.loyEarn.set(c.earnRate); this.loyRedeem.set(c.redeemRate);
    });
  }

  // ---- Fidelización ----
  protected readonly loyEnabled = signal(false);
  protected readonly loyEarn = signal(1);
  protected readonly loyRedeem = signal(20);
  protected readonly loySaved = signal(false);

  protected saveLoyalty(): void {
    this.api.saveLoyaltyConfig({
      enabled: this.loyEnabled(), earnRate: Number(this.loyEarn()) || 0, redeemRate: Number(this.loyRedeem()) || 1,
    }).subscribe((c) => {
      this.loyEnabled.set(c.enabled); this.loyEarn.set(c.earnRate); this.loyRedeem.set(c.redeemRate);
      this.loySaved.set(true);
      setTimeout(() => this.loySaved.set(false), 2500);
    });
  }

  private refreshZones(): void { this.api.listZones().subscribe((z) => this.zonesRaw.set(z)); }
  private refreshDrivers(): void { this.api.listDrivers().subscribe((d) => this.driversRaw.set(d)); }
  private refreshCoupons(): void { this.api.listCoupons().subscribe((c) => this.couponsRaw.set(c)); }

  protected readonly tabs = computed(() => {
    const cur = this.store.settingsTab();
    const defs: [Tab, string][] = [
      ['usuarios', 'Usuarios y roles'], ['impresoras', 'Impresoras'],
      ['sucursales', 'Sucursales'], ['entregas', 'Entregas'],
      ['promociones', 'Promociones'],
    ];
    return defs.map(([v, l]) => ({
      label: l, value: v,
      style:
        'border:none;background:none;cursor:pointer;font-family:inherit;font-size:13.5px;font-weight:600;padding:11px 4px;position:relative;color:' +
        (cur === v ? 'var(--text)' : 'var(--text-3)') + ';border-bottom:2px solid ' +
        (cur === v ? 'var(--primary)' : 'transparent') + ';',
    }));
  });

  private readonly roleColor: Record<UserRole, string> = {
    Administradora: 'violet', Cajero: 'blue', Mesera: 'primary', Cocina: 'amber',
  };
  private readonly roleAvatar: Record<UserRole, string> = {
    Administradora: 'linear-gradient(135deg,#8B5CF6,#6366F1)',
    Cajero: 'linear-gradient(135deg,#3B82F6,#2563EB)',
    Mesera: 'linear-gradient(135deg,#10B981,#059669)',
    Cocina: 'linear-gradient(135deg,#F59E0B,#D97706)',
  };

  protected readonly users = computed(() =>
    this.usersRaw().map((u) => ({
      id: u.id, name: u.name, email: u.email, role: u.role, roleRaw: u.role,
      branch: u.branchName, branchId: u.branchId, isActive: u.isActive,
      init: u.name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase(),
      avatar: u.isActive ? this.roleAvatar[u.role] : 'linear-gradient(135deg,#94A3B8,#64748B)',
      roleStyle: badge(this.roleColor[u.role]),
      statusStyle: 'display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:' + (u.isActive ? 'var(--primary-text)' : 'var(--text-3)'),
      dotStyle: 'width:7px;height:7px;border-radius:50%;background:' + (u.isActive ? 'var(--primary)' : 'var(--text-3)'),
      statusLabel: u.isActive ? 'Activo' : 'Inactivo',
    })),
  );

  protected readonly usersSummary = computed(() => {
    const total = this.usersRaw().length;
    const roles = new Set(this.usersRaw().map((u) => u.role)).size;
    return `${total} usuario${total === 1 ? '' : 's'} · ${roles} roles configurados`;
  });

  protected readonly printers = computed(() =>
    this.printersRaw().map((p) => ({
      key: p.key, name: p.name, model: p.model, use: p.use, conn: p.connection,
      switchStyle: swStyle(p.isConnected), knobStyle: swKnob(p.isConnected),
      statusLabel: p.isConnected ? 'Conectada' : 'Desconectada',
      statusStyle: 'font-size:11.5px;font-weight:600;color:' + (p.isConnected ? 'var(--primary-text)' : 'var(--text-3)'),
    })),
  );

  protected readonly branchCards = computed(() =>
    this.branchesRaw().map((b) => ({
      id: b.id, name: b.name, addr: b.address, hours: b.hours, whatsapp: b.whatsappPhone, isActive: b.isActive,
      lat: b.latitude, lng: b.longitude,
    })),
  );

  /** Opciones (id + nombre) para el selector de sucursal al invitar usuarios. */
  protected readonly branchOptions = computed(() =>
    this.branchesRaw().map((b) => ({ id: b.id, name: b.name })),
  );

  protected setTab(t: Tab): void {
    this.store.settingsTab.set(t);
  }

  protected readonly roles: UserRole[] = ['Administradora', 'Cajero', 'Mesera', 'Cocina'];

  // ---- Modal: invitar usuario ----
  protected readonly userOpen = signal(false);
  protected readonly uName = signal('');
  protected readonly uEmail = signal('');
  protected readonly uPassword = signal('');
  protected readonly uRole = signal<UserRole>('Cajero');
  protected readonly uBranchId = signal<string>('');
  protected readonly uError = signal<string | null>(null);

  protected openUser(): void {
    this.uName.set(''); this.uEmail.set(''); this.uPassword.set('');
    this.uRole.set('Cajero'); this.uBranchId.set(''); this.uError.set(null);
    this.userOpen.set(true);
  }

  protected submitUser(): void {
    if (!this.uName().trim() || !this.uEmail().trim() || this.uPassword().length < 8) return;
    this.uError.set(null);
    this.api.createUser({
      name: this.uName().trim(), email: this.uEmail().trim(), password: this.uPassword(),
      role: this.uRole(), branchId: this.uBranchId() || null,
    }).subscribe({
      next: () => { this.userOpen.set(false); this.api.listUsers().subscribe((u) => this.usersRaw.set(u)); },
      error: (e) => this.uError.set(e?.error?.mensaje ?? 'No se pudo crear el usuario.'),
    });
  }

  // ---- Modal: editar usuario (⋯) ----
  protected readonly editOpen = signal(false);
  protected readonly euId = signal('');
  protected readonly euName = signal('');
  protected readonly euRole = signal<UserRole>('Cajero');
  protected readonly euBranchId = signal<string>('');
  protected readonly euActive = signal(true);

  protected openEdit(u: { id: string; name: string; roleRaw: UserRole; branchId: string | null; isActive: boolean }): void {
    this.euId.set(u.id); this.euName.set(u.name); this.euRole.set(u.roleRaw);
    this.euBranchId.set(u.branchId ?? ''); this.euActive.set(u.isActive);
    this.editOpen.set(true);
  }

  private refreshUsers(): void {
    this.api.listUsers().subscribe((u) => this.usersRaw.set(u));
  }

  protected submitEdit(): void {
    if (!this.euName().trim()) return;
    this.api.updateUser(this.euId(), {
      name: this.euName().trim(), role: this.euRole(), branchId: this.euBranchId() || null,
    }).subscribe(() => { this.editOpen.set(false); this.refreshUsers(); });
  }

  /** Activa/desactiva el usuario en edición (desde el mismo modal). */
  protected toggleEditActive(): void {
    const next = !this.euActive();
    this.api.setUserActive(this.euId(), next).subscribe(() => {
      this.euActive.set(next);
      this.refreshUsers();
    });
  }

  // ---- Modal: agregar sucursal ----
  protected readonly branchOpen = signal(false);
  protected readonly bName = signal('');
  protected readonly bAddress = signal('');
  protected readonly bHours = signal('Lun–Dom · 11:00 – 22:00');
  protected readonly bWhatsapp = signal('');
  protected readonly bLat = signal<number | null>(null);
  protected readonly bLng = signal<number | null>(null);

  protected openBranch(): void {
    this.bName.set(''); this.bAddress.set(''); this.bHours.set('Lun–Dom · 11:00 – 22:00'); this.bWhatsapp.set('');
    this.bLat.set(null); this.bLng.set(null);
    this.branchOpen.set(true);
  }

  protected onBranchLocation(loc: { lat: number; lng: number }): void {
    this.bLat.set(loc.lat); this.bLng.set(loc.lng);
  }

  protected submitBranch(): void {
    if (!this.bName().trim() || !this.bAddress().trim()) return;
    this.api.createBranch({
      name: this.bName().trim(), address: this.bAddress().trim(),
      hours: this.bHours().trim(), whatsappPhone: this.bWhatsapp().trim(),
      latitude: this.bLat(), longitude: this.bLng(),
    }).subscribe(() => { this.branchOpen.set(false); this.api.listBranches().subscribe((b) => this.branchesRaw.set(b)); });
  }

  // ---- Modal: QR de la tienda por sucursal ----
  protected readonly qrOpen = signal(false);
  protected readonly qrBranchName = signal('');
  protected readonly qrUrl = signal('');
  protected readonly qrImage = signal('');

  /** Genera el QR que apunta a la tienda pública de la sucursal (`/t/:id`). */
  protected async openQr(branch: { id: string; name: string }): Promise<void> {
    const url = `${window.location.origin}/t/${branch.id}`;
    this.qrBranchName.set(branch.name);
    this.qrUrl.set(url);
    this.qrImage.set('');
    this.qrOpen.set(true);
    this.qrImage.set(await QRCode.toDataURL(url, { width: 520, margin: 2, errorCorrectionLevel: 'M' }));
  }

  /** Descarga el QR como PNG. */
  protected downloadQr(): void {
    if (!this.qrImage()) return;
    const a = document.createElement('a');
    a.href = this.qrImage();
    a.download = `qr-${this.qrBranchName().toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
  }

  /** Abre un afiche imprimible con el QR y el nombre de la sucursal. */
  protected printQr(): void {
    const w = window.open('', '_blank', 'width=620,height=820');
    if (!w) return;
    w.document.write(`
      <html><head><title>QR ${this.qrBranchName()}</title>
      <style>
        body{font-family:system-ui,sans-serif;text-align:center;padding:48px 32px;color:#0f172a;}
        h1{font-size:26px;margin:0 0 4px;}
        h2{font-size:18px;color:#10B981;margin:0 0 28px;font-weight:700;}
        img{width:340px;height:340px;}
        p{font-size:15px;color:#475569;margin-top:24px;}
        .tag{font-size:13px;color:#94a3b8;margin-top:8px;}
      </style></head>
      <body>
        <h1>${this.qrBranchName()}</h1>
        <h2>📱 Escanea y pide en línea</h2>
        <img src="${this.qrImage()}" alt="QR" />
        <p>Comer aquí · Para llevar · A domicilio</p>
        <p class="tag">${this.qrUrl()}</p>
        <script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script>
      </body></html>`);
    w.document.close();
  }

  // ---- Modal: editar sucursal ----
  protected readonly editBranchOpen = signal(false);
  protected readonly ebId = signal('');
  protected readonly ebName = signal('');
  protected readonly ebAddress = signal('');
  protected readonly ebHours = signal('');
  protected readonly ebWhatsapp = signal('');
  protected readonly ebActive = signal(true);
  protected readonly ebLat = signal<number | null>(null);
  protected readonly ebLng = signal<number | null>(null);

  protected openEditBranch(b: { id: string; name: string; addr: string; hours: string; whatsapp: string; isActive: boolean; lat: number | null; lng: number | null }): void {
    this.ebId.set(b.id); this.ebName.set(b.name); this.ebAddress.set(b.addr);
    this.ebHours.set(b.hours); this.ebWhatsapp.set(b.whatsapp); this.ebActive.set(b.isActive);
    this.ebLat.set(b.lat); this.ebLng.set(b.lng);
    this.editBranchOpen.set(true);
  }

  protected onEditBranchLocation(loc: { lat: number; lng: number }): void {
    this.ebLat.set(loc.lat); this.ebLng.set(loc.lng);
  }

  protected submitEditBranch(): void {
    if (!this.ebName().trim() || !this.ebAddress().trim()) return;
    this.api.updateBranch(this.ebId(), {
      name: this.ebName().trim(), address: this.ebAddress().trim(),
      hours: this.ebHours().trim(), whatsappPhone: this.ebWhatsapp().trim(), isActive: this.ebActive(),
      latitude: this.ebLat(), longitude: this.ebLng(),
    }).subscribe(() => {
      this.editBranchOpen.set(false);
      this.api.listBranches().subscribe((b) => this.branchesRaw.set(b));
    });
  }

  // ---- Zonas de entrega ----
  protected readonly money = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  protected readonly zoneOpen = signal(false);
  protected readonly zId = signal<string | null>(null);
  protected readonly zName = signal('');
  protected readonly zFee = signal(0);
  protected readonly zActive = signal(true);

  protected openZone(z?: DeliveryZoneDto): void {
    this.zId.set(z?.id ?? null);
    this.zName.set(z?.name ?? '');
    this.zFee.set(z?.fee ?? 0);
    this.zActive.set(z?.isActive ?? true);
    this.zoneOpen.set(true);
  }

  protected submitZone(): void {
    if (!this.zName().trim()) return;
    const body = { name: this.zName().trim(), fee: Number(this.zFee()) || 0, isActive: this.zActive(), branchId: null };
    const req = this.zId() ? this.api.updateZone(this.zId()!, body) : this.api.createZone(body);
    req.subscribe(() => { this.zoneOpen.set(false); this.refreshZones(); });
  }

  protected deleteZone(z: DeliveryZoneDto): void {
    this.api.deleteZone(z.id).subscribe(() => this.refreshZones());
  }

  protected toggleZone(z: DeliveryZoneDto): void {
    this.api.updateZone(z.id, { name: z.name, fee: z.fee, isActive: !z.isActive, branchId: z.branchId })
      .subscribe(() => this.refreshZones());
  }

  // ---- Repartidores ----
  protected readonly driverOpen = signal(false);
  protected readonly dId = signal<string | null>(null);
  protected readonly dName = signal('');
  protected readonly dPhone = signal('');
  protected readonly dActive = signal(true);

  protected openDriver(d?: DriverDto): void {
    this.dId.set(d?.id ?? null);
    this.dName.set(d?.name ?? '');
    this.dPhone.set(d?.phone ?? '');
    this.dActive.set(d?.isActive ?? true);
    this.driverOpen.set(true);
  }

  protected submitDriver(): void {
    if (!this.dName().trim()) return;
    const body = { name: this.dName().trim(), phone: this.dPhone().trim(), isActive: this.dActive(), branchId: null };
    const req = this.dId() ? this.api.updateDriver(this.dId()!, body) : this.api.createDriver(body);
    req.subscribe(() => { this.driverOpen.set(false); this.refreshDrivers(); });
  }

  protected toggleDriver(d: DriverDto): void {
    this.api.updateDriver(d.id, { name: d.name, phone: d.phone, isActive: !d.isActive, branchId: d.branchId })
      .subscribe(() => this.refreshDrivers());
  }

  // ---- Cupones / promociones ----
  protected readonly couponOpen = signal(false);
  protected readonly cpId = signal<string | null>(null);
  protected readonly cpCode = signal('');
  protected readonly cpType = signal<DiscountType>('Percentage');
  protected readonly cpValue = signal<number>(10);
  protected readonly cpMinOrder = signal<number>(0);
  protected readonly cpMax = signal<number | null>(null);
  protected readonly cpActive = signal(true);

  protected readonly couponCards = computed(() =>
    this.couponsRaw().map((c) => ({
      id: c.id, code: c.code, active: c.isActive,
      valueLabel: c.type === 'Percentage' ? `${c.value}% de descuento` : `${this.money(c.value)} de descuento`,
      meta: [
        c.minOrder > 0 ? `Mínimo ${this.money(c.minOrder)}` : null,
        c.maxRedemptions != null ? `${c.timesRedeemed}/${c.maxRedemptions} usados` : `${c.timesRedeemed} usos`,
      ].filter(Boolean).join(' · '),
    })),
  );

  protected openCoupon(c?: CouponDto): void {
    this.cpId.set(c?.id ?? null);
    this.cpCode.set(c?.code ?? '');
    this.cpType.set(c?.type ?? 'Percentage');
    this.cpValue.set(c?.value ?? 10);
    this.cpMinOrder.set(c?.minOrder ?? 0);
    this.cpMax.set(c?.maxRedemptions ?? null);
    this.cpActive.set(c?.isActive ?? true);
    this.couponOpen.set(true);
  }

  protected submitCoupon(): void {
    if (!this.cpCode().trim() || !(Number(this.cpValue()) > 0)) return;
    const body = {
      code: this.cpCode().trim().toUpperCase(), type: this.cpType(), value: Number(this.cpValue()),
      minOrder: Number(this.cpMinOrder()) || 0, maxRedemptions: this.cpMax(), isActive: this.cpActive(),
    };
    const req = this.cpId() ? this.api.updateCoupon(this.cpId()!, body) : this.api.createCoupon(body);
    req.subscribe(() => { this.couponOpen.set(false); this.refreshCoupons(); });
  }

  protected deleteCoupon(c: { id: string }): void {
    this.api.deleteCoupon(c.id).subscribe(() => this.refreshCoupons());
  }

  protected togglePrinter(key: string): void {
    const cur = this.printersRaw().find((p) => p.key === key);
    if (!cur) return;
    this.api.setPrinter(key, !cur.isConnected).subscribe((updated) =>
      this.printersRaw.update((list) => list.map((p) => (p.key === key ? updated : p))),
    );
  }

  // ---- Impresoras: probar + agregar ----
  protected readonly testMsg = signal<string | null>(null);

  protected testPrinter(key: string): void {
    this.api.testPrinter(key).subscribe((r) => {
      this.testMsg.set(r.message);
      setTimeout(() => this.testMsg.set(null), 3500);
    });
  }

  protected readonly printerOpen = signal(false);
  protected readonly prName = signal('');
  protected readonly prModel = signal('Térmica 80mm');
  protected readonly prUse = signal('');
  protected readonly prConn = signal('USB');
  protected readonly connOptions = ['USB', 'Red (LAN)', 'Bluetooth'];

  protected openPrinter(): void {
    this.prName.set(''); this.prModel.set('Térmica 80mm'); this.prUse.set(''); this.prConn.set('USB');
    this.printerOpen.set(true);
  }

  protected submitPrinter(): void {
    if (!this.prName().trim()) return;
    this.api.createPrinter({
      name: this.prName().trim(), model: this.prModel().trim(), use: this.prUse().trim(), connection: this.prConn(),
    }).subscribe(() => {
      this.printerOpen.set(false);
      this.api.listPrinters().subscribe((p) => this.printersRaw.set(p));
    });
  }
}
