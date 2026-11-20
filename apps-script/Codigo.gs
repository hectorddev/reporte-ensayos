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
 * (códigos separados por coma) | Horario («Lunes 08:00-12:00; Martes 14:00-18:00»).
 * La hoja «Agrupaciones» (Código | Nombre | Activa) es el catálogo que usa todo
 * el sitio; la coordinación cambia nombres o agrega agrupaciones desde el panel.
 *
 * Programa Simón Bolívar: el formador guarda cada clase el mismo día (datos +
 * fotos) y comparte el mensaje en Telegram; al final de la semana el sitio arma
 * el Word con esas clases. Todo queda en Drive, en «Informes PSB / Escuela /
 * Semana del …» (o dentro de la carpeta de la propiedad CARPETA_PSB_ID), y
 * listado en la hoja «InformesPSB». Propiedades opcionales: TELEFONOS_NUCLEO
 * (teléfonos del núcleo en el Word) y LIDER_PSB (líder del programa en el
 * mensaje de Telegram).
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
var ENCABEZADOS_PROFESORES = ['Cédula', 'Nombre', 'Agrupaciones', 'Actualizado', 'Programas', 'Escuelas PSB', 'Horario'];
var DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
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

/** «Lunes 08:00-12:00; Martes 14:00-18:00» → [{ dia, horaInicio, horaFin }] */
function horarioDeTexto_(texto) {
  return String(texto || '')
    .split(';')
    .map(function (b) { return b.trim(); })
    .filter(String)
    .map(function (b) {
      var m = /^(\S+)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/.exec(b);
      if (!m || DIAS_SEMANA.indexOf(m[1]) < 0) return null;
      var dos = function (h) { return h.length === 4 ? '0' + h : h; };
      return { dia: m[1], horaInicio: dos(m[2]), horaFin: dos(m[3]) };
    })
    .filter(function (b) { return b; });
}

/** Horario que llega del sitio, saneado y ordenado por día y hora. */
function horario_(bloques) {
  return (Array.isArray(bloques) ? bloques : [])
    .filter(function (b) {
      return b && DIAS_SEMANA.indexOf(b.dia) >= 0 && /^\d{2}:\d{2}$/.test(b.horaInicio) && /^\d{2}:\d{2}$/.test(b.horaFin) && b.horaFin > b.horaInicio;
    })
    .slice(0, 40)
    .map(function (b) { return { dia: b.dia, horaInicio: b.horaInicio, horaFin: b.horaFin }; })
    .sort(function (a, b) {
      return DIAS_SEMANA.indexOf(a.dia) - DIAS_SEMANA.indexOf(b.dia) || (a.horaInicio < b.horaInicio ? -1 : 1);
    });
}

function textoDeHorario_(bloques) {
  return bloques.map(function (b) { return b.dia + ' ' + b.horaInicio + '-' + b.horaFin; }).join('; ');
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
      horario: horarioDeTexto_(valores[i][6]),
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
    horario: p.horario,
    telefonosNucleo: PropertiesService.getScriptProperties().getProperty('TELEFONOS_NUCLEO') || '0276-3945614',
    liderPSB: PropertiesService.getScriptProperties().getProperty('LIDER_PSB') || '',
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
  var horario = horario_(p && p.horario);
  if (!cedulaValida_(cedula)) throw new Error('Cédula inválida.');
  if (!nombre) throw new Error('Falta el nombre del profesor.');

  var hoja = hojaProfesores_();
  var otra = filaProfesor_(hoja, cedula);
  var fila = nuevo ? -1 : filaProfesor_(hoja, normalizarCedula_(cedulaAnterior) || cedula);
  if (otra > 0 && otra !== fila) throw new Error('Ya hay un profesor registrado con esa cédula.');

  var valores = [[
    cedula, nombre, agrupaciones.join(', '), new Date().toISOString(), programas.join(', '), modulos.join(', '),
    textoDeHorario_(horario),
  ]];
  if (fila > 0) {
    hoja.getRange(fila, 1, 1, valores[0].length).setValues(valores);
  } else {
    hoja.appendRow(valores[0]);
  }
  return { cedula: cedula, nombre: nombre, agrupaciones: agrupaciones, programas: programas, modulos: modulos, horario: horario };
}

