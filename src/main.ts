import './styles.css';
import { installImageFallback } from './lib/ui';
import { initAssets } from './lib/assets';
import { mountNavbar, type NavId } from './components/Navbar';
import { mountProfileView } from './components/ProfileView';
import { mountToolsView } from './components/ToolsView';
import { mountClashDraftBoard } from './components/ClashDraftBoard';

// Inicializar detector de fallos en imágenes de Data Dragon
installImageFallback();

// Consultar la versión más reciente de Data Dragon en segundo plano
void initAssets();

// Contenedores del DOM
const titlebarEl = document.getElementById('titlebar');
const profileEl = document.getElementById('page-profile');
const toolsEl = document.getElementById('page-tools');
const clashEl = document.getElementById('page-clash');

if (!titlebarEl || !profileEl || !toolsEl || !clashEl) {
  throw new Error('No se encontraron los contenedores elementales en el DOM.');
}

const pages: Record<NavId, HTMLElement> = {
  profile: profileEl,
  tools: toolsEl,
  clash: clashEl,
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

// Montar la barra superior (custom titlebar con drag region y controles nativos Tauri)
mountNavbar(titlebarEl, (navId) => {
  showPage(navId);
});

// Montar vistas modulares
mountProfileView(profileEl);
mountToolsView(toolsEl);
mountClashDraftBoard(clashEl);

// Mostrar página inicial
showPage('profile');

// Evitar menú contextual predeterminado del navegador para emular aplicación de escritorio
window.addEventListener('contextmenu', (e) => {
  // Permitir menú contextual nativo únicamente en campos de texto editables
  const target = e.target as HTMLElement | null;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
    return;
  }
  e.preventDefault();
});
