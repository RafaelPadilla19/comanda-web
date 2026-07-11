import { Component, input, output } from '@angular/core';

/** Diálogo modal reutilizable con overlay, título y contenido proyectado. */
@Component({
  selector: 'app-modal',
  template: `
    <div class="cmd-ov" (click)="close.emit()"></div>
    <div class="cmd-dlg" role="dialog" aria-modal="true">
      <div class="cmd-hd">
        <span>{{ title() }}</span>
        <button type="button" class="cmd-x" (click)="close.emit()" aria-label="Cerrar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="cmd-bd"><ng-content /></div>
    </div>
  `,
  styleUrl: './modal.component.css',
})
export class ModalComponent {
  readonly title = input('');
  readonly close = output<void>();
}
