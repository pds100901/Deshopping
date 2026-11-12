import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Lab } from './Lab';
import { Presentacion } from './presentacion/Presentacion';

const raiz = document.getElementById('root');
if (!raiz) throw new Error('No se encontró el elemento #root');

// La oficina de De Shopping con Pau es la página principal; `?lab` abre el laboratorio (FPS, vestidor).
const lab = new URLSearchParams(window.location.search).has('lab');

createRoot(raiz).render(<StrictMode>{lab ? <Lab /> : <Presentacion />}</StrictMode>);
