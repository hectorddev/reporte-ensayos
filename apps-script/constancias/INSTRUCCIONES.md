# Servicio de constancias (Google Apps Script)

Las constancias usan su **propio** Google Sheet y su **propio** Web App,
separados de los reportes mensuales. Ahí se guardan las solicitudes y las
plantillas; así los enlaces quedan cortos (`nucleop1.xyz/p/PL26-K7Q9PX`) y la
coordinación ve todas las solicitudes desde cualquier equipo.

## 1. Crear el Sheet

1. Entra a https://sheets.google.com y crea una hoja nueva, por ejemplo
   «Constancias». Las pestañas `Solicitudes` y `Plantillas` se crean solas.

## 2. Pegar el script

1. En la hoja: **Extensiones → Apps Script**.
2. Borra el contenido de `Código.gs` y pega todo [`Codigo.gs`](./Codigo.gs).
3. Guarda (Ctrl+S).

## 3. Clave de coordinación (importante)

El Sheet guarda nombres y cédulas de menores. Las acciones de la coordinación
(ver, aprobar, editar solicitudes y plantillas) exigen una clave que se valida
en el servidor.

1. En el editor: **Configuración del proyecto (⚙️) → Propiedades del script →
   Agregar propiedad del script**.
2. Propiedad: `CLAVE_COORDINACION`. Valor: una clave que **no** esté en el
   código del sitio.
3. Guarda.

Sin esta propiedad el servidor acepta la contraseña del panel admin, que es
visible en el código público del sitio: sirve para probar, no para usarlo con
datos reales. Al entrar a Constancias en el panel se te pedirá la clave de
coordinación una vez por sesión.

## 4. Desplegar como Web App

1. **Implementar → Nueva implementación → ⚙️ Aplicación web**.
2. Ejecutar como: **Yo**. Quién tiene acceso: **Cualquier usuario**.
3. **Implementar** y autoriza los permisos.
4. Copia la URL que termina en `/exec`.

## 5. Conectar el sitio

1. Abre [`src/features/constancias/config.ts`](../../src/features/constancias/config.ts).
2. Pega la URL en `URL_CONSTANCIAS`.
3. Commit y push: el sitio se actualiza en 1–2 minutos.

## Si cambias el script después

**Implementar → Gestionar implementaciones → ✏️ → Versión: Nueva versión →
Implementar**. Así la URL no cambia. Si creas una implementación nueva, la URL
cambia y hay que pegarla otra vez en `config.ts`.
