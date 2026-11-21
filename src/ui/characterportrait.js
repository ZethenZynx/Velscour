// Movable player portrait HUD. It reuses the equipped paperdoll art and stores layout
// preferences with the regular UI settings, never in character save data.
import { G, saveSettings } from '../state.js';
import { fmtInt } from '../core/util.js';
import { shownEquip } from '../data/items.js';
import { heroPortrait } from '../core/gearart.js';

const BASE_W = 260, BASE_H = 154;
const HEAD_CROP_H = 100;
const FALLBACK_PORTRAITS = new Map();
const config = () => (G.settings.characterPortrait ||= { visible: true, locked: false, size: 100, position: null });
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const artKey = (item) => item ? [item.base, item.look, item.rarity, item.appearance, item.setId] : null;

export const CharacterPortrait = {
  root: null,
  artCanvas: null,
  lastArtKey: '',
  artRetryAt: 0,
  lastVitals: '',
  resizeListener: null,
  init(host) {
    if (this.root?.isConnected) return;
    const root = document.createElement('section');
    root.id = 'character-portrait-hud';
    root.className = 'character-portrait-hud';
    root.setAttribute('aria-label', 'Character portrait and vital bars');
    root.innerHTML = `<header class="character-portrait-head"><div class="character-portrait-identity"><b data-portrait-name></b><span data-portrait-level></span></div><div class="character-portrait-tools"><button type="button" data-portrait-lock aria-label="Lock portrait position" title="Lock portrait position">⌖</button><button type="button" data-portrait-hide aria-label="Hide character portrait" title="Hide portrait">×</button></div></header><div class="character-portrait-content"><canvas data-portrait-art width="160" height="100" aria-hidden="true"></canvas><div class="character-portrait-vitals"><div class="character-portrait-meter health"><i data-portrait-health-fill></i><b data-portrait-health-text></b></div><div class="character-portrait-meter mana"><i data-portrait-mana-fill></i><b data-portrait-mana-text></b></div></div></div><div class="character-portrait-resize" data-portrait-resize role="button" tabindex="0" aria-label="Resize character portrait" title="Drag to resize"></div>`;
    host.appendChild(root);
    this.root = root;
    this.artCanvas = root.querySelector('[data-portrait-art]');
    root.querySelector('[data-portrait-lock]').addEventListener('click', (e) => {
      e.stopPropagation(); const c = config(); c.locked = !c.locked; this.applySettings(); saveSettings();
    });
    root.querySelector('[data-portrait-hide]').addEventListener('click', (e) => {
      e.stopPropagation(); config().visible = false; this.applySettings(); saveSettings();
    });
    root.querySelector('.character-portrait-head').addEventListener('pointerdown', (e) => this.beginDrag(e));
    root.querySelector('[data-portrait-resize]').addEventListener('pointerdown', (e) => this.beginResize(e));
    root.querySelector('[data-portrait-resize]').addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault(); const c = config(); c.size = clamp((Number(c.size) || 100) + (e.key === 'ArrowUp' ? 25 : -25), 75, 150); this.applySettings(); saveSettings();
    });
    this.resizeListener ||= () => this.clampPosition(true);
    window.addEventListener('resize', this.resizeListener);
    this.applySettings();
  },
  ensurePosition() {
    const c = config(), saved = c.position;
    const { width, height } = this.bounds();
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y) && saved.x >= 0 && saved.x <= 1 && saved.y >= 0 && saved.y <= 1) {
      return [saved.x * Math.max(0, innerWidth - width), saved.y * Math.max(0, innerHeight - height)];
    }
    return [16, Math.max(16, innerHeight - height - 84)];
  },
  bounds() {
    const scale = clamp(Number(config().size) || 100, 75, 150) / 100;
    return { width: BASE_W * scale, height: BASE_H * scale };
  },
  savePosition(x, y) {
    const c = config(), { width, height } = this.bounds();
    const maxX = Math.max(0, innerWidth - width), maxY = Math.max(0, innerHeight - height);
    c.position = { x: maxX ? clamp(x, 0, maxX) / maxX : 0, y: maxY ? clamp(y, 0, maxY) / maxY : 0 };
    this.root.style.left = `${maxX ? clamp(x, 0, maxX) : 0}px`;
    this.root.style.top = `${maxY ? clamp(y, 0, maxY) : 0}px`;
  },
  clampPosition(persist = false) {
    if (!this.root) return;
    const c = config(), box = this.bounds();
    const maxX = Math.max(0, innerWidth - box.width), maxY = Math.max(0, innerHeight - box.height);
    const x = clamp(parseFloat(this.root.style.left) || 0, 0, maxX), y = clamp(parseFloat(this.root.style.top) || 0, 0, maxY);
    this.root.style.left = `${x}px`; this.root.style.top = `${y}px`;
    if (persist) c.position = { x: maxX ? x / maxX : 0, y: maxY ? y / maxY : 0 };
  },
  applySettings() {
    if (!this.root) return;
    const c = config(), size = clamp(Number(c.size) || 100, 75, 150), [x, y] = this.ensurePosition();
    c.size = size;
    this.root.classList.toggle('hidden', c.visible === false || !G.char);
    this.root.classList.toggle('locked', !!c.locked);
    this.root.style.width = `${BASE_W * size / 100}px`;
    this.root.style.height = `${BASE_H * size / 100}px`;
    this.root.style.left = `${clamp(x, 0, Math.max(0, innerWidth - BASE_W * size / 100))}px`;
    this.root.style.top = `${clamp(y, 0, Math.max(0, innerHeight - BASE_H * size / 100))}px`;
    const lock = this.root.querySelector('[data-portrait-lock]');
    lock.textContent = c.locked ? '🔒' : '⌖';
    lock.title = c.locked ? 'Unlock portrait movement and resizing' : 'Lock portrait movement and resizing';
    lock.setAttribute('aria-label', lock.title);
    if (c.position && (parseFloat(this.root.style.left) !== x || parseFloat(this.root.style.top) !== y)) this.savePosition(parseFloat(this.root.style.left), parseFloat(this.root.style.top));
  },
  refreshSettings() { this.applySettings(); this.update(); },
  resetPosition() {
    config().position = null;
    const [x, y] = this.ensurePosition();
    this.savePosition(x, y); saveSettings();
  },
  beginDrag(e) {
    if (e.button !== 0 || e.target.closest('button') || config().locked || !this.root) return;
    e.preventDefault(); e.stopPropagation();
    const r = this.root.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    e.currentTarget.setPointerCapture(e.pointerId);
    const move = (ev) => { this.savePosition(ev.clientX - dx, ev.clientY - dy); };
    const end = () => { e.currentTarget.removeEventListener('pointermove', move); e.currentTarget.removeEventListener('pointerup', end); e.currentTarget.removeEventListener('pointercancel', end); saveSettings(); };
    e.currentTarget.addEventListener('pointermove', move); e.currentTarget.addEventListener('pointerup', end); e.currentTarget.addEventListener('pointercancel', end);
  },
  beginResize(e) {
    if (e.button !== 0 || config().locked || !this.root) return;
    e.preventDefault(); e.stopPropagation();
    const initial = config().size || 100, sx = e.clientX, sy = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const ratio = Math.max((BASE_W + ev.clientX - sx) / BASE_W, (BASE_H + ev.clientY - sy) / BASE_H);
      config().size = clamp(Math.round((initial * ratio) / 25) * 25, 75, 150); this.applySettings();
    };
    const end = () => { e.currentTarget.removeEventListener('pointermove', move); e.currentTarget.removeEventListener('pointerup', end); e.currentTarget.removeEventListener('pointercancel', end); saveSettings(); };
    e.currentTarget.addEventListener('pointermove', move); e.currentTarget.addEventListener('pointerup', end); e.currentTarget.addEventListener('pointercancel', end);
  },
  update() {
    if (!this.root || !G.char || !G.player || config().visible === false || this.root.classList.contains('hidden')) return;
    const c = G.char, p = G.player, eq = shownEquip(c);
    const key = JSON.stringify([c.classId, artKey(eq?.body), artKey(eq?.head), !!c.hideHelm]);
    if (key !== this.lastArtKey || G.time >= this.artRetryAt) {
      this.lastArtKey = key;
      this.artRetryAt = G.time + 0.5;
      const ctx = this.artCanvas.getContext('2d'); ctx.clearRect(0, 0, this.artCanvas.width, this.artCanvas.height); ctx.imageSmoothingEnabled = false;
      let portrait = null;
      try { portrait = heroPortrait(c.classId, eq?.body, eq?.head, 160, 160); } catch (_) { /* class art can still be loading */ }
      if (portrait) { ctx.drawImage(portrait, 0, 0, 160, HEAD_CROP_H, 0, 0, 160, 100); this.artRetryAt = Infinity; }
      else {
        let image = FALLBACK_PORTRAITS.get(c.classId);
        if (!image) { image = new Image(); image.src = `assets/sprites/select/${c.classId}.webp`; FALLBACK_PORTRAITS.set(c.classId, image); }
        if (image.complete && image.naturalWidth) ctx.drawImage(image, 0, 0, image.naturalWidth, Math.min(image.naturalHeight, image.naturalWidth), 0, 0, 160, 100);
      }
    }
    const name = c.name || 'Adventurer', level = `Level ${c.level || 1}`;
    const health = `${fmtInt(Math.max(0, p.hp))} / ${fmtInt(Math.max(0, p.maxHp))}`;
    const mana = `${fmtInt(Math.max(0, p.mana))} / ${fmtInt(Math.max(0, p.maxMana))}`;
    const healthPct = `${clamp(p.maxHp ? p.hp / p.maxHp * 100 : 0, 0, 100)}%`, manaPct = `${clamp(p.maxMana ? p.mana / p.maxMana * 100 : 0, 0, 100)}%`;
    const vitalKey = `${name}|${level}|${health}|${mana}|${healthPct}|${manaPct}`;
    if (vitalKey === this.lastVitals) return;
    this.lastVitals = vitalKey;
    this.root.querySelector('[data-portrait-name]').textContent = name;
    this.root.querySelector('[data-portrait-level]').textContent = level;
    this.root.querySelector('[data-portrait-health-fill]').style.width = healthPct;
    this.root.querySelector('[data-portrait-health-text]').textContent = health;
    this.root.querySelector('[data-portrait-mana-fill]').style.width = manaPct;
    this.root.querySelector('[data-portrait-mana-text]').textContent = mana;
  },
};
