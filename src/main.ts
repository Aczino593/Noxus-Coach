import './styles.css';
import { installImageFallback } from './lib/ui';
import { initAssets } from './lib/assets';
import { mountNavbar, type NavId } from './components/Navbar';
import { mountProfileView } from './components/ProfileView';
import { mountToolsView } from './components/ToolsView';
import { mountLiveOverlayView } from './components/LiveOverlayView';

// Inicializar detector de fallos en imágenes de Data Dragon
installImageFallback();

// Consultar la versión más reciente de Data Dragon en segundo plano
void initAssets();

// Contenedores del DOM
const titlebarEl = document.getElementById('titlebar');
const profileEl = document.getElementById('page-profile');
const toolsEl = document.getElementById('page-tools');
const overlayRootEl = document.getElementById('ingame-overlay-root');

if (!titlebarEl || !profileEl || !toolsEl || !overlayRootEl) {
  throw new Error('No se encontraron los contenedores elementales en el DOM.');
}

const pages: Record<NavId, HTMLElement> = {
  profile: profileEl,
  tools: toolsEl,
};

function showPage(id: NavId) {
  for (const [key, el] of Object.entries(pages) as [NavId, HTMLElement][]) {
    if (key === id) {
      el.removeAttribute('hidden');
    } else {
      el.setAttribute('hidden', '');
    }
  }
}

// Montar Overlay In-Game Flotante (estilo iTero / Mobalytics)
let navbarCtrl: ReturnType<typeof mountNavbar> | null = null;
const overlayCtrl = mountLiveOverlayView(overlayRootEl, (open) => {
  navbarCtrl?.setOverlayOpen(open);
});

// Montar la barra superior con acceso directo al Overlay In-Game
navbarCtrl = mountNavbar(
  titlebarEl,
  (navId) => {
    showPage(navId);
  },
  () => {
    overlayCtrl.toggle();
  },
);

// Atajo global Alt+O para abrir/cerrar el Mini-HUD Overlay In-Game en cualquier momento
window.addEventListener('keydown', (e) => {
  if (e.altKey && (e.key === 'o' || e.key === 'O')) {
    e.preventDefault();
    overlayCtrl.toggle();
  }
});

// Montar vistas modulares principales
mountProfileView(profileEl);
mountToolsView(toolsEl);

// Mostrar página inicial
showPage('profile');

// Evitar menú contextual predeterminado del navegador para emular aplicación de escritorio
window.addEventListener('contextmenu', (e) => {
  const target = e.target as HTMLElement | null;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
    return;
  }
  e.preventDefault();
});
