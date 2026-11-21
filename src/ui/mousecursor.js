import { G } from '../state.js';

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
const TRAILS = new Set(['none', 'solid', 'dotted', 'sparkles', 'stars', 'particles', 'fire', 'lightning', 'frost', 'smoke', 'arcane', 'orbs', 'rainbow', 'comet', 'ghost']);
const PALETTE = { default: '#d8b26a', white: '#fff8e8', black: '#17120e', red: '#ff4545', orange: '#ff8a32', yellow: '#ffe34d', green: '#55e36c', cyan: '#4de8e8', blue: '#4c91ff', purple: '#bc70ff', pink: '#ff76c8', gold: '#ffd05a' };
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
const HISTORY_TRAILS = new Set(['solid', 'dotted', 'comet', 'ghost']);
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
export function cursorPointerOffset(size = 100) { const scale = normalizeMouseCursorSettings({ size }).size / 100; return { x: 2 * scale, y: 2 * scale }; }
export function cursorTrailGap(size = 100) { return 4 + normalizeMouseCursorSettings({ size }).size * 0.055; }
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
    this.ctx = this.canvas.getContext('2d', { alpha: true, desynchronized: true });
    document.body.append(this.canvas);
    this.cursorEl = document.createElement('div');
    this.cursorEl.className = 'mouse-cursor-pointer';
    this.cursorEl.setAttribute('aria-hidden', 'true');
    this.cursorSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.cursorSvg.setAttribute('viewBox', '0 0 24 24');
    this.cursorSvg.setAttribute('width', '24'); this.cursorSvg.setAttribute('height', '24');
    this.cursorPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.cursorSvg.append(this.cursorPath);
    this.cursorEl.append(this.cursorSvg);
    document.body.append(this.cursorEl);
    this.highlightEl = document.createElement('div');
    this.highlightEl.className = 'mouse-cursor-highlight'; this.highlightEl.setAttribute('aria-hidden', 'true');
    document.body.append(this.highlightEl);
    this.cursorRules = collectCursorRules();
    this.resize();
    window.addEventListener('resize', () => this.resize(), { passive: true });
    window.addEventListener('pointermove', (event) => this.move(event), { passive: true, capture: true });
    window.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse') { this.pointer.inside = true; this.move(event); } }, { passive: true, capture: true });
    window.addEventListener('pointerleave', (event) => { if (event.pointerType === 'mouse') { this.pointer.inside = false; this.cursorEl.style.display = 'none'; this.highlightEl.style.display = 'none'; this.draw(); } }, { passive: true, capture: true });
    window.addEventListener('keydown', (event) => this.keyDown(event), true);
    window.addEventListener('keyup', (event) => this.keyUp(event), true);
    window.addEventListener('blur', () => { this.locatorHeld = false; this.shakeUntil = 0; this.stopIfIdle(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(this.frame); this.frame = 0; }
      else this.refresh();
    });
    this.refresh();
  },

  settings() {
    if (!G.settings.mouseCursor || typeof G.settings.mouseCursor !== 'object') G.settings.mouseCursor = { ...MOUSE_CURSOR_DEFAULTS };
    return G.settings.mouseCursor;
  },

  resize() {
    if (!this.canvas) return;
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
    if (!this.canvas) return;
    G.settings.mouseCursor = normalizeMouseCursorSettings(G.settings.mouseCursor);
    const s = this.settings();
    this.pointerOverlay = cursorNeedsPointerOverlay(s);
    this.effectsActive = cursorNeedsEffects(s);
    this.active = this.pointerOverlay || this.effectsActive;
    document.body.classList.toggle('custom-mouse-pointer', this.pointerOverlay);
    this.cursorEl.style.display = this.pointerOverlay && this.pointer.inside ? 'block' : 'none';
    this.highlightEl.style.display = s.highlightCircle && this.pointer.inside ? 'block' : 'none';
    this.canvas.style.mixBlendMode = s.color === 'inverted' ? 'difference' : 'normal';
    this.canvas.style.display = this.effectsActive ? 'block' : 'none';
    this.updateCursorStyle();
    this.positionCursor();
    if (s.trailStyle === 'none') this.clearTrail();
    if (!this.effectsActive) {
      cancelAnimationFrame(this.frame); this.frame = 0;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }
    this.draw(); this.ensureAnimation();
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
    if (this.pointerOverlay) this.positionCursor();
    const dx = this.previous ? x - this.previous.x : 0, dy = this.previous ? y - this.previous.y : 0;
    const distance = Math.hypot(dx, dy);
    if (this.effectsActive && s.trailStyle !== 'none' && distance >= 1) {
      const gap = cursorTrailGap(s.size), ux = dx / distance, uy = dy / distance;
      const trailPoint = this.acquireHistoryPoint();
      trailPoint.x = x - ux * gap; trailPoint.y = y - uy * gap; trailPoint.time = now;
      this.history.push(trailPoint);
      while (this.history.length > MAX_CURSOR_TRAIL_POINTS || (this.history.length && now - this.history[0].time > trailFadeDuration(s))) this.recycleHistoryPoint(this.history.shift());
      this.emitTrail(x - ux * gap, y - uy * gap, distance, now);
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
    if (this.pointerOverlay) this.cursorEl.style.transform = `translate3d(${this.pointer.x - hotspot.x}px,${this.pointer.y - hotspot.y}px,0)`;
    if (settings.highlightCircle) this.highlightEl.style.transform = `translate3d(${this.pointer.x - 17 * scale}px,${this.pointer.y - 17 * scale}px,0) scale(${scale})`;
  },

  updateCursorStyle() {
    if (!this.cursorPath) return;
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
    this.highlightEl.style.width = `${34 * s.size / 100}px`; this.highlightEl.style.height = `${34 * s.size / 100}px`;
    this.highlightEl.style.borderColor = s.outline ? s.outlineColor : cursorColor(s);
    this.positionCursor();
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

  emitTrail(x, y, distance, now) {
    const s = this.settings(), style = s.trailStyle;
    if (style === 'none' || style === 'solid' || style === 'dotted' || style === 'ghost' || style === 'comet' || s.particleDensity <= 0) return;
    this.trailDistance += distance;
    const spacing = 24 - s.particleDensity * 0.18;
    const count = Math.min(4, Math.floor(this.trailDistance / spacing));
    if (!count) return;
    this.trailDistance -= count * spacing;
    for (let i = 0; i < count && this.particles.length < MAX_CURSOR_TRAIL_PARTICLES; i++) {
      const color = s.rainbowTrail || style === 'rainbow' ? `hsl(${(this.rainbowPhase++ * 23) % 360} 100% 65%)`
      : s.matchCursorColor ? resolvedCursorColor(s, now / 1000) : s.customTrailColor || s.trailColor;
      const angle = random(0, Math.PI * 2), speed = style === 'lightning' ? random(24, 90) : random(5, 34);
      const particle = this.particlePool.pop() || {};
      particle.x = x + random(-3, 3); particle.y = y + random(-3, 3);
      particle.vx = Math.cos(angle) * speed; particle.vy = Math.sin(angle) * speed + (style === 'fire' || style === 'smoke' ? -random(12, 35) : 0);
      particle.color = color; particle.size = random(s.particleSize * 0.55, s.particleSize * 1.2);
      particle.life = s.trailLength / 1000 / s.fadeSpeed; particle.age = 0; particle.style = style;
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
    if ((style === 'solid' || style === 'comet') && history.length > 1) {
      for (let i = 1; i < history.length; i++) {
        const a = history[i - 1], b = history[i], age = now - b.time;
        const duration = trailFadeDuration(s);
        if (age > duration) continue;
        ctx.globalAlpha = (1 - age / duration) * s.trailOpacity / 100;
        ctx.strokeStyle = style === 'comet' ? `hsl(${(now / 5 + i * 12) % 360} 100% 65%)` : this.trailColor(s, now);
        ctx.lineWidth = s.trailWidth * (style === 'comet' ? 1.2 : 1);
        ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = s.trailGlow > 0 ? Math.min(5, s.trailGlow / 24) : 0;
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
      for (let i = 0; i < history.length; i += 5) {
        const point = history[i], age = now - point.time, duration = trailFadeDuration(s); if (age > duration) continue;
        ctx.globalAlpha = (1 - age / duration) * s.trailOpacity / 160; ctx.fillStyle = this.trailColor(s, now);
        this.arrowPath(ctx, point.x, point.y, s.size / 100); ctx.fill();
      }
    }
    for (const particle of this.particles) {
      const fade = Math.max(0, 1 - particle.age / particle.life) * s.trailOpacity / 100;
      ctx.globalAlpha = fade; ctx.fillStyle = particle.color; ctx.strokeStyle = particle.color;
      ctx.shadowColor = particle.color; ctx.shadowBlur = s.trailGlow > 0 ? Math.min(5, s.trailGlow / 22) : 0;
      const r = particle.size * (particle.style === 'smoke' ? 1 + particle.age / particle.life : 1);
      if (particle.style === 'sparkles' || particle.style === 'lightning') {
        ctx.lineWidth = Math.max(1, r * 0.28); ctx.beginPath(); ctx.moveTo(particle.x - r, particle.y); ctx.lineTo(particle.x + r, particle.y); ctx.moveTo(particle.x, particle.y - r); ctx.lineTo(particle.x, particle.y + r); ctx.stroke();
        if (particle.style === 'lightning') { ctx.beginPath(); ctx.moveTo(particle.x - r, particle.y - r); ctx.lineTo(particle.x + r * 0.3, particle.y); ctx.lineTo(particle.x - r * 0.1, particle.y + r); ctx.stroke(); }
      } else if (particle.style === 'stars') {
        this.starPath(ctx, particle.x, particle.y, r); ctx.fill();
      } else if (particle.style === 'arcane') {
        ctx.beginPath(); ctx.arc(particle.x, particle.y, r, 0, Math.PI * 1.45); ctx.stroke();
      } else if (particle.style === 'frost') {
        ctx.lineWidth = Math.max(1, r * 0.22);
        for (let arm = 0; arm < 3; arm++) {
          const angle = arm * Math.PI / 3;
          const dx = Math.cos(angle) * r, dy = Math.sin(angle) * r;
          ctx.beginPath(); ctx.moveTo(particle.x - dx, particle.y - dy); ctx.lineTo(particle.x + dx, particle.y + dy); ctx.stroke();
        }
      } else if (particle.style === 'orbs') {
        ctx.beginPath(); ctx.arc(particle.x, particle.y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(particle.x - r * 0.25, particle.y - r * 0.25, Math.max(1, r * 0.26), 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(particle.x, particle.y, r * (particle.style === 'fire' ? 0.7 : 1), 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
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
