# Despliegue de Comanda en GCP — costo mínimo (~$0/mes + dominio)

Arquitectura elegida (2026-07-01): **Cloud Run** (APIs, escala a cero) + **Firebase Hosting**
(los 2 Angular) + **Neon** (Postgres serverless, free tier) + **Cloud Scheduler** (jobs diarios).

```
                    ┌─ app.comanda.sv    → Firebase Hosting (Angular customer)
Usuarios ──────────►├─ admin.comanda.sv  → Firebase Hosting (Angular admin)
                    ├─ api.comanda.sv    → Cloud Run: comanda-api
Wompi (webhook) ───►└─ pagos.comanda.sv  → Cloud Run: paymentshub
                                              │
                                              ▼
                                      Neon Postgres (2 BDs: comanda, payments)
Cloud Scheduler ──► POST api.../jobs/retention y /jobs/renewal (diario, X-Jobs-Key)
```

> Los dominios son de ejemplo; funciona igual con los `*.run.app` / `*.web.app` gratuitos
> mientras no compres dominio.

---

## 0. Prerrequisitos (una sola vez)

- Cuenta Google + proyecto GCP nuevo (ej. `comanda-prod`) con facturación habilitada
  (obligatorio aunque el consumo sea $0).
- CLI: `gcloud` (https://cloud.google.com/sdk) y `firebase` (`npm i -g firebase-tools`).
- Cuenta en https://neon.tech (gratis, sin tarjeta).

```powershell
gcloud auth login
gcloud config set project comanda-prod
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com cloudscheduler.googleapis.com secretmanager.googleapis.com
gcloud artifacts repositories create comanda --repository-format=docker --location=us-central1
```

## 1. Base de datos — Neon (gratis)

1. En Neon: crear proyecto `comanda` (región AWS us-east, la más cercana barata).
2. Crear **2 databases** en el mismo proyecto: `comanda` y `payments`.
3. Copiar los connection strings (formato `Host=...;Database=comanda;Username=...;Password=...;SSL Mode=Require`).
   - Neon da URLs estilo `postgres://`; para .NET/Npgsql conviértelas a formato clave-valor
     o usa la pestaña ".NET" del dashboard de Neon.
4. Las migraciones se aplican solas al arrancar cada servicio (`MigrateAsync` en el seed).

> Límite free: 0.5 GB y auto-suspensión tras inactividad (~5 min). El primer request tras
> suspensión tarda ~1 s extra. Cuando haya clientes pagando: plan Launch de Neon o Cloud SQL
> (solo cambia el connection string).

## 2. Secretos — Secret Manager

```powershell
# Generar valores fuertes (ejemplo)
# JWT_KEY, JOBS_KEY, WEBHOOK_KEY, CALLBACK_SECRET: usa 32+ chars aleatorios

echo "<connection-string-comanda>"  | gcloud secrets create comanda-db --data-file=-
echo "<connection-string-payments>" | gcloud secrets create payments-db --data-file=-
echo "<jwt-signing-key>"            | gcloud secrets create jwt-key --data-file=-
echo "<callback-secret>"            | gcloud secrets create callback-secret --data-file=-
echo "<jobs-key>"                   | gcloud secrets create jobs-key --data-file=-
echo "<webhook-key>"                | gcloud secrets create webhook-key --data-file=-
echo "<wompi-app-id>"               | gcloud secrets create wompi-app-id --data-file=-
echo "<wompi-api-secret>"           | gcloud secrets create wompi-api-secret --data-file=-
```

Dar acceso al service account de Cloud Run (el default `PROJECT_NUMBER-compute@developer.gserviceaccount.com`):

```powershell
gcloud projects add-iam-policy-binding comanda-prod --member="serviceAccount:<SA>" --role="roles/secretmanager.secretAccessor"
```

## 3. PaymentsHub → Cloud Run

Desde `D:\Posventas\PaymentsHub` (Cloud Build construye la imagen, no hace falta Docker local):

```powershell
gcloud builds submit --tag us-central1-docker.pkg.dev/comanda-prod/comanda/paymentshub

gcloud run deploy paymentshub `
  --image us-central1-docker.pkg.dev/comanda-prod/comanda/paymentshub `
  --region us-central1 --allow-unauthenticated `
  --min-instances 0 --max-instances 3 --memory 512Mi `
  --set-secrets "ConnectionStrings__Payments=payments-db:latest,Wompi__AppId=wompi-app-id:latest,Wompi__ApiSecret=wompi-api-secret:latest,Service__WebhookKey=webhook-key:latest,Service__CallbackSecret=callback-secret:latest" `
  --set-env-vars "Service__PublicBaseUrl=https://<url-de-este-servicio>"
```

> `Service__PublicBaseUrl`: primer deploy → toma la URL `*.run.app` que te devuelve y
> re-deploya solo con `--set-env-vars` actualizado. Con esto el **webhook de Wompi queda
> público y protegido por el token** (`?k=<webhook-key>`) — pendiente que ya quedó resuelto.

## 4. Comanda.Api → Cloud Run

Desde `D:\Posventas\Comanda.Backend`:

```powershell
gcloud builds submit --tag us-central1-docker.pkg.dev/comanda-prod/comanda/comanda-api

gcloud run deploy comanda-api `
  --image us-central1-docker.pkg.dev/comanda-prod/comanda/comanda-api `
  --region us-central1 --allow-unauthenticated `
  --min-instances 0 --max-instances 5 --memory 512Mi `
  --set-secrets "ConnectionStrings__Comanda=comanda-db:latest,Jwt__SigningKey=jwt-key:latest,Payments__CallbackSecret=callback-secret:latest,Jobs__Key=jobs-key:latest" `
  --set-env-vars "Jobs__RunInProcess=false,Services__PaymentsHubUrl=https://<url-paymentshub>,Cors__Origins=https://<app>.web.app;https://<admin>.web.app,Services__StorefrontBaseUrl=https://<app>.web.app,Services__SelfBaseUrl=https://<url-comanda-api>"
```

Claves de esta config:
- `Jobs__RunInProcess=false` → apaga los BackgroundServices (con escala a cero no correrían);
  los dispara Cloud Scheduler (paso 6).
- `Cors__Origins` → dominios reales separados por `;`.

## 5. Frontends → Firebase Hosting (gratis, CDN + SSL)

```powershell
cd D:\Posventas\Comanda
npx ng build comanda --configuration production
npx ng build admin --configuration production

firebase login
firebase init hosting   # crear 2 sites en el proyecto: comanda-app y comanda-admin
```

`firebase.json` (multi-site):

```json
{
  "hosting": [
    {
      "target": "app",
      "public": "dist/comanda/browser",
      "ignore": ["firebase.json"],
      "rewrites": [{ "source": "**", "destination": "/index.html" }]
    },
    {
      "target": "admin",
      "public": "dist/admin/browser",
      "ignore": ["firebase.json"],
      "rewrites": [{ "source": "**", "destination": "/index.html" }]
    }
  ]
}
```

```powershell
firebase target:apply hosting app comanda-app
firebase target:apply hosting admin comanda-admin
firebase deploy --only hosting
```

> **Antes de buildear**: apuntar `src/environments/environment.ts` (prod) de cada app al
> `apiBaseUrl` real (`https://<url-comanda-api>/api`).

## 6. Jobs diarios → Cloud Scheduler (3 jobs gratis)

```powershell
gcloud scheduler jobs create http comanda-retention `
  --location us-central1 --schedule "0 8 * * *" --time-zone "America/El_Salvador" `
  --uri "https://<url-comanda-api>/api/jobs/retention" --http-method POST `
  --headers "X-Jobs-Key=<jobs-key>"

gcloud scheduler jobs create http comanda-renewal `
  --location us-central1 --schedule "0 */12 * * *" --time-zone "America/El_Salvador" `
  --uri "https://<url-comanda-api>/api/jobs/renewal" --http-method POST `
  --headers "X-Jobs-Key=<jobs-key>"
```

## 7. Dominio propio (opcional, ~$12/año)

- Frontends: `firebase hosting:sites` → "Custom domain" en la consola (SSL automático).
- APIs: `gcloud beta run domain-mappings create --service comanda-api --domain api.comanda.sv`.
- Tras mapear: actualizar `Cors__Origins`, `Service__PublicBaseUrl`, environments de Angular
  y re-deployar.

## 8. Checklist final antes de clientes reales

- [ ] Credenciales **Wompi de producción** en Secret Manager (hoy sandbox) y en `/platform` las de la plataforma.
- [ ] Probar un pago completo end-to-end (link → pago → webhook → pedido/suscripción pagada).
- [ ] Backup de Neon: free tier tiene point-in-time restore limitado; exportar `pg_dump` semanal (puede ser un Scheduler + Cloud Run job más adelante).
- [ ] Quitar/usuario demo y credenciales seed (`DbSeeder`) o cambiar sus contraseñas.
- [ ] Revisar que `/platform` admin (admin@comanda.sv) tenga contraseña fuerte.

## Costos esperados

| Concepto | Hoy (0–10 restaurantes) | Al crecer |
|---|---|---|
| Cloud Run ×2 | $0 (free tier) | ~$5–20/mes con tráfico real |
| Firebase Hosting ×2 | $0 | $0 hasta ~10GB/mes transferencia |
| Neon Postgres | $0 | $5–19/mes (Launch) o Cloud SQL ~$10+ |
| Scheduler + Secret Manager | $0 | $0 |
| Dominio | ~$12/año | igual |
| **Total** | **~$1/mes** | **crece proporcional al uso** |
