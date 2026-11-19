import { Link } from 'react-router-dom';
import { CabeceraSitio } from '../components/CabeceraSitio';
import {
  CIFRAS,
  CITA,
  EQUIPO,
  FECHA_CIFRAS,
  HISTORIA,
  MODULOS_ESCOLARES,
  NUCLEO,
  PROGRAMAS,
  PROYECCION,
  SEDES,
} from '../features/inicio/contenido';

const telefonoEnlace = `tel:+58${NUCLEO.telefono.replace(/\D/g, '').slice(1)}`;

const ACCESOS = [
  {
    para: 'Representantes',
    titulo: 'Solicitar una constancia',
    texto: 'Horario, participación, conciertos y ensayos. La pides aquí y te avisamos por WhatsApp.',
    a: '/constancias',
    accion: 'Solicitar',
  },
  {
    para: 'Profesores',
    titulo: 'Reportes e informes',
    texto: 'Reporte mensual de ensayos de tu agrupación e informe semanal del Programa Simón Bolívar.',
    a: '/profesores',
    accion: 'Entrar',
  },
  {
    para: 'Coordinación',
    titulo: 'Panel de coordinación',
    texto: 'Revisión de constancias, plantillas y reportes. Se entra con la clave de coordinación.',
    a: '/admin',
    accion: 'Entrar',
  },
];

