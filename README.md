# Practica-Intermedia-Gestion-de-Usuarios-BildyApp

Backend de BildyApp para la practica intermedia de gestion de usuarios.

## Requisitos

- Node.js 22 o superior
- MongoDB Atlas

## Instalacion

```bash
npm install
```

## Variables de entorno

1. Crear `.env` a partir de `.env.example`.
2. Completar los valores reales.

Variables requeridas:

- `DB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN` (por defecto `15m`)
- `JWT_REFRESH_TOKEN_EXPIRES_IN` (dias, por defecto `7`)
- `PORT` (opcional, por defecto `3000`)
- `NODE_ENV` (opcional, por ejemplo `development`)
- `PUBLIC_URL` (opcional)

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

## Endpoints de usuario

Base URL: `/api/user`

- `POST /register`
- `PUT /validation`
- `POST /login`
- `PUT /register` (onboarding personal)
- `PATCH /company` (onboarding compania)
- `PATCH /logo` (multipart/form-data, campo `logo`)
- `GET /`
- `POST /refresh`
- `POST /logout`
- `DELETE /?soft=true|false`
- `PUT /password`
- `POST /invite`

## Notas de implementacion

- Autenticacion con JWT access token + refresh token.
- Passwords cifradas con bcryptjs.
- Validacion de cuerpos con Zod.
- Manejo de errores con `AppError` y middleware global.
- Seguridad T6 aplicada: Helmet, rate limiting y sanitizacion NoSQL.
- Soft delete en User y Company mediante plugin de Mongoose.

## Campo de validacion de email

La ruta `PUT /api/user/validation` recibe el campo:

```json
{
  "code": "123456"
}
```

Internamente el modelo almacena el valor en `verificationCode`.
