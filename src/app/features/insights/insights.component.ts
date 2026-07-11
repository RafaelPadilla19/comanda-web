import { Component, OnInit, inject, signal } from '@angular/core';
import { ComandaApi } from '@core/api/comanda-api.service';
import { InsightsDto } from '@core/api/models';

@Component({
  selector: 'app-insights',
  templateUrl: './insights.component.html',
})
export class InsightsComponent implements OnInit {
  private readonly api = inject(ComandaApi);

  protected readonly data = signal<InsightsDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly range = signal<'week' | 'month'>('month');

  ngOnInit(): void {
    this.load();
  }

  protected setRange(r: 'week' | 'month'): void {
    if (this.range() === r) return;
    this.range.set(r);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.api.insights(this.range()).subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  /** Color de acento según el tono de la tarjeta. */
  protected toneColor(tone: string): string {
    return tone === 'good' ? 'var(--primary)' : tone === 'warn' ? '#ef4444' : 'var(--text-2)';
  }
}
