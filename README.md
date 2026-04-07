# Practica Intermedia - Gestion de Usuarios - BildyApp

Backend REST de BildyApp para la practica intermedia de Programacion Web 2.
Implementa el modulo completo de usuarios con registro, autenticacion, onboarding,
verificacion de email, gestion de sesiones, invitaciones y borrado soft/hard.

## Stack

- Node.js 22+
- Express 5
- MongoDB Atlas + Mongoose
- Zod
- JWT + bcryptjs
- Multer

## Requisitos

- Node.js 22 o superior
- Acceso a una base de datos MongoDB Atlas

## Instalacion

```bash
npm install
```

## Variables de entorno

Crea un archivo `.env` a partir de `.env.example`.

Variables usadas por la API:

- `NODE_ENV` (ejemplo: `development`)
- `PORT` (por defecto `3000`)
- `PUBLIC_URL` (opcional)
- `DB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN` (por defecto `15m`)
- `JWT_REFRESH_TOKEN_EXPIRES_IN` (por defecto `7` dias)

## Ejecucion

Desarrollo:

```bash
npm run dev
```

Produccion:

```bash
npm start
```

Health check:

- `GET /health`

## Seguridad y middleware

- `helmet` para cabeceras de seguridad
- `express-rate-limit` en `/api`
- `express-mongo-sanitize` contra inyeccion NoSQL
- Middleware de auth JWT
- Middleware de roles (`admin`, `guest`)
- Middleware de estado verificado en rutas sensibles

## Flujos clave

### Registro y verificacion

1. `POST /api/user/register` crea usuario `pending`, genera `verificationCode`, devuelve:
   - `token`
   - `refreshToken`
   - `user` con `email`, `status`, `role`
2. `PUT /api/user/validation` valida `code` y cambia `status` a `verified`.

Nota:

- En `NODE_ENV=development`, las respuestas de registro/invitacion pueden incluir el codigo de verificacion para pruebas.

### Invitacion

- `POST /api/user/invite` requiere usuario autenticado, verificado y con rol `admin`.
- Crea usuario `guest` en la misma `company` del admin que invita.
- El invitado queda `pending` hasta validar email.

### Sesiones

- `POST /api/user/refresh` recibe `refreshToken` y devuelve un nuevo access token.
- `POST /api/user/logout` realiza logout global del usuario autenticado:
  invalida todos sus refresh tokens.

## Politica de acceso por estado de usuario

- Rutas que exigen usuario verificado:
  - `PUT /api/user/register` (onboarding personal)
  - `PATCH /api/user/company`
  - `PATCH /api/user/logo`
  - `GET /api/user`
  - `POST /api/user/invite`
- Rutas permitidas para `pending` y `verified`:
  - `PUT /api/user/validation`
  - `POST /api/user/logout`
  - `PUT /api/user/password`
  - `DELETE /api/user`

## Endpoints

Base URL: `/api/user`

- `POST /register`
  - Body: `{ email, password }`
  - Respuesta: `token`, `refreshToken`, `user { email, status, role }`

- `PUT /validation`
  - Requiere JWT
  - Body: `{ code }`

- `POST /login`
  - Body: `{ email, password }`
  - Respuesta: `token`, `refreshToken`, `user { email, status, role, company }`

- `PUT /register` (onboarding personal)
  - Requiere JWT + usuario verificado
  - Body: `{ name, lastName, nif, address }`

- `PATCH /company` (onboarding de compania)
  - Requiere JWT + usuario verificado
  - Body para empresa: `{ isFreelance: false, cif, name, address }`
  - Body para autonomo: `{ isFreelance: true }`

- `PATCH /logo`
  - Requiere JWT + usuario verificado
  - `multipart/form-data` con campo `logo`

- `GET /`
  - Requiere JWT + usuario verificado
  - Devuelve `user` con `company` poblada

- `POST /refresh`
  - Body: `{ refreshToken }`
  - Devuelve: `{ token }`

- `POST /logout`
  - Requiere JWT
  - Body: `{ refreshToken }` (validado por contrato)
  - Invalida globalmente todos los refresh tokens del usuario autenticado

- `DELETE /?soft=true|false`
  - Requiere JWT
  - Soft delete con `?soft=true`, hard delete con `?soft=false` o sin query

- `PUT /password`
  - Requiere JWT
  - Body: `{ currentPassword, newPassword }`

- `POST /invite`
  - Requiere JWT + usuario verificado + rol `admin`
  - Body: `{ email, password, name, lastName, nif }`

## Estructura de proyecto

```text
Practica-Intermedia-Gestion-de-Usuarios-BildyApp/
  src/
    config/
    controllers/
    middleware/
    models/
    plugins/
    routes/
    services/
    utils/
    validators/
    app.js
  http/
    01-flow-empresa-existente.http
    02-flow-autonomo.http
    03-flow-invitacion-admin.http
    04-flow-errores-seguridad.http
    05-flow-soft-delete-restore.http
  uploads/
  .env.example
  api.http
```

## Eventos de dominio

Se emiten eventos con `EventEmitter` durante el ciclo de vida del usuario:

- `user:registered`
- `user:verified`
- `user:invited`
- `user:deleted`