function eliminarProfesor_(cedula) {
  var hoja = hojaProfesores_();
  var fila = filaProfesor_(hoja, normalizarCedula_(cedula));
  if (fila > 0) hoja.deleteRow(fila);
  return true;
}

/* ---------- Agrupaciones (catálogo editable) ---------- */

var HOJA_AGRUPACIONES = 'Agrupaciones';
var ENCABEZADOS_AGRUPACIONES = ['Código', 'Nombre', 'Activa', 'Actualizado'];
// Las que había en el sitio antes de que el catálogo pasara a la hoja.
var AGRUPACIONES_INICIALES = [
  ['PNISPIM', 'PNISPIM'], ['DOPIM', 'DOPIM'], ['RE_Y_MIPIM', 'RE Y MIPIM'], ['PREPARATORIO_PIM', 'PREPARATORIO PIM'],
  ['INICIACION_INSTRUMENTAL', 'INICIACIÓN INSTRUMENTAL'], ['PRE_INFANTIL_ETAPA_1', 'PRE INFANTIL ETAPA 1'],
  ['CORO_INFANTIL', 'CORO INFANTIL'], ['ALMA_LLANERA_NIVEL_I', 'ALMA LLANERA NIVEL I'],
  ['ALMA_LLANERA_NIVEL_II', 'ALMA LLANERA NIVEL II'], ['ALMA_LLANERA_NIVEL_III', 'ALMA LLANERA NIVEL III'],
  ['ORQUESTAL_PRE_INFANTIL_E2', 'ORQUESTAL PRE INFANTIL ETAPA 2'], ['ORQUESTAL_INFANTIL', 'ORQUESTAL INFANTIL'],
];

function hojaAgrupaciones_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_AGRUPACIONES);
  if (!hoja) {
    hoja = ss.insertSheet(HOJA_AGRUPACIONES);
    hoja.appendRow(ENCABEZADOS_AGRUPACIONES);
    hoja.setFrozenRows(1);
    var ahora = new Date().toISOString();
    AGRUPACIONES_INICIALES.forEach(function (a) { hoja.appendRow([a[0], a[1], 'SÍ', ahora]); });
  }
  return hoja;
}

/** Pública: los nombres de las agrupaciones no son datos personales. */
function listarAgrupaciones_() {
  var hoja = hojaAgrupaciones_();
  var ultima = hoja.getLastRow();
  if (ultima < 2) return [];
  return hoja.getRange(2, 1, ultima - 1, 3).getValues()
    .filter(function (f) { return String(f[0]).trim(); })
    .map(function (f) {
      return { id: String(f[0]).trim(), nombre: String(f[1]).trim(), activa: may_(f[2]) !== 'NO' };
    });
}

/** «Coro Juvenil» → «CORO_JUVENIL» (código estable; el nombre se puede cambiar después). */
function codigoAgrupacion_(nombre, existentes) {
  var base = String(nombre).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'AGRUPACION';
  var codigo = base;
  for (var n = 2; existentes.indexOf(codigo) >= 0; n++) codigo = base + '_' + n;
  return codigo;
}

/** Cambia el nombre o el estado de una agrupación, o agrega una nueva (sin id). */
function guardarAgrupacion_(a) {
  var nombre = String((a && a.nombre) || '').trim().slice(0, 80);
  if (!nombre) throw new Error('Falta el nombre de la agrupación.');
  var hoja = hojaAgrupaciones_();
  var ultima = hoja.getLastRow();
  var codigos = ultima < 2 ? [] : hoja.getRange(2, 1, ultima - 1, 1).getValues().map(function (f) { return String(f[0]).trim(); });
  var activa = !(a && a.activa === false);
  var fila = a && a.id ? codigos.indexOf(String(a.id)) : -1;
  var otra = codigos.map(function (c, i) { return i; }).filter(function (i) {
    return i !== fila && may_(hoja.getRange(i + 2, 2).getValue()).trim() === may_(nombre).trim();
  });
  if (otra.length) throw new Error('Ya hay una agrupación con ese nombre.');

  var ahora = new Date().toISOString();
  if (fila >= 0) {
    hoja.getRange(fila + 2, 2, 1, 3).setValues([[nombre, activa ? 'SÍ' : 'NO', ahora]]);
    return { id: codigos[fila], nombre: nombre, activa: activa };
  }
  if (a && a.id) throw new Error('No existe esa agrupación.');
  var codigo = codigoAgrupacion_(nombre, codigos);
  hoja.appendRow([codigo, nombre, activa ? 'SÍ' : 'NO', ahora]);
  return { id: codigo, nombre: nombre, activa: activa };
}

