# Paddock — Mundial F1

Aplicación para organizar campeonatos privados de F1. Cualquier persona puede consultar la lista de mundiales, resultados, clasificaciones y perfiles. Para crear un campeonato, invitar participantes o registrar resultados hay que iniciar sesión.

## Funciones

- Registro e inicio de sesión con correo y contraseña a través de Neon Auth; Google está disponible si se configura como proveedor OAuth en Neon.
- Creación de mundiales por usuarios autenticados.
- Invitaciones por correo (el enlace queda limitado a ese correo) o mediante enlace compartible. El enlace abre la app y permite aceptar la invitación tras iniciar sesión y escoger alias.
- Perfiles con alias, foto pública y cambio de contraseña.
- Propietarios y participantes pueden editar resultados; solo el propietario puede invitar o eliminar el campeonato.
- Resultados, clasificación y estadísticas públicos.

## Base de datos y despliegue

Vercel debe tener conectada la base Neon y las variables `DATABASE_URL`, `NEON_AUTH_BASE_URL` y `VITE_NEON_AUTH_URL` configuradas en producción y preview. La verificación de sesión usa `NEON_AUTH_JWKS_URL` cuando está disponible y, si no, el endpoint JWKS estándar de Neon Auth.

Ejecuta [`schema.sql`](./schema.sql) una vez en el SQL Editor de Neon para crear las tablas de perfiles, membresías e invitaciones y añadir el propietario a los campeonatos existentes. Un campeonato antiguo sin propietario puede reclamarse por el primer usuario autenticado que lo abra.

Después, `git push` a GitHub dispara el despliegue de Vercel. Vite compila la interfaz a `dist/`; las funciones de `api/` siguen ejecutándose en Vercel.

## Desarrollo local

```sh
npm install
npm run build
npx vercel dev
```

Para autenticar localmente, usa `vercel env pull` cuando las variables del entorno sean descargables o crea un `.env.local` con `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL` y `VITE_NEON_AUTH_URL`. No guardes archivos `.env*` en Git.

Las invitaciones con correo generan un enlace específico para ese destinatario y permiten abrir el programa de correo con el enlace incluido. El envío automático requiere conectar un proveedor de correo.
