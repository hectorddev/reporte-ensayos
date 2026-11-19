/**
 * Reportes de ensayo del núcleo sobre Google Sheets (Web App).
 * Se despliega como Aplicación web (ver INSTRUCCIONES.md).
 *
 * Quién puede hacer qué:
 * - Profesores: entran con su cédula. Solo ven y guardan reportes de las
 *   agrupaciones que la coordinación les asignó (hoja «Profesores»).
 * - Coordinación: con la clave de coordinación (propiedad del script
 *   CLAVE_COORDINACION, la misma del servicio de constancias). Ve, edita y
 *   borra todos los reportes y administra a los profesores.
 * Sin cédula registrada ni clave no se puede leer ni escribir nada.
 *
 * El sitio hace POST text/plain con { accion, datos, clave?, cedula? }.
 *
 * La hoja «Reportes» guarda columnas legibles + datos_json (columna 17) con el
 * reporte completo para la app. La hoja «Profesores» se puede leer y corregir a
 * mano: Cédula | Nombre | Agrupaciones (códigos separados por coma).
 */

var HOJA_REPORTES = 'Reportes';
var HOJA_PROFESORES = 'Profesores';
var MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
var ENCABEZADOS = [
  'id', 'Agrupación', 'Año', 'Mes', 'N° Ensayos', 'Fechas de ensayo',
  'Niños', 'Niñas', 'Adolescentes F', 'Adolescentes M', 'Adultos F', 'Adultos M',
  'Total', 'Repertorio', 'Observaciones', 'Creado', 'datos_json', 'Actualizado por',
];
var COL_ID = 1;
var COL_JSON = 17; // posición de datos_json (no moverla: la usan los reportes ya guardados)
var ENCABEZADOS_PROFESORES = ['Cédula', 'Nombre', 'Agrupaciones', 'Actualizado'];

/* ---------- Hojas ---------- */

function hojaReportes_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_REPORTES) || ss.insertSheet(HOJA_REPORTES);
  if (hoja.getLastRow() === 0) {
    hoja.appendRow(ENCABEZADOS);
    hoja.setFrozenRows(1);
  } else if (hoja.getRange(1, ENCABEZADOS.length).getValue() === '') {
    // Hojas creadas con la versión anterior: se agrega «Actualizado por».
    hoja.getRange(1, 1, 1, ENCABEZADOS.length).setValues([ENCABEZADOS]);
  }
  return hoja;
}

function hojaProfesores_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PROFESORES);
  if (!hoja) {
    hoja = ss.insertSheet(HOJA_PROFESORES);
    hoja.appendRow(ENCABEZADOS_PROFESORES);
    hoja.setFrozenRows(1);
    // Cédulas como texto, para que no se conviertan en números con decimales.
    hoja.getRange(1, 1, 1000, 1).setNumberFormat('@');
  }
  return hoja;
}

function may_(texto) {
  return String(texto || '').toUpperCase();
}

/* ---------- Acceso ---------- */

function exigirClave_(clave) {
  var esperada = PropertiesService.getScriptProperties().getProperty('CLAVE_COORDINACION');
  if (!esperada) {
    throw new Error('Falta configurar CLAVE_COORDINACION en las propiedades del script (ver INSTRUCCIONES.md).');
  }
  if (String(clave || '') !== esperada) throw new Error('CLAVE_INVALIDA');
}

/** «V-12.345.678» → «12345678». */
function normalizarCedula_(cedula) {
  return String(cedula || '').replace(/\D/g, '');
}

function cedulaValida_(cedula) {
  return cedula.length >= 5 && cedula.length <= 10;
}

function listarProfesores_() {
  var hoja = hojaProfesores_();
  var ultima = hoja.getLastRow();
  if (ultima < 2) return [];
  var valores = hoja.getRange(2, 1, ultima - 1, 3).getValues();
  var profesores = [];
  for (var i = 0; i < valores.length; i++) {
    var cedula = normalizarCedula_(valores[i][0]);
    if (!cedula) continue;
    profesores.push({
      cedula: cedula,
      nombre: String(valores[i][1] || '').trim(),
      agrupaciones: String(valores[i][2] || '')
        .split(',')
        .map(function (a) { return a.trim(); })
        .filter(String),
    });
  }
  return profesores;
}

function buscarProfesor_(cedula) {
  var buscada = normalizarCedula_(cedula);
  var profesores = listarProfesores_();
  for (var i = 0; i < profesores.length; i++) {
    if (profesores[i].cedula === buscada) return profesores[i];
  }
  return null;
}

function exigirProfesor_(cedula) {
  var profesor = buscarProfesor_(cedula);
  if (!profesor) throw new Error('PROFESOR_NO_REGISTRADO');
  return profesor;
}

