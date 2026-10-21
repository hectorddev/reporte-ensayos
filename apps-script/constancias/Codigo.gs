/**
 * Backend de CONSTANCIAS, independiente del de reportes: vive en su propio
 * Google Sheet y se despliega como Web App aparte (ver INSTRUCCIONES.md).
 *
 * El frontend hace POST text/plain con { accion, datos, clave? }.
 * Públicas:      crearSolicitud | listarPlantillasActivas | leerPlantilla
 * Coordinación:  verificarClave | listarSolicitudes | guardarSolicitud |
 *                eliminarSolicitud | listarPlantillas | guardarPlantilla |
 *                eliminarPlantilla
 *
 * Las solicitudes (con cédulas de menores) solo se leen con la clave de
 * coordinación. Defínela en Configuración del proyecto → Propiedades del
 * script → CLAVE_COORDINACION. Sin ella se usa la clave del panel, que es
 * pública en el código del sitio: configúrala antes de usarlo en serio.
 */

var CLAVE_POR_DEFECTO = 'orquestatipica2008.';
var MAX_DATOS = 20000; // caracteres por registro; una celda admite 50.000
var DIAS_VIGENCIA = 30; // una plantilla de evento se oculta 30 días después

var TIPOS = {
  horario: 'HORARIO',
  pertenencia: 'PARTICIPACIÓN EN AGRUPACIÓN',
  concierto: 'CONCIERTO',
  jornada: 'JORNADA DE ENSAYOS',
  ensayo: 'ENSAYO',
};

var HOJAS = {
  solicitudes: {
    nombre: 'Solicitudes',
    encabezados: [
      'Código', 'Estado', 'Tipo', 'Solicitada', 'Estudiante', 'Cédula estudiante',
      'Agrupación', 'Representante', 'Teléfono', 'Plantilla', 'Fecha emisión',
      'Actualizada', 'datos_json',
    ],
    fila: function (c) {
      return [
        c.codigo, may_(c.estado), TIPOS[c.tipo] || may_(c.tipo), c.creadoEn || '',
        may_(c.estudianteNombre), c.estudianteCedula || '', may_(c.agrupacionNombre),
        may_(c.representanteNombre), c.representanteTelefono || '', c.plantilla || '',
        c.fechaEmision || '', c.actualizadoEn || '', JSON.stringify(c),
      ];
    },
  },
  plantillas: {
    nombre: 'Plantillas',
    encabezados: ['Código', 'Título', 'Tipo', 'Fecha', 'Hasta', 'Lugar', 'Creada', 'datos_json'],
    fila: function (p) {
      var d = p.datos || {};
      return [
        p.codigo, may_(p.titulo), TIPOS[d.tipo] || may_(d.tipo), d.fecha || '',
        d.fechaFin || '', may_(d.lugar), p.creadoEn || '', JSON.stringify(p),
      ];
    },
  },
};

function may_(texto) {
  return String(texto || '').toUpperCase();
}

