# Servicio de reportes (Google Sheets)

Los reportes de ensayo se guardan en un Google Sheet a través de este Apps
Script. Quién puede usarlo:

- **Profesores**: entran en `/profesores` con su cédula y solo ven y guardan
  reportes de las agrupaciones que la coordinación les asignó.
- **Coordinación**: con la clave de coordinación ve, edita y borra todo, y
  registra a los profesores en el panel (`/admin/profesores`).
- **Programa Simón Bolívar**: los formadores reportan cada clase de sus
  escuelas (las fotos quedan en tu Drive) y la coordinación arma el Word semanal.

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

Propiedades opcionales (mismo lugar):

- `TELEFONOS_NUCLEO`: lo que el informe PSB pone en «Teléfonos de contacto
  (núcleo)», por ejemplo `0276-3945614 / 0414-0000000`. Si no está, va solo el
  0276-3945614. Está aquí y no en el sitio para no publicar números personales.
- `LIDER_PSB`: nombre del líder del Programa Simón Bolívar para el mensaje de
  Telegram (ej. `Lcdo. …`). Si no está, cada formador lo escribe una vez en su
  teléfono.
- `CARPETA_PSB_ID`: id de una carpeta de Drive donde guardar los informes PSB
  (lo que va después de `/folders/` en su enlace). Si no está, se crea
  «Informes PSB» en la raíz de tu Drive.

## 2c. Permiso de Drive (para los informes PSB)

1. En el editor, arriba, elige la función **autorizarDrive** y pulsa **▶ Ejecutar**.
2. Acepta los permisos (Drive). En el registro aparece el enlace de la carpeta
   «Informes PSB».

Hazlo cada vez que una versión nueva del script pida permisos nuevos.

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

- Se registran desde el panel: **Profesores → + Registrar profesor**. Cada uno
  tiene su página de perfil (tocando su nombre) con sus datos, programas,
  agrupaciones, escuelas y **horario semanal** (mañana, tarde u otro horario por
  día). Al guardar se puede avisarles por WhatsApp. El profesor ve su horario al
  entrar.
- Quedan en la hoja **Profesores** (Cédula | Nombre | Agrupaciones | … |
  Horario). Las agrupaciones van con su código (ej. `CORO_INFANTIL, DOPIM`) y el
  horario como `Lunes 08:00-12:00; Martes 14:00-18:00`; también se pueden
  corregir a mano en la hoja.

## Agrupaciones

- Su lista está en la hoja **Agrupaciones** (Código | Nombre | Activa). Se crea
  sola con las agrupaciones que ya existían.
- En el panel, **Agrupaciones** permite cambiar el nombre, agregar nuevas o
  desactivarlas (dejan de salir en los formularios). Los reportes y constancias
  ya hechos conservan el nombre que tenían. El código no cambia nunca.
- **Quitar acceso** borra al profesor de la lista; sus reportes se conservan.
- Si dos profesores llevan la misma agrupación, el mes es uno solo: el último en
  guardar lo actualiza (la columna «Actualizado por» dice quién fue).

## Informes del Programa Simón Bolívar

- Al registrar a un profesor marca sus **programas** (pueden ser varios). Si
  está en Simón Bolívar, marca también sus **escuelas**: solo podrá hacer
  informes de esas.
- **Cada día**, al terminar la clase, el formador la reporta: horario, tipo de
  actividad, estudiantes atendidos, niveles, personal adulto, repertorio y una
  foto. Se guarda en **Informes PSB / Escuela / Semana del …** y la app le arma
  el mensaje con el formato de Telegram para compartirlo con la foto.
- **Sin internet** la clase queda guardada en el teléfono y se envía sola apenas
  vuelve la conexión: con la app abierta o al volver a abrirla; en Android
  (Chrome) también con la app cerrada.
- **El Word de la semana lo arma la coordinación**, no el formador: en el panel,
  **Simón Bolívar → Armar Word** en la semana y escuela que quieras. Se arma en
  ese momento con las clases guardadas y sus fotos, así que siempre sale con lo
  último (si un formador corrige una clase, basta con volver a armarlo). Se
  completan el evento, las agrupaciones, la cantidad de alumnos (propone la suma
  de los atendidos de cada clase), instructores, responsable y teléfonos; el
  panel recuerda lo escrito para cada escuela. El Word se descarga en tu equipo.
- La hoja **InformesPSB** lista cada semana con el enlace a su carpeta.
- Al corregir o quitar una clase, las fotos que ya no se usan van a la papelera
  de Drive.
- Las fotos pueden tener niños: la carpeta es privada de tu cuenta; no la
  compartas con enlace público.

## Nota de seguridad

La URL del servicio está en el código del sitio, pero ya no basta con conocerla:
sin clave de coordinación o una cédula registrada no se puede leer ni escribir.
La cédula no es secreta (sale en documentos), así que quien conozca la de un
profesor puede entrar como él, pero solo a las agrupaciones de ese profesor. Si
alguna vez hace falta más, se puede agregar un PIN por profesor.
