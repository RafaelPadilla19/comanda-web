/* ============================================================
   Formatting helpers — El Salvador (USD, IVA 13%)
   ============================================================ */

/** Tax rate applied across the app (IVA El Salvador). */
export const IVA_RATE = 0.13;

/** "$1,234.56" — two decimals, US$ (El Salvador uses USD). */
export function money(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "$1,234" — integer dollars, used for compact summary figures. */
export function moneyShort(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/** Signed money for cash movements: "+ $50.00" / "− $30.00". */
export function moneySigned(n: number): string {
  return (n >= 0 ? '+ ' : '− ') + '$' + Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
