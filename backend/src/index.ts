import cors from 'cors';
import express, { Express } from 'express';
import routes from './routes';

const app = express();
const ES_PRODUCCION = process.env.NODE_ENV === 'production';
const PUERTO_PREFERIDO = Number(process.env.PORT) || 3001;
const PUERTO_ALTERNATIVO = 8080;

const origenesPermitidos = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origenesPermitidos.includes(origin) || !ES_PRODUCCION) {
        callback(null, true);
      } else {
        callback(new Error('Origen no permitido por CORS'));
      }
    },
  })
);
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    db: 'postgresql',
    entorno: process.env.NODE_ENV ?? 'development',
  });
});

app.use('/api', routes);

function escuchar(appInstance: Express, puerto: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const servidor = appInstance.listen(puerto);

    servidor.once('listening', () => resolve(puerto));

    servidor.once('error', (err: NodeJS.ErrnoException) => {
      servidor.close();
      reject(err);
    });
  });
}

async function iniciarServidor() {
  try {
    const puerto = await escuchar(app, PUERTO_PREFERIDO);
    console.log(`API corriendo en puerto ${puerto}`);
  } catch (err) {
    const error = err as NodeJS.ErrnoException;

    if (
      !ES_PRODUCCION &&
      error.code === 'EADDRINUSE' &&
      PUERTO_PREFERIDO !== PUERTO_ALTERNATIVO
    ) {
      console.warn(
        `Puerto ${PUERTO_PREFERIDO} ocupado. Intentando puerto ${PUERTO_ALTERNATIVO}...`
      );
      const puerto = await escuchar(app, PUERTO_ALTERNATIVO);
      console.log(`API corriendo en puerto ${puerto}`);
      return;
    }

    console.error('No se pudo iniciar el servidor:', error.message);
    process.exit(1);
  }
}

iniciarServidor();
