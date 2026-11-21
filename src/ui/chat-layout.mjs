const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const numberOr = (value, fallback) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : fallback;

/** A saved layout must contain real coordinates and positive dimensions. Zero-size DOM rectangles are invalid. */
export function hasValidChatLayout(layout) {
  const hasCoordinate = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  return !!layout && hasCoordinate(layout.left) && hasCoordinate(layout.top) &&
    Number.isFinite(Number(layout.width)) && Number(layout.width) > 0 &&
    Number.isFinite(Number(layout.height)) && Number(layout.height) > 0;
}

/** Normalize a saved or live chat layout for the current viewport. */
export function clampChatLayout(layout = {}, viewport = {}, defaults = {}) {
  const width = Math.max(1, numberOr(viewport.width, 1));
  const height = Math.max(1, numberOr(viewport.height, 1));
  const windowWidth = clamp(numberOr(layout.width, numberOr(defaults.width, 370)), Math.min(300, width), width);
  const windowHeight = clamp(numberOr(layout.height, numberOr(defaults.height, 310)), Math.min(180, height), height);
  const fallbackTop = numberOr(defaults.top, Math.max(12, height - windowHeight - 150));
  return {
    left: clamp(numberOr(layout.left, numberOr(defaults.left, 14)), 0, Math.max(0, width - windowWidth)),
    top: clamp(numberOr(layout.top, fallbackTop), 0, Math.max(0, height - windowHeight)),
    width: windowWidth,
    height: windowHeight,
  };
}

/** Repair layouts written by older builds while preserving valid user positions, including zero-edge positions. */
export function restoreChatLayout(layout, viewport, defaults) {
  return clampChatLayout(hasValidChatLayout(layout) ? layout : defaults, viewport, defaults);
}
