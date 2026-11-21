import assert from 'node:assert/strict';
import { clampChatLayout } from '../../src/ui/chat-layout.mjs';

const defaults = { left: 14, width: 370, height: 310 };

assert.deepEqual(
  clampChatLayout({ left: 245, top: 88, width: 480, height: 360 }, { width: 1280, height: 800 }, defaults),
  { left: 245, top: 88, width: 480, height: 360 },
  'an in-bounds saved layout is restored unchanged',
);
assert.deepEqual(
  clampChatLayout({ left: 900, top: 700, width: 480, height: 360 }, { width: 800, height: 600 }, defaults),
  { left: 320, top: 240, width: 480, height: 360 },
  'a layout is clamped inside a smaller viewport without changing its size',
);
assert.deepEqual(
  clampChatLayout({ left: 0, top: 0, width: 900, height: 700 }, { width: 240, height: 160 }, defaults),
  { left: 0, top: 0, width: 240, height: 160 },
  'tiny viewports constrain dimensions without placing the window off-screen',
);
assert.deepEqual(
  clampChatLayout({ left: 0, top: 0, width: 370, height: 310 }, { width: 1280, height: 800 }, defaults),
  { left: 0, top: 0, width: 370, height: 310 },
  'zero-valued coordinates remain valid saved positions',
);

console.log('chat layout persistence checks passed');
