import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { NOTA_VALIDEZ, PIE_CONSTANCIA } from '../config';
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
  /** Carlito: mismas medidas que Calibri, la letra del formato del núcleo. */
  fuenteCursiva: string;
  fuenteNegritaCursiva: string;
}

/** Registra la letra del cuerpo; se llama antes de generar el PDF. */
export function registrarFuentes(r: Pick<RecursosPdf, 'fuenteCursiva' | 'fuenteNegritaCursiva'>): void {
  Font.register({
    family: 'Carlito',
    fonts: [
      { src: r.fuenteCursiva, fontStyle: 'italic' },
      { src: r.fuenteNegritaCursiva, fontStyle: 'italic', fontWeight: 'bold' },
    ],
  });
}

export interface PropsConstanciaPdf {
  datos: DatosDocumento;
  codigo: string;
  firmante: Firmante;
  fechaEmision: string;
  recursos: RecursosPdf;
}

const AZUL = '#1f3a5f';
const BORDE = '#9fb3c3';

// Medidas en puntos (72 por pulgada), tomadas del formato en Word del núcleo.
const s = StyleSheet.create({
  pagina: {
    paddingTop: 90,
    paddingRight: 84,
    paddingBottom: 82,
    paddingLeft: 86,
    fontFamily: 'Carlito',
    fontStyle: 'italic',
    fontSize: 12,
    lineHeight: 1.32,
  },
  franja: { position: 'absolute', top: 0, left: 0, width: 56, height: 792 },
  logo: { position: 'absolute', top: 16, left: 235, width: 142, height: 56 },
  destinatario: { marginBottom: 10 },
  titulo: {
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    textDecoration: 'underline',
  },
  parrafo: { marginBottom: 5, textAlign: 'justify', textIndent: 35 },
  negrita: { fontWeight: 'bold' },
  tabla: { marginTop: 4, marginBottom: 10, marginLeft: 35, borderTop: `1 solid ${BORDE}`, borderLeft: `1 solid ${BORDE}` },
  fila: { flexDirection: 'row' },
  celda: {
    paddingHorizontal: 6,
    borderRight: `1 solid ${BORDE}`,
    borderBottom: `1 solid ${BORDE}`,
    textAlign: 'center',
    justifyContent: 'center',
  },
  celdaDia: { width: '20%' },
  celdaHora: { width: '30%' },
  celdaActividad: { width: '50%' },
  encabezado: { backgroundColor: '#e6f2f1', fontWeight: 'bold', color: AZUL },
  despedida: { marginTop: 4, textIndent: 35 },
  firma: { width: 200, alignSelf: 'center', marginTop: 40 },
  firmaLinea: { borderTop: '1 solid #000' },
  firmaTexto: { marginTop: 3 },
  // lineHeight sin unidad se calcula con el fontSize del mismo estilo (18 por defecto): van juntos.
  firmaLineaTexto: { textAlign: 'center', fontWeight: 'bold', fontSize: 12, lineHeight: 1.2 },
  // Nota de validez: esquina inferior izquierda, a la altura del código (esquina derecha).
  validez: { position: 'absolute', left: 70, bottom: 14, fontSize: 7.5, lineHeight: 1.2, color: '#4a5568' },
  pie: { position: 'absolute', left: 56, right: 0, bottom: 34, textAlign: 'center' },
  pieLinea: { fontFamily: 'Times-Roman', fontStyle: 'normal', fontSize: 10, lineHeight: 1.25 },
  codigo: {
    position: 'absolute',
    right: 30,
    bottom: 14,
    fontFamily: 'Helvetica',
    fontStyle: 'normal',
    fontSize: 7,
    lineHeight: 1.2,
    color: '#8a94a6',
  },
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

/** Documento PDF (carta) con el formato del núcleo. La firma y el sello van a mano. */
export function ConstanciaPdf({ datos, codigo, firmante, fechaEmision, recursos }: PropsConstanciaPdf) {
  const contenido = construirContenido(datos, firmante, fechaEmision);
  // Contenido largo: tabla y espacio de firma más justos para que todo quepa en una hoja.
  const filas = contenido.tabla?.length ?? 0;
  const compacta = esCompacta(contenido);
  const celda = [s.celda, { paddingVertical: filas > 4 ? 2 : filas > 2 ? 3 : 5 }];

  return (
    <Document title={`Constancia ${codigo}`} author={firmante.nombre} language="es">
      <Page size="LETTER" style={s.pagina}>
        <Image src={recursos.franja} style={s.franja} fixed />
        <Image src={recursos.logo} style={s.logo} />

        {contenido.destinatario.length > 0 && (
          <Text style={s.destinatario}>{contenido.destinatario.join('\n')}</Text>
        )}
        <Text style={s.titulo}>{contenido.titulo}</Text>

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

        {contenido.parrafosFinales.map((p, i) => (
          <ParrafoPdf key={i} parrafo={p} />
        ))}

        {/* «Atentamente» y firma nunca se separan: si no caben, pasan juntas a la otra hoja. */}
        <View wrap={false}>
          <Text style={s.despedida}>{contenido.despedida}</Text>
          <View style={[s.firma, compacta ? { marginTop: 20 } : {}]}>
            <View style={s.firmaLinea} />
            {/* Una línea por <Text>: con "\n" react-pdf deja un interlineado mucho mayor. */}
            <View style={s.firmaTexto}>
              {[firmante.nombre, firmante.cargoFirma].filter(Boolean).map((linea, i) => (
                <Text key={i} style={s.firmaLineaTexto}>
                  {linea}
                </Text>
              ))}
            </View>
          </View>
        </View>

        <Text style={s.validez} fixed>
          {NOTA_VALIDEZ}
        </Text>
        <View style={s.pie} fixed>
          {PIE_CONSTANCIA.map((linea, i) => (
            <Text key={i} style={s.pieLinea}>
              {linea}
            </Text>
          ))}
        </View>
        <Text style={s.codigo} fixed>
          Código: {codigo}
        </Text>
      </Page>
    </Document>
  );
}
