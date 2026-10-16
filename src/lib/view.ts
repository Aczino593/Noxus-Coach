/**
 * Mini-framework de vistas: estado local + render por string + delegación de eventos.
 *
 *  - Un único listener por tipo de evento por vista (click / input / change).
 *  - `set()` hace comparación superficial y agrupa renders en un frame (rAF):
 *    si el parche no cambia nada, NO hay re-render.
 *  - Conserva foco/selección de inputs con `id` y el scroll de contenedores
 *    marcados con `data-keep-scroll="clave"`.
 */
export interface ActionCtx<S extends object> {
  state: S;
  el: HTMLElement;
  data: DOMStringMap;
  event: Event;
  view: View<S>;
}
export type InputCtx<S extends object> = ActionCtx<S> & { value: string; checked: boolean };
export type Patch<S> = Partial<S> | void;

export interface ViewDef<S extends object> {
  root: HTMLElement;
  state: S;
  render: (s: S) => string;
  /** `data-action="nombre"` → click */
  actions?: Record<string, (c: ActionCtx<S>) => Patch<S> | Promise<Patch<S>>>;
  /** `data-input="nombre"` → evento input */
  inputs?: Record<string, (c: InputCtx<S>) => Patch<S>>;
  /** `data-change="nombre"` → evento change (selects, checkboxes) */
  changes?: Record<string, (c: InputCtx<S>) => Patch<S>>;
  afterRender?: (view: View<S>) => void;
}

export interface View<S extends object> {
  root: HTMLElement;
  readonly state: S;
  set(patch: Partial<S>): void;
  refresh(): void;
}

export function createView<S extends object>(def: ViewDef<S>): View<S> {
  const { root, render } = def;
  let state = def.state;
  let queued = false;

  const view: View<S> = {
    root,
    get state() {
      return state;
    },
    set(patch) {
      let changed = false;
      for (const k of Object.keys(patch) as (keyof S)[]) {
        if (!Object.is(state[k], patch[k])) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
      state = { ...state, ...patch };
      schedule();
    },
    refresh: schedule,
  };

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      paint();
    });
  }

  function paint() {
    const active = document.activeElement as HTMLInputElement | null;
    const focusId = active && root.contains(active) ? active.id : '';
    const selStart = focusId ? active?.selectionStart ?? null : null;
    const selEnd = focusId ? active?.selectionEnd ?? null : null;

    const scrolls = new Map<string, number>();
    root.querySelectorAll<HTMLElement>('[data-keep-scroll]').forEach((n) => {
      scrolls.set(n.dataset.keepScroll!, n.scrollTop);
    });

    root.innerHTML = render(state);

    scrolls.forEach((top, key) => {
      const n = root.querySelector<HTMLElement>(`[data-keep-scroll="${key}"]`);
      if (n) n.scrollTop = top;
    });
    if (focusId) {
      const next = document.getElementById(focusId) as HTMLInputElement | null;
      if (next && root.contains(next)) {
        next.focus({ preventScroll: true });
        try {
          if (selStart !== null && selEnd !== null) next.setSelectionRange(selStart, selEnd);
        } catch {
          /* inputs sin selección (select, checkbox) */
        }
      }
    } else {
      root.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
    }
    def.afterRender?.(view);
  }

  const apply = (r: Patch<S> | Promise<Patch<S>>) => {
    if (r instanceof Promise) void r.then((p) => p && view.set(p));
    else if (r) view.set(r);
  };

  root.addEventListener('click', (event) => {
    const el = (event.target as Element | null)?.closest<HTMLElement>('[data-action]');
    if (!el || !root.contains(el) || (el as HTMLButtonElement).disabled) return;
    const handler = def.actions?.[el.dataset.action!];
    if (!handler) return;
    apply(handler({ state, el, data: el.dataset, event, view }));
  });

  root.addEventListener('input', (event) => {
    const el = (event.target as Element | null)?.closest<HTMLInputElement>('[data-input]');
    if (!el) return;
    const handler = def.inputs?.[el.dataset.input!];
    if (!handler) return;
    apply(handler({ state, el, data: el.dataset, event, view, value: el.value, checked: el.checked }));
  });

  root.addEventListener('change', (event) => {
    const el = (event.target as Element | null)?.closest<HTMLInputElement>('[data-change]');
    if (!el) return;
    const handler = def.changes?.[el.dataset.change!];
    if (!handler) return;
    apply(handler({ state, el, data: el.dataset, event, view, value: el.value, checked: el.checked }));
  });

  root.addEventListener('submit', (event) => {
    event.preventDefault();
    const el = (event.target as Element | null)?.closest<HTMLElement>('[data-submit]');
    if (!el) return;
    const handler = def.actions?.[el.dataset.submit!];
    if (!handler) return;
    apply(handler({ state, el, data: el.dataset, event, view }));
  });

  paint();
  return view;
}
