import { Component, inject } from '@angular/core';
import { LoadingService } from './loading.service';
import { ToastService } from './toast.service';

/** Capa global: barra de carga superior + pila de toasts. */
@Component({
  selector: 'app-toast-host',
  template: `
    @if (loading.active()) {
      <div class="ld-bar"><div class="ld-fill"></div></div>
    }
    <div class="tt-wrap">
      @for (t of toast.toasts(); track t.id) {
        <div class="tt" [class.ok]="t.type === 'success'" [class.err]="t.type === 'error'" (click)="toast.dismiss(t.id)">
          <span class="tt-icon">{{ t.type === 'success' ? '✓' : t.type === 'error' ? '!' : 'i' }}</span>
          <span class="tt-msg">{{ t.message }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .ld-bar { position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 200; background: transparent; overflow: hidden; }
    .ld-fill { height: 100%; width: 40%; background: var(--primary, #10B981); border-radius: 0 3px 3px 0; animation: ld-slide 1s ease-in-out infinite; }
    @keyframes ld-slide { 0% { margin-left: -40%; } 100% { margin-left: 100%; } }

    .tt-wrap { position: fixed; top: 16px; right: 16px; z-index: 210; display: flex; flex-direction: column; gap: 10px; max-width: min(360px, calc(100vw - 32px)); }
    .tt {
      display: flex; align-items: center; gap: 11px;
      padding: 12px 14px;
      background: var(--surface, #fff);
      border: 1px solid var(--border, #e2e8f0);
      border-left: 4px solid var(--text-3, #64748b);
      border-radius: 11px;
      box-shadow: var(--shadow-lg, 0 10px 30px rgba(0,0,0,.15));
      font-size: 13.5px; font-weight: 600; color: var(--text, #0f172a);
      cursor: pointer;
      animation: tt-in .2s ease;
    }
    .tt.ok { border-left-color: #10B981; }
    .tt.err { border-left-color: #ef4444; }
    .tt-icon { width: 20px; height: 20px; flex: none; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: 800; color: #fff; background: var(--text-3, #64748b); }
    .tt.ok .tt-icon { background: #10B981; }
    .tt.err .tt-icon { background: #ef4444; }
    .tt-msg { flex: 1; }
    @keyframes tt-in { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: none; } }
  `],
})
export class ToastHostComponent {
  protected readonly toast = inject(ToastService);
  protected readonly loading = inject(LoadingService);
}
