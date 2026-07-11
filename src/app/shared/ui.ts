/* ============================================================
   Reusable inline-style builders — ported from the prototype's
   badge()/swStyle()/swKnob()/invStatus() helpers so every screen
   renders pills and toggles identically.
   ============================================================ */
import { InventoryItem } from './models';

/** Soft rounded status pill in an accent color. */
export function badge(c: string): string {
  return `display:inline-flex;align-items:center;font-size:11.5px;font-weight:700;color:var(--${c}-text,var(--${c}));background:var(--${c}-soft);padding:3px 10px;border-radius:20px;`;
}

/** Toggle track. */
export function swStyle(on: boolean): string {
  return `width:38px;height:22px;border-radius:20px;border:none;cursor:pointer;position:relative;transition:background .15s;background:${on ? 'var(--primary)' : 'var(--border-strong)'};flex-shrink:0;`;
}

/** Toggle knob. */
export function swKnob(on: boolean): string {
  return `position:absolute;top:2px;left:${on ? '18px' : '2px'};width:18px;height:18px;border-radius:50%;background:#fff;transition:left .15s;box-shadow:0 1px 3px rgba(0,0,0,.3);`;
}

export interface StockStatus {
  key: 'crit' | 'low' | 'ok';
  label: string;
  c: 'red' | 'amber' | 'primary';
}

export function invStatus(i: InventoryItem): StockStatus {
  if (i.stock < i.min) return { key: 'crit', label: 'Crítico', c: 'red' };
  if (i.stock < i.min * 1.75) return { key: 'low', label: 'Bajo', c: 'amber' };
  return { key: 'ok', label: 'En stock', c: 'primary' };
}