/* ---------- Programa Simón Bolívar: clases del día e informe semanal ---------- */

/*
 * Cada escuela tiene una fila por semana en «InformesPSB». El formador guarda
 * cada clase el mismo día (datos + fotos en Drive) y comparte el mensaje en
 * Telegram; al final de la semana el sitio arma el Word con esas clases y lo
 * registra aquí.
 */

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

function texto_(valor, maximo) {
  return String(valor == null ? '' : valor).slice(0, maximo || 500);
}

function sumarDiasIso_(iso, n) {
  var p = String(iso).split('-');
  return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)).toISOString().slice(0, 10);
}

/** La fecha cae entre el lunes y el domingo de esa semana. */
function enSemana_(fecha, lunes) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(fecha)) && fecha >= lunes && fecha <= sumarDiasIso_(lunes, 6);
}

/** Fotos de un día como objetos (la versión anterior guardaba solo los ids). */
function fotosDeDia_(inf, dia) {
  return (dia.fotos || []).map(function (f) {
    if (f && typeof f === 'object') return f;
    var hallada = (inf.fotos || []).filter(function (x) { return x.id === f; })[0];
    return hallada ? { id: hallada.id, url: hallada.url, nombre: hallada.nombre } : { id: String(f), url: '', nombre: '' };
  });
}

function normalizarInforme_(inf) {
  inf.dias = (inf.dias || []).map(function (d) {
    d.fotos = fotosDeDia_(inf, d);
    return d;
  });
  // Lista plana de fotos (la usa la versión anterior del sitio).
  inf.fotos = [];
  inf.dias.forEach(function (d) {
    d.fotos.forEach(function (f) { inf.fotos.push({ id: f.id, url: f.url, nombre: f.nombre, fecha: d.fecha }); });
  });
  return inf;
}

function porFecha_(a, b) {
  return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0;
}

function buscarSemana_(hoja, modulo, semana) {
  var hallado = null;
  leerJson_(hoja, COL_JSON_PSB).forEach(function (x) {
    if (!hallado && x.reporte.modulo === modulo && x.reporte.semana === semana) hallado = x;
  });
  if (hallado) hallado.reporte = normalizarInforme_(hallado.reporte);
  return hallado;
}

function filaPSB_(inf) {
  return [
    inf.id,
    may_(inf.escuela),
    inf.semanaTexto || inf.semana,
    (inf.dias || []).map(function (d) { return String(d.fecha).slice(8, 10); }).join(', '),
    may_(inf.profesor),
    inf.alumnos || '',
    inf.actualizadoEn,
    inf.carpeta ? inf.carpeta.url : '',
    inf.archivo ? inf.archivo.url : 'WORD PENDIENTE',
    JSON.stringify(inf),
  ];
}

function escribirSemana_(hoja, previo, inf) {
  inf.actualizadoEn = new Date().toISOString();
  var fila = filaPSB_(inf);
  if (previo) {
    hoja.getRange(previo.fila, 1, 1, fila.length).setValues([fila]);
  } else {
    hoja.appendRow(fila);
  }
  return inf;
}

/**
 * Guarda (o corrige) la clase de un día. Si es la primera clase de la semana,
 * crea la fila. Las fotos que tenía ese día y ya no están van a la papelera.
 */
