import { INFORME_PSB } from '../config';
import type { DatosInforme, FotoLocal } from '../tipos';
import { fechaYHora, semanaArchivo, tituloClase } from './fechas';
import { bytesDeDataUrl } from './fotos';

/**
 * Arma el «Informe descriptivo y memoria fotográfica de eventos» con el formato
 * del núcleo: carta, encabezado con los logos de El Sistema y del Programa Simón
 * Bolívar, tablas con títulos en rojo y la memoria fotográfica por día.
 * La librería se carga solo al generar (no pesa en el resto del sitio).
 */

const ANCHO_UTIL = 9404; // carta (12240) menos márgenes de 1418 (en twips)
const COL_ETIQUETA = 3400; // ≈ 36 %, como el formato original
const COL_VALOR = ANCHO_UTIL - COL_ETIQUETA;
const ROJO = 'C00000';
const CM = 96 / 2.54; // píxeles por centímetro (docx usa 96 ppp)

const mayus = (t: string) => t.trim().toLocaleUpperCase('es');

export function nombreArchivoInforme(escuela: string, lunes: string): string {
  return `REPORTE PSB ${mayus(escuela)} ${semanaArchivo(lunes)}.docx`;
}

async function bytesDe(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('No se pudo cargar el logo del informe.');
  return new Uint8Array(await res.arrayBuffer());
}

/** Medidas de cada foto: dos por fila, o una más grande si es la única del día. */
function medidas(foto: FotoLocal, sola: boolean) {
  const anchoMax = (sola ? 13 : 7.8) * CM;
  const altoMax = (sola ? 9.5 : 6.2) * CM;
  const escala = Math.min(anchoMax / foto.ancho, altoMax / foto.alto);
  return { width: Math.round(foto.ancho * escala), height: Math.round(foto.alto * escala) };
}

