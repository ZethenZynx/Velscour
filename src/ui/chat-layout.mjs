const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value, fallback) => value === null || value === undefined || value === ''
  ? fallback
  : Number.isFinite(Number(value)) ? Number(value) : fallback;

/** Normalize a persisted chat layout for the current viewport. */
export function clampChatLayout(layout = {}, viewport = {}, defaults = {}) {
  const width = Math.max(1, finite(viewport.width, 1));
  const height = Math.max(1, finite(viewport.height, 1));
  const minWidth = Math.min(300, width);
  const minHeight = Math.min(180, height);
  const windowWidth = clamp(finite(layout.width, finite(defaults.width, 370)), minWidth, width);
  const windowHeight = clamp(finite(layout.height, finite(defaults.height, 310)), minHeight, height);
  const defaultTop = Math.max(12, height - windowHeight - 150);

  return {
    left: clamp(finite(layout.left, finite(defaults.left, 14)), 0, Math.max(0, width - windowWidth)),
    top: clamp(finite(layout.top, finite(defaults.top, defaultTop)), 0, Math.max(0, height - windowHeight)),
    width: windowWidth,
    height: windowHeight,
  };
}
