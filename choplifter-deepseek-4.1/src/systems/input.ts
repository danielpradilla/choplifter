export type Action = 'left' | 'right' | 'up' | 'down' | 'fire' | 'rotate';

const KEY_MAP: Record<string, Action> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  Space: 'fire',
  KeyJ: 'fire',
  ShiftLeft: 'rotate',
  ShiftRight: 'rotate',
  KeyK: 'rotate',
};

class InputManager {
  private state: Record<Action, boolean> = {
    left: false,
    right: false,
    up: false,
    down: false,
    fire: false,
    rotate: false,
  };

  private fireQueued = false;
  private rotateQueued = false;

  private keyboardAttached = false;
  private touchAttached = false;

  attachKeyboard(): void {
    if (this.keyboardAttached) return;
    this.keyboardAttached = true;

    window.addEventListener('keydown', (e) => {
      const action = KEY_MAP[e.code];
      if (!action) return;
      if (e.repeat) {
        e.preventDefault();
        return;
      }
      this.state[action] = true;
      if (action === 'fire') this.fireQueued = true;
      if (action === 'rotate') this.rotateQueued = true;
      e.preventDefault();
    });

    window.addEventListener('keyup', (e) => {
      const action = KEY_MAP[e.code];
      if (!action) return;
      this.state[action] = false;
      e.preventDefault();
    });

    window.addEventListener('blur', () => this.clear());
  }

  attachTouch(): void {
    const coarse =
      typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!coarse && !hasTouch) return;
    document.body.classList.add('touch');

    const root = document.getElementById('touch');
    if (!root || this.touchAttached) return;
    this.touchAttached = true;

    const set = (action: Action, on: boolean) => {
      this.state[action] = on;
      if (on && action === 'fire') this.fireQueued = true;
      if (on && action === 'rotate') this.rotateQueued = true;
    };

    root.querySelectorAll<HTMLButtonElement>('button[data-act]').forEach((btn) => {
      const action = btn.dataset.act as Action;
      const press = (e: PointerEvent) => {
        e.preventDefault();
        btn.classList.add('active');
        set(action, true);
      };
      const release = (e: PointerEvent) => {
        e.preventDefault();
        btn.classList.remove('active');
        set(action, false);
      };
      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  }

  isDown(action: Action): boolean {
    return this.state[action];
  }

  consumeFire(): boolean {
    const value = this.fireQueued;
    this.fireQueued = false;
    return value;
  }

  consumeRotate(): boolean {
    const value = this.rotateQueued;
    this.rotateQueued = false;
    return value;
  }

  clear(): void {
    (Object.keys(this.state) as Action[]).forEach((key) => {
      this.state[key] = false;
    });
    this.fireQueued = false;
    this.rotateQueued = false;
  }
}

export const input = new InputManager();
