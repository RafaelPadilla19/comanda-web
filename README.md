# Comanda

Plataforma de gestión para restaurantes — cliente web **standalone** (Angular 21).

Reproducción fiel del handoff de diseño `Comanda.dc.html` (Claude Design),
**adaptada a El Salvador**: moneda en **US$**, impuesto **IVA 13%** y métodos de
pago locales (Efectivo, Tarjeta, **Transfer365**, Transferencia bancaria).

> App independiente: no comparte código con `POS_ADMIN` ni `POS_DESKTOP`.

## Pantallas

| Ruta              | Pantalla        | Contenido |
|-------------------|-----------------|-----------|
| `/dashboard`      | Dashboard       | KPIs, ingresos de la semana, más vendidos, inventario bajo, pedidos activos |
| `/pos`            | Punto de venta  | Catálogo por categoría, carrito, descuentos, IVA 13%, métodos de pago |
| `/pedidos`        | Pedidos         | Tablero kanban (Nuevos → Preparación → Listos → Entregados) |
| `/caja`           | Caja            | Arqueo, KPIs de efectivo, ventas por método, movimientos |
| `/menu`           | Menú digital    | Editor de carta + vista previa móvil, disponibilidad por producto |
| `/inventario`     | Inventario      | Stock de insumos, estados (crítico/bajo/en stock), entradas/salidas |
| `/reportes`       | Reportes        | Ventas por fecha, por categoría, por sucursal, top de productos |
| `/configuracion`  | Configuración   | Usuarios y roles, impresoras, sucursales, métodos de pago |

## Stack

- **Angular 21** standalone components + signals + zoneless change detection
- Ruteo con lazy-loading por pantalla
- Sistema de diseño propio (tokens CSS claro/oscuro, fuente Manrope) portado del
  diseño original — sin PrimeNG/Tailwind en la ruta de render para preservar la
  fidelidad pixel-perfect

## Estructura

```
src/app/
  app.ts / app.config.ts / app.routes.ts   bootstrap + ruteo
  core/
    store.ts                               estado global (signals) y acciones
    layout/shell.component.*                sidebar + header + tema + router-outlet
  shared/
    data.ts        datos semilla (cocina salvadoreña, USD)
    models.ts      tipos de dominio
    format.ts      money() US$ + IVA_RATE 13%
    icons.ts       set de íconos SVG inline
    ui.ts          helpers de pills/switches/estados de stock
    safe-html.pipe.ts
  features/<pantalla>/<pantalla>.component.{ts,html}
```

El estado vive en `ComandaStore` (`@Injectable({ providedIn: 'root' })`) y cada
pantalla lo consume con `computed()`. El tema (claro/oscuro) se refleja sobre
`<html data-theme="…">`.

## Desarrollo

```bash
npm install
npm start          # ng serve  → http://localhost:4200
npm run build      # build de producción → dist/comanda
```

## Notas

- Datos de ejemplo (menú, sucursales, inventario, usuarios) son ficticios.
- Toda la lógica es de demostración en cliente; aún no hay backend conectado.
