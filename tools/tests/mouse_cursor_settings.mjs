import assert from 'node:assert/strict';
import {
  MOUSE_CURSOR_DEFAULTS,
  MouseCursor,
  cursorColor,
  cursorLeaveIsWindowBoundary,
  customCursorCanRender,
  cursorPointerShouldUseCustom,
  cursorNeedsEffects,
  cursorNeedsPointerOverlay,
  cursorPointerOffset,
  cursorTrailGap,
  cursorUsesOverlay,
  MAX_CURSOR_TRAIL_PARTICLES,
  MAX_CURSOR_TRAIL_POINTS,
  normalizeMouseCursorSettings,
} from '../../src/ui/mousecursor.js';
import { G } from '../../src/state.js';

const defaults = normalizeMouseCursorSettings();
assert.deepEqual(defaults, MOUSE_CURSOR_DEFAULTS, 'new cursor preferences start at their defaults');
assert.equal(cursorUsesOverlay(defaults), false, 'the custom cursor renderer is off by default');
assert.equal(cursorNeedsPointerOverlay(defaults), false, 'defaults keep the native Velscour pointer');
assert.equal(cursorNeedsEffects(defaults), false, 'defaults do not start the effects renderer');
assert.deepEqual(cursorPointerOffset(100), { x: 2, y: 2 }, 'the pointer retains the original 2,2 hotspot');
assert.deepEqual(cursorPointerOffset(300), { x: 6, y: 6 }, 'the original hotspot scales proportionally');
assert.equal(cursorTrailGap(100), 9.5, 'trails begin behind the pointer tip');
assert.ok(cursorTrailGap(300) > cursorTrailGap(100) * 2, 'the pointer-to-trail gap scales with the cursor');
assert.ok(cursorTrailGap(100, -1, 0, 3, 25) > cursorTrailGap(100, 1, 0, 3, 25), 'the gap accounts for the arrow artwork when moving toward its body');
assert.ok(cursorTrailGap(50, -1, 0, 14, 100) > cursorTrailGap(50, -1, 0, 3, 0), 'wide glowing trails leave extra clearance around the pointer');
assert.equal(customCursorCanRender(null, null), false, 'missing custom cursor elements select the native fallback');
assert.equal(customCursorCanRender({ isConnected: true }, { isConnected: true }), true, 'connected custom cursor elements may safely hide the native cursor');
assert.equal(customCursorCanRender({ isConnected: false }, { isConnected: false }), false, 'detached custom cursor elements restore the native cursor');
assert.equal(cursorPointerShouldUseCustom(true, true, true), true, 'a connected custom pointer is shown while the mouse is inside');
assert.equal(cursorPointerShouldUseCustom(true, false, true), false, 'the custom pointer is released when the mouse leaves the window');
assert.equal(cursorPointerShouldUseCustom(true, true, false), false, 'failed custom rendering falls back to the native pointer');
assert.equal(cursorPointerShouldUseCustom(false, true, true), false, 'native cursor mode never hides the native pointer');
const fakeWindow = {}, fakeDocument = { documentElement: {} }, child = {};
assert.equal(cursorLeaveIsWindowBoundary(fakeWindow, fakeWindow, fakeDocument), true, 'a real viewport leave activates the native fallback');
assert.equal(cursorLeaveIsWindowBoundary(child, fakeWindow, fakeDocument, {}), false, 'leaving a child element cannot hide the pointer');
assert.equal(cursorLeaveIsWindowBoundary(fakeDocument.documentElement, fakeWindow, fakeDocument), true, 'a document-edge leave is recognized when no destination exists');
assert.ok(MAX_CURSOR_TRAIL_PARTICLES <= 128, 'trail particle work has a fixed upper bound');
assert.ok(MAX_CURSOR_TRAIL_POINTS <= 80, 'trail history has a fixed upper bound');
assert.equal(defaults.trailStyle, 'none', 'trails are disabled by default');
assert.equal(defaults.outline, false, 'outline is disabled by default');
assert.equal(defaults.glow, false, 'glow is disabled by default');
assert.equal(defaults.locatorEnabled, false, 'the locator is disabled by default');