/** Página de inicio pública: quiénes somos y accesos para familias, profesores y coordinación. */
export function InicioPage() {
  return (
    <div className="inicio">
      <CabeceraSitio />

      <section className="inicio-portada">
        <div className="inicio-ancho inicio-portada-interior">
          <div className="inicio-portada-texto">
            <p className="inicio-etiqueta">{NUCLEO.sistema}</p>
            <h1>
              Núcleo
              <br />
              Palmira I
            </h1>
            <p className="inicio-lema">
              <span className="inicio-lema-linea" aria-hidden="true" />
              {NUCLEO.lema}
            </p>
            <p className="inicio-portada-desc">
              Desde 2001 formamos músicos, y sobre todo ciudadanos, en Palmira, municipio Guásimos.
            </p>
            <div className="inicio-portada-acciones">
              <Link to="/constancias" className="btn-inicio btn-inicio-amarillo">
                Solicitar una constancia
              </Link>
              <a href="#programas" className="btn-inicio btn-inicio-borde">
                Conoce los programas
              </a>
            </div>
          </div>
          <div className="inicio-logo-caja">
            <img src="/img/sitio/logo-nucleo-negro.png" alt="El Sistema · Núcleo Palmira I" width="340" height="465" />
          </div>
        </div>
        <div className="inicio-ancho">
          <dl className="inicio-datos">
            <div>
              <dt>Código</dt>
              <dd>{NUCLEO.codigo}</dd>
            </div>
            <div>
              <dt>Ubicación</dt>
              <dd>{NUCLEO.ubicacionCorta}</dd>
            </div>
            <div>
              <dt>Adscripción</dt>
              <dd>{NUCLEO.adscripcion}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="inicio-ancho inicio-accesos" aria-label="Accesos">
        {ACCESOS.map((a) => (
          <Link key={a.a} to={a.a} className="inicio-acceso">
            <span className="inicio-acceso-para">{a.para}</span>
            <span className="inicio-acceso-titulo">{a.titulo}</span>
            <span className="inicio-acceso-texto">{a.texto}</span>
            <span className="inicio-acceso-accion">{a.accion} →</span>
          </Link>
        ))}
      </section>

      <section className="inicio-banda inicio-banda-oscura" aria-labelledby="cifras">
        <div className="inicio-ancho">
          <p className="inicio-etiqueta">Informe estadístico · {FECHA_CIFRAS}</p>
          <h2 id="cifras">El núcleo en cifras</h2>
          <ul className="inicio-cifras">
            {CIFRAS.map((c) => (
              <li key={c.texto}>
                <strong>{c.valor}</strong>
                <span>{c.texto}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="programas" className="inicio-ancho inicio-seccion" aria-labelledby="titulo-programas">
        <p className="inicio-etiqueta">Qué se enseña</p>
        <h2 id="titulo-programas">Programas de formación</h2>
        <ul className="inicio-programas">
          {PROGRAMAS.map((p) => (
            <li key={p.nombre} style={{ borderTopColor: p.barra }}>
              <h3 style={{ color: p.color }}>{p.nombre}</h3>
              <p>{p.descripcion}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="inicio-banda inicio-banda-clara" aria-labelledby="titulo-escuela">
        <div className="inicio-ancho inicio-escuela">
          <div>
            <p className="inicio-etiqueta inicio-etiqueta-naranja">El Sistema va a la escuela</p>
            <h2 id="titulo-escuela">Programa Simón Bolívar</h2>
            <p className="inicio-parrafo">
              Formación musical dentro de las instituciones educativas del municipio Guásimos, sin que las familias tengan que
              trasladarse al núcleo.
            </p>
            <h3 className="inicio-subtitulo">Siete módulos escolares activos</h3>
            <ol className="inicio-modulos">
              {MODULOS_ESCOLARES.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ol>
          </div>
          <div className="inicio-escuela-cifra">
            <strong>596</strong>
            <span>niños y niñas incorporados a El Sistema a través del programa</span>
          </div>
        </div>
      </section>

      <section className="inicio-ancho inicio-seccion" aria-labelledby="titulo-historia">
        <p className="inicio-etiqueta">De dónde venimos</p>
        <h2 id="titulo-historia">Reseña histórica</h2>
        <ol className="inicio-historia">
          {HISTORIA.map((h) => (
            <li key={h.anio}>
              <strong>{h.anio}</strong>
              <p>{h.texto}</p>
            </li>
          ))}
        </ol>
        <div className="inicio-proyeccion">
          <h3>Proyección internacional</h3>
          <p>{PROYECCION}</p>
        </div>
      </section>

      <section className="inicio-banda inicio-banda-verde" aria-labelledby="titulo-equipo">
        <div className="inicio-ancho">
          <p className="inicio-etiqueta">Quiénes lo sostienen</p>
          <h2 id="titulo-equipo">Nuestro equipo</h2>
          <ul className="inicio-equipo">
            {EQUIPO.map((e) => (
              <li key={e.titulo}>
                <h3>{e.titulo}</h3>
                <p>{e.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="inicio-ancho inicio-seccion" aria-labelledby="titulo-ubicacion">
        <p className="inicio-etiqueta">Dónde estamos</p>
        <h2 id="titulo-ubicacion">Ubicación y contacto</h2>
        <div className="inicio-ubicacion">
          {SEDES.map((s) => (
            <div key={s.titulo} className="inicio-sede">
              <h3>{s.titulo}</h3>
              <p>{s.direccion}</p>
            </div>
          ))}
          <div className="inicio-sede inicio-contacto">
            <h3>Contacto</h3>
            <p>
              Teléfono: <a href={telefonoEnlace}>{NUCLEO.telefono}</a>
              <br />
              Correo: <a href={`mailto:${NUCLEO.correo}`}>{NUCLEO.correo}</a>
            </p>
          </div>
        </div>
        <a className="btn-inicio btn-inicio-verde" href={NUCLEO.mapa} target="_blank" rel="noreferrer">
          Ver en Google Maps
        </a>
      </section>

      <section className="inicio-banda inicio-banda-oscura inicio-cita" aria-label="Pensamiento del Maestro">
        <figure className="inicio-ancho">
          <blockquote>«{CITA.texto}»</blockquote>
          <figcaption>{CITA.autor}</figcaption>
        </figure>
      </section>

      <footer className="inicio-pie">
        <div className="inicio-ancho inicio-pie-interior">
          <img src="/img/sitio/logo-nucleo-blanco.png" alt="El Sistema · Núcleo Palmira I" width="96" height="131" />
          <div>
            <p className="inicio-pie-nombre">{NUCLEO.nombre}</p>
            <p>{NUCLEO.adscripcion}</p>
            <p>Código {NUCLEO.codigo}</p>
          </div>
          <nav aria-label="Accesos" className="inicio-pie-enlaces">
            <Link to="/constancias">Solicitar constancia</Link>
            <Link to="/profesores">Profesores</Link>
            <Link to="/admin">Coordinación</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