/** Lo que ve el propio profesor de su cuenta. */
function perfil_(p) {
  return { nombre: p.nombre, agrupaciones: p.agrupaciones };
}

/* ---------- Reportes ---------- */

/**
 * Compacta fechas: solo los días, y la última de cada mes lleva -MM-AAAA.
 * Ej: ['2026-06-01','2026-06-25'] -> "01, 25-06-2026".
 */
function fechasCompactas_(ensayos) {
  var fechas = (ensayos || [])
    .map(function (e) { return String(e.fecha).slice(0, 10); })
    .filter(String)
    .sort();

  var grupos = [];
  for (var i = 0; i < fechas.length; i++) {
    var partes = fechas[i].split('-');
    var anio = partes[0], mes = partes[1], dia = partes[2];
    var ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.anio === anio && ultimo.mes === mes) {
      ultimo.dias.push(dia);
    } else {
      grupos.push({ anio: anio, mes: mes, dias: [dia] });
    }
  }

  return grupos.map(function (g) {
    return g.dias.map(function (dia, idx) {
      return idx === g.dias.length - 1 ? dia + '-' + g.mes + '-' + g.anio : dia;
    }).join(', ');
  }).join(', ');
}

function filaDesdeReporte_(r) {
  var total =
    (r.totalNinos || 0) + (r.totalNinas || 0) +
    (r.totalAdolescentesFemeninas || 0) + (r.totalAdolescentesMasculinos || 0) +
    (r.totalAdultosFemeninos || 0) + (r.totalAdultosMasculinos || 0);
  var nombreAgr = r.agrupacion ? r.agrupacion.nombre : r.agrupacionId;

  return [
    r.id,
    may_(nombreAgr),
    r.anio,
    may_(MESES[r.mes - 1] || r.mes),
    (r.ensayos || []).length,
    fechasCompactas_(r.ensayos),
    r.totalNinos || 0,
    r.totalNinas || 0,
    r.totalAdolescentesFemeninas || 0,
    r.totalAdolescentesMasculinos || 0,
    r.totalAdultosFemeninos || 0,
    r.totalAdultosMasculinos || 0,
    total,
    may_((r.repertorioTexto || '').split('\n').filter(String).join(' | ')),
    may_(r.observaciones || ''),
    r.createdAt || '',
    JSON.stringify(r),
    may_(r.actualizadoPor || ''),
  ];
}

/** Todos los reportes con su número de fila. */
function leerReportes_(hoja) {
  var ultima = hoja.getLastRow();
  if (ultima < 2) return [];
  var valores = hoja.getRange(2, COL_JSON, ultima - 1, 1).getValues();
  var reportes = [];
  for (var i = 0; i < valores.length; i++) {
    var celda = valores[i][0];
    if (!celda) continue;
    try {
      reportes.push({ fila: i + 2, reporte: JSON.parse(celda) });
    } catch (e) {}
  }
  return reportes;
}

function listar_() {
  return leerReportes_(hojaReportes_()).map(function (x) { return x.reporte; });
}

function reportesDe_(profesor) {
  return listar_().filter(function (r) {
    return profesor.agrupaciones.indexOf(r.agrupacionId) >= 0;
  });
}

/**
 * Crea o actualiza un reporte. Se busca por id y, si no aparece, por
 * agrupación + año + mes: así dos profesores de la misma agrupación no
 * duplican el mes. Con `permitidas` (profesor) solo se tocan esas agrupaciones.
 * Devuelve el reporte tal como quedó (con su id definitivo).
 */
function guardar_(reporte, autor, permitidas) {
  if (!reporte || !reporte.agrupacionId || !reporte.anio || !(reporte.mes >= 1 && reporte.mes <= 12)) {
    throw new Error('Reporte incompleto.');
  }
  if (permitidas && permitidas.indexOf(reporte.agrupacionId) < 0) throw new Error('SIN_PERMISO');

  var hoja = hojaReportes_();
  var existentes = leerReportes_(hoja);
  var previo = null;
  for (var i = 0; i < existentes.length && !previo; i++) {
    if (reporte.id && String(existentes[i].reporte.id) === String(reporte.id)) previo = existentes[i];
  }
  for (var j = 0; j < existentes.length && !previo; j++) {
    var r = existentes[j].reporte;
    if (r.agrupacionId === reporte.agrupacionId && r.anio === reporte.anio && r.mes === reporte.mes) previo = existentes[j];
  }

  if (previo && permitidas && permitidas.indexOf(previo.reporte.agrupacionId) < 0) throw new Error('SIN_PERMISO');

  reporte.id = previo ? previo.reporte.id : reporte.id || Utilities.getUuid();
  reporte.createdAt = (previo && previo.reporte.createdAt) || reporte.createdAt || new Date().toISOString();
  reporte.actualizadoPor = autor;
  reporte.actualizadoEn = new Date().toISOString();

  var fila = filaDesdeReporte_(reporte);
  if (previo) {
    hoja.getRange(previo.fila, 1, 1, fila.length).setValues([fila]);
  } else {
    hoja.appendRow(fila);
  }
  return reporte;
}