const supportedColors = ['default', 'white', 'black', 'red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink', 'gold', 'rainbow', 'inverted', 'custom'];
for (const color of supportedColors) {
  const normalized = normalizeMouseCursorSettings({ color });
  assert.equal(normalized.color, color, `${color} cursor color is supported`);
  assert.equal(cursorUsesOverlay(normalized), color !== 'default', `${color} selects the custom cursor when applicable`);
}
assert.equal(normalizeMouseCursorSettings({ color: 'not-a-color' }).color, 'default', 'invalid colors safely fall back');
assert.equal(cursorColor({ color: 'white' }), '#fff8e8', 'named colors resolve to their palette value');
assert.equal(cursorColor({ color: 'custom', customColor: '#123456' }), '#123456', 'custom cursor color is applied');
assert.equal(cursorColor({ color: 'inverted' }), '#ffffff', 'inverted mode uses a high-contrast difference blend source');
assert.match(cursorColor({ color: 'rainbow' }, 1), /^hsl\(/, 'rainbow color cycles dynamically');

for (const trailStyle of ['none', 'solid', 'dotted', 'sparkles', 'stars', 'particles', 'fire', 'lightning', 'frost', 'smoke', 'arcane', 'orbs', 'rainbow', 'comet', 'ghost']) {
  assert.equal(normalizeMouseCursorSettings({ trailStyle }).trailStyle, trailStyle, `${trailStyle} trail style is supported`);
}
assert.equal(normalizeMouseCursorSettings({ trailStyle: 'unknown' }).trailStyle, 'none', 'invalid trail styles safely disable trails');

const bounded = normalizeMouseCursorSettings({ size: 999, transparency: -1, trailLength: 0, locatorSize: 999, particleDensity: 300 });
assert.equal(bounded.size, 300, 'size is limited to the requested maximum');
assert.equal(normalizeMouseCursorSettings({ size: 112 }).size, 100, 'size snaps to a 25 percent increment');
assert.equal(normalizeMouseCursorSettings({ size: 113 }).size, 125, 'size rounds to the nearest 25 percent increment');
assert.equal(bounded.transparency, 20, 'transparency respects its minimum');
assert.equal(bounded.trailLength, 100, 'trail length respects its minimum');
assert.equal(bounded.locatorSize, 160, 'locator size respects its maximum');
assert.equal(bounded.particleDensity, 100, 'particle density respects its maximum');
assert.equal(normalizeMouseCursorSettings({ customColor: 'transparent' }).customColor, MOUSE_CURSOR_DEFAULTS.customColor, 'invalid color values are replaced');
assert.equal(normalizeMouseCursorSettings({ locatorKey: 'KeyQ' }).locatorKey, 'KeyQ', 'valid locator key bindings are retained');
assert.equal(normalizeMouseCursorSettings({ locatorKey: 'Escape' }).locatorKey, MOUSE_CURSOR_DEFAULTS.locatorKey, 'unsafe or unsupported locator bindings fall back');
assert.equal(cursorUsesOverlay({ trailStyle: 'sparkles' }), true, 'enabling a trail activates the effects renderer');
assert.equal(cursorNeedsPointerOverlay({ trailStyle: 'sparkles' }), false, 'trails do not replace or delay the native pointer');
assert.equal(cursorNeedsEffects({ trailStyle: 'sparkles' }), true, 'trail effects run independently from the cursor');
assert.equal(cursorUsesOverlay({ locatorEnabled: true }), true, 'enabling the locator activates the effects renderer');

const particleStyles = ['sparkles', 'stars', 'particles', 'fire', 'lightning', 'frost', 'smoke', 'arcane', 'orbs', 'rainbow'];
const trailStyles = ['none', 'solid', 'dotted', ...particleStyles, 'comet', 'ghost'];
const timing = {};
for (const trailStyle of trailStyles) {
  G.settings.mouseCursor = normalizeMouseCursorSettings({ trailStyle, particleDensity: 100, particleSize: 20, trailLength: 1500, fadeSpeed: 0.25, trailGlow: 100 });
  MouseCursor.clearTrail();
  const start = process.hrtime.bigint();
  for (let i = 0; i < 4000; i++) MouseCursor.emitTrail(i * 18, 24, 18, i * 8);
  timing[trailStyle] = Number(process.hrtime.bigint() - start) / 1e6;
  assert.ok(MouseCursor.particles.length <= MAX_CURSOR_TRAIL_PARTICLES, `${trailStyle} stays within its particle cap`);
  MouseCursor.advanceParticles(10);
  assert.equal(MouseCursor.particles.length, 0, `${trailStyle} expires particles without a browser frame`);
  const recycled = MouseCursor.particlePool[MouseCursor.particlePool.length - 1];
  MouseCursor.emitTrail(1, 2, 80, 40001);
  if (particleStyles.includes(trailStyle)) assert.ok(MouseCursor.particles.includes(recycled), `${trailStyle} reuses a recycled particle`);
}
G.settings.mouseCursor = { ...MOUSE_CURSOR_DEFAULTS };
MouseCursor.clearTrail();
console.log(`Mouse cursor synthetic emitter benchmark (4,000 pointer samples, ms): ${Object.entries(timing).map(([style, ms]) => `${style}=${ms.toFixed(2)}`).join(', ')}`);

console.log('Mouse cursor settings checks passed.');
