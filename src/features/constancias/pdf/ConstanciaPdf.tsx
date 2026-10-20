import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import {
  construirContenido,
  esCompacta,
  rangoHoras,
  type DatosDocumento,
  type Parrafo,
} from '../lib/textoConstancia';
import type { Firmante } from '../types/constancia.types';

// react-pdf separa palabras con reglas del inglés; en español deja cada palabra entera.
Font.registerHyphenationCallback((palabra) => [palabra]);

export interface RecursosPdf {
  logo: string;
  franja: string;
}

export interface PropsConstanciaPdf {
  datos: DatosDocumento;
  codigo: string;
  firmante: Firmante;
  fechaEmision: string;
  recursos: RecursosPdf;
}

// Medidas en puntos (72 por pulgada), calcadas de la constancia en papel.
const s = StyleSheet.create({
  pagina: {
    paddingTop: 9,
    paddingRight: 68,
    paddingBottom: 22,
    paddingLeft: 83,
    fontFamily: 'Times-Roman',
    fontSize: 12,
    lineHeight: 1.38,
  },
  franja: { position: 'absolute', top: 0, left: 0, width: 42, height: 792 },
  logo: { width: 56, alignSelf: 'center', position: 'relative', left: 7, marginBottom: 6 },
  fecha: { textAlign: 'right', marginBottom: 7 },
  destinatario: { marginBottom: 22 },
  parrafo: { textAlign: 'justify', textIndent: 36 },
  negrita: { fontFamily: 'Times-Bold' },
  tabla: { marginTop: 16, marginLeft: 61, borderTop: '1 solid #bfbfbf', borderLeft: '1 solid #bfbfbf' },
  fila: { flexDirection: 'row' },
  celda: {
    paddingVertical: 11,
    paddingHorizontal: 6,
    borderRight: '1 solid #bfbfbf',
    borderBottom: '1 solid #bfbfbf',
    textAlign: 'center',
    justifyContent: 'center',
  },
  celdaDia: { width: '17%' },
  celdaHora: { width: '30%' },
  celdaActividad: { width: '53%' },
  encabezado: { backgroundColor: '#f2f2f2', fontFamily: 'Times-Bold' },
  finales: { marginTop: 18 },
  despedida: { marginTop: 14 },
  firma: { width: 216, alignSelf: 'center', position: 'relative', left: 25, marginTop: 52 },
  firmaLinea: { borderTop: '1 solid #000' },
  firmaTexto: { marginTop: 3 },
  firmaLineaTexto: { textAlign: 'center', fontFamily: 'Times-BoldItalic', fontSize: 12, lineHeight: 1.2 },
  codigo: { position: 'absolute', right: 43, bottom: 22, fontFamily: 'Helvetica', fontSize: 8, color: '#6b7280' },
});

function ParrafoPdf({ parrafo }: { parrafo: Parrafo }) {
  return (
    <Text style={s.parrafo}>
      {parrafo.map((seg, i) =>
        seg.negrita ? (
          <Text key={i} style={s.negrita}>
            {seg.texto}
          </Text>
        ) : (
          seg.texto
        )
      )}
    </Text>
  );
}

/** Documento PDF (carta). La firma y el sello van a mano sobre la línea. */
export function ConstanciaPdf({ datos, codigo, firmante, fechaEmision, recursos }: PropsConstanciaPdf) {
  const contenido = construirContenido(datos, firmante, fechaEmision);
  // Contenido largo: tabla y espacio de firma más justos para que todo quepa en una hoja.
  const filas = contenido.tabla?.length ?? 0;
  const compacta = esCompacta(contenido);
  const celda = [s.celda, { paddingVertical: filas > 4 ? 3 : filas > 2 ? 5 : 11 }];

  return (
    <Document title={`Constancia ${codigo}`} author={firmante.nombre} language="es">
      <Page size="LETTER" style={s.pagina}>
        <Image src={recursos.franja} style={s.franja} fixed />
        <Image src={recursos.logo} style={s.logo} />

        <Text style={s.fecha}>{contenido.lugarYFecha}</Text>
        <Text style={s.destinatario}>{contenido.destinatario.join('\n')}</Text>

        {contenido.parrafos.map((p, i) => (
          <ParrafoPdf key={i} parrafo={p} />
        ))}

        {contenido.tabla && (
          <View style={s.tabla} wrap={false}>
            <View style={s.fila}>
              <Text style={[...celda, s.celdaDia, s.encabezado]}>Día</Text>
              <Text style={[...celda, s.celdaHora, s.encabezado]}>Hora</Text>
              <Text style={[...celda, s.celdaActividad, s.encabezado]}>Actividad</Text>
            </View>
            {contenido.tabla.map((fila, i) => (
              <View key={i} style={s.fila}>
                <Text style={[...celda, s.celdaDia]}>{fila.dia}</Text>
                <Text style={[...celda, s.celdaHora]}>{rangoHoras(fila.horaInicio, fila.horaFin)}</Text>
                <Text style={[...celda, s.celdaActividad]}>{fila.actividad}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.finales}>
          {contenido.parrafosFinales.map((p, i) => (
            <ParrafoPdf key={i} parrafo={p} />
          ))}
        </View>

        {/* Despedida y firma nunca se separan: si no caben, pasan juntas a la otra hoja. */}
        <View wrap={false}>
          <Text style={[s.parrafo, s.despedida, compacta ? { marginTop: 10 } : {}]}>{contenido.despedida}</Text>
          <View style={[s.firma, compacta ? { marginTop: 36 } : {}]}>
            <View style={s.firmaLinea} />
            {/* Una línea por <Text>: con "\n" react-pdf deja un interlineado mucho mayor. */}
            <View style={s.firmaTexto}>
              {[firmante.nombre, firmante.cargoFirma, firmante.telefono].filter(Boolean).map((linea, i) => (
                <Text key={i} style={s.firmaLineaTexto}>
                  {linea}
                </Text>
              ))}
            </View>
          </View>
        </View>

        <Text style={s.codigo} fixed>
          Código: {codigo}
        </Text>
      </Page>
    </Document>
  );
}
