import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ComandaStore } from '@core/store';
import { ModalComponent } from '@shared/modal.component';
import { ProductOptionDto } from '@core/api/models';
import { money } from '@shared/format';
import { swStyle, swKnob } from '@shared/ui';

@Component({
  selector: 'app-menu',
  imports: [ModalComponent, FormsModule],
  templateUrl: './menu.component.html',
})
export class MenuComponent implements OnInit {
  protected readonly store = inject(ComandaStore);

  ngOnInit(): void {
    this.store.loadCatalog();
  }

  // ---- Modal: crear/editar producto ----
  protected readonly prodOpen = signal(false);
  protected readonly editId = signal<string | null>(null);
  protected readonly pName = signal('');
  protected readonly pPrice = signal<number | null>(null);
  protected readonly pCategoryId = signal('');
  protected readonly pEmoji = signal('🍽️');
  protected readonly pDesc = signal('');
  protected readonly pVariants = signal<ProductOptionDto[]>([]);
  protected readonly pExtras = signal<ProductOptionDto[]>([]);

  protected openProduct(id?: string): void {
    const cats = this.store.categories();
    if (id) {
      const p = this.store.products().find((x) => x.id === id);
      if (!p) return;
      this.editId.set(id);
      this.pName.set(p.name); this.pPrice.set(p.price); this.pCategoryId.set(p.categoryId);
      this.pEmoji.set(p.emoji || '🍽️'); this.pDesc.set(p.description);
      this.pVariants.set(p.variants.map((v) => ({ ...v })));
      this.pExtras.set(p.extras.map((e) => ({ ...e })));
    } else {
      this.editId.set(null);
      const curCat = cats.find((c) => c.name === this.store.menuCat());
      this.pName.set(''); this.pPrice.set(null);
      this.pCategoryId.set(curCat?.id ?? cats[0]?.id ?? '');
      this.pEmoji.set('🍽️'); this.pDesc.set('');
      this.pVariants.set([]); this.pExtras.set([]);
    }
    this.prodOpen.set(true);
  }

  // ---- Edición de opciones (variantes / extras) con precio ----
  protected addVariant(): void { this.pVariants.update((l) => [...l, { name: '', price: 0 }]); }
  protected removeVariant(i: number): void { this.pVariants.update((l) => l.filter((_, idx) => idx !== i)); }
  protected setVariantName(i: number, name: string): void {
    this.pVariants.update((l) => l.map((o, idx) => (idx === i ? { ...o, name } : o)));
  }
  protected setVariantPrice(i: number, price: number): void {
    this.pVariants.update((l) => l.map((o, idx) => (idx === i ? { ...o, price: Number(price) || 0 } : o)));
  }
  protected addExtra(): void { this.pExtras.update((l) => [...l, { name: '', price: 0 }]); }
  protected removeExtra(i: number): void { this.pExtras.update((l) => l.filter((_, idx) => idx !== i)); }
  protected setExtraName(i: number, name: string): void {
    this.pExtras.update((l) => l.map((o, idx) => (idx === i ? { ...o, name } : o)));
  }
  protected setExtraPrice(i: number, price: number): void {
    this.pExtras.update((l) => l.map((o, idx) => (idx === i ? { ...o, price: Number(price) || 0 } : o)));
  }

  protected submitProduct(): void {
    if (!this.pName().trim() || this.pPrice() == null || !this.pCategoryId()) return;
    this.store.saveProduct({
      name: this.pName().trim(), price: this.pPrice() ?? 0, categoryId: this.pCategoryId(),
      emoji: this.pEmoji().trim() || '🍽️', description: this.pDesc().trim(),
      variants: this.pVariants().filter((v) => v.name.trim()).map((v) => ({ name: v.name.trim(), price: v.price })),
      extras: this.pExtras().filter((e) => e.name.trim()).map((e) => ({ name: e.name.trim(), price: e.price })),
    }, this.editId() ?? undefined);
    this.prodOpen.set(false);
  }

  private cats(): { name: string }[] {
    return this.store.categories().slice().sort((a, b) => a.sortOrder - b.sortOrder);
  }

  protected readonly menuCats = computed(() => {
    const cur = this.store.menuCat();
    const data = this.store.products();
    return this.cats().map((c) => {
      const active = cur === c.name;
      return {
        label: c.name, value: c.name, count: data.filter((p) => p.categoryName === c.name).length,
        style:
          'display:flex;align-items:center;justify-content:space-between;width:100%;border:none;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;padding:9px 12px;border-radius:9px;' +
          (active ? 'background:var(--primary-soft);color:var(--primary-text);' : 'background:transparent;color:var(--text-2);'),
        countStyle: 'font-size:11px;font-weight:700;color:' + (active ? 'var(--primary-text)' : 'var(--text-3)') + ';',
      };
    });
  });

  protected readonly catLabel = computed(() => this.store.menuCat());

  /** Id de la categoría seleccionada (para poder eliminarla). */
  protected readonly currentCatId = computed(
    () => this.store.categories().find((c) => c.name === this.store.menuCat())?.id ?? null);

  protected deleteCurrentCategory(): void {
    const id = this.currentCatId();
    if (!id) return;
    if (!confirm(`¿Eliminar la categoría "${this.store.menuCat()}"? (debe estar vacía)`)) return;
    this.store.deleteCategory(id);
  }

  protected readonly menuItems = computed(() => {
    const cur = this.store.menuCat();
    return this.store.products().filter((p) => p.categoryName === cur).map((p) => ({
      id: p.id, name: p.name, emoji: p.emoji, desc: p.description,
      priceLabel: money(p.price), available: p.isAvailable,
      metaLabel:
        (p.variants.length ? p.variants.length + ' variantes' : 'Sin variantes') +
        (p.extras.length ? ' · ' + p.extras.length + ' extras' : ''),
      switchStyle: swStyle(p.isAvailable), knobStyle: swKnob(p.isAvailable), rowOpacity: p.isAvailable ? '1' : '.5',
    }));
  });

  protected readonly previewItems = computed(() => {
    const cur = this.store.menuCat();
    return this.store.products()
      .filter((p) => p.categoryName === cur && p.isAvailable)
      .map((p) => ({ id: p.id, name: p.name, emoji: p.emoji, desc: p.description, priceLabel: money(p.price) }));
  });

  protected readonly previewCats = computed(() => {
    const cur = this.store.menuCat();
    return this.cats().map((c) => ({
      label: c.name,
      style:
        'font-size:11px;font-weight:700;padding:5px 11px;border-radius:20px;white-space:nowrap;' +
        (c.name === cur ? 'background:var(--primary);color:#fff;' : 'background:var(--surface-hover);color:var(--text-2);'),
    }));
  });

  protected toggleAvail(id: string, current: boolean): void {
    this.store.setAvailability(id, !current);
  }

  // ---- Modal: nueva / renombrar categoría ----
  protected readonly catOpen = signal(false);
  protected readonly cName = signal('');
  protected readonly catEditId = signal<string | null>(null);

  protected openCategory(): void {
    this.catEditId.set(null);
    this.cName.set('');
    this.catOpen.set(true);
  }

  /** Abre el modal en modo renombrar con la categoría seleccionada. */
  protected renameCurrentCategory(): void {
    const id = this.currentCatId();
    if (!id) return;
    this.catEditId.set(id);
    this.cName.set(this.store.menuCat());
    this.catOpen.set(true);
  }

  protected submitCategory(): void {
    const name = this.cName().trim();
    if (!name) return;
    const id = this.catEditId();
    if (id) this.store.renameCategory(id, name);
    else this.store.createCategory(name);
    this.catOpen.set(false);
  }
}
