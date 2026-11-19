# Servicio de reportes (Google Sheets)

Los reportes de ensayo se guardan en un Google Sheet a través de este Apps
Script. Quién puede usarlo:

- **Profesores**: entran en `/profesores` con su cédula y solo ven y guardan
  reportes de las agrupaciones que la coordinación les asignó.
- **Coordinación**: con la clave de coordinación ve, edita y borra todo, y
  registra a los profesores en el panel (`/admin/profesores`).

Sin una cédula registrada o la clave, el servicio no muestra ni guarda nada.

## 1. Crear el Google Sheet

1. Entra a https://sheets.google.com y crea una hoja nueva.
2. Ponle el nombre que quieras (ej: "Reportes de Ensayos").

## 2. Pegar el script

1. En la hoja: menú **Extensiones → Apps Script**.
2. Borra el contenido de `Código.gs` y pega TODO el contenido de
   [`Codigo.gs`](./Codigo.gs) (este repo).
3. Guarda (icono de disquete o Ctrl+S).

## 2b. Clave de coordinación (obligatoria)

1. En el editor de Apps Script: ⚙️ **Configuración del proyecto** → **Propiedades
   del script** → **Agregar propiedad**.
2. Propiedad: `CLAVE_COORDINACION`. Valor: **la misma clave** que tiene el
   servicio de constancias (la que se escribe para entrar al panel).
3. **Guardar propiedades del script**.

Sin esta propiedad el panel de coordinación no puede leer los reportes.

## 3. Desplegar como Web App

1. Arriba a la derecha: **Implementar → Nueva implementación**.
2. Engrana ⚙️ → **Aplicación web**.
3. Configura:
   - **Descripción**: lo que quieras.
   - **Ejecutar como**: *Yo* (tu cuenta).
   - **Quién tiene acceso**: **Cualquier usuario** (importante: permite que el
     sitio escriba sin que cada persona inicie sesión).
4. **Implementar**. Te pedirá autorizar permisos → acepta (es tu propio script).
5. Copia la **URL del Web App** — termina en `/exec`.
   Ejemplo: `https://script.google.com/macros/s/AKfy.../exec`

## 4. Pegar la URL en la app

1. Abre [`src/lib/configNube.ts`](../src/lib/configNube.ts).
2. Pega la URL entre las comillas:
   ```ts
   export const URL_NUBE = 'https://script.google.com/macros/s/AKfy.../exec';
   ```
3. `git add . && git commit -m "feat: conectar Google Sheets" && git push`
4. El deploy de GitHub Pages se actualiza solo en ~1-2 min.

## Listo

- Cada reporte guardado aparece como una fila en el Sheet (columnas legibles).
- Si alguien no tiene internet, su reporte se guarda local y se sincroniza
  cuando vuelve la conexión y recarga.
- El botón "Exportar a Excel" sigue funcionando.
- El Sheet ya es, en la práctica, tu Excel en la nube siempre actualizado.

## Si cambias el script después

Cada vez que edites `Codigo.gs` debes **Implementar → Gestionar implementaciones
→ editar (lápiz) → Versión: Nueva versión → Implementar**. Si creas una
implementación nueva en vez de actualizar, la URL cambia y hay que volver a
pegarla en `configNube.ts`.

## Profesores

- Se registran desde el panel: **Profesores → Registrar profesor** (nombre,
  cédula y agrupaciones). Al guardar se puede avisarles por WhatsApp.
- Quedan en la hoja **Profesores** (Cédula | Nombre | Agrupaciones). Las
  agrupaciones van con su código (ej. `CORO_INFANTIL, DOPIM`); también se pueden
  corregir a mano en la hoja.
- **Quitar acceso** borra al profesor de la lista; sus reportes se conservan.
- Si dos profesores llevan la misma agrupación, el mes es uno solo: el último en
  guardar lo actualiza (la columna «Actualizado por» dice quién fue).

## Nota de seguridad

La URL del servicio está en el código del sitio, pero ya no basta con conocerla:
sin clave de coordinación o una cédula registrada no se puede leer ni escribir.
La cédula no es secreta (sale en documentos), así que quien conozca la de un
profesor puede entrar como él, pero solo a las agrupaciones de ese profesor. Si
alguna vez hace falta más, se puede agregar un PIN por profesor.