function eliminar_(id) {
  var hoja = hojaReportes_();
  var existentes = leerReportes_(hoja);
  for (var i = 0; i < existentes.length; i++) {
    if (String(existentes[i].reporte.id) === String(id)) {
      hoja.deleteRow(existentes[i].fila);
      break;
    }
  }
  return { id: id };
}

function limpiar_() {
  var hoja = hojaReportes_();
  var ultima = hoja.getLastRow();
  if (ultima >= 2) hoja.deleteRows(2, ultima - 1);
  return true;
}

/* ---------- Profesores (coordinación) ---------- */

function filaProfesor_(hoja, cedula) {
  var ultima = hoja.getLastRow();
  if (ultima < 2) return -1;
  var cedulas = hoja.getRange(2, 1, ultima - 1, 1).getValues();
  for (var i = 0; i < cedulas.length; i++) {
    if (normalizarCedula_(cedulas[i][0]) === cedula) return i + 2;
  }
  return -1;
}

/**
 * Crea (`nuevo`) o actualiza un profesor. `cedulaAnterior` permite corregir la
 * cédula. Un registro nuevo nunca reemplaza a otro con la misma cédula.
 */
function guardarProfesor_(p, cedulaAnterior, nuevo) {
  var cedula = normalizarCedula_(p && p.cedula);
  var nombre = String((p && p.nombre) || '').trim();
  var agrupaciones = ((p && p.agrupaciones) || [])
    .map(function (a) { return String(a).trim(); })
    .filter(String)
    .slice(0, 40);
  if (!cedulaValida_(cedula)) throw new Error('Cédula inválida.');
  if (!nombre) throw new Error('Falta el nombre del profesor.');

  var hoja = hojaProfesores_();
  var otra = filaProfesor_(hoja, cedula);
  var fila = nuevo ? -1 : filaProfesor_(hoja, normalizarCedula_(cedulaAnterior) || cedula);
  if (otra > 0 && otra !== fila) throw new Error('Ya hay un profesor registrado con esa cédula.');

  var valores = [[cedula, nombre, agrupaciones.join(', '), new Date().toISOString()]];
  if (fila > 0) {
    hoja.getRange(fila, 1, 1, 4).setValues(valores);
  } else {
    hoja.appendRow(valores[0]);
  }
  return { cedula: cedula, nombre: nombre, agrupaciones: agrupaciones };
}

function eliminarProfesor_(cedula) {
  var hoja = hojaProfesores_();
  var fila = filaProfesor_(hoja, normalizarCedula_(cedula));
  if (fila > 0) hoja.deleteRow(fila);
  return true;
}

/* ---------- Web App ---------- */

function respuesta_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var cuerpo = JSON.parse(e.postData.contents);
    var datos = cuerpo.datos || {};
    var clave = cuerpo.clave;
    var profesor;
    var r;

    switch (cuerpo.accion) {
      // Profesores: con su cédula, solo sus agrupaciones.
      case 'entrarProfesor':
        r = perfil_(exigirProfesor_(cuerpo.cedula));
        break;
      case 'listarMios':
        profesor = exigirProfesor_(cuerpo.cedula);
        r = { profesor: perfil_(profesor), reportes: reportesDe_(profesor) };
        break;
      case 'guardarMio':
        profesor = exigirProfesor_(cuerpo.cedula);
        r = guardar_(datos, profesor.nombre, profesor.agrupaciones);
        break;

      // Coordinación: con la clave, todo.
      case 'listar': exigirClave_(clave); r = listar_(); break;
      case 'guardar': exigirClave_(clave); r = guardar_(datos, 'Coordinación', null); break;
      case 'eliminar': exigirClave_(clave); r = eliminar_(datos.id); break;
      case 'limpiar': exigirClave_(clave); r = limpiar_(); break;
      case 'listarProfesores': exigirClave_(clave); r = listarProfesores_(); break;
      case 'guardarProfesor':
        exigirClave_(clave);
        r = guardarProfesor_(datos.profesor, datos.cedulaAnterior, datos.nuevo === true);
        break;
      case 'eliminarProfesor': exigirClave_(clave); r = eliminarProfesor_(datos.cedula); break;

      default:
        return respuesta_({ ok: false, error: 'Acción desconocida: ' + cuerpo.accion });
    }
    return respuesta_({ ok: true, resultado: r });
  } catch (err) {
    return respuesta_({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

// Abrir la URL en el navegador solo confirma que el servicio está activo (no muestra datos).
function doGet() {
  return respuesta_({ ok: true, resultado: 'Servicio de reportes activo' });
}
