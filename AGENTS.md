# AGENTS.md — Comanda (frontend)

Frontend de **Comanda**, plataforma multi-tenant de gestión para restaurantes (El Salvador). Backend separado en `Comanda.Backend`.

## Stack

- Angular 21 (standalone, **zoneless** — `provideZonelessChangeDetection()`), Signals para estado/reactividad
- Interceptors HTTP funcionales (`provideHttpClient(withInterceptors([...]))`) — el orden del array importa (primero = más externo)
- Dos proyectos en el mismo repo: `app` (Comanda, panel del restaurante + tienda pública) y `admin` (control-plane / super-admin, proyecto `admin`, puerto `:4300`)
- Deploy: **Firebase Hosting** (multi-site) + API en Cloud Run

## Estructura

```
src/app/
  core/            servicios core (api, auth, layout, guards, interceptors)
  features/        una carpeta por pantalla (auth, pos, orders, caja, menu, inventory, ...)
  storefront/       tienda pública QR (sin sesión, sin shell)
projects/admin/     app aparte del super-admin (control-plane)
```

## Reglas de código

1. **Idioma**: código, comentarios y mensajes de commit en español.
2. **Rutas públicas van fuera del árbol con `authGuard`**: cualquier ruta sin sesión (login, registro, tienda pública, login-token/logout por link) se define como top-level en `app.routes.ts`, no como hijo del `ShellComponent`.
3. **`PUBLIC_AUTH_PATHS` en `auth.interceptor.ts`**: cualquier endpoint que sea parte del propio flujo de auth (login, register, refresh-token, revoke-token) debe estar en esa lista para que un 401 ahí NO dispare el redirect global a `/login` — cada uno maneja su propio error en pantalla.
4. **El `title:` de una ruta es estático**, no refleja estado interno del componente — no usarlo como fuente de verdad para debug de un flujo; confiar en el DOM/screenshot real.
5. **No crear librería compartida** entre esta app y otros clientes (si en el futuro hay un cliente Desktop/app nativa, cada uno evoluciona independiente — duplicación aceptable).
6. No hardcodear datos de un cliente real (emails, nombres de negocio) en componentes compartidos como `LoginComponent` — ya pasó una vez, revisar antes de commitear.

## Git

- **Commits directos a `main`** — sin flujo de feature-branch/PR obligatorio.
- Ramas `qa` y `feature/*` existen para trabajo puntual, pero el grueso va directo a `main`.
- **Nunca** agregar `Co-Authored-By: Claude` ni cualquier firma de IA en commits o PRs.
- Verificar `git config user.email` antes de commitear — este repo usa el email asociado a la cuenta de GitHub `RafaelPadilla19`, no otra cuenta personal.
- No commitear `firebase.json`, `.firebaserc` ni `environment.production.ts` — están en `.gitignore` porque son config local por entorno/máquina.

## Deploy

```
npx ng build comanda --configuration production
npx firebase deploy --only hosting:app --project comanda-501203
```

(para `admin`: `npx ng build admin --configuration production` + `firebase deploy --only hosting:admin`)

- **Siempre pedir OK antes de desplegar** a producción.
- Dominio prod: `comanda.innovacors.com` (ya configurado como custom domain en Firebase Hosting — verificar infra real con `curl`/`nslookup`, no solo el repo, si hay dudas).

## Documentación

- `docs/app-webview-auth.md` — contrato de las rutas `/login-token/{token}` y `/logout` para integración con la app vía WebView.
- `docs/deploy-gcp.md` — guía de deploy a GCP/Firebase.
- Si cambiás el flujo de auth (login, refresh, logout), actualizá `docs/app-webview-auth.md` en el mismo commit.
