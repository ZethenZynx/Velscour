// Non-browser regression coverage for saved chat geometry and legacy zero-size records.
// Usage: node tools/tests/chat_layout_persistence.mjs
import assert from 'node:assert/strict';
import { clampChatLayout, hasValidChatLayout, restoreChatLayout } from '../../src/ui/chat-layout.mjs';

const viewport = { width: 1440, height: 900 };
const defaults = { left: 14, top: null, width: 370, height: 310 };
const saved = { left: 712, top: 286, width: 462, height: 355 };
assert.equal(hasValidChatLayout(saved), true);
assert.deepEqual(restoreChatLayout(saved, viewport, defaults), saved, 'saved geometry survives restoration unchanged');
assert.deepEqual(restoreChatLayout({ left: 0, top: 0, width: 370, height: 310 }, viewport, defaults),
  { left: 0, top: 0, width: 370, height: 310 }, 'valid intentional edge placement is preserved');
assert.deepEqual(restoreChatLayout({ left: 0, top: 0, width: 0, height: 0 }, viewport, defaults),
  { left: 14, top: 440, width: 370, height: 310 }, 'legacy hidden-window zero rectangle is replaced with defaults');
assert.deepEqual(clampChatLayout(saved, { width: 500, height: 300 }, defaults),
  { left: 38, top: 0, width: 462, height: 300 }, 'valid saved layout stays inside changed viewport bounds');

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}
const KEY = 'velscour.pc.chat-window.v1';
const storage = new MemoryStorage();
storage.setItem(KEY, JSON.stringify({ left: 0, top: 0, width: 0, height: 0, rememberLayout: false }));
globalThis.localStorage = storage;
globalThis.innerWidth = viewport.width;
globalThis.innerHeight = viewport.height;
globalThis.document = { visibilityState: 'visible' };
const { GameChat } = await import('../../src/ui/chat.js');

const style = { left: '', top: '', width: '', height: '', bottom: '', right: '', setProperty() {} };
const listeners = new Map();
let visible = false;
const dragHandle = {
  addEventListener: (type, fn) => listeners.set(type, fn),
  removeEventListener: (type) => listeners.delete(type),
  setPointerCapture() {},
};
const root = {
  style,
  dataset: {},
  classList: { contains: (name) => name === 'hidden' && !visible },
  getClientRects: () => visible ? [{}] : [],
  getBoundingClientRect: () => ({ left: Number.parseFloat(style.left) || 0, top: Number.parseFloat(style.top) || 0,
    width: Number.parseFloat(style.width) || 0, height: Number.parseFloat(style.height) || 0 }),
  querySelector: (selector) => selector === '.gc-drag-handle' ? dragHandle : null,
};
GameChat.root = root;
GameChat.prefs = JSON.parse(storage.getItem(KEY));
GameChat.applyPrefs();
GameChat.save();
let persisted = JSON.parse(storage.getItem(KEY));
assert.equal(persisted.left, 14, 'corrupt legacy position is migrated');
assert.equal(persisted.top, 440, 'legacy top-left is not restored');
assert.equal(persisted.width, 370, 'default dimensions repair a zero-size record');
assert.equal(persisted.height, 310);
assert.equal(persisted.rememberLayout, true, 'layout persistence remains enabled across characters');

// Exercise the actual drag completion handler; the window remains saved when hidden afterward.
style.left = '712px'; style.top = '286px'; style.width = '462px'; style.height = '355px'; visible = true;
GameChat.bindDrag();
listeners.get('pointerdown')({ button: 0, pointerId: 4, clientX: 712, clientY: 286, preventDefault() {} });
listeners.get('pointermove')({ pointerId: 4, clientX: 790, clientY: 340 });
listeners.get('pointerup')({ pointerId: 4 });
persisted = JSON.parse(storage.getItem(KEY));
assert.equal(persisted.left, 790, 'drag-end saves the updated horizontal coordinate');
assert.equal(persisted.top, 340, 'drag-end saves the updated vertical coordinate');
assert.equal(persisted.width, 462, 'drag preserves width');
assert.equal(persisted.height, 355, 'drag preserves height');

// A hidden element reports an all-zero client rectangle. Saving must use its inline geometry instead.
visible = false;
GameChat.save();
persisted = JSON.parse(storage.getItem(KEY));
assert.deepEqual({ left: persisted.left, top: persisted.top, width: persisted.width, height: persisted.height },
  { left: 790, top: 340, width: 462, height: 355 },
  'logout/hidden-state save retains the last moved and resized layout');

console.log('OK - valid layout restore, old zero-size migration, hidden-state save, and cross-character persistence key');
