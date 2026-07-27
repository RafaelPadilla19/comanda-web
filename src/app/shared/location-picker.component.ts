import {
  AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy,
  Output, SimpleChanges, ViewChild,
} from '@angular/core';
import * as L from 'leaflet';

const DEFAULT_CENTER: [number, number] = [13.6929, -89.2182]; // San Salvador

/** Selector de ubicación con pin arrastrable (Leaflet/OpenStreetMap, sin API key). */
@Component({
  selector: 'app-location-picker',
  imports: [],
  template: `
    <div class="picker">
      <div #mapEl class="map"></div>
      <button type="button" class="ghost-btn locate" (click)="useCurrentLocation()">
        📍 Usar mi ubicación actual
      </button>
    </div>
  `,
  styles: [`
    .picker { display: flex; flex-direction: column; gap: 8px; }
    .map { height: 220px; border-radius: 10px; overflow: hidden; border: 1px solid var(--border); }
    .locate {
      align-self: flex-start; height: 32px; padding: 0 12px; border-radius: 8px;
      border: 1px solid var(--border); background: var(--surface); font-size: 12px;
      font-weight: 600; color: var(--text-2); cursor: pointer; font-family: inherit;
    }
  `],
})
export class LocationPickerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() lat: number | null = null;
  @Input() lng: number | null = null;
  @Output() locationChange = new EventEmitter<{ lat: number; lng: number }>();

  @ViewChild('mapEl', { static: true }) private mapEl!: ElementRef<HTMLDivElement>;

  private map?: L.Map;
  private marker?: L.Marker;

  private readonly pinIcon = L.divIcon({
    className: 'location-pin',
    html: '📍',
    iconSize: [28, 28],
    iconAnchor: [14, 26],
  });

  ngAfterViewInit(): void {
    const center: [number, number] = this.lat != null && this.lng != null ? [this.lat, this.lng] : DEFAULT_CENTER;
    this.map = L.map(this.mapEl.nativeElement).setView(center, this.lat != null ? 16 : 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(this.map);

    if (this.lat != null && this.lng != null) this.placeMarker(this.lat, this.lng, false);

    this.map.on('click', (e: L.LeafletMouseEvent) => this.placeMarker(e.latlng.lat, e.latlng.lng, true));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;
    if ((changes['lat'] || changes['lng']) && this.lat != null && this.lng != null) {
      this.map.setView([this.lat, this.lng], 16);
      this.placeMarker(this.lat, this.lng, false);
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private placeMarker(lat: number, lng: number, emit: boolean): void {
    if (!this.map) return;
    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = L.marker([lat, lng], { draggable: true, icon: this.pinIcon }).addTo(this.map);
      this.marker.on('dragend', () => {
        const pos = this.marker!.getLatLng();
        this.locationChange.emit({ lat: pos.lat, lng: pos.lng });
      });
    }
    if (emit) this.locationChange.emit({ lat, lng });
  }

  protected useCurrentLocation(): void {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      this.map?.setView([latitude, longitude], 17);
      this.placeMarker(latitude, longitude, true);
    });
  }
}
