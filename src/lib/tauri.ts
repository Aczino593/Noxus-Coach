/** Puente con la ventana nativa de Tauri v2, con fallback para `vite dev` en navegador. */
const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

type Win = Awaited<ReturnType<typeof getWin>>;
let winPromise: Promise<Win> | null = null;

async function getWin() {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  return getCurrentWindow();
}
const win = () => (winPromise ??= getWin());

export const isTauri = () => inTauri;

export async function minimize() {
  if (inTauri) await (await win()).minimize();
}

export async function toggleMaximize() {
  if (inTauri) {
    await (await win()).toggleMaximize();
  } else if (document.fullscreenElement) {
    await document.exitFullscreen();
  } else {
    await document.documentElement.requestFullscreen().catch(() => undefined);
  }
}

export async function closeWindow() {
  if (inTauri) await (await win()).close();
}

export async function isMaximized(): Promise<boolean> {
  if (inTauri) return (await win()).isMaximized();
  return !!document.fullscreenElement;
}

/** Notifica cambios de maximizado (para alternar el icono). Devuelve la función de baja. */
export async function onMaximizeChange(cb: (max: boolean) => void): Promise<() => void> {
  if (inTauri) {
    const w = await win();
    return w.onResized(async () => cb(await w.isMaximized()));
  }
  const h = () => cb(!!document.fullscreenElement);
  document.addEventListener('fullscreenchange', h);
  return () => document.removeEventListener('fullscreenchange', h);
}
