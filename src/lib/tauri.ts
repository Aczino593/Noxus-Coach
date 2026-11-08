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

export async function minimize(): Promise<void> {
  if (inTauri) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('minimize_window');
      return;
    } catch {
      try {
        await (await win()).minimize();
      } catch (err) {
        console.error('Error al minimizar ventana:', err);
      }
    }
  }
}

export async function toggleMaximize(): Promise<void> {
  if (inTauri) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('toggle_maximize_window');
      return;
    } catch {
      try {
        await (await win()).toggleMaximize();
        return;
      } catch (err) {
        console.error('Error al alternar maximizado:', err);
      }
    }
  } else if (document.fullscreenElement) {
    await document.exitFullscreen();
  } else {
    await document.documentElement.requestFullscreen().catch(() => undefined);
  }
}

export async function closeWindow(): Promise<void> {
  if (inTauri) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('close_window');
      return;
    } catch {
      try {
        await (await win()).close();
      } catch (err) {
        console.error('Error al cerrar ventana:', err);
      }
    }
  }
}

export async function isMaximized(): Promise<boolean> {
  if (inTauri) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<boolean>('is_window_maximized');
    } catch {
      try {
        return await (await win()).isMaximized();
      } catch {
        // fallback
      }
    }
  }
  return !!document.fullscreenElement;
}

export async function setOverlayAlwaysOnTop(active: boolean): Promise<void> {
  if (inTauri) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('set_overlay_mode', { active });
    } catch {
      try {
        await (await win()).setAlwaysOnTop(active);
      } catch {
        // ignore
      }
    }
  }
}

/** Notifica cambios de maximizado (para alternar el icono). Devuelve la función de baja. */
export async function onMaximizeChange(cb: (max: boolean) => void): Promise<() => void> {
  if (inTauri) {
    try {
      const w = await win();
      return w.onResized(async () => cb(await isMaximized()));
    } catch {
      // fallback
    }
  }
  const h = () => cb(!!document.fullscreenElement);
  document.addEventListener('fullscreenchange', h);
  return () => document.removeEventListener('fullscreenchange', h);
}
