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
const INTERACTIVE_POINTER = '[role="button"],button,a,summary,.slot,.pc-card,.hbtn,.gr-btn,.tab,.panel-close,.save-row,.book-item,.settings-tab-btn,.gc-tab,.gc-pin,.gc-minimize,#xp-track,#xp-text,#minimap,#target-box:not(.no-pic)';

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
  previous: null, history: [], particles: [], shakeSamples: [], locatorHeld: false, shakeUntil: 0,
  frame: 0, lastFrame: 0, rainbowPhase: 0, cursorRules: [], lastCursorTarget: null, lastCursorKind: 'default', initialized: false,

  init() {
    if (this.initialized || typeof document === 'undefined') return;
    this.initialized = true;
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'mouse-cursor-effects';
    this.canvas.className = 'mouse-cursor-effects';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    document.body.append(this.canvas);
    this.cursorRules = collectCursorRules();
    this.resize();
    window.addEventListener('resize', () => this.resize(), { passive: true });
    window.addEventListener('pointermove', (event) => this.move(event), { passive: true, capture: true });
    window.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse') { this.pointer.inside = true; this.move(event); } }, { passive: true, capture: true });
    window.addEventListener('pointerleave', (event) => { if (event.pointerType === 'mouse') { this.pointer.inside = false; this.draw(); } }, { passive: true, capture: true });
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
    this.active = cursorUsesOverlay(s);
    document.body.classList.toggle('custom-mouse-cursor', this.active);
    this.canvas.style.mixBlendMode = s.color === 'inverted' ? 'difference' : 'normal';
    this.canvas.style.display = this.active ? 'block' : 'none';
    if (!this.active) {
      this.particles.length = 0; this.history.length = 0;
      cancelAnimationFrame(this.frame); this.frame = 0;
      return;
    }
    this.draw();
    this.ensureAnimation();
  },

  move(event) {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    const now = performance.now(), point = { x: event.clientX, y: event.clientY, time: now };
    const target = document.elementFromPoint(point.x, point.y);
    if (target !== this.lastCursorTarget) {
      const semantic = contextualCursor(target);
      const declared = semantic === 'default' ? authoredCursor(target, this.cursorRules) : '';
      this.lastCursorTarget = target;
      this.lastCursorKind = semantic === 'default' ? (['pointer', 'crosshair', 'text', 'move', 'grab', 'grabbing', 'resize', 'ew-resize', 'ns-resize'].includes(declared) ? (declared.includes('resize') ? 'resize' : declared === 'grabbing' ? 'grab' : declared) : 'default') : semantic;
    }
    this.pointer.kind = this.lastCursorKind;
    this.pointer.x = point.x; this.pointer.y = point.y; this.pointer.inside = true;
    if (this.active && this.settings().trailStyle !== 'none') {
      this.history.push(point);
      while (this.history.length > 70 || (this.history.length && now - this.history[0].time > trailFadeDuration(this.settings()) * 1.8)) this.history.shift();
      this.emitTrail(point, now);
    }
    this.detectShake(point);
    this.previous = point;
    if (this.active) { this.draw(); this.ensureAnimation(); }
  },

  detectShake(point) {
    const s = this.settings();
    if (!s.shakeLocator || !this.previous) return;
    const dt = Math.max(1, point.time - this.previous.time), dx = point.x - this.previous.x, dy = point.y - this.previous.y;
    const speed = Math.hypot(dx, dy) / dt * 1000;
    this.shakeSamples.push({ dx, dy, speed, time: point.time });
    this.shakeSamples = this.shakeSamples.filter((sample) => point.time - sample.time < 500).slice(-8);
    if (this.shakeSamples.length >= 4 && this.shakeSamples.filter((sample) => sample.speed > 620).length >= 4) {
      this.shakeUntil = point.time + 1100;
    }
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

  emitTrail(point, now) {
    const s = this.settings(), style = s.trailStyle;
    if (style === 'none' || style === 'solid' || style === 'dotted' || style === 'ghost' || style === 'comet' || s.particleDensity <= 0) return;
    const prev = this.history[this.history.length - 2];
    const distance = prev ? Math.hypot(point.x - prev.x, point.y - prev.y) : 0;
    const count = Math.max(1, Math.min(10, Math.round(distance / 13 * s.particleDensity / 35)));
    for (let i = 0; i < count && this.particles.length < 260; i++) {
      const color = s.rainbowTrail || style === 'rainbow' ? `hsl(${(this.rainbowPhase++ * 23) % 360} 100% 65%)`
      : s.matchCursorColor ? resolvedCursorColor(s, now / 1000) : s.customTrailColor || s.trailColor;
      const angle = random(0, Math.PI * 2), speed = style === 'lightning' ? random(24, 90) : random(5, 34);
      this.particles.push({ x: point.x + random(-3, 3), y: point.y + random(-3, 3), vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed + (style === 'fire' || style === 'smoke' ? -random(12, 35) : 0),
        color, size: random(s.particleSize * 0.55, s.particleSize * 1.2), life: s.trailLength / 1000 / s.fadeSpeed, age: 0, style });
    }
  },

  ensureAnimation() {
    if (!this.active || this.frame || document.hidden) return;
    const s = this.settings();
    const historyAnim = HISTORY_TRAILS.has(s.trailStyle) && this.history.length > 0;
    if (!this.particles.length && !historyAnim && !this.locatorHeld && performance.now() > this.shakeUntil && !(s.pulsatingGlow && s.glow) && s.color !== 'rainbow') return;
    this.frame = requestAnimationFrame((time) => this.animate(time));
  },

  stopIfIdle() {
    const s = this.settings();
    if (this.particles.length || (HISTORY_TRAILS.has(s.trailStyle) && this.history.length) || this.locatorHeld || performance.now() < this.shakeUntil || (s.pulsatingGlow && s.glow) || s.color === 'rainbow') return;
    cancelAnimationFrame(this.frame); this.frame = 0;
  },

  animate(time) {
    this.frame = 0;
    const dt = Math.min(0.05, Math.max(0, (time - (this.lastFrame || time)) / 1000));
    this.lastFrame = time;
    for (const particle of this.particles) { particle.age += dt; particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vx *= 0.97; particle.vy *= 0.97; }
    this.particles = this.particles.filter((particle) => particle.age < particle.life);
    const s = this.settings();
    while (this.history.length && time - this.history[0].time > trailFadeDuration(s)) this.history.shift();
    this.draw(time);
    this.ensureAnimation();
  },

  draw(now = performance.now()) {
    if (!this.active || !this.ctx) return;
    const ctx = this.ctx, s = this.settings(), width = window.innerWidth, height = window.innerHeight;
    ctx.clearRect(0, 0, width, height);
    this.drawTrail(ctx, s, now);
    this.drawLocator(ctx, s, now);
    if (this.pointer.inside) this.drawCursor(ctx, s, now);
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
        ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = s.trailGlow / 18;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    } else if (style === 'dotted' && history.length) {
      for (const point of history) {
        const age = now - point.time, duration = trailFadeDuration(s); if (age > duration) continue;
        ctx.globalAlpha = (1 - age / duration) * s.trailOpacity / 100;
        ctx.fillStyle = this.trailColor(s, now); ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = s.trailGlow / 16;
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
      ctx.shadowColor = particle.color; ctx.shadowBlur = s.trailGlow * 0.12;
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

  drawCursor(ctx, s, now) {
    const scale = s.size / 100, color = resolvedCursorColor(s, now / 1000), pulse = s.pulsatingGlow ? 0.8 + 0.2 * (1 + Math.sin(now / 190)) : 1;
    const locatorActive = this.locatorHeld || now < this.shakeUntil;
    ctx.save(); ctx.translate(this.pointer.x, this.pointer.y); ctx.scale(scale, scale); ctx.globalAlpha = s.transparency / 100;
    if (locatorActive) { ctx.shadowColor = s.locatorColor; ctx.shadowBlur = Math.max(12, s.locatorSize * 0.25); }
    if (s.highlightCircle) { ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.strokeStyle = s.outline ? s.outlineColor : color; ctx.lineWidth = Math.max(1, s.outlineThickness); ctx.stroke(); }
    if (s.glow || s.pulsatingGlow) { ctx.shadowColor = s.glowColor || color; ctx.shadowBlur = s.glowIntensity * 0.22 * pulse; }
    ctx.fillStyle = color;
    if (this.pointer.kind === 'pointer') { ctx.translate(-6, -2); this.handPath(ctx); }
    else if (this.pointer.kind === 'crosshair') this.crosshairPath(ctx);
    else if (this.pointer.kind === 'text') this.textPath(ctx);
    else if (this.pointer.kind === 'move' || this.pointer.kind === 'grab' || this.pointer.kind === 'resize') this.movePath(ctx);
    else this.arrowPath(ctx, 0, 0, 1);
    ctx.fill();
    if (s.outline) { ctx.shadowBlur = 0; ctx.strokeStyle = s.outlineColor; ctx.lineWidth = s.outlineThickness; ctx.stroke(); }
    ctx.restore();
  },

  arrowPath(ctx, x, y, scale = 1) {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 1 * scale, y + 23 * scale); ctx.lineTo(x + 6 * scale, y + 18 * scale); ctx.lineTo(x + 10 * scale, y + 27 * scale); ctx.lineTo(x + 14 * scale, y + 25 * scale); ctx.lineTo(x + 10 * scale, y + 16 * scale); ctx.lineTo(x + 18 * scale, y + 16 * scale); ctx.closePath();
  },
  handPath(ctx) { ctx.beginPath(); ctx.moveTo(2, 22); ctx.lineTo(2, 10); ctx.quadraticCurveTo(2, 7, 5, 8); ctx.lineTo(6, 13); ctx.lineTo(6, 3); ctx.quadraticCurveTo(6, 0, 9, 2); ctx.lineTo(10, 12); ctx.lineTo(11, 5); ctx.quadraticCurveTo(12, 2, 14, 5); ctx.lineTo(14, 12); ctx.lineTo(16, 8); ctx.quadraticCurveTo(19, 7, 19, 11); ctx.lineTo(18, 20); ctx.lineTo(14, 26); ctx.lineTo(7, 26); ctx.closePath(); },
  crosshairPath(ctx) { ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(-3, 0); ctx.moveTo(3, 0); ctx.lineTo(11, 0); ctx.moveTo(0, -11); ctx.lineTo(0, -3); ctx.moveTo(0, 3); ctx.lineTo(0, 11); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 2; ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); },
  textPath(ctx) { ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.moveTo(0, -10); ctx.lineTo(0, 10); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 2; ctx.stroke(); ctx.beginPath(); ctx.moveTo(-4, -10); ctx.lineTo(4, -10); ctx.moveTo(-4, 10); ctx.lineTo(4, 10); ctx.stroke(); ctx.beginPath(); ctx.rect(-1, -1, 2, 2); },
  movePath(ctx) { ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(4, -7); ctx.lineTo(1.5, -7); ctx.lineTo(1.5, -2); ctx.lineTo(7, -2); ctx.lineTo(7, -4.5); ctx.lineTo(12, 0); ctx.lineTo(7, 4.5); ctx.lineTo(7, 2); ctx.lineTo(1.5, 2); ctx.lineTo(1.5, 7); ctx.lineTo(4, 7); ctx.lineTo(0, 12); ctx.lineTo(-4, 7); ctx.lineTo(-1.5, 7); ctx.lineTo(-1.5, 2); ctx.lineTo(-7, 2); ctx.lineTo(-7, 4.5); ctx.lineTo(-12, 0); ctx.lineTo(-7, -4.5); ctx.lineTo(-7, -2); ctx.lineTo(-1.5, -2); ctx.lineTo(-1.5, -7); ctx.lineTo(-4, -7); ctx.closePath(); },
  starPath(ctx, x, y, r) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, radius = i % 2 ? r * 0.42 : r; const px = x + Math.cos(a) * radius, py = y + Math.sin(a) * radius; if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.closePath(); },
};

export function initMouseCursor() { MouseCursor.init(); }
export function refreshMouseCursor() { MouseCursor.refresh(); }
