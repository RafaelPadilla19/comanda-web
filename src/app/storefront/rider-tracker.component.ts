import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild, inject } from '@angular/core';
import * as L from 'leaflet';
import { StorefrontApi } from './storefront-api.service';

const POLL_MS = 10_000;

/** Mapa en vivo (Leaflet/OpenStreetMap, sin costo) con la ubicación del rider asignado a un pedido. */
@Component({
  selector: 'app-rider-tracker',
  template: `
    @if (visible) {
      <div class="rt-wrap">
        <div class="rt-hd">
          <span>🛵</span>
          <span>{{ statusLabel() }}</span>
        </div>
        <div #mapEl class="rt-map"></div>
      </div>
    }
  `,
  styles: [`
    .rt-wrap { margin-top: 14px; border: 1px solid var(--border); border-radius: 14px; overflow: hidden; background: var(--surface); }
    .rt-hd { display: flex; align-items: center; gap: 8px; padding: 10px 14px; font-size: 13px; font-weight: 700; color: var(--text-2); }
    .rt-map { height: 200px; }
  `],
})
export class RiderTrackerComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @Input() orderId = '';
  @Input() customerLat: number | null = null;
  @Input() customerLng: number | null = null;

  private readonly api = inject(StorefrontApi);
  @ViewChild('mapEl') private mapEl?: ElementRef<HTMLDivElement>;

  protected visible = false;
  private status = '';
  private map?: L.Map;
  private riderMarker?: L.Marker;
  private customerMarker?: L.Marker;
  private timer?: ReturnType<typeof setInterval>;

  private readonly riderIcon = L.divIcon({ className: 'rt-pin', html: '🛵', iconSize: [28, 28], iconAnchor: [14, 14] });
  private readonly customerIcon = L.divIcon({ className: 'rt-pin', html: '📍', iconSize: [26, 26], iconAnchor: [13, 24] });

  ngOnInit(): void {
    this.poll();
    this.timer = setInterval(() => this.poll(), POLL_MS);
  }

  ngAfterViewInit(): void {
    // El mapa se crea recién cuando aparezca (visible=true tras el primer poll con datos).
  }

  ngOnChanges(_: SimpleChanges): void {
    if (this.map && this.customerLat != null && this.customerLng != null && !this.customerMarker) {
      this.customerMarker = L.marker([this.customerLat, this.customerLng], { icon: this.customerIcon }).addTo(this.map);
    }
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.map?.remove();
  }

  protected statusLabel(): string {
    return this.status === 'Accepted' ? 'Tu rider va en camino' : 'Buscando rider para tu pedido…';
  }

  private poll(): void {
    if (!this.orderId) return;
    this.api.riderLocation(this.orderId).subscribe({
      next: (l) => {
        this.status = l.jobStatus;
        if (!l.available || l.lat == null || l.lng == null) return;
        this.visible = true;
        // El mapa se crea la primera vez que ya hay coordenadas (el div solo existe si visible=true).
        queueMicrotask(() => this.ensureMap(l.lat!, l.lng!));
      },
      error: () => {},
    });
  }

  private ensureMap(lat: number, lng: number): void {
    if (!this.mapEl) return;
    if (!this.map) {
      this.map = L.map(this.mapEl.nativeElement).setView([lat, lng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(this.map);
      this.riderMarker = L.marker([lat, lng], { icon: this.riderIcon }).addTo(this.map);
      if (this.customerLat != null && this.customerLng != null) {
        this.customerMarker = L.marker([this.customerLat, this.customerLng], { icon: this.customerIcon }).addTo(this.map);
        this.map.fitBounds([[lat, lng], [this.customerLat, this.customerLng]], { padding: [24, 24] });
      }
    } else {
      this.riderMarker?.setLatLng([lat, lng]);
    }
  }
}
