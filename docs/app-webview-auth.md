# 🔐 Login/Logout por link — para la app (WebView)

Documentación de las dos rutas que la app usa para integrar Comanda en un WebView sin
mostrarle nunca el formulario de login.

## 1. Login por token

```
https://comanda.innovacors.com/login-token/{token}
```

> ⚠️ Hoy el dominio en producción es `https://comanda-innovacors.web.app` — si
> `comanda.innovacors.com` todavía no está configurado como dominio personalizado en
> Firebase Hosting, avisar antes de que la app apunte ahí (es un paso de configuración
> aparte, no de código).

**Qué es `{token}`:** es el `refreshToken` de una sesión ya existente — el mismo campo
que devuelven `/auth/login`, `/auth/register` o `/auth/refresh-token` en el backend. La
app debe guardar ese valor (de cuando el usuario inició sesión por primera vez, por
ejemplo) y usarlo para abrir el WebView ya autenticado.

**Qué hace esta ruta:**
1. Recibe el token por el parámetro `{token}`.
2. **Limpia cualquier sesión que ya hubiera en el navegador/WebView** (por si quedó algo
   de un uso anterior) — este link siempre representa "entra como este usuario".
3. Valida el token contra el backend (`POST /auth/refresh-token`).
4. Si es válido: inicia sesión automáticamente (guarda el token nuevo en `localStorage`,
   el WebView queda autenticado) y redirige a `/dashboard`.
5. Si el token es inválido, ya fue usado, expiró, o no viene: **no inicia sesión, no
   muestra ningún formulario de login** — solo se ve el mensaje:

   > Debes iniciar sesión

**Importante — el token se consume en un solo uso (rotación):** cada vez que
`/login-token/{token}` se usa con éxito, el backend invalida ese token y emite uno
nuevo para la sesión. Si la app necesita volver a abrir el WebView autenticado más
adelante, tiene que usar el `refreshToken` **nuevo** que vino en la respuesta de la
última vez (no puede reusar el mismo `{token}` dos veces — el segundo intento muestra
"Debes iniciar sesión").

## 2. Logout

```
https://comanda.innovacors.com/logout
```

**Qué hace esta ruta:**
- Cierra la sesión actual: invalida el refresh token en el backend (no solo lo borra
  del navegador — queda realmente inservible, no se puede reusar aunque alguien lo
  haya visto en un log o una URL guardada) y limpia la sesión local.
- No necesita ningún parámetro.
- Muestra el mismo mensaje que login-token cuando no hay sesión:

  > Debes iniciar sesión

La app usa esta URL para cerrar la sesión del usuario desde el WebView, igual que pidió
el requisito original.

## 3. Resumen para quien integra el WebView

| Acción | URL | Resultado esperado |
|---|---|---|
| Abrir Comanda ya logueado | `/login-token/{refreshToken}` | Redirige a `/dashboard` si el token es válido |
| Token inválido/vencido/reusado | `/login-token/{token}` | Pantalla con "Debes iniciar sesión", nunca un formulario |
| Cerrar sesión | `/logout` | Sesión invalidada (en el backend también), pantalla con "Debes iniciar sesión" |

**Cómo obtener el primer `refreshToken`:** la primera vez, el usuario inicia sesión
normal (formulario de Comanda, o el flujo que tenga la app) contra `/auth/login` o
`/auth/register` — la respuesta incluye `refreshToken`. Ese es el valor que se guarda
en la app y se usa para construir el link de `/login-token/{token}` cada vez que se
necesite reabrir el WebView sin pedir credenciales otra vez. Cada uso entrega un
`refreshToken` nuevo (ver rotación arriba) — hay que reemplazar el guardado por el más
reciente cada vez.
