# Conectar la app a Google Sheets

La app puede guardar los reportes en un Google Sheet en la nube (en vez de solo
el navegador). Así varias personas llenan reportes y nada se pierde.

Mientras no completes estos pasos, la app sigue funcionando 100% local. Al pegar
la URL del Web App, empieza a sincronizar.

## 1. Crear el Google Sheet

1. Entra a https://sheets.google.com y crea una hoja nueva.
2. Ponle el nombre que quieras (ej: "Reportes de Ensayos").

## 2. Pegar el script

1. En la hoja: menú **Extensiones → Apps Script**.
2. Borra el contenido de `Código.gs` y pega TODO el contenido de
   [`Codigo.gs`](./Codigo.gs) (este repo).
3. Guarda (icono de disquete o Ctrl+S).

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

## Nota de seguridad

La URL queda dentro del código del sitio (es estático), así que es visible para
quien inspeccione. Con acceso "Cualquier usuario", alguien que la encuentre
podría escribir en el Sheet. Para reportes de ensayos suele ser aceptable. Si
luego quieres más control, se puede agregar un token o pasar a OAuth.
