import { useEffect, useRef, useState, type ReactNode } from 'react';
import '@fontsource/carlito/latin-400-italic.css';
import '@fontsource/carlito/latin-700-italic.css';
import { NOTA_VALIDEZ, PIE_CONSTANCIA } from '../config';
import {
  construirContenido,
  esCompacta,
  rangoHoras,
  type DatosDocumento,
  type Parrafo,
} from '../lib/textoConstancia';
import type { Firmante } from '../types/constancia.types';

const BASE = import.meta.env.BASE_URL;
const ANCHO_HOJA_PX = 816; // 8.5in a 96 dpi

interface Props {
  datos: DatosDocumento;
  codigo: string;
  firmante: Firmante;
  fechaEmision: string;
}

function ParrafoDoc({ parrafo }: { parrafo: Parrafo }) {
  return (
    <p>
      {parrafo.map((s, i) => (s.negrita ? <strong key={i}>{s.texto}</strong> : s.texto))}
    </p>
  );
}

/**
 * Vista previa en pantalla, maquetada igual que el PDF (pdf/ConstanciaPdf.tsx).
 * Si cambias el diseño de uno, ajusta el otro.
 */
export function ConstanciaDocumento({ datos, codigo, firmante, fechaEmision }: Props) {
  const contenido = construirContenido(datos, firmante, fechaEmision);

  return (
    <article className={`constancia-hoja ${esCompacta(contenido) ? 'compacta' : ''}`}>
      <img className="constancia-franja" src={`${BASE}img/constancias/franja-degradado.png`} alt="" />
      <img
        className="constancia-logo"
        src={`${BASE}img/constancias/logo-el-sistema.png`}
        alt="El Sistema — Música para todos"
      />

      <div className="constancia-cuerpo">
        {contenido.destinatario.length > 0 && (
          <p className="constancia-destinatario">
            {contenido.destinatario.map((linea, i) => (
              <span key={i}>
                {linea}
                <br />
              </span>
            ))}
          </p>
        )}

        <h4 className="constancia-titulo">{contenido.titulo}</h4>

        {contenido.parrafos.map((p, i) => (
          <ParrafoDoc key={i} parrafo={p} />
        ))}

        {contenido.tabla && (
          <table
            className={`constancia-tabla ${contenido.tabla.length > 4 ? 'muy-compacta' : contenido.tabla.length > 2 ? 'compacta' : ''}`}
          >
            <thead>
              <tr>
                <th>Día</th>
                <th>Hora</th>
                <th>Actividad</th>
              </tr>
            </thead>
            <tbody>
              {contenido.tabla.map((fila, i) => (
                <tr key={i}>
                  <td>{fila.dia}</td>
                  <td>{rangoHoras(fila.horaInicio, fila.horaFin)}</td>
                  <td>{fila.actividad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="constancia-finales">
          {contenido.parrafosFinales.map((p, i) => (
            <ParrafoDoc key={i} parrafo={p} />
          ))}
          <p className="constancia-despedida">{contenido.despedida}</p>
        </div>

        <div className="constancia-firma">
          <div className="constancia-firma-linea" />
          <p>
            {[firmante.nombre, firmante.cargoFirma].filter(Boolean).map((linea, i) => (
              <span key={i}>
                {linea}
                <br />
              </span>
            ))}
          </p>
        </div>
      </div>

      <p className="constancia-validez">{NOTA_VALIDEZ}</p>
      <footer className="constancia-pie">
        {PIE_CONSTANCIA.map((linea, i) => (
          <span key={i}>
            {linea}
            <br />
          </span>
        ))}
      </footer>
      <p className="constancia-codigo">Código: {codigo}</p>
    </article>
  );
}

/** Reduce la hoja para que quepa en pantallas angostas. */
export function HojaEscalada({ children }: { children: ReactNode }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);

  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    const medir = () => setEscala(Math.min(1, el.clientWidth / ANCHO_HOJA_PX));
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  return (
    <div ref={contenedor} className="hoja-escalada">
      <div className="hoja-escalada-contenido" style={{ zoom: escala }}>
        {children}
      </div>
    </div>
  );
}
