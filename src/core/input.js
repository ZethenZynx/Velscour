// Keyboard and mouse input for the PC edition.
import { G, saveSettings } from '../state.js';
import { camera } from './view.js';
import { clamp } from './util.js';

const GAME_KEYS = new Set(['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);

export const input = {
  keys: new Set(),
  pressed: new Set(),
  mouse: { x: 0, y: 0, left: false, right: false, leftPressed: false, rightPressed: false, inside: true },
  lastPointerType: 'mouse',
  enabled: true,

  down(code) { return this.keys.has(code); },
  consume(code) {
    if (this.pressed.has(code)) { this.pressed.delete(code); return true; }
    return false;
  },
  endFrame() {
    this.pressed.clear();
    this.mouse.leftPressed = false;
    this.mouse.rightPressed = false;
  },
  reset() {
    this.keys.clear(); this.pressed.clear();
    this.mouse.left = this.mouse.right = false;
  },
};

function isTyping(e) {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}

export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    if (isTyping(e)) return;
    if (GAME_KEYS.has(e.code) && G.mode === 'game') e.preventDefault();
    if (!e.repeat) input.pressed.add(e.code);
    input.keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => { input.keys.delete(e.code); });
  window.addEventListener('blur', () => input.reset());
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => { if (G.mode === 'game') e.preventDefault(); });

  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (G.cine) return;
    if (G.tapHook && G.tapHook(e.clientX, e.clientY, e)) { e.preventDefault(); return; }
    input.mouse.x = e.clientX; input.mouse.y = e.clientY;
    if (e.button === 0) { input.mouse.left = true; input.mouse.leftPressed = true; }
    if (e.button === 2) { input.mouse.right = true; input.mouse.rightPressed = true; }
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    input.mouse.x = e.clientX; input.mouse.y = e.clientY; input.mouse.inside = true;
  });
  const up = (e) => {
    if (e.pointerType !== 'mouse') return;
    if (e.button === 0) input.mouse.left = false;
    if (e.button === 2) input.mouse.right = false;
  };
  canvas.addEventListener('pointerup', up);
  window.addEventListener('pointerup', up);
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') input.mouse.inside = false; });

  let saveTimer = null;
  const debouncedSaveSettings = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saveTimer = null; saveSettings(); }, 300);
  };
  window.addEventListener('wheel', (e) => {
    if (G.mode !== 'game') return;
    const target = e.target;
    if (target && target.closest && target.closest('.panel, .dialog-box, .screen, select, textarea, input')) return;
    let el = target;
    while (el && el !== document.body && el !== document.documentElement && el !== canvas) {
      if (el.scrollHeight > el.clientHeight + 1) {
        const style = window.getComputedStyle(el);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') return;
      }
      el = el.parentElement;
    }
    e.preventDefault();
    const dy = clamp(e.deltaMode === 1 ? e.deltaY * 33 : (e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY), -300, 300);
    const factor = Math.exp(-dy * 0.001);
    const current = G.settings.zoom || 1;
    const next = clamp(Math.round(current * factor * 100) / 100, 0.7, 1.6);
    if (Math.abs(next - current) > 0.001) {
      G.settings.zoom = next;
      camera.computeZoom();
      debouncedSaveSettings();
    }
  }, { passive: false });
}