function guardarDiaPSB_(profesor, d) {
  exigirPSB_(profesor, d.modulo);
  var dia = d.dia || {};
  if (!d.semana || !enSemana_(dia.fecha, d.semana)) throw new Error('La fecha no corresponde a esa semana.');

  var hoja = hojaPSB_();
  var previo = buscarSemana_(hoja, d.modulo, d.semana);
  var inf = previo
    ? previo.reporte
    : { id: Utilities.getUuid(), modulo: d.modulo, semana: d.semana, dias: [], creadoEn: new Date().toISOString() };
  inf.escuela = texto_(d.escuela, 150) || inf.escuela;
  inf.semanaTexto = texto_(d.semanaTexto, 80) || inf.semanaTexto;
  if (d.carpeta && d.carpeta.id) inf.carpeta = { id: texto_(d.carpeta.id, 200), url: texto_(d.carpeta.url, 500) };

  var nuevo = {
    fecha: dia.fecha,
    horaInicio: texto_(dia.horaInicio, 5),
    horaFin: texto_(dia.horaFin, 5),
    descripcion: texto_(dia.descripcion, 3000),
    tipoActividad: texto_(dia.tipoActividad, 120),
    atendidos: texto_(dia.atendidos, 120),
    niveles: texto_(dia.niveles, 200),
    adultos: texto_(dia.adultos, 200),
    fotos: (dia.fotos || []).slice(0, 8).map(function (f) {
      return { id: texto_(f.id, 200), url: texto_(f.url, 500), nombre: texto_(f.nombre, 200) };
    }),
    formador: profesor.nombre,
    guardadoEn: new Date().toISOString(),
  };
  var vigentes = {};
  nuevo.fotos.forEach(function (f) { vigentes[f.id] = true; });
  inf.dias = inf.dias.filter(function (x) {
    if (x.fecha !== nuevo.fecha) return true;
    x.fotos.forEach(function (f) { if (!vigentes[f.id]) aLaPapelera_(f.id); });
    return false;
  });
  inf.dias.push(nuevo);
  inf.dias.sort(porFecha_);
  inf.profesor = profesor.nombre;
  inf.clasesEn = nuevo.guardadoEn; // si es posterior al Word, el Word quedó viejo
  return escribirSemana_(hoja, previo, inf);
}

/** Quita una clase guardada por error (y manda sus fotos a la papelera). */
function quitarDiaPSB_(profesor, d) {
  exigirPSB_(profesor, d.modulo);
  var hoja = hojaPSB_();
  var previo = buscarSemana_(hoja, d.modulo, d.semana);
  if (!previo) throw new Error('No se encontró esa semana.');
  var inf = previo.reporte;
  inf.dias = inf.dias.filter(function (x) {
    if (x.fecha !== d.fecha) return true;
    x.fotos.forEach(function (f) { aLaPapelera_(f.id); });
    return false;
  });
  inf.clasesEn = new Date().toISOString();
  return escribirSemana_(hoja, previo, inf);
}

/**
 * Registra el Word de la semana (armado en el sitio con las clases guardadas).
 * El Word anterior de esa semana, si lo había, va a la papelera.
 */
