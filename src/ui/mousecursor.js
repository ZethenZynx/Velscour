import { G, saveSettings } from '../state.js';

export const MOUSE_CURSOR_DEFAULTS = Object.freeze({
  color: 'default', customColor: '#d8b26a', size: 100,
  outline: false, outlineColor: '#170d07', outlineThickness: 2,
  glow: false, glowColor: '#ffd77a', glowIntensity: 35, transparency: 100,
  pulsatingGlow: false, highlightCircle: false,
  trailStyle: 'none', trailColor: '#e5bd72', customTrailColor: '#e5bd72', matchCursorColor: true,
  rainbowTrail: false, trailLength: 450, trailWidth: 3, particleSize: 5, particleDensity: 45,
  fadeSpeed: 1, trailGlow: 25, trailOpacity: 75,
  locatorEnabled: false, shakeLocator: false, locatorKey: 'AltLeft', locatorRings: true, locatorSize: 54, locatorColor: '#ffe08a',
});

const COLORS = new Set(['default', 'white', 'black', 'red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink', 'gold', 'rainbow', 'inverted', 'custom']);
const TRAILS = new Set(['none', 'solid', 'dotted', 'sparkles', 'stars', 'particles', 'fire', 'lightning', 'frost', 'smoke', 'arcane', 'orbs', 'rainbow', 'ghost']);
const PALETTE = { default: '#d8b26a', white: '#fff8e8', black: '#17120e', red: '#ff4545', orange: '#ff8a32', yellow: '#ffe34d', green: '#55e36c', cyan: '#4de8e8', blue: '#4c91ff', purple: '#bc70ff', pink: '#ff76c8', gold: '#ffd05a' };
export const CURSOR_TRAIL_SPELL_MATCHES = Object.freeze({
  solid: 'Beam and Comet Dive layered strokes in src/gfx/vfx.js and src/gfx/lancefx.js',
  dotted: 'Elemental glow motes from burst() in src/gfx/vfx.js',
  sparkles: 'sparkle() and the bright four-ray spell glints in src/gfx/classfx.js',
  stars: 'Stardive and Astronomer star motes in src/gfx/lancefx.js and src/gfx/classfx.js',
  particles: 'Rising and orbiting class spell motes in src/gfx/classfx.js',
  fire: 'Flame and ember rendering in src/gfx/vfx.js plus Dragon Knight flame motes in src/gfx/classfx.js',
  lightning: 'Jagged, colored halo plus white-core Bolt rendering in src/gfx/vfx.js',
  frost: 'Cold shards and icy mist in src/game/sigs/deathknight.js and src/gfx/classfx.js',
  smoke: 'Soft expanding smoke puffs from smoke() in src/gfx/vfx.js',
  arcane: 'Spinning motes and rune-like rings in src/gfx/classfx.js and src/gfx/lancefx.js',
  orbs: 'Layered glow cores used by spell projectiles and elemental effects in src/gfx/vfx.js',
  rainbow: 'Bard motes and rainbow lightning colors in src/gfx/classfx.js and src/gfx/vfx.js',
  ghost: 'Fading afterimages from ghost-trail skills in src/gfx/lancefx.js',
});
const SPELL_TRAIL_PALETTES = Object.freeze({
  sparkles: { glow: '#ffd860', core: '#fff8d0', dark: '#b87820' },
  stars: { glow: '#c060ff', core: '#ffe8ff', dark: '#4a2080' },
  particles: { glow: '#9fe6ff', core: '#f2fbff', dark: '#3050a0' },
  fire: { glow: '#ff7a10', core: '#fff3a0', dark: '#c02000' },
  lightning: { glow: '#a8ccff', core: '#ffffff', dark: '#4a64ff' },
  frost: { glow: '#60c8ff', core: '#f0ffff', dark: '#1a50d0' },
  smoke: { glow: '#8a8290', core: '#d8d0dc', dark: '#2a2420' },
  arcane: { glow: '#c060ff', core: '#ffe0ff', dark: '#5a10c0' },
  orbs: { glow: '#4aa8ff', core: '#f2fbff', dark: '#1430a0' },
  rainbow: { glow: '#ff70d0', core: '#ffffff', dark: '#4a64ff' },
  ghost: { glow: '#8aa8ff', core: '#f0fbff', dark: '#202c90' },
});
const clamp = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;

