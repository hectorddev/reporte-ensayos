# GitHub + Neon — Pasos concretos

## Parte 1: Neon (base de datos)

1. Abre **[console.neon.tech](https://console.neon.tech)** e inicia sesión (GitHub sirve).
2. **New project** → nombre: `reporte-ensayos` → región cercana a ti.
3. En el dashboard, pestaña **Connection details** → copia la URL que dice **Pooled connection** o **Direct connection**:
   ```
   postgresql://neondb_owner:XXXX@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
   ```

4. En tu PC, desde la raíz del proyecto, ejecuta (reemplaza la URL):

```powershell
.\scripts\setup-neon.ps1 "postgresql://neondb_owner:XXXX@ep-xxxx.neon.tech/neondb?sslmode=require"
```

Eso configura `backend/.env` y crea tablas + las 11 agrupaciones.

5. Verifica que el backend arranca:

```powershell
cd backend
npm run dev
```

Abre http://localhost:3001/api/health → debe decir `"db":"postgresql"`.

---

## Parte 2: GitHub (código)

El repo local ya está listo con `git init` y commit inicial.

### Crear el repositorio en GitHub

1. Ve a **[github.com/new](https://github.com/new)**
2. Nombre: `reporte-ensayos`
3. **Público** o privado (como prefieras)
4. **No** marques "Add README" (ya lo tenemos)
5. **Create repository**

### Subir el código

GitHub te mostrará comandos. Usa estos (cambia `TU_USUARIO`):

```powershell
cd C:\Users\hectorddev\workspaces\reporte-ensayos
git remote add origin https://github.com/TU_USUARIO/reporte-ensayos.git
git push -u origin main
```

Si pide login, usa **GitHub CLI**, **Personal Access Token** o **Git Credential Manager**.

---

## Parte 3: Siguiente paso (URL pública)

Con GitHub + Neon ya tienes código y BD en la nube. Para una **URL pública** de la app:

| Servicio | Qué despliega |
|----------|----------------|
| **Render** | Backend (conectado a Neon) |
| **Vercel** | Frontend |

Guía completa: [DEPLOY.md](./DEPLOY.md) — pasos 3 a 5.

Variables clave en Render:
- `DATABASE_URL` = la misma URL de Neon
- `ADMIN_PASSWORD` = tu clave admin
- `FRONTEND_URL` = URL de Vercel (después)

Variable en Vercel:
- `VITE_API_URL` = URL del backend Render

---

## Resumen rápido

```
[GitHub]  → código del proyecto
[Neon]    → PostgreSQL en la nube (DATABASE_URL)
[Render]  → API pública (opcional, siguiente paso)
[Vercel]  → App web pública (opcional, siguiente paso)
```
