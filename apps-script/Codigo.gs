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
 * mano: Cédula | Nombre | Agrupaciones | Actualizado | Programas | Escuelas PSB
 * (códigos separados por coma).
 *
 * Programa Simón Bolívar: los profesores de ese programa suben el informe
 * semanal de cada escuela asignada (Word armado en el sitio + fotos). Se guardan
 * en Drive, en «Informes PSB / Escuela / Semana del …» (o dentro de la carpeta
 * de la propiedad CARPETA_PSB_ID), y quedan listados en la hoja «InformesPSB».
 * La propiedad opcional TELEFONOS_NUCLEO es lo que el informe pone como
 * teléfonos de contacto del núcleo.
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
var ENCABEZADOS_PROFESORES = ['Cédula', 'Nombre', 'Agrupaciones', 'Actualizado', 'Programas', 'Escuelas PSB'];
var PROGRAMA_PSB = 'SIMON_BOLIVAR';

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
  } else if (hoja.getRange(1, ENCABEZADOS_PROFESORES.length).getValue() === '') {
    // Hojas de la versión anterior: se agregan Programas y Escuelas PSB.
    hoja.getRange(1, 1, 1, ENCABEZADOS_PROFESORES.length).setValues([ENCABEZADOS_PROFESORES]);
  }
  return hoja;
}

/** «CORO_INFANTIL, DOPIM» → ['CORO_INFANTIL', 'DOPIM'] */
function lista_(texto) {
  return String(texto || '')
    .split(',')
    .map(function (a) { return a.trim(); })
    .filter(String);
}

