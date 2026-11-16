// Keyboard and mouse input for the PC edition.
import { G, saveSettings } from '../state.js';
import { camera } from './view.js';
import { clamp } from './util.js';

const GAME_KEYS = new Set(['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);

export const KEY_BINDING_ACTIONS = [
  { id: 'moveUp', label: 'Move up', section: 'Movement', defaultKey: 'KeyW', aliases: ['KeyW', 'ArrowUp'] },
  { id: 'moveDown', label: 'Move down', section: 'Movement', defaultKey: 'KeyS', aliases: ['KeyS', 'ArrowDown'] },
  { id: 'moveLeft', label: 'Move left', section: 'Movement', defaultKey: 'KeyA', aliases: ['KeyA', 'ArrowLeft'] },
  { id: 'moveRight', label: 'Move right', section: 'Movement', defaultKey: 'KeyD', aliases: ['KeyD', 'ArrowRight'] },
  ...[
    ['Digit1', '1'], ['Digit2', '2'], ['Digit3', '3'], ['Digit4', '4'], ['Digit5', '5'], ['Digit6', '6'],
    ['Digit7', '7'], ['Digit8', '8'], ['Digit9', '9'], ['Digit0', '0'], ['Minus', '-'], ['Equal', '='],
  ].map(([defaultKey, label], i) => ({ id: `skill${i + 1}`, label: `Skill bar slot ${label}`, section: 'Skills', defaultKey, aliases: [defaultKey] })),
  { id: 'inventory', label: 'Inventory', section: 'Interface', defaultKey: 'KeyI', aliases: ['KeyI'] },
  { id: 'character', label: 'Character sheet', section: 'Interface', defaultKey: 'KeyC', aliases: ['KeyC'] },
  { id: 'skillTree', label: 'Skill tree', section: 'Interface', defaultKey: 'KeyK', aliases: ['KeyK'] },
  { id: 'talents', label: 'Talents', section: 'Interface', defaultKey: 'KeyT', aliases: ['KeyT'] },
  { id: 'spellbook', label: 'Spellbook', section: 'Interface', defaultKey: 'KeyB', aliases: ['KeyB'] },
  { id: 'questLog', label: 'Quest log', section: 'Interface', defaultKey: 'KeyQ', aliases: ['KeyQ'] },
  { id: 'hearth', label: 'Hearthstone', section: 'Interface', defaultKey: 'KeyH', aliases: ['KeyH'] },
  { id: 'automap', label: 'Toggle map', section: 'Interface', defaultKey: 'Tab', aliases: ['Tab', 'KeyM'] },
  { id: 'madness', label: 'Unleash madness', section: 'Interface', defaultKey: 'KeyG', aliases: ['KeyG'] },
  { id: 'smite', label: 'Toggle Smite', section: 'Interface', defaultKey: 'KeyF', aliases: ['KeyF'] },
  { id: 'healthPotion', label: 'Health potion', section: 'Potions', defaultKey: 'KeyZ', aliases: ['KeyZ'] },
  { id: 'manaPotion', label: 'Mana potion', section: 'Potions', defaultKey: 'KeyX', aliases: ['KeyX'] },
  { id: 'rejuvenationPotion', label: 'Rejuvenation potion', section: 'Potions', defaultKey: 'KeyR', aliases: ['KeyR'] },
  { id: 'furyPotion', label: 'Fury potion', section: 'Potions', defaultKey: 'KeyV', aliases: ['KeyV'] },
];
const ACTION_BY_ALIAS = new Map(KEY_BINDING_ACTIONS.flatMap((action) => action.aliases.map((code) => [code, action.id])));
const ACTION_BY_ID = new Map(KEY_BINDING_ACTIONS.map((action) => [action.id, action]));
const currentBinding = (action) => {
  const item = ACTION_BY_ID.get(action);
  const saved = G.settings.keybinds && G.settings.keybinds[action];
  return typeof saved === 'string' && saved ? saved : item ? item.defaultKey : null;
};
const resolveCode = (code) => {
  const action = ACTION_BY_ALIAS.get(code);
  return action ? currentBinding(action) : code;
};
export const keyBindingLabel = (code) => {
  if (!code) return 'Unbound';
  const special = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Minus: '-', Equal: '=', Space: 'Space', Tab: 'Tab', Escape: 'Esc', Backspace: 'Backspace', PageUp: 'Page Up', PageDown: 'Page Down', Home: 'Home', End: 'End' };
  if (special[code]) return special[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
  if (/^F\d+$/.test(code)) return code;
  return code.replace(/([A-Z])/g, ' $1').trim();
};
export const getKeyBinding = (action) => currentBinding(action);
export function setKeyBinding(action, code) {
  if (!ACTION_BY_ID.has(action) || typeof code !== 'string' || !code) return false;
  const previous = currentBinding(action);
  const other = KEY_BINDING_ACTIONS.find((item) => item.id !== action && currentBinding(item.id) === code);
  const next = { ...(G.settings.keybinds || {}), [action]: code };
  if (other) next[other.id] = previous;
  G.settings.keybinds = next;
  saveSettings();
  return true;
}
export function resetKeyBindings() {
  G.settings.keybinds = {};
  saveSettings();
}

export const input = {
  keys: new Set(),
  pressed: new Set(),
  mouse: { x: 0, y: 0, left: false, right: false, leftPressed: false, rightPressed: false, inside: true },
  lastPointerType: 'mouse',
  enabled: true,

  down(code) { return this.keys.has(resolveCode(code)); },
  consume(code) {
    const resolved = resolveCode(code);
    if (this.pressed.has(resolved)) { this.pressed.delete(resolved); return true; }
    return false;
  },
  consumeRaw(code) {
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
    const mapped = KEY_BINDING_ACTIONS.some((action) => currentBinding(action.id) === e.code);
    if ((GAME_KEYS.has(e.code) || mapped) && G.mode === 'game') e.preventDefault();
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
