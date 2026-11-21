import assert from 'node:assert/strict';
import {
  MOUSE_CURSOR_DEFAULTS,
  cursorColor,
  cursorUsesOverlay,
  normalizeMouseCursorSettings,
} from '../../src/ui/mousecursor.js';

const defaults = normalizeMouseCursorSettings();
assert.deepEqual(defaults, MOUSE_CURSOR_DEFAULTS, 'new cursor preferences start at their defaults');
assert.equal(cursorUsesOverlay(defaults), false, 'the custom cursor renderer is off by default');
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
assert.equal(cursorUsesOverlay({ locatorEnabled: true }), true, 'enabling the locator activates the effects renderer');

console.log('Mouse cursor settings checks passed.');