function guardarInformePSB_(profesor, d) {
  if (!d || !d.modulo || !d.semana || !d.archivo || !d.archivo.id) throw new Error('Informe incompleto.');
  exigirPSB_(profesor, d.modulo);
  var hoja = hojaPSB_();
  var previo = buscarSemana_(hoja, d.modulo, d.semana);
  var inf;

  if (Array.isArray(d.dias) && d.dias.length) {
    // Versión anterior del sitio: manda la semana completa de una vez.
    inf = normalizarInforme_(d);
    var vigentes = {};
    vigentes[d.archivo.id] = true;
    inf.dias.forEach(function (dia) { dia.fotos.forEach(function (f) { vigentes[f.id] = true; }); });
    if (previo) {
      var viejos = [previo.reporte.archivo];
      previo.reporte.dias.forEach(function (dia) { viejos = viejos.concat(dia.fotos); });
      viejos.forEach(function (a) { if (a && a.id && !vigentes[a.id]) aLaPapelera_(a.id); });
      inf.id = previo.reporte.id;
      inf.creadoEn = previo.reporte.creadoEn;
    } else {
      inf.id = Utilities.getUuid();
      inf.creadoEn = new Date().toISOString();
    }
  } else {
    if (!previo || !previo.reporte.dias.length) throw new Error('Primero guarda al menos una clase de la semana.');
    inf = previo.reporte;
    if (inf.archivo && inf.archivo.id && inf.archivo.id !== d.archivo.id) aLaPapelera_(inf.archivo.id);
    if (d.carpeta && d.carpeta.id) inf.carpeta = { id: texto_(d.carpeta.id, 200), url: texto_(d.carpeta.url, 500) };
  }

  inf.archivo = { id: texto_(d.archivo.id, 200), url: texto_(d.archivo.url, 500), nombre: texto_(d.archivo.nombre, 200) };
  inf.evento = texto_(d.evento, 200);
  inf.agrupaciones = texto_(d.agrupaciones, 200);
  inf.instructores = texto_(d.instructores, 300);
  inf.alumnos = Number(d.alumnos) || 0;
  inf.wordEn = new Date().toISOString();
  inf.wordPor = profesor.nombre;
  inf.profesor = profesor.nombre;
  return escribirSemana_(hoja, previo, inf);
}

/** Todas las semanas (coordinación) o las de las escuelas del profesor. */
function listarInformesPSB_(profesor) {
  return leerJson_(hojaPSB_(), COL_JSON_PSB)
    .map(function (x) { return normalizarInforme_(x.reporte); })
    .filter(function (inf) {
      return !profesor || (profesor.programas.indexOf(PROGRAMA_PSB) >= 0 && profesor.modulos.indexOf(inf.modulo) >= 0);
    });
}

/** Un archivo (foto o Word) de un informe que la persona puede ver. Drive es privado. */
function descargarArchivoPSB_(profesor, id) {
  var informes = listarInformesPSB_(profesor);
  for (var i = 0; i < informes.length; i++) {
    var inf = informes[i];
    var ids = inf.archivo ? [inf.archivo.id] : [];
    inf.dias.forEach(function (d) { d.fotos.forEach(function (f) { ids.push(f.id); }); });
    if (ids.indexOf(id) >= 0) {
      var archivo = DriveApp.getFileById(id);
      var blob = archivo.getBlob();
      return { nombre: archivo.getName(), base64: Utilities.base64Encode(blob.getBytes()) };
    }
  }
  throw new Error('No se encontró el archivo.');
}

/** El Word del informe de la semana. */
function descargarInformePSB_(profesor, id) {
  var informes = listarInformesPSB_(profesor);
  for (var i = 0; i < informes.length; i++) {
    if (informes[i].id === id && informes[i].archivo) return descargarArchivoPSB_(profesor, informes[i].archivo.id);
  }
  throw new Error('Esa semana todavía no tiene Word.');
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
  eliminarProfesor: true, guardarAgrupacion: true, subirArchivoPSB: true, guardarInformePSB: true, guardarDiaPSB: true, quitarDiaPSB: true,
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
      // Pública: catálogo de agrupaciones (lo usan también las constancias).
      case 'listarAgrupaciones':
        r = listarAgrupaciones_();
        break;

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
      case 'guardarDiaPSB': r = guardarDiaPSB_(exigirProfesor_(cuerpo.cedula), datos); break;
      case 'quitarDiaPSB': r = quitarDiaPSB_(exigirProfesor_(cuerpo.cedula), datos); break;
      case 'descargarArchivoPSB': r = descargarArchivoPSB_(exigirProfesor_(cuerpo.cedula), datos.id); break;
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
      case 'guardarAgrupacion': exigirClave_(clave); r = guardarAgrupacion_(datos); break;
      case 'listarInformesPSB': exigirClave_(clave); r = listarInformesPSB_(null); break;
      case 'descargarInformePSBCoordinacion': exigirClave_(clave); r = descargarInformePSB_(null, datos.id); break;
      case 'descargarArchivoPSBCoordinacion': exigirClave_(clave); r = descargarArchivoPSB_(null, datos.id); break;

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
