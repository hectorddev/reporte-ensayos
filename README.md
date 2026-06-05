# Reporte de Ensayos

Módulo de gestión de indicadores mensuales para agrupaciones musicales y orquestales.

**Stack:**
- PostgreSQL ([Neon](https://neon.tech) gratis)
- Node.js + Express + Prisma
- React + Vite

## Requisitos

- [Node.js](https://nodejs.org/) 18+
- Base de datos PostgreSQL (Neon gratis recomendado)

## Instalación local

1. Crea un proyecto en [Neon](https://neon.tech) y copia la connection string
2. Configura `backend/.env` (ver `backend/.env.example`)
3. Ejecuta:

```bash
cd backend
npm install
npm run db:setup

cd ../frontend
npm install
```

## Despliegue en la nube (gratis)

Guía completa paso a paso: **[DEPLOY.md](./DEPLOY.md)**

- Frontend → Vercel
- Backend → Render
- Base de datos → Neon

## Desarrollo

En dos terminales:

```bash
# Terminal 1 — API (puerto 3001)
npm run dev:backend

# Terminal 2 — Frontend (puerto 5173)
npm run dev:frontend
```

O todo junto (requiere `npm install` en la raíz primero):

```bash
npm install
npm run dev
```

Abre http://localhost:5173

## Panel de administración

- URL: http://localhost:5173/admin
- Contraseña por defecto: `admin123` (configurable en `backend/.env` → `ADMIN_PASSWORD`)
- Permite ver, editar y eliminar todos los reportes mensuales

## API principal

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/agrupaciones` | Lista agrupaciones |
| GET | `/api/agrupaciones/:id/demografia-activa` | Preview matrícula activa |
| POST | `/api/reportes-mensuales` | Crear/cerrar reporte mensual |
| GET | `/api/admin/reportes-mensuales` | Listar todos (requiere admin) |
| PUT | `/api/admin/reportes-mensuales/:id` | Editar reporte (requiere admin) |
| DELETE | `/api/admin/reportes-mensuales/:id` | Eliminar reporte (requiere admin) |

## Regla de negocio

Un estudiante es **Activo** si asistió a ≥50% de los ensayos en las últimas 4 semanas (28 días). Solo los activos cuentan en la demografía del indicador.

## Variables de entorno en producción

| Servicio | Variables |
|----------|-----------|
| **Render** (backend) | `DATABASE_URL`, `ADMIN_PASSWORD`, `FRONTEND_URL`, `NODE_ENV=production` |
| **Vercel** (frontend) | `VITE_API_URL` = URL del backend Render |