export function normalizeMouseCursorSettings(value = {}) {
  const input = value && typeof value === 'object' ? value : {};
  const result = { ...MOUSE_CURSOR_DEFAULTS, ...input };
  if (!COLORS.has(result.color)) result.color = 'default';
  if (!TRAILS.has(result.trailStyle)) result.trailStyle = 'none';
  result.size = Math.round(clamp(result.size, 50, 300, 100) / 25) * 25;
  result.outlineThickness = clamp(result.outlineThickness, 1, 8, 2);
  result.glowIntensity = clamp(result.glowIntensity, 0, 100, 35);
  result.transparency = clamp(result.transparency, 20, 100, 100);
  result.trailLength = clamp(result.trailLength, 100, 1500, 450);
  result.trailWidth = clamp(result.trailWidth, 1, 14, 3);
  result.particleSize = clamp(result.particleSize, 1, 20, 5);
  result.particleDensity = clamp(result.particleDensity, 0, 100, 45);
  result.fadeSpeed = clamp(result.fadeSpeed, 0.25, 3, 1);
  result.trailGlow = clamp(result.trailGlow, 0, 100, 25);
  result.trailOpacity = clamp(result.trailOpacity, 10, 100, 75);
  result.locatorSize = clamp(result.locatorSize, 24, 160, 54);
  for (const key of ['outline','glow','pulsatingGlow','highlightCircle','matchCursorColor','rainbowTrail','locatorEnabled','shakeLocator','locatorRings']) result[key] = !!result[key];
  for (const key of ['customColor','outlineColor','glowColor','trailColor','customTrailColor','locatorColor']) {
    if (!/^#[0-9a-f]{6}$/i.test(String(result[key]))) result[key] = MOUSE_CURSOR_DEFAULTS[key];
  }
  if (typeof result.locatorKey !== 'string' || !/^(AltLeft|ShiftLeft|ControlLeft|F[1-9]|F1[0-2]|Key[A-Z]|Digit[0-9])$/.test(result.locatorKey)) result.locatorKey = MOUSE_CURSOR_DEFAULTS.locatorKey;
  return result;
}

export function cursorColor(settings, time = 0) {
  const s = normalizeMouseCursorSettings(settings);
  return resolvedCursorColor(s, time);
}

function resolvedCursorColor(s, time = 0) {
  if (s.color === 'custom') return s.customColor;
  if (s.color === 'rainbow') return `hsl(${Math.floor((time * 90) % 360)} 100% 62%)`;
  if (s.color === 'inverted') return '#ffffff';
  return PALETTE[s.color] || PALETTE.default;
}

export function cursorUsesOverlay(settings) {
  const s = normalizeMouseCursorSettings(settings);
  return s.color !== 'default' || s.size !== 100 || s.outline || s.glow || s.transparency !== 100 || s.pulsatingGlow || s.highlightCircle || s.trailStyle !== 'none' || s.locatorEnabled || s.shakeLocator;
}

const random = (min, max) => min + Math.random() * (max - min);
const HISTORY_TRAILS = new Set(['solid', 'dotted', 'ghost']);
const trailFadeDuration = (settings) => settings.trailLength / settings.fadeSpeed;
export const MAX_CURSOR_TRAIL_POINTS = 80;
export const MAX_CURSOR_TRAIL_PARTICLES = 128;
const INTERACTIVE_POINTER = '[role="button"],button,a,summary,.slot,.pc-card,.hbtn,.gr-btn,.tab,.panel-close,.save-row,.book-item,.settings-tab-btn,.gc-tab,.gc-pin,.gc-minimize,#xp-track,#xp-text,#minimap,#target-box:not(.no-pic)';

export function cursorNeedsPointerOverlay(settings) {
  const s = normalizeMouseCursorSettings(settings);
  return s.color !== 'default' || s.size !== 100 || s.outline || s.glow || s.transparency !== 100 || s.pulsatingGlow;
}
export function cursorNeedsEffects(settings) {
  const s = normalizeMouseCursorSettings(settings);
  return s.trailStyle !== 'none' || s.locatorEnabled || s.shakeLocator || s.highlightCircle;
}
export function customCursorCanRender(cursorEl, cursorPath) {
  return !!cursorEl?.isConnected && !!cursorPath?.isConnected;
}
export function cursorPointerShouldUseCustom(requested, inside, rendererReady) {
  return !!requested && !!inside && !!rendererReady;
}
export function cursorLeaveIsWindowBoundary(target, win, doc, relatedTarget = null) {
  return target === win || ((target === doc || target === doc?.documentElement) && relatedTarget == null);
}
export function cursorPointerOffset(size = 100) { const scale = normalizeMouseCursorSettings({ size }).size / 100; return { x: 2 * scale, y: 2 * scale }; }
export function cursorTrailGap(size = 100, directionX = 1, directionY = 0, width = 3, glow = 0, particleSize = 0) {
  const scale = normalizeMouseCursorSettings({ size }).size / 100;
  const length = Math.hypot(directionX, directionY) || 1, ux = directionX / length, uy = directionY / length;
  const behindExtent = Math.max(0, ...[[0,0],[18,7],[10,10],[7,18]].map(([x,y]) => -(x * ux + y * uy))) * scale;
  const effectRadius = Math.max(Math.max(1, Number(width) || 1) * 0.5, Math.max(0, Number(particleSize) || 0) * 1.2) + Math.min(5, Math.max(0, Number(glow) || 0) / 22) + 2;
  return Math.max(4 + scale * 5.5, behindExtent + effectRadius);
}
const CURSOR_PATHS = {
  default: 'M2 2 L20 9 L12 12 L9 20 Z',
  pointer: 'M2 22 L2 10 Q2 7 5 8 L6 13 L6 3 Q6 0 9 2 L10 12 L11 5 Q12 2 14 5 L14 12 L16 8 Q19 7 19 11 L18 20 L14 26 L7 26 Z',
  crosshair: 'M2 12 H9 M15 12 H22 M12 2 V9 M12 15 V22 M12 9 A3 3 0 1 0 12.01 9',
  text: 'M9 2 H15 M12 2 V22 M9 22 H15',
  move: 'M12 1 L16 6 H14 V10 H18 V8 L23 12 L18 16 V14 H14 V18 H16 L12 23 L8 18 H10 V14 H6 V16 L1 12 L6 8 V10 H10 V6 H8 Z',
};

function contextualCursor(target) {
  if (!target) return 'default';
  if (target.matches?.('input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]),textarea,[contenteditable="true"]')) return 'text';
  if (target.closest?.('.aiming') || target.style?.cursor === 'crosshair') return 'crosshair';
  if (target.closest?.('.resizing') || target.style?.cursor?.includes('resize')) return 'resize';
  if (target.closest?.('.moving, .panel-head') || target.style?.cursor?.includes('grab')) return 'grab';
  if (target.closest?.(INTERACTIVE_POINTER) || target.style?.cursor === 'pointer' || G.canvas?.style.cursor === 'pointer') return 'pointer';
  const inline = target.style?.cursor || '';
  if (inline.includes('move')) return 'move';
  if (inline.includes('resize')) return 'resize';
  return 'default';
}

function collectCursorRules() {
  const rules = [];
  const visit = (list) => {
    for (const rule of list || []) {
      if (rule.selectorText && rule.style?.cursor) rules.push({ selector: rule.selectorText, cursor: rule.style.cursor });
      else if (rule.cssRules) {
        if (!rule.conditionText || !window.matchMedia || window.matchMedia(rule.conditionText).matches) visit(rule.cssRules);
      }
    }
  };
  for (const sheet of document.styleSheets) {
    try { visit(sheet.cssRules); } catch { /* Ignore cross-origin stylesheets; semantic cursor mapping remains available. */ }
  }
  return rules;
}

function authoredCursor(target, rules) {
  let result = '';
  for (const rule of rules) {
    try { if (target.matches(rule.selector)) result = rule.cursor; } catch { /* Ignore selectors unsupported by this browser. */ }
  }
  return result;
}

export const MouseCursor = {
  canvas: null, ctx: null, active: false, pointer: { x: -100, y: -100, inside: false, kind: 'default' },
  cursorEl: null, cursorSvg: null, cursorPath: null, highlightEl: null, pointerOverlay: false, effectsActive: false,
  previous: null, history: [], historyPool: [], particles: [], particlePool: [], shakeSamples: [], shakeSamplePool: [], locatorHeld: false, shakeUntil: 0,
  trailDistance: 0,
  frame: 0, lastFrame: 0, rainbowPhase: 0, cursorRules: [], lastCursorTarget: null, lastCursorKind: 'default', initialized: false,

  init() {
    if (this.initialized || typeof document === 'undefined') return;
    this.initialized = true;
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'mouse-cursor-effects';
    this.canvas.className = 'mouse-cursor-effects';
    this.canvas.setAttribute('aria-hidden', 'true');
    try { this.ctx = this.canvas.getContext('2d', { alpha: true, desynchronized: true }); }
    catch { this.ctx = null; }
    document.body.append(this.canvas);
    this.cursorEl = document.createElement('div');
    this.cursorEl.className = 'mouse-cursor-pointer';
    this.cursorEl.setAttribute('aria-hidden', 'true');
    try {
      this.cursorSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      this.cursorSvg.setAttribute('viewBox', '0 0 24 24');
      this.cursorSvg.setAttribute('width', '24'); this.cursorSvg.setAttribute('height', '24');
      this.cursorPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      this.cursorSvg.append(this.cursorPath); this.cursorEl.append(this.cursorSvg);
      document.body.append(this.cursorEl);
    } catch {
      this.cursorEl = null; this.cursorSvg = null; this.cursorPath = null;
    }
    this.highlightEl = document.createElement('div');
    this.highlightEl.className = 'mouse-cursor-highlight'; this.highlightEl.setAttribute('aria-hidden', 'true');
    document.body.append(this.highlightEl);
    if (typeof MutationObserver !== 'undefined') {
      this.observer = new MutationObserver(() => {
        if (this.pointerOverlay && !customCursorCanRender(this.cursorEl, this.cursorPath)) this.setPointerVisible(false);
      });
      this.observer.observe(document.body, { childList: true });
    }
    this.cursorRules = collectCursorRules();
    this.resize();
    window.addEventListener('resize', () => this.resize(), { passive: true });
    window.addEventListener('pointermove', (event) => this.move(event), { passive: true, capture: true });
    window.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse') { this.pointer.inside = true; this.move(event); } }, { passive: true, capture: true });
    // This listener is capture-phase: descendant pointerleave events also reach it. Only a true viewport leave should hide/fallback the pointer.
    window.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'mouse' && cursorLeaveIsWindowBoundary(event.target, window, document, event.relatedTarget)) {
        this.pointer.inside = false; this.setPointerVisible(false); if (this.highlightEl) this.highlightEl.style.display = 'none'; this.draw();
      }
    }, { passive: true, capture: true });
    window.addEventListener('keydown', (event) => this.keyDown(event), true);
    window.addEventListener('keyup', (event) => this.keyUp(event), true);
    window.addEventListener('blur', () => { this.locatorHeld = false; this.shakeUntil = 0; this.setPointerVisible(false); this.stopIfIdle(); });
    window.addEventListener('focus', () => this.restorePointer(), { passive: true });
    window.addEventListener('pageshow', () => this.restorePointer(), { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(this.frame); this.frame = 0; this.setPointerVisible(false); }
      else { this.restorePointer(); this.refresh(); }
    });
    this.refresh();
  },

  settings() {
    if (!G.settings.mouseCursor || typeof G.settings.mouseCursor !== 'object') G.settings.mouseCursor = { ...MOUSE_CURSOR_DEFAULTS };
    const stored = G.settings.mouseCursor;
    // Persist retired cursor styles once so an old Comet preference never
    // returns on the next load or starts its former effect processing.
    if (stored.trailStyle === 'comet') {
      stored.trailStyle = 'none';
      this.clearTrail();
      if (this.frame) { if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.frame); this.frame = 0; }
      saveSettings();
    }
    return stored;
  },

  resize() {
    if (!this.canvas || !this.ctx) return;
    // Trails are decorative; a modest backing scale avoids full-screen 2x fill work.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    this.canvas.width = Math.max(1, Math.round(window.innerWidth * dpr));
    this.canvas.height = Math.max(1, Math.round(window.innerHeight * dpr));
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  },

  refresh() {
    if (!this.canvas && !this.cursorEl) return;
    G.settings.mouseCursor = normalizeMouseCursorSettings(this.settings());
    const s = this.settings();
    this.pointerOverlay = cursorNeedsPointerOverlay(s);
    this.effectsActive = cursorNeedsEffects(s);
    this.active = this.pointerOverlay || this.effectsActive;
    this.updateCursorStyle();
    if (this.highlightEl) this.highlightEl.style.display = s.highlightCircle && this.pointer.inside ? 'block' : 'none';
    this.setPointerVisible(this.pointerOverlay && this.pointer.inside);
    if (this.canvas) {
      this.canvas.style.mixBlendMode = 'normal';
      this.canvas.style.display = this.effectsActive && this.ctx ? 'block' : 'none';
    }
    if (s.trailStyle === 'none') this.clearTrail();
    if (!this.effectsActive || !this.ctx) {
      cancelAnimationFrame(this.frame); this.frame = 0;
      if (this.ctx && this.canvas) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }
    this.draw(); this.ensureAnimation();
  },

  setPointerVisible(visible) {
    const canRender = customCursorCanRender(this.cursorEl, this.cursorPath);
    const useCustom = cursorPointerShouldUseCustom(this.pointerOverlay, visible, canRender);
    const hidden = document.body.classList.contains('custom-mouse-pointer');
    if (useCustom) {
      this.positionCursor();
      if (this.cursorEl.style.display !== 'block') this.cursorEl.style.display = 'block';
      if (!hidden) document.body.classList.add('custom-mouse-pointer');
      return true;
    }
    // Reveal the original/native cursor before hiding a custom one, so handoffs never create a blank frame.
    if (hidden) document.body.classList.remove('custom-mouse-pointer');
    if (this.cursorEl && this.cursorEl.style.display !== 'none') this.cursorEl.style.display = 'none';
    return false;
  },

  restorePointer() {
    if (this.pointerOverlay && this.pointer.inside) this.setPointerVisible(true);
    else this.setPointerVisible(false);
  },

  move(event) {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    const now = performance.now(), x = event.clientX, y = event.clientY;
    const s = this.settings();
    if (!this.pointerOverlay && s.trailStyle === 'none' && !s.shakeLocator) {
      this.pointer.x = x; this.pointer.y = y; this.pointer.inside = true;
      if (s.highlightCircle) this.positionCursor();
      if (!this.previous) this.previous = { x, y, time: now };
      else { this.previous.x = x; this.previous.y = y; this.previous.time = now; }
      if (this.locatorHeld) this.ensureAnimation();
      return;
    }
    const target = event.target;
    const cursorTargetChanged = this.pointerOverlay && target !== this.lastCursorTarget;
    if (cursorTargetChanged) {
      const semantic = contextualCursor(target);
      const declared = semantic === 'default' ? authoredCursor(target, this.cursorRules) : '';
      this.lastCursorTarget = target;
      this.lastCursorKind = semantic === 'default' ? (['pointer', 'crosshair', 'text', 'move', 'grab', 'grabbing', 'resize', 'ew-resize', 'ns-resize'].includes(declared) ? (declared.includes('resize') ? 'resize' : declared === 'grabbing' ? 'grab' : declared) : 'default') : semantic;
    }
    this.pointer.kind = this.lastCursorKind;
    if (cursorTargetChanged) this.updateCursorStyle();
    this.pointer.x = x; this.pointer.y = y; this.pointer.inside = true;
    if (this.pointerOverlay) this.setPointerVisible(true);
    const dx = this.previous ? x - this.previous.x : 0, dy = this.previous ? y - this.previous.y : 0;
    const distance = Math.hypot(dx, dy);
    if (this.effectsActive && s.trailStyle !== 'none' && distance >= 1) {
      const ux = dx / distance, uy = dy / distance;
      const gap = cursorTrailGap(s.size, ux, uy, s.trailWidth, s.trailGlow, s.particleSize);
      const trailPoint = this.acquireHistoryPoint();
      trailPoint.x = x - ux * gap; trailPoint.y = y - uy * gap; trailPoint.time = now;
      this.history.push(trailPoint);
      while (this.history.length > MAX_CURSOR_TRAIL_POINTS || (this.history.length && now - this.history[0].time > trailFadeDuration(s))) this.recycleHistoryPoint(this.history.shift());
      this.emitTrail(x - ux * gap, y - uy * gap, distance, now, ux, uy);
    }
    if (s.shakeLocator) this.detectShake(x, y, now);
    if (this.effectsActive && distance > 0.35) this.ensureAnimation();
    if (!this.previous) this.previous = { x, y, time: now };
    else { this.previous.x = x; this.previous.y = y; this.previous.time = now; }
  },

  detectShake(x, y, time) {
    const s = this.settings();
    if (!s.shakeLocator || !this.previous) return;
    const dt = Math.max(1, time - this.previous.time), dx = x - this.previous.x, dy = y - this.previous.y;
    const speed = Math.hypot(dx, dy) / dt * 1000;
    const sample = this.shakeSamplePool.pop() || {};
    sample.dx = dx; sample.dy = dy; sample.speed = speed; sample.time = time; this.shakeSamples.push(sample);
    while (this.shakeSamples.length && time - this.shakeSamples[0].time >= 500) this.shakeSamplePool.push(this.shakeSamples.shift());
    while (this.shakeSamples.length > 8) this.shakeSamplePool.push(this.shakeSamples.shift());
    let fast = 0;
    for (const entry of this.shakeSamples) if (entry.speed > 620) fast++;
    if (this.shakeSamples.length >= 4 && fast >= 4) {
      this.shakeUntil = time + 1100;
    }
  },

  positionCursor() {
    if (!this.pointer.inside) return;
    const settings = this.settings(), scale = settings.size / 100;
    const hotspot = cursorPointerOffset(settings.size);
    if (this.pointerOverlay && this.cursorEl) this.cursorEl.style.transform = `translate3d(${this.pointer.x - hotspot.x}px,${this.pointer.y - hotspot.y}px,0)`;
    if (settings.highlightCircle && this.highlightEl) this.highlightEl.style.transform = `translate3d(${this.pointer.x - 17 * scale}px,${this.pointer.y - 17 * scale}px,0) scale(${scale})`;
  },

  updateCursorStyle() {
    if (!this.cursorPath) return;
    try {
      const s = this.settings(), kind = this.pointer.kind || 'default';
      this.cursorPath.setAttribute('d', CURSOR_PATHS[kind] || CURSOR_PATHS.default);
      this.cursorPath.setAttribute('fill', kind === 'crosshair' || kind === 'text' ? 'none' : resolvedCursorColor(s, performance.now() / 1000));
      this.cursorPath.setAttribute('stroke', s.outline ? s.outlineColor : (kind === 'crosshair' || kind === 'text' ? resolvedCursorColor(s, performance.now() / 1000) : '#200'));
      this.cursorPath.setAttribute('stroke-width', s.outline ? String(s.outlineThickness) : (kind === 'crosshair' || kind === 'text' ? '2' : '1.5'));
      this.cursorPath.setAttribute('stroke-linejoin', 'round');
      this.cursorPath.setAttribute('transform', kind === 'pointer' ? 'translate(-6 -2)' : '');
      this.cursorPath.style.animation = s.color === 'rainbow' ? 'cursor-hue-cycle 2.5s linear infinite' : 'none';
      this.cursorSvg.style.width = `${24 * s.size / 100}px`;
      this.cursorSvg.style.height = `${24 * s.size / 100}px`;
      this.cursorEl.style.opacity = String(s.transparency / 100);
      const glow = (s.glow || s.pulsatingGlow) ? `drop-shadow(0 0 ${Math.max(1, s.glowIntensity / 10)}px ${s.glowColor || cursorColor(s)})` : 'none';
      this.cursorEl.classList.toggle('pulsating-glow', !!(s.pulsatingGlow && s.glow));
      this.cursorEl.style.setProperty('--cursor-glow', s.glowColor || cursorColor(s));
      this.cursorEl.style.filter = s.pulsatingGlow && s.glow ? '' : glow;
      this.cursorEl.style.mixBlendMode = s.color === 'inverted' ? 'difference' : 'normal';
      if (this.highlightEl) {
        this.highlightEl.style.width = `${34 * s.size / 100}px`; this.highlightEl.style.height = `${34 * s.size / 100}px`;
        this.highlightEl.style.borderColor = s.outline ? s.outlineColor : cursorColor(s);
      }
      this.positionCursor();
    } catch {
      // Keep the native cursor available if a browser cannot update the decorative SVG cursor.
      this.pointerOverlay = false;
      this.setPointerVisible(false);
    }
  },

  acquireHistoryPoint() { return this.historyPool.pop() || {}; },
  recycleHistoryPoint(point) { if (point && this.historyPool.length < MAX_CURSOR_TRAIL_POINTS) this.historyPool.push(point); },
  clearTrail() {
    while (this.history.length) this.recycleHistoryPoint(this.history.pop());
    while (this.particles.length) {
      const particle = this.particles.pop();
      if (this.particlePool.length < MAX_CURSOR_TRAIL_PARTICLES) this.particlePool.push(particle);
    }
    this.trailDistance = 0;
  },

  keyDown(event) {
    const s = this.settings();
    if (!s.locatorEnabled || event.code !== s.locatorKey || event.repeat) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.locatorHeld = true;
    this.keyStarted = performance.now();
    if (this.active) this.ensureAnimation();
  },

  keyUp(event) {
    if (event.code !== this.settings().locatorKey) return;
    if (this.locatorHeld) { event.preventDefault(); event.stopImmediatePropagation(); }
    this.locatorHeld = false;
  },

  emitTrail(x, y, distance, now, directionX = 1, directionY = 0) {
    const s = this.settings(), style = s.trailStyle;
    if (style === 'none' || style === 'solid' || style === 'dotted' || style === 'ghost' || s.particleDensity <= 0) return;
    this.trailDistance += distance;
    const spacing = 24 - s.particleDensity * 0.18;
    const count = Math.min(4, Math.floor(this.trailDistance / spacing));
    if (!count) return;
    this.trailDistance -= count * spacing;
    const theme = SPELL_TRAIL_PALETTES[style] || {};
    const directionLength = Math.hypot(directionX, directionY) || 1, ux = directionX / directionLength, uy = directionY / directionLength;
    for (let i = 0; i < count && this.particles.length < MAX_CURSOR_TRAIL_PARTICLES; i++) {
      const color = style === 'rainbow' || s.rainbowTrail ? `hsl(${(this.rainbowPhase++ * 23) % 360} 100% 65%)`
      : s.matchCursorColor ? resolvedCursorColor(s, now / 1000) : s.customTrailColor || s.trailColor;
      const speed = style === 'lightning' ? random(24, 90) : random(5, 34);
      let vx = 0, vy = 0;
      if (style === 'fire' || style === 'smoke') { vx = -ux * speed * 0.34 + random(-5, 5); vy = -random(12, 35) - uy * speed * 0.12; }
      else if (style === 'lightning') { vx = -ux * speed * 0.3 + random(-18, 18); vy = -uy * speed * 0.3 + random(-18, 18); }
      else if (style === 'frost') { vx = -ux * speed * 0.65 + random(-5, 5); vy = -uy * speed * 0.65 + random(-5, 5); }
      else if (style === 'arcane' || style === 'orbs') { vx = -ux * speed * 0.2 - uy * speed * 0.48; vy = -uy * speed * 0.2 + ux * speed * 0.48; }
      else if (style === 'sparkles' || style === 'stars' || style === 'particles' || style === 'rainbow') { vx = -ux * speed * 0.2 + random(-5, 5); vy = -uy * speed * 0.2 - random(3, 14); }
      const particle = this.particlePool.pop() || {};
      particle.x = x + random(-3, 3); particle.y = y + random(-3, 3);
      particle.vx = vx; particle.vy = vy;
      particle.color = color; particle.glow = theme.glow || color; particle.core = theme.core || '#ffffff'; particle.dark = theme.dark || color;
      particle.size = random(s.particleSize * 0.55, s.particleSize * 1.2);
      particle.life = s.trailLength / 1000 / s.fadeSpeed * (style === 'lightning' ? 0.42 : style === 'smoke' ? 1.3 : 1);
      particle.age = 0; particle.style = style; particle.phase = random(0, Math.PI * 2);
      this.particles.push(particle);
    }
  },

  ensureAnimation() {
    if (!this.effectsActive || this.frame || document.hidden) return;
    const s = this.settings();
    const historyAnim = HISTORY_TRAILS.has(s.trailStyle) && this.history.length > 0;
    if (!this.particles.length && !historyAnim && !this.locatorHeld && performance.now() > this.shakeUntil) return;
    this.frame = requestAnimationFrame((time) => this.animate(time));
  },

  stopIfIdle() {
    const s = this.settings();
    if (this.particles.length || (HISTORY_TRAILS.has(s.trailStyle) && this.history.length) || this.locatorHeld || performance.now() < this.shakeUntil) return;
    cancelAnimationFrame(this.frame); this.frame = 0;
  },

  animate(time) {
    this.frame = 0;
    const dt = Math.min(0.05, Math.max(0, (time - (this.lastFrame || time)) / 1000));
    this.lastFrame = time;
    this.advanceParticles(dt);
    const s = this.settings();
    while (this.history.length && time - this.history[0].time > trailFadeDuration(s)) this.recycleHistoryPoint(this.history.shift());
    this.draw(time);
    this.ensureAnimation();
  },

  advanceParticles(dt) {
    let write = 0;
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i]; particle.age += dt; particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vx *= 0.97; particle.vy *= 0.97;
      if (particle.age < particle.life) this.particles[write++] = particle;
      else if (this.particlePool.length < MAX_CURSOR_TRAIL_PARTICLES) this.particlePool.push(particle);
    }
    this.particles.length = write;
  },

  draw(now = performance.now()) {
    if (!this.effectsActive || !this.ctx) return;
    const ctx = this.ctx, s = this.settings(), width = window.innerWidth, height = window.innerHeight;
    ctx.clearRect(0, 0, width, height);
    this.drawTrail(ctx, s, now);
    this.drawLocator(ctx, s, now);
  },

  drawTrail(ctx, s, now) {
    const style = s.trailStyle, history = this.history;
    if (style === 'none') return;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (style === 'solid' && history.length > 1) {
      for (let i = 1; i < history.length; i++) {
        const a = history[i - 1], b = history[i], age = now - b.time;
        const duration = trailFadeDuration(s);
        if (age > duration) continue;
        ctx.globalAlpha = (1 - age / duration) * s.trailOpacity / 100;
        const color = this.trailColor(s, now);
        ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        ctx.strokeStyle = color; ctx.lineWidth = s.trailWidth * 2.1;
        ctx.shadowColor = color; ctx.shadowBlur = s.trailGlow > 0 ? Math.min(6, s.trailGlow / 18) : 0;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.strokeStyle = '#fff8e8'; ctx.lineWidth = Math.max(0.8, s.trailWidth * 0.38); ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    } else if (style === 'dotted' && history.length) {
      for (const point of history) {
        const age = now - point.time, duration = trailFadeDuration(s); if (age > duration) continue;
        ctx.globalAlpha = (1 - age / duration) * s.trailOpacity / 100;
        ctx.fillStyle = this.trailColor(s, now); ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = s.trailGlow > 0 ? Math.min(4, s.trailGlow / 28) : 0;
        ctx.beginPath(); ctx.arc(point.x, point.y, s.trailWidth * 0.6, 0, Math.PI * 2); ctx.fill();
      }
    } else if (style === 'ghost') {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < history.length; i += 5) {
        const point = history[i], age = now - point.time, duration = trailFadeDuration(s); if (age > duration) continue;
        ctx.globalAlpha = (1 - age / duration) * s.trailOpacity / 210; ctx.fillStyle = this.trailColor(s, now);
        this.arrowPath(ctx, point.x, point.y, s.size / 100); ctx.fill();
        ctx.globalAlpha *= 0.72; ctx.strokeStyle = SPELL_TRAIL_PALETTES.ghost.core; ctx.lineWidth = Math.max(0.8, s.size / 150);
        ctx.stroke();
      }
    }
    for (const particle of this.particles) {
      const fade = Math.max(0, 1 - particle.age / particle.life) * s.trailOpacity / 100;
      const r = particle.size * (particle.style === 'smoke' ? 1 + particle.age / particle.life : 1);
      ctx.globalAlpha = fade; ctx.fillStyle = particle.color; ctx.strokeStyle = particle.color;
      ctx.shadowColor = particle.glow || particle.color; ctx.shadowBlur = s.trailGlow > 0 ? Math.min(5, s.trailGlow / 22) : 0;
      if (particle.style === 'lightning') this.drawLightningTrail(ctx, particle, r);
      else if (particle.style === 'fire') this.drawFlameTrail(ctx, particle, r);
      else if (particle.style === 'sparkles') this.drawSparkleTrail(ctx, particle, r);
      else if (particle.style === 'stars' || particle.style === 'rainbow') {
        ctx.save(); ctx.translate(particle.x, particle.y); ctx.rotate(particle.phase + particle.age * 1.8);
        this.starPath(ctx, 0, 0, r); ctx.fillStyle = particle.color; ctx.fill();
        ctx.fillStyle = particle.core; ctx.beginPath(); ctx.arc(0, 0, Math.max(0.8, r * 0.2), 0, Math.PI * 2); ctx.fill(); ctx.restore();
      } else if (particle.style === 'particles') {
        ctx.beginPath(); ctx.arc(particle.x, particle.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = particle.core; ctx.beginPath(); ctx.arc(particle.x - r * 0.2, particle.y - r * 0.2, Math.max(0.8, r * 0.25), 0, Math.PI * 2); ctx.fill();
      } else if (particle.style === 'arcane') {
        ctx.save(); ctx.translate(particle.x, particle.y); ctx.rotate(particle.phase + particle.age * 2.6);
        ctx.strokeStyle = particle.color; ctx.lineWidth = Math.max(1, r * 0.24);
        ctx.beginPath(); ctx.arc(0, 0, r * 0.82, -0.2, Math.PI * 1.25); ctx.stroke();
        ctx.strokeStyle = particle.glow; ctx.beginPath(); ctx.arc(0, 0, r * 0.48, Math.PI, Math.PI * 1.8); ctx.stroke();
        for (let tick = 0; tick < 3; tick++) { const a = tick * Math.PI * 2 / 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9); ctx.lineTo(Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15); ctx.stroke(); }
        ctx.restore();
      } else if (particle.style === 'frost') {
        this.drawFrostTrail(ctx, particle, r);
      } else if (particle.style === 'smoke') {
        ctx.globalAlpha = fade * 0.46; ctx.fillStyle = particle.color || particle.dark || '#514b56';
        for (let puff = 0; puff < 3; puff++) {
          const a = particle.phase + puff * Math.PI * 2 / 3, d = r * (0.18 + puff * 0.12);
          ctx.beginPath(); ctx.arc(particle.x + Math.cos(a) * d, particle.y + Math.sin(a) * d, r * (0.42 + (puff % 2) * 0.12), 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = fade * 0.3; ctx.fillStyle = particle.glow;
        ctx.beginPath(); ctx.arc(particle.x - r * 0.16, particle.y - r * 0.2, r * 0.32, 0, Math.PI * 2); ctx.fill();
      } else if (particle.style === 'orbs') {
        ctx.strokeStyle = particle.glow; ctx.lineWidth = Math.max(1, r * 0.2);
        ctx.beginPath(); ctx.arc(particle.x, particle.y, r * 0.82, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = particle.color; ctx.beginPath(); ctx.arc(particle.x, particle.y, r * 0.57, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = particle.core; ctx.beginPath(); ctx.arc(particle.x - r * 0.2, particle.y - r * 0.22, Math.max(1, r * 0.25), 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(particle.x, particle.y, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  },

  drawSparkleTrail(ctx, particle, r) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = particle.glow; ctx.lineWidth = Math.max(1.4, r * 0.32);
    ctx.beginPath(); ctx.moveTo(particle.x - r, particle.y); ctx.lineTo(particle.x + r, particle.y); ctx.moveTo(particle.x, particle.y - r); ctx.lineTo(particle.x, particle.y + r); ctx.stroke();
    ctx.strokeStyle = particle.core; ctx.lineWidth = Math.max(0.8, r * 0.12);
    ctx.beginPath(); ctx.moveTo(particle.x - r * 0.65, particle.y - r * 0.65); ctx.lineTo(particle.x + r * 0.65, particle.y + r * 0.65); ctx.moveTo(particle.x + r * 0.65, particle.y - r * 0.65); ctx.lineTo(particle.x - r * 0.65, particle.y + r * 0.65); ctx.stroke();
  },

  drawFlameTrail(ctx, particle, r) {
    const pulse = 0.85 + Math.sin(particle.phase + particle.age * 18) * 0.15;
    ctx.save(); ctx.translate(particle.x, particle.y); ctx.scale(0.66, 1.15 * pulse);
    ctx.fillStyle = particle.dark || '#c02000';
    ctx.beginPath(); ctx.moveTo(0, r); ctx.quadraticCurveTo(-r * 0.9, r * 0.1, -r * 0.38, -r * 0.65); ctx.quadraticCurveTo(-r * 0.2, -r * 0.18, r * 0.12, -r * 0.28); ctx.quadraticCurveTo(r * 0.18, -r * 0.75, r * 0.52, -r); ctx.quadraticCurveTo(r * 0.76, -r * 0.25, r * 0.55, r * 0.42); ctx.quadraticCurveTo(r * 0.34, r * 0.92, 0, r); ctx.fill();
    ctx.fillStyle = particle.glow || '#ff7a10';
    ctx.beginPath(); ctx.moveTo(0, r * 0.68); ctx.quadraticCurveTo(-r * 0.48, r * 0.05, 0, -r * 0.62); ctx.quadraticCurveTo(r * 0.58, r * 0.05, 0, r * 0.68); ctx.fill();
    ctx.fillStyle = particle.color;
    ctx.beginPath(); ctx.moveTo(0, r * 0.52); ctx.quadraticCurveTo(-r * 0.3, r * 0.02, 0, -r * 0.38); ctx.quadraticCurveTo(r * 0.32, r * 0.06, 0, r * 0.52); ctx.fill();
    ctx.fillStyle = particle.core || '#fff3a0';
    ctx.beginPath(); ctx.ellipse(0, r * 0.25, r * 0.18, r * 0.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  },

  drawLightningTrail(ctx, particle, r) {
    this.strokeLightningTrail(ctx, particle, r, particle.glow, Math.max(2, r * 0.7), true);
    this.strokeLightningTrail(ctx, particle, r, particle.color, Math.max(1.4, r * 0.42));
    this.strokeLightningTrail(ctx, particle, r, particle.core, Math.max(0.8, r * 0.16));
  },

  strokeLightningTrail(ctx, particle, r, color, width, branch = false) {
    const phase = particle.phase + particle.age * 28, x = particle.x, y = particle.y;
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
    ctx.moveTo(x - r * 0.8, y + r * 0.48);
    for (let i = 1; i <= 4; i++) {
      const px = x - r * 0.8 + r * 0.4 * i, py = y + Math.sin(phase + i * 2.1) * r * 0.42;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
    if (branch) {
      ctx.beginPath(); ctx.moveTo(x + r * 0.05, y - r * 0.08); ctx.lineTo(x + r * 0.32, y - r * 0.82); ctx.lineTo(x + r * 0.42, y - r * 0.94); ctx.stroke();
    }
  },

  drawFrostTrail(ctx, particle, r) {
    const phase = particle.phase + particle.age * 1.5;
    ctx.save(); ctx.translate(particle.x, particle.y); ctx.rotate(phase);
    ctx.fillStyle = particle.dark || '#1a50d0';
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.42, -r * 0.12); ctx.lineTo(r * 0.16, r); ctx.lineTo(-r * 0.32, r * 0.12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = particle.color; ctx.beginPath(); ctx.moveTo(0, -r * 0.72); ctx.lineTo(r * 0.27, -r * 0.1); ctx.lineTo(r * 0.11, r * 0.68); ctx.lineTo(-r * 0.19, r * 0.1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = particle.glow || '#60c8ff'; ctx.lineWidth = Math.max(1, r * 0.2);
    ctx.beginPath(); ctx.moveTo(0, -r * 0.9); ctx.lineTo(r * 0.18, r * 0.7); ctx.moveTo(-r * 0.8, -r * 0.22); ctx.lineTo(r * 0.8, r * 0.22); ctx.stroke();
    ctx.strokeStyle = particle.core || '#f0ffff'; ctx.lineWidth = Math.max(0.8, r * 0.1);
    ctx.beginPath(); ctx.moveTo(0, -r * 0.8); ctx.lineTo(0, r * 0.55); ctx.stroke(); ctx.restore();
  },

  trailColor(s, time) {
    if (s.rainbowTrail || s.trailStyle === 'rainbow') return `hsl(${Math.floor((time * 0.15) % 360)} 100% 65%)`;
    if (s.matchCursorColor) return resolvedCursorColor(s, time / 1000);
    return s.customTrailColor || s.trailColor;
  },

  drawLocator(ctx, s, now) {
    const shaking = now < this.shakeUntil, enabled = this.locatorHeld || shaking;
    if (!enabled || !s.locatorRings || !this.pointer.inside) return;
    const interval = 380, radius = s.locatorSize;
    const phase = ((now - (this.keyStarted || (this.shakeUntil - 1100))) % interval) / interval;
    ctx.save(); ctx.strokeStyle = s.locatorColor; ctx.lineWidth = 2.5;
    for (let ring = 0; ring < 2; ring++) {
      const age = (phase + ring * 0.5) % 1;
      ctx.globalAlpha = (1 - age) * 0.8;
      ctx.beginPath(); ctx.arc(this.pointer.x, this.pointer.y, radius * age, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  },

  arrowPath(ctx, x, y, scale = 1) {
    ctx.beginPath(); ctx.moveTo(x + 2 * scale, y + 2 * scale); ctx.lineTo(x + 20 * scale, y + 9 * scale); ctx.lineTo(x + 12 * scale, y + 12 * scale); ctx.lineTo(x + 9 * scale, y + 20 * scale); ctx.closePath();
  },
  starPath(ctx, x, y, r) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, radius = i % 2 ? r * 0.42 : r; const px = x + Math.cos(a) * radius, py = y + Math.sin(a) * radius; if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.closePath(); },
};

export function initMouseCursor() { MouseCursor.init(); }
export function refreshMouseCursor() { MouseCursor.refresh(); }
