/**
 * Backend ligero para "Reporte de Ensayos" sobre Google Sheets.
 * Se despliega como Web App (Implementar → Nueva implementación → Aplicación web).
 *
 * El frontend hace POST text/plain con { accion, datos }.
 * Acciones: listar | guardar | eliminar | limpiar
 *
 * La hoja guarda columnas legibles para humanos + una columna datos_json
 * (la última) que conserva el reporte completo para la app.
 */

var NOMBRE_HOJA = 'Reportes';
var MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
var ENCABEZADOS = [
  'id', 'Agrupación', 'Año', 'Mes', 'N° Ensayos', 'Fechas de ensayo',
  'Niños', 'Niñas', 'Adolescentes F', 'Adolescentes M', 'Adultos F', 'Adultos M',
  'Total', 'Repertorio', 'Observaciones', 'Creado', 'datos_json',
];
var COL_JSON = 17; // posición de datos_json
var COL_ID = 1;

function obtenerHoja_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(NOMBRE_HOJA);
  if (!hoja) {
    hoja = ss.insertSheet(NOMBRE_HOJA);
  }
  if (hoja.getLastRow() === 0) {
    hoja.appendRow(ENCABEZADOS);
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function filaDesdeReporte_(r) {
  var fechas = (r.ensayos || []).map(function (e) {
    return String(e.fecha).slice(0, 10);
  }).join(', ');
  var total =
    (r.totalNinos || 0) + (r.totalNinas || 0) +
    (r.totalAdolescentesFemeninas || 0) + (r.totalAdolescentesMasculinos || 0) +
    (r.totalAdultosFemeninos || 0) + (r.totalAdultosMasculinos || 0);
  var nombreAgr = r.agrupacion ? r.agrupacion.nombre : r.agrupacionId;

  return [
    r.id,
    nombreAgr,
    r.anio,
    MESES[r.mes - 1] || r.mes,
    (r.ensayos || []).length,
    fechas,
    r.totalNinos || 0,
    r.totalNinas || 0,
    r.totalAdolescentesFemeninas || 0,
    r.totalAdolescentesMasculinos || 0,
    r.totalAdultosFemeninos || 0,
    r.totalAdultosMasculinos || 0,
    total,
    (r.repertorioTexto || '').split('\n').filter(String).join(' | '),
    r.observaciones || '',
    r.createdAt || '',
    JSON.stringify(r),
  ];
}

function listar_() {
  var hoja = obtenerHoja_();
  var ultima = hoja.getLastRow();
  if (ultima < 2) return [];
  var valores = hoja.getRange(2, COL_JSON, ultima - 1, 1).getValues();
  var reportes = [];
  for (var i = 0; i < valores.length; i++) {
    var celda = valores[i][0];
    if (!celda) continue;
    try {
      reportes.push(JSON.parse(celda));
    } catch (e) {}
  }
  return reportes;
}

function buscarFilaPorId_(hoja, id) {
  var ultima = hoja.getLastRow();
  if (ultima < 2) return -1;
  var ids = hoja.getRange(2, COL_ID, ultima - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2; // fila real
  }
  return -1;
}

function guardar_(reporte) {
  var hoja = obtenerHoja_();
  var fila = filaDesdeReporte_(reporte);
  var existente = buscarFilaPorId_(hoja, reporte.id);
  if (existente > 0) {
    hoja.getRange(existente, 1, 1, fila.length).setValues([fila]);
  } else {
    hoja.appendRow(fila);
  }
  return reporte;
}

function eliminar_(id) {
  var hoja = obtenerHoja_();
  var fila = buscarFilaPorId_(hoja, id);
  if (fila > 0) hoja.deleteRow(fila);
  return { id: id };
}

function limpiar_() {
  var hoja = obtenerHoja_();
  var ultima = hoja.getLastRow();
  if (ultima >= 2) {
    hoja.deleteRows(2, ultima - 1);
  }
  return true;
}

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
    var accion = cuerpo.accion;
    var datos = cuerpo.datos;
    var resultado;

    switch (accion) {
      case 'listar': resultado = listar_(); break;
      case 'guardar': resultado = guardar_(datos); break;
      case 'eliminar': resultado = eliminar_(datos.id); break;
      case 'limpiar': resultado = limpiar_(); break;
      default: return respuesta_({ ok: false, error: 'Acción desconocida: ' + accion });
    }
    return respuesta_({ ok: true, resultado: resultado });
  } catch (err) {
    return respuesta_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Permite probar la URL en el navegador (GET) sin romper nada.
function doGet() {
  return respuesta_({ ok: true, resultado: listar_() });
}
