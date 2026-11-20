import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import './estilos/sitio.css';
import { iniciarEnvioAutomatico } from './features/psb/lib/envioAutomatico';
import { getSesionProfesor } from './lib/profesorAuth';
import { PROGRAMA_PSB } from './lib/datosEstaticos';

const queryClient = new QueryClient();

// Clases del Programa Simón Bolívar guardadas sin internet: se envían solas.
if (getSesionProfesor()?.programas.includes(PROGRAMA_PSB)) iniciarEnvioAutomatico();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