export async function generarInformeDocx(d: DatosInforme): Promise<Blob> {
  const docx = await import('docx');
  const {
    AlignmentType,
    BorderStyle,
    Document,
    Header,
    HeightRule,
    ImageRun,
    Packer,
    Paragraph,
    ShadingType,
    TabStopType,
    Table,
    TableCell,
    TableLayoutType,
    TableRow,
    TextRun,
    VerticalAlign,
    WidthType,
  } = docx;

  const [logoSistema, logoPSB] = await Promise.all([
    bytesDe('/img/psb/logo-el-sistema.png'),
    bytesDe('/img/psb/logo-psb.png'),
  ]);

  const texto = (t: string, extra: { bold?: boolean; color?: string } = {}) =>
    new TextRun({ text: t, font: 'Arial', size: 22, ...extra });
  const borde = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const bordes = { top: borde, bottom: borde, left: borde, right: borde };
  const parrafo = (hijos: InstanceType<typeof TextRun>[], extra: { centrado?: boolean; justificado?: boolean } = {}) =>
    new Paragraph({
      children: hijos,
      spacing: { before: 40, after: 40 },
      alignment: extra.centrado ? AlignmentType.CENTER : extra.justificado ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
    });

  const filaTitulo = (t: string) =>
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 2,
          width: { size: ANCHO_UTIL, type: WidthType.DXA },
          borders: bordes,
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: ROJO },
          verticalAlign: VerticalAlign.CENTER,
          children: [parrafo([texto(t, { bold: true, color: 'FFFFFF' })], { centrado: true })],
        }),
      ],
    });

  const fila = (etiqueta: string, valores: string[]) =>
    new TableRow({
      height: { value: 404, rule: HeightRule.ATLEAST },
      children: [
        new TableCell({
          width: { size: COL_ETIQUETA, type: WidthType.DXA },
          borders: bordes,
          verticalAlign: VerticalAlign.CENTER,
          children: [parrafo([texto(etiqueta, { bold: true })])],
        }),
        new TableCell({
          width: { size: COL_VALOR, type: WidthType.DXA },
          borders: bordes,
          verticalAlign: VerticalAlign.CENTER,
          children: valores.map((v) => parrafo([texto(mayus(v))])),
        }),
      ],
    });

  /** Tabla de una columna: título en rojo y contenido debajo. */
  const tablaSimple = (titulo: string, contenido: InstanceType<typeof Paragraph>[]) =>
    new Table({
      width: { size: ANCHO_UTIL, type: WidthType.DXA },
      columnWidths: [ANCHO_UTIL],
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: ANCHO_UTIL, type: WidthType.DXA },
              borders: bordes,
              shading: { type: ShadingType.CLEAR, color: 'auto', fill: ROJO },
              children: [parrafo([texto(titulo, { bold: true, color: 'FFFFFF' })], { centrado: true })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: ANCHO_UTIL, type: WidthType.DXA },
              borders: bordes,
              margins: { top: 120, bottom: 120, left: 140, right: 140 },
              children: contenido,
            }),
          ],
        }),
      ],
    });

  const dias = [...d.dias].sort((a, b) => a.fecha.localeCompare(b.fecha));

  const identificacion = new Table({
    width: { size: ANCHO_UTIL, type: WidthType.DXA },
    columnWidths: [COL_ETIQUETA, COL_VALOR],
    rows: [
      filaTitulo('DATOS DE IDENTIFICACIÓN DEL NÚCLEO Y MÓDULO:'),
      fila('NOMBRE DEL NÚCLEO - ESTADO:', [INFORME_PSB.nucleoEstado]),
      fila('DIRECTOR(A) DEL NÚCLEO:', [INFORME_PSB.director]),
      fila('NOMBRE DEL MÓDULO:', [d.escuela]),
      fila('PROFESOR (ES):', [d.instructores]),
      fila('TELÉFONOS DE CONTACTO (NÚCLEO):', [d.telefonos]),
      fila('CORREOS ELECTRÓNICOS (NÚCLEO):', [INFORME_PSB.correo]),
      filaTitulo('DATOS DE IDENTIFICACIÓN DEL EVENTO:'),
      fila('NOMBRE DEL EVENTO:', [d.evento]),
      fila('RESPONSABLE DEL EVENTO:', [d.responsable]),
      fila('LUGAR DEL EVENTO:', [d.escuela]),
      fila('FECHA Y HORA DEL EVENTO:', dias.map(fechaYHora)),
      fila('PROGRAMAS ACADÉMICOS PARTICIPANTES:', [INFORME_PSB.programa]),
      fila('AGRUPACIONES PARTICIPANTES:', [d.agrupaciones]),
      fila('NOMBRE Y APELLIDO DE EL/LOS INSTRUCTOR(ES) PARTICIPANTE(S):', [d.instructores]),
      fila('CANTIDAD DE ALUMNOS(AS) PARTICIPANTES:', [`${d.alumnos} ${d.alumnos === 1 ? 'ALUMNO' : 'ALUMNOS'}`]),
    ],
  });

  const propositos = tablaSimple(
    'PROPÓSITOS DEL EVENTO (DESCRIPCIÓN):',
    dias.flatMap((dia, i) => [
      ...(i > 0 ? [new Paragraph({ children: [] })] : []),
      parrafo([texto(`${tituloClase(dia.fecha)}: `, { bold: true }), texto(mayus(dia.descripcion))], { justificado: true }),
    ])
  );

  const titulo = (t: string) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 120 },
      children: [new TextRun({ text: t, font: 'Calibri', size: 24, bold: true })],
    });

  const memoria = tablaSimple(
    'MEMORIA FOTOGRÁFICA:',
    dias
      .filter((dia) => dia.fotos.length > 0)
      .flatMap((dia) => {
        const sola = dia.fotos.length === 1;
        const filas: InstanceType<typeof Paragraph>[] = [];
        for (let i = 0; i < dia.fotos.length; i += 2) {
          const par = dia.fotos.slice(i, i + 2);
          filas.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
              children: par.flatMap((foto, j) => [
                ...(j > 0 ? [new TextRun({ text: '   ' })] : []),
                new ImageRun({ type: 'jpg', data: bytesDeDataUrl(foto.dataUrl), transformation: medidas(foto, sola) }),
              ]),
            })
          );
        }
        return [titulo(tituloClase(dia.fecha)), ...filas];
      })
  );

  const encabezado = new Header({
    children: [
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: ANCHO_UTIL }],
        children: [
          new ImageRun({ type: 'png', data: logoSistema, transformation: { width: Math.round(4.53 * CM), height: Math.round(2.27 * CM) } }),
          new TextRun({ text: '\t' }),
          new ImageRun({ type: 'png', data: logoPSB, transformation: { width: Math.round(2.17 * CM), height: Math.round(2.73 * CM) } }),
        ],
      }),
    ],
  });

  const documento = new Document({
    creator: 'Núcleo Palmira I',
    title: `Informe PSB ${d.escuela}`,
    styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 851, right: 1418, bottom: 851, left: 1418, header: 567 },
          },
        },
        headers: { default: encabezado },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 240 },
            children: [texto('INFORME DESCRIPTIVO Y MEMORIA FOTOGRÁFICA DE EVENTOS:', { bold: true })],
          }),
          identificacion,
          new Paragraph({ children: [] }),
          propositos,
          new Paragraph({ children: [] }),
          memoria,
        ],
      },
    ],
  });

  return Packer.toBlob(documento);
}
