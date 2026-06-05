# Despliegue gratuito — Guía paso a paso

Stack recomendado (100% free tier para pruebas):

| Componente | Servicio | URL ejemplo |
|------------|----------|-------------|
| Base de datos | [Neon](https://neon.tech) (PostgreSQL) | — |
| Backend API | [Render](https://render.com) | `https://reporte-ensayos-api.onrender.com` |
| Frontend | [Vercel](https://vercel.com) | `https://reporte-ensayos.vercel.app` |

---

## Requisitos previos

- Cuenta en [GitHub](https://github.com)
- Cuenta en [Neon](https://neon.tech)
- Cuenta en [Render](https://render.com)
- Cuenta en [Vercel](https://vercel.com)
- [Git](https://git-scm.com/) instalado

---

## Paso 1 — Subir el código a GitHub

```bash
cd reporte-ensayos
git init
git add .
git commit -m "Proyecto reporte de ensayos listo para deploy"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/reporte-ensayos.git
git push -u origin main
```

> No subas archivos `.env` con contraseñas. Ya están en `.gitignore`.

---

## Paso 2 — Base de datos en Neon (gratis)

1. Entra a [neon.tech](https://neon.tech) → **Sign up**
2. **New Project** → nombre: `reporte-ensayos`
3. Copia la **Connection string** (pestaña *Connection details*)
   - Debe verse así:
   ```
   postgresql://usuario:password@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
   ```
4. Guárdala, la usarás en Render.

### Poblar tablas y datos iniciales (desde tu PC)

Crea `backend/.env` con la URL de Neon:

```env
DATABASE_URL="postgresql://usuario:password@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require"
ADMIN_PASSWORD="tu_clave_segura"
```

Luego ejecuta:

```bash
cd backend
npm install
npm run db:setup
```

Esto crea las tablas y las 11 agrupaciones predefinidas.

---

## Paso 3 — Backend en Render (gratis)

1. [dashboard.render.com](https://dashboard.render.com) → **New +** → **Web Service**
2. Conecta tu repositorio de GitHub
3. Configuración:

| Campo | Valor |
|-------|-------|
| **Name** | `reporte-ensayos-api` |
| **Root Directory** | `backend` |
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build && npx prisma db push` |
| **Start Command** | `npm run start:prod` |
| **Plan** | Free |

4. **Environment Variables** (Environment → Add):

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | Connection string de Neon |
| `ADMIN_PASSWORD` | Contraseña del panel admin |
| `FRONTEND_URL` | *(la pondrás después del paso 4)* |
| `NODE_ENV` | `production` |

5. **Create Web Service** y espera el deploy (~3-5 min)
6. Prueba: `https://TU-SERVICIO.onrender.com/api/health`
   - Debe responder: `{"status":"ok","db":"postgresql",...}`

> **Nota:** El plan gratuito de Render "duerme" tras 15 min sin uso. La primera petición puede tardar ~30-60 segundos en despertar.

### Alternativa: Blueprint automático

En Render → **New +** → **Blueprint** → selecciona el repo. Usará el archivo `render.yaml` del proyecto.

---

## Paso 4 — Frontend en Vercel (gratis)

1. [vercel.com](https://vercel.com) → **Add New Project**
2. Importa el repo de GitHub
3. Configuración:

| Campo | Valor |
|-------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

4. **Environment Variables**:

| Variable | Valor |
|----------|-------|
| `VITE_API_URL` | `https://TU-SERVICIO.onrender.com` *(sin `/api`)* |

5. **Deploy**
6. Copia la URL de Vercel, ej: `https://reporte-ensayos.vercel.app`

---

## Paso 5 — Conectar frontend y backend (CORS)

Vuelve a **Render** → tu servicio → **Environment**:

- Actualiza `FRONTEND_URL` con la URL exacta de Vercel:
  ```
  https://reporte-ensayos.vercel.app
  ```
- Guarda → Render redesplegará automáticamente.

---

## Paso 6 — Verificar que todo funciona

1. Abre la URL de Vercel
2. Crea un reporte de prueba
3. Ve a **Reportes guardados** — debe aparecer
4. Entra a `/admin` con tu `ADMIN_PASSWORD`
5. Edita y elimina desde el panel admin

---

## URLs finales

```
Frontend:  https://reporte-ensayos.vercel.app
API:       https://reporte-ensayos-api.onrender.com/api/health
Admin:     https://reporte-ensayos.vercel.app/admin
Base datos: Neon dashboard (sin URL pública)
```

---

## Desarrollo local (con la misma BD de Neon)

**backend/.env**
```env
DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
ADMIN_PASSWORD="admin123"
FRONTEND_URL="http://localhost:5173"
```

**frontend/.env** (opcional, vacío usa proxy local)
```env
VITE_API_URL=
```

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

---

## Límites del free tier

| Servicio | Límite típico |
|----------|---------------|
| **Neon** | 0.5 GB almacenamiento, proyecto se pausa tras inactividad |
| **Render** | 750 hrs/mes, cold starts, 512 MB RAM |
| **Vercel** | 100 GB bandwidth/mes, builds ilimitados hobby |

Suficiente para pruebas y demos.

---

## Solución de problemas

### Error CORS en el navegador
- Verifica que `FRONTEND_URL` en Render coincida **exactamente** con la URL de Vercel (sin `/` final).

### API no responde / timeout
- Render free tier dormido. Espera 30-60 s o haz ping a `/api/health`.

### Error de base de datos
- Revisa `DATABASE_URL` en Render.
- Asegúrate que incluya `?sslmode=require`.

### Frontend muestra datos vacíos
- Verifica `VITE_API_URL` en Vercel.
- Redespliega el frontend tras cambiar variables de entorno.

### Admin: "no autorizado"
- Usa la misma `ADMIN_PASSWORD` configurada en Render.