function hoja_(tipo) {
  var conf = HOJAS[tipo];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(conf.nombre) || ss.insertSheet(conf.nombre);
  if (hoja.getLastRow() === 0) {
    hoja.appendRow(conf.encabezados);
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function columnaJson_(tipo) {
  return HOJAS[tipo].encabezados.length;
}

function listar_(tipo) {
  var hoja = hoja_(tipo);
  var ultima = hoja.getLastRow();
  if (ultima < 2) return [];
  var valores = hoja.getRange(2, columnaJson_(tipo), ultima - 1, 1).getValues();
  var lista = [];
  for (var i = 0; i < valores.length; i++) {
    if (!valores[i][0]) continue;
    try {
      lista.push(JSON.parse(valores[i][0]));
    } catch (e) {}
  }
  return lista;
}

function buscarFila_(hoja, codigo) {
  var ultima = hoja.getLastRow();
  if (ultima < 2 || !codigo) return -1;
  var codigos = hoja.getRange(2, 1, ultima - 1, 1).getValues();
  var buscado = String(codigo).trim().toUpperCase();
  for (var i = 0; i < codigos.length; i++) {
    if (String(codigos[i][0]).toUpperCase() === buscado) return i + 2;
  }
  return -1;
}

function leer_(tipo, codigo) {
  var hoja = hoja_(tipo);
  var fila = buscarFila_(hoja, codigo);
  if (fila < 0) return null;
  return JSON.parse(hoja.getRange(fila, columnaJson_(tipo)).getValue());
}

function guardar_(tipo, objeto) {
  if (JSON.stringify(objeto).length > MAX_DATOS) throw new Error('Los datos son demasiado largos.');
  var hoja = hoja_(tipo);
  var valores = HOJAS[tipo].fila(objeto);
  var fila = buscarFila_(hoja, objeto.codigo);
  if (fila > 0) {
    hoja.getRange(fila, 1, 1, valores.length).setValues([valores]);
  } else {
    hoja.appendRow(valores);
  }
  return objeto;
}

function eliminar_(tipo, codigo) {
  var hoja = hoja_(tipo);
  var fila = buscarFila_(hoja, codigo);
  if (fila > 0) hoja.deleteRow(fila);
  return { codigo: codigo };
}

/** Código corto, sin caracteres ambiguos (0/O, 1/I). Ej: CT26-7KQ9PX */
function generarCodigo_(tipo, prefijo) {
  var alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var hoja = hoja_(tipo);
  var base = prefijo + String(new Date().getFullYear()).slice(2) + '-';
  for (var intento = 0; intento < 20; intento++) {
    var codigo = base;
    for (var i = 0; i < 6; i++) codigo += alfabeto.charAt(Math.floor(Math.random() * alfabeto.length));
    if (buscarFila_(hoja, codigo) < 0) return codigo;
  }
  throw new Error('No se pudo generar un código único, intenta de nuevo.');
}

function exigirClave_(clave) {
  var esperada = PropertiesService.getScriptProperties().getProperty('CLAVE_COORDINACION') || CLAVE_POR_DEFECTO;
  if (String(clave || '') !== esperada) throw new Error('CLAVE_INVALIDA');
}

function hoyIso_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function plantillaVigente_(p) {
  var d = p.datos || {};
  var ultima = d.fechaFin || d.fecha;
  if (!ultima) return true; // horario o participación: no vencen
  var partes = String(ultima).split('-');
  var limite = new Date(Date.UTC(+partes[0], +partes[1] - 1, +partes[2] + DIAS_VIGENCIA));
  return limite.toISOString().slice(0, 10) >= hoyIso_();
}

/* ---------- Acciones ---------- */

/** Pública. Los campos de control los fija el servidor: nunca llega aprobada. */
function crearSolicitud_(datos) {
  if (!datos || !TIPOS[datos.tipo] || !datos.estudianteNombre || !datos.representanteTelefono) {
    throw new Error('Faltan datos de la solicitud.');
  }
  var s = {};
  for (var campo in datos) s[campo] = datos[campo];
  s.codigo = generarCodigo_('solicitudes', 'CT');
  s.estado = 'pendiente';
  s.creadoEn = new Date().toISOString();
  s.fechaEmision = '';
  s.parrafoAdicional = '';
  s.entrega = 'representante';
  s.motivoRechazo = '';
  s.actualizadoEn = s.creadoEn;
  guardar_('solicitudes', s);
  return { codigo: s.codigo };
}

/** Coordinación: crea (sin código) o actualiza una constancia. */
function guardarSolicitud_(c) {
  if (!c || !TIPOS[c.tipo]) throw new Error('Constancia inválida.');
  if (!c.codigo) {
    c.codigo = generarCodigo_('solicitudes', 'CT');
    c.creadoEn = new Date().toISOString();
  } else if (buscarFila_(hoja_('solicitudes'), c.codigo) < 0) {
    throw new Error('Constancia no encontrada: ' + c.codigo);
  }
  c.actualizadoEn = new Date().toISOString();
  return guardar_('solicitudes', c);
}

function guardarPlantilla_(p) {
  if (!p || !p.datos || !TIPOS[p.datos.tipo]) throw new Error('Plantilla inválida.');
  if (!p.codigo) {
    p.codigo = generarCodigo_('plantillas', 'PL');
    p.creadoEn = new Date().toISOString();
  }
  return guardar_('plantillas', p);
}

function leerPlantilla_(codigo) {
  var p = leer_('plantillas', codigo);
  if (!p) throw new Error('Esta constancia ya no está disponible. Pide el enlace nuevo a la coordinación.');
  return p;
}

function listarPlantillasActivas_() {
  return listar_('plantillas').filter(plantillaVigente_);
}

function respuesta_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var cuerpo = JSON.parse(e.postData.contents);
    var datos = cuerpo.datos || {};
    var clave = cuerpo.clave;
    var r;

    switch (cuerpo.accion) {
      case 'crearSolicitud': r = crearSolicitud_(datos); break;
      case 'listarPlantillasActivas': r = listarPlantillasActivas_(); break;
      case 'leerPlantilla': r = leerPlantilla_(datos.codigo); break;

      case 'verificarClave': exigirClave_(clave); r = true; break;
      case 'listarSolicitudes': exigirClave_(clave); r = listar_('solicitudes'); break;
      case 'guardarSolicitud': exigirClave_(clave); r = guardarSolicitud_(datos); break;
      case 'eliminarSolicitud': exigirClave_(clave); r = eliminar_('solicitudes', datos.codigo); break;
      case 'listarPlantillas': exigirClave_(clave); r = listar_('plantillas'); break;
      case 'guardarPlantilla': exigirClave_(clave); r = guardarPlantilla_(datos); break;
      case 'eliminarPlantilla': exigirClave_(clave); r = eliminar_('plantillas', datos.codigo); break;

      default: return respuesta_({ ok: false, error: 'Acción desconocida: ' + cuerpo.accion });
    }
    return respuesta_({ ok: true, resultado: r });
  } catch (err) {
    return respuesta_({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

// Abrir la URL en el navegador confirma que el despliegue responde.
function doGet() {
  return respuesta_({ ok: true, resultado: 'Servicio de constancias activo' });
}