/** Lista de códigos que llega del sitio, saneada. */
function codigos_(valores) {
  return (Array.isArray(valores) ? valores : [])
    .map(function (a) { return String(a).trim(); })
    .filter(String)
    .slice(0, 40);
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
  var valores = hoja.getRange(2, 1, ultima - 1, ENCABEZADOS_PROFESORES.length).getValues();
  var profesores = [];
  for (var i = 0; i < valores.length; i++) {
    var cedula = normalizarCedula_(valores[i][0]);
    if (!cedula) continue;
    profesores.push({
      cedula: cedula,
      nombre: String(valores[i][1] || '').trim(),
      agrupaciones: lista_(valores[i][2]),
      programas: lista_(valores[i][4]),
      modulos: lista_(valores[i][5]),
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
  return {
    nombre: p.nombre,
    agrupaciones: p.agrupaciones,
    programas: p.programas,
    modulos: p.modulos,
    telefonosNucleo: PropertiesService.getScriptProperties().getProperty('TELEFONOS_NUCLEO') || '0276-3945614',
  };
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

/** Todos los objetos guardados en la columna JSON, con su número de fila. */
function leerJson_(hoja, columna) {
  var ultima = hoja.getLastRow();
  if (ultima < 2) return [];
  var valores = hoja.getRange(2, columna, ultima - 1, 1).getValues();
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

function leerReportes_(hoja) {
  return leerJson_(hoja, COL_JSON);
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
  var agrupaciones = codigos_(p && p.agrupaciones);
  var programas = codigos_(p && p.programas);
  var modulos = codigos_(p && p.modulos);
  if (!cedulaValida_(cedula)) throw new Error('Cédula inválida.');
  if (!nombre) throw new Error('Falta el nombre del profesor.');

  var hoja = hojaProfesores_();
  var otra = filaProfesor_(hoja, cedula);
  var fila = nuevo ? -1 : filaProfesor_(hoja, normalizarCedula_(cedulaAnterior) || cedula);
  if (otra > 0 && otra !== fila) throw new Error('Ya hay un profesor registrado con esa cédula.');

  var valores = [[
    cedula, nombre, agrupaciones.join(', '), new Date().toISOString(), programas.join(', '), modulos.join(', '),
  ]];
  if (fila > 0) {
    hoja.getRange(fila, 1, 1, valores[0].length).setValues(valores);
  } else {
    hoja.appendRow(valores[0]);
  }
  return { cedula: cedula, nombre: nombre, agrupaciones: agrupaciones, programas: programas, modulos: modulos };
}

function eliminarProfesor_(cedula) {
  var hoja = hojaProfesores_();
  var fila = filaProfesor_(hoja, normalizarCedula_(cedula));
  if (fila > 0) hoja.deleteRow(fila);
  return true;
}

/* ---------- Programa Simón Bolívar: informes semanales con fotos ---------- */

var HOJA_PSB = 'InformesPSB';
var ENCABEZADOS_PSB = [
  'id', 'Escuela', 'Semana', 'Días de clase', 'Profesor', 'Alumnos', 'Actualizado', 'Carpeta', 'Documento', 'datos_json',
];
var COL_JSON_PSB = 10;
var MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
var MAX_BASE64 = 20 * 1024 * 1024; // ~15 MB por archivo

function hojaPSB_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PSB) || ss.insertSheet(HOJA_PSB);
  if (hoja.getLastRow() === 0) {
    hoja.appendRow(ENCABEZADOS_PSB);
    hoja.setFrozenRows(1);
  }
  return hoja;
}

/** Solo profesores del programa y de esa escuela. */
function exigirPSB_(profesor, modulo) {
  if (profesor.programas.indexOf(PROGRAMA_PSB) < 0 || profesor.modulos.indexOf(modulo) < 0) {
    throw new Error('SIN_PERMISO');
  }
}

/** Nombre seguro para carpetas y archivos de Drive. */
function nombreDrive_(texto) {
  return String(texto || '').replace(/[\\/:*?"<>|]/g, '-').trim().slice(0, 150) || 'sin nombre';
}

function carpetaHija_(padre, nombre) {
  var existentes = padre.getFoldersByName(nombre);
  return existentes.hasNext() ? existentes.next() : padre.createFolder(nombre);
}

function carpetaRaizPSB_() {
  var id = PropertiesService.getScriptProperties().getProperty('CARPETA_PSB_ID');
  return id ? DriveApp.getFolderById(id) : carpetaHija_(DriveApp.getRootFolder(), 'Informes PSB');
}

/** Informes PSB / <Escuela> / Semana del 09-11 al 13-11-2026 */
function carpetaInforme_(escuela, semana) {
  return carpetaHija_(carpetaHija_(carpetaRaizPSB_(), nombreDrive_(escuela)), nombreDrive_(semana));
}

/**
 * Ejecútala una vez desde el editor (elígela arriba y pulsa ▶ Ejecutar) para dar
 * al script permiso de Drive. Crea la carpeta «Informes PSB» si no existe.
 */
function autorizarDrive() {
  var carpeta = carpetaRaizPSB_();
  Logger.log('Carpeta de informes PSB: ' + carpeta.getUrl());
}

/** Sube una foto (JPEG) o el Word del informe a la carpeta de esa escuela y semana. */
function subirArchivoPSB_(profesor, d) {
  exigirPSB_(profesor, d.modulo);
  if (!d.base64 || String(d.base64).length > MAX_BASE64) throw new Error('El archivo está vacío o es demasiado grande.');
  var mime = d.mime === MIME_DOCX ? MIME_DOCX : 'image/jpeg';
  var carpeta = carpetaInforme_(d.escuela, d.carpetaSemana);
  var blob = Utilities.newBlob(Utilities.base64Decode(d.base64), mime, nombreDrive_(d.nombre));
  var archivo = carpeta.createFile(blob);
  return {
    id: archivo.getId(),
    url: archivo.getUrl(),
    nombre: archivo.getName(),
    carpeta: { id: carpeta.getId(), url: carpeta.getUrl() },
  };
}

function aLaPapelera_(id) {
  try {
    DriveApp.getFileById(id).setTrashed(true);
  } catch (e) {}
}

function filaPSB_(inf) {
  return [
    inf.id,
    may_(inf.escuela),
    inf.semanaTexto || inf.semana,
    (inf.dias || []).map(function (d) { return String(d.fecha).slice(8, 10); }).join(', '),
    may_(inf.profesor),
    inf.alumnos || 0,
    inf.actualizadoEn,
    inf.carpeta ? inf.carpeta.url : '',
    inf.archivo ? inf.archivo.url : '',
    JSON.stringify(inf),
  ];
}

/**
 * Registra el informe (ya con sus archivos subidos). Si esa escuela ya tenía
 * informe de esa semana, se reemplaza y los archivos anteriores van a la papelera.
 */
function guardarInformePSB_(profesor, inf) {
  if (!inf || !inf.modulo || !inf.semana || !inf.archivo || !inf.archivo.id) throw new Error('Informe incompleto.');
  exigirPSB_(profesor, inf.modulo);

  var hoja = hojaPSB_();
  var previo = null;
  leerJson_(hoja, COL_JSON_PSB).forEach(function (x) {
    if (!previo && x.reporte.modulo === inf.modulo && x.reporte.semana === inf.semana) previo = x;
  });

  var ahora = new Date().toISOString();
  if (previo) {
    var vigentes = {};
    vigentes[inf.archivo.id] = true;
    (inf.fotos || []).forEach(function (f) { vigentes[f.id] = true; });
    [previo.reporte.archivo].concat(previo.reporte.fotos || []).forEach(function (a) {
      if (a && a.id && !vigentes[a.id]) aLaPapelera_(a.id);
    });
    inf.id = previo.reporte.id;
    inf.creadoEn = previo.reporte.creadoEn;
  } else {
    inf.id = Utilities.getUuid();
    inf.creadoEn = ahora;
  }
  inf.profesor = profesor.nombre;
  inf.actualizadoEn = ahora;

  var fila = filaPSB_(inf);
  if (previo) {
    hoja.getRange(previo.fila, 1, 1, fila.length).setValues([fila]);
  } else {
    hoja.appendRow(fila);
  }
  return inf;
}

/** Todos (coordinación) o los de las escuelas del profesor. */
function listarInformesPSB_(profesor) {
  return leerJson_(hojaPSB_(), COL_JSON_PSB)
    .map(function (x) { return x.reporte; })
    .filter(function (inf) {
      return !profesor || (profesor.programas.indexOf(PROGRAMA_PSB) >= 0 && profesor.modulos.indexOf(inf.modulo) >= 0);
    });
}

/** El Word del informe, para descargarlo desde el sitio (Drive es privado). */
function descargarInformePSB_(profesor, id) {
  var informes = listarInformesPSB_(profesor);
  for (var i = 0; i < informes.length; i++) {
    if (informes[i].id === id) {
      var blob = DriveApp.getFileById(informes[i].archivo.id).getBlob();
      return { nombre: informes[i].archivo.nombre, base64: Utilities.base64Encode(blob.getBytes()) };
    }
  }
  throw new Error('No se encontró el informe.');
}

/* ---------- Web App ---------- */

function respuesta_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Acciones que escriben en la hoja o en Drive: van de una en una. */
var ESCRIBEN = {
  guardarMio: true, guardar: true, eliminar: true, limpiar: true, guardarProfesor: true,
  eliminarProfesor: true, subirArchivoPSB: true, guardarInformePSB: true,
};

function doPost(e) {
  var cuerpo;
  try {
    cuerpo = JSON.parse(e.postData.contents);
  } catch (err) {
    return respuesta_({ ok: false, error: 'Petición inválida.' });
  }
  var lock = ESCRIBEN[cuerpo.accion] ? LockService.getScriptLock() : null;
  if (lock) lock.waitLock(30000);
  try {
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

      // Programa Simón Bolívar: solo sus escuelas.
      case 'subirArchivoPSB': r = subirArchivoPSB_(exigirProfesor_(cuerpo.cedula), datos); break;
      case 'guardarInformePSB': r = guardarInformePSB_(exigirProfesor_(cuerpo.cedula), datos); break;
      case 'listarMisInformesPSB': r = listarInformesPSB_(exigirProfesor_(cuerpo.cedula)); break;
      case 'descargarInformePSB': r = descargarInformePSB_(exigirProfesor_(cuerpo.cedula), datos.id); break;

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
      case 'listarInformesPSB': exigirClave_(clave); r = listarInformesPSB_(null); break;
      case 'descargarInformePSBCoordinacion': exigirClave_(clave); r = descargarInformePSB_(null, datos.id); break;

      default:
        return respuesta_({ ok: false, error: 'Acción desconocida: ' + cuerpo.accion });
    }
    return respuesta_({ ok: true, resultado: r });
  } catch (err) {
    return respuesta_({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    if (lock) lock.releaseLock();
  }
}

// Abrir la URL en el navegador solo confirma que el servicio está activo (no muestra datos).
function doGet() {
  return respuesta_({ ok: true, resultado: 'Servicio de reportes activo' });
}
