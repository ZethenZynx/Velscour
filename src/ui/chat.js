// Desktop chat window for the PC edition. It presents the game's existing log;
// multiplayer-only channels remain absent because this build has no chat server.
import { UI } from './ui.js';

const STORAGE_KEY = 'velscour.pc.chat-window.v1';
const MAX_MESSAGES = 300;
const MAX_RENDERED = MAX_MESSAGES;
const FADE_DELAY = 5500;

function loadPrefs() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch (_) { return {}; }
}

function plainText(html) {
  const node = document.createElement('div');
  node.innerHTML = String(html ?? '');
  return (node.textContent || '').replace(/\s+/g, ' ').trim();
}

export const GameChat = {
  root: null,
  list: null,
  messages: [],
  prefs: loadPrefs(),
  activeTab: 'all',
  includeSystem: true,
  unsubscribe: null,
  fadeTimer: 0,
  observer: null,
  dragging: null,
  resizing: null,
  initialized: false,

  init() {
    if (this.initialized) return;
    const app = document.getElementById('app');
    if (!app) return;
    this.initialized = true;
    this.includeSystem = this.prefs.includeSystem !== false;
    const root = document.createElement('section');
    root.id = 'game-chat';
    root.className = 'game-chat hidden';
    root.setAttribute('aria-label', 'Game messages');
    root.innerHTML = `
      <header class="gc-header">
        <span class="gc-title-mark" aria-hidden="true">✦</span>
        <div class="gc-drag-handle"><span class="gc-title">Adventurer's Log</span><small>LOCAL GAME MESSAGES</small></div>
        <button class="gc-pin" type="button" aria-label="Pin chat window" title="Pin window"><svg class="gc-pin-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 2h6l-.7 4 2.5 2.4v1.2H11l-.5 7.2-1 .8L9 9.6H5.2V8.4L7.7 6z"></path><path d="M9.5 17.6 8.8 19"></path></svg></button>
        <button class="gc-minimize" type="button" aria-label="Minimize chat window" title="Minimize">−</button>
      </header>
      <nav class="gc-tabs" aria-label="Message channels">
        <button class="gc-tab active" type="button" data-tab="all">All</button>
        <button class="gc-tab" type="button" data-tab="system">System</button>
      </nav>
      <div class="gc-filter-row">
        <label title="Show or hide game log notifications"><input class="gc-system-filter" type="checkbox"> System messages</label>
        <span class="gc-offline-note">Player chat is unavailable offline</span>
      </div>
      <div class="gc-message-list" role="log" aria-live="polite" aria-relevant="additions"></div>
      <button class="gc-unread hidden" type="button" aria-label="Jump to newest messages">New messages below <span>0</span> ↓</button>
      <div class="gc-footer"><span>Messages from the existing game log</span><span class="gc-count">0</span></div>
      <div id="gc-resize-handle" class="gc-resize-handle" role="separator" aria-label="Resize chat window" tabindex="0"><svg viewBox="0 0 16 16" aria-hidden="true"><line x1="5" y1="15" x2="15" y2="5"></line><line x1="10" y1="15" x2="15" y2="10"></line><line x1="14" y1="15" x2="15" y2="14"></line></svg></div>`;
    const launcher = document.createElement('button');
    launcher.id = 'game-chat-launcher';
    launcher.className = 'game-chat-launcher hidden';
    launcher.type = 'button';
    launcher.textContent = 'Messages';
    launcher.title = 'Open the adventurer’s log';
    launcher.setAttribute('aria-label', 'Open game messages');
    app.append(root, launcher);
    this.root = root;
    this.list = root.querySelector('.gc-message-list');
    this.applyPrefs();
    this.bindEvents(launcher);
    this.unsubscribe = UI.onLog((html, color) => this.addSystemMessage(html, color));
    const hud = document.getElementById('hud');
    if (hud && typeof MutationObserver !== 'undefined') {
      this.observer = new MutationObserver(() => this.syncGameVisibility());
      this.observer.observe(hud, { attributes: true, attributeFilter: ['class'] });
    }
    window.addEventListener('resize', () => this.clampToViewport());
    this.syncGameVisibility();
  },

  bindEvents(launcher) {
    const root = this.root;
    root.addEventListener('pointerdown', () => {
      this.wake();
    });
    root.addEventListener('wheel', (event) => event.stopPropagation(), { passive: true });
    root.addEventListener('pointerenter', () => this.wake());
    root.addEventListener('pointerleave', () => this.scheduleFade());
    root.addEventListener('focusin', () => this.wake());
    root.addEventListener('focusout', () => this.scheduleFade());
    root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        root.blur?.();
        this.minimize();
      }
      // There is intentionally no send field in the offline PC build.
      event.stopPropagation();
    });
    root.querySelectorAll('.gc-tab').forEach((button) => button.addEventListener('click', () => {
      this.activeTab = button.dataset.tab;
      root.querySelectorAll('.gc-tab').forEach((tab) => tab.classList.toggle('active', tab === button));
      this.render();
    }));
    root.querySelector('.gc-system-filter').addEventListener('change', (event) => {
      this.includeSystem = event.target.checked;
      this.savePrefs();
      this.render();
    });
    root.querySelector('.gc-pin').addEventListener('click', () => {
      this.prefs.pinned = !this.prefs.pinned;
      this.updatePin();
      this.savePrefs();
      if (this.prefs.pinned) root.classList.remove('gc-dimmed'); else this.scheduleFade();
    });
    root.querySelector('.gc-minimize').addEventListener('click', () => this.minimize());
    launcher.addEventListener('click', () => this.restore());
    root.querySelector('.gc-unread').addEventListener('click', () => this.scrollToBottom());
    this.list.tabIndex = -1;
    this.list.addEventListener('scroll', () => {
      if (this.isAtBottom()) this.clearUnread();
    }, { passive: true });
    this.bindDrag();
    this.bindResize();
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.repeat && !event.target?.closest?.('input, textarea, select, button, [contenteditable="true"]') && !UI.modal && document.getElementById('hud') && !document.getElementById('hud').classList.contains('hidden')) {
        this.restore();
        this.list?.focus({ preventScroll: true });
      }
      if (event.key === 'Escape' && !root.classList.contains('hidden') && !root.classList.contains('gc-faded') && !root.contains(event.target)) {
        event.preventDefault();
        event.stopPropagation();
        this.minimize();
      }
    });
  },

  bindDrag() {
    const handle = this.root.querySelector('.gc-drag-handle');
    handle.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const rect = this.root.getBoundingClientRect();
      this.dragging = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      handle.setPointerCapture?.(event.pointerId);
      const move = (ev) => {
        if (!this.dragging) return;
        this.setPosition(this.dragging.left + ev.clientX - this.dragging.x, this.dragging.top + ev.clientY - this.dragging.y, false);
      };
      const end = () => {
        if (!this.dragging) return;
        this.dragging = null;
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', end);
        handle.removeEventListener('pointercancel', end);
        this.savePrefs();
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', end);
      handle.addEventListener('pointercancel', end);
    });
  },

  bindResize() {
    const handle = this.root.querySelector('.gc-resize-handle');
    handle.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const rect = this.root.getBoundingClientRect();
      this.resizing = { x: event.clientX, y: event.clientY, width: rect.width, height: rect.height };
      handle.setPointerCapture?.(event.pointerId);
      const move = (ev) => {
        if (!this.resizing) return;
        const maxW = Math.max(300, window.innerWidth - this.root.offsetLeft);
        const maxH = Math.max(180, window.innerHeight - this.root.offsetTop);
        const width = Math.max(300, Math.min(maxW, this.resizing.width + ev.clientX - this.resizing.x));
        const height = Math.max(180, Math.min(maxH, this.resizing.height + ev.clientY - this.resizing.y));
        this.root.style.width = `${width}px`;
        this.root.style.height = `${height}px`;
      };
      const end = () => {
        if (!this.resizing) return;
        this.resizing = null;
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', end);
        handle.removeEventListener('pointercancel', end);
        this.clampToViewport();
        this.savePrefs();
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', end);
      handle.addEventListener('pointercancel', end);
    });
    handle.addEventListener('keydown', (event) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const grow = event.shiftKey ? 20 : 5;
      const width = this.root.offsetWidth + (event.key === 'ArrowRight' ? grow : event.key === 'ArrowLeft' ? -grow : 0);
      const height = this.root.offsetHeight + (event.key === 'ArrowDown' ? grow : event.key === 'ArrowUp' ? -grow : 0);
      this.root.style.width = `${Math.max(300, Math.min(window.innerWidth - this.root.offsetLeft, width))}px`;
      this.root.style.height = `${Math.max(180, Math.min(window.innerHeight - this.root.offsetTop, height))}px`;
      this.savePrefs();
    });
  },

  syncGameVisibility() {
    const inGame = document.body && document.getElementById('hud') && !document.getElementById('hud').classList.contains('hidden');
    if (inGame) {
      if (this.prefs.minimized) this.minimize(); else this.restore(false);
    } else {
      this.root?.classList.add('hidden');
      document.getElementById('game-chat-launcher')?.classList.add('hidden');
      document.body?.classList.remove('game-chat-expanded');
    }
  },

  addSystemMessage(html, color = '') {
    const text = plainText(html);
    if (!text) return;
    const wasAtBottom = this.isAtBottom();
    this.messages.push({ text, color: /^#[\da-f]{3,8}$/i.test(String(color)) ? color : '', time: Date.now() });
    if (this.messages.length > MAX_MESSAGES) this.messages.splice(0, this.messages.length - MAX_MESSAGES);
    if (this.root && !this.root.classList.contains('hidden')) {
      if (this.includeSystem) {
        this.list.appendChild(this.createMessageRow(this.messages[this.messages.length - 1]));
        while (this.list.children.length > MAX_RENDERED) this.list.firstElementChild.remove();
        this.root.querySelector('.gc-count').textContent = `${this.messages.length} ${this.messages.length === 1 ? 'message' : 'messages'}`;
        if (wasAtBottom) this.scrollToBottom(); else this.incrementUnread();
      }
    }
  },

  createMessageRow(item) {
    const row = document.createElement('div');
    row.className = 'gc-message';
    if (item.color) row.style.color = item.color;
    const time = document.createElement('time');
    time.dateTime = new Date(item.time).toISOString();
    time.textContent = new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const text = document.createElement('span');
    text.textContent = item.text;
    row.append(time, text);
    return row;
  },

  render() {
    if (!this.list) return;
    const filtered = this.messages.filter((message) => (this.activeTab === 'all' || this.activeTab === 'system') && this.includeSystem);
    const visible = filtered.slice(-MAX_RENDERED);
    const wasAtBottom = this.isAtBottom();
    this.list.replaceChildren();
    if (!visible.length) {
      const empty = document.createElement('div');
      empty.className = 'gc-empty';
      empty.textContent = this.includeSystem ? 'No messages yet. The game log will appear here.' : 'System messages are hidden by your filter.';
      this.list.appendChild(empty);
    } else {
      const fragment = document.createDocumentFragment();
      for (const item of visible) fragment.appendChild(this.createMessageRow(item));
      this.list.appendChild(fragment);
    }
    this.root.querySelector('.gc-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'message' : 'messages'}`;
    this.root.querySelector('.gc-system-filter').checked = this.includeSystem;
    if (wasAtBottom) this.scrollToBottom();
  },

  isAtBottom() {
    if (!this.list) return true;
    return this.list.scrollHeight - this.list.scrollTop - this.list.clientHeight < 28;
  },
  scrollToBottom() {
    if (this.list) this.list.scrollTop = this.list.scrollHeight;
    this.clearUnread();
  },
  incrementUnread() {
    const badge = this.root?.querySelector('.gc-unread');
    if (!badge) return;
    const count = Number(badge.dataset.count || 0) + 1;
    badge.dataset.count = String(count);
    badge.querySelector('span').textContent = String(count);
    badge.classList.remove('hidden');
  },
  clearUnread() {
    const badge = this.root?.querySelector('.gc-unread');
    if (!badge) return;
    badge.dataset.count = '0';
    badge.querySelector('span').textContent = '0';
    badge.classList.add('hidden');
  },

  restore(wake = true) {
    if (!this.root) return;
    this.root.classList.remove('hidden');
    this.root.classList.remove('gc-dimmed', 'gc-fading', 'gc-faded');
    document.getElementById('game-chat-launcher')?.classList.add('hidden');
    document.body.classList.add('game-chat-expanded');
    this.prefs.minimized = false;
    this.render();
    if (wake) this.wake(); else this.scheduleFade();
    this.savePrefs();
  },
  minimize() {
    if (!this.root) return;
    this.root.classList.add('hidden');
    document.getElementById('game-chat-launcher')?.classList.remove('hidden');
    document.body.classList.remove('game-chat-expanded');
    this.prefs.minimized = true;
    this.savePrefs();
  },
  wake() {
    clearTimeout(this.fadeTimer);
    if (!this.root) return;
    this.root.classList.remove('gc-dimmed', 'gc-fading', 'gc-faded');
    if (!this.root.classList.contains('hidden')) document.body.classList.add('game-chat-expanded');
    this.scheduleFade();
  },
  scheduleFade() {
    clearTimeout(this.fadeTimer);
    if (this.prefs.pinned || !this.root || this.root.matches(':hover') || this.root.contains(document.activeElement)) return;
    this.fadeTimer = setTimeout(() => {
      if (!this.root || this.prefs.pinned || this.root.matches(':hover') || this.root.contains(document.activeElement)) return;
      this.root.classList.add('gc-fading');
      this.fadeTimer = setTimeout(() => {
        if (!this.root || this.prefs.pinned || this.root.matches(':hover') || this.root.contains(document.activeElement)) return;
        this.root.classList.remove('gc-fading');
        this.root.classList.add('gc-faded');
        document.body.classList.remove('game-chat-expanded');
      }, 420);
    }, FADE_DELAY);
  },
  updatePin() {
    const button = this.root?.querySelector('.gc-pin');
    if (!button) return;
    button.classList.toggle('active', !!this.prefs.pinned);
    button.setAttribute('aria-label', this.prefs.pinned ? 'Unpin chat window' : 'Pin chat window');
    button.title = this.prefs.pinned ? 'Unpin window' : 'Pin window';
  },
  setPosition(left, top, save = true) {
    if (!this.root) return;
    const maxLeft = Math.max(0, window.innerWidth - this.root.offsetWidth);
    const maxTop = Math.max(0, window.innerHeight - this.root.offsetHeight);
    this.root.style.left = `${Math.max(0, Math.min(maxLeft, left))}px`;
    this.root.style.top = `${Math.max(0, Math.min(maxTop, top))}px`;
    this.root.style.bottom = 'auto';
    this.root.style.right = 'auto';
    if (save) this.savePrefs();
  },
  clampToViewport() {
    if (!this.root || this.root.classList.contains('hidden')) return;
    const rect = this.root.getBoundingClientRect();
    this.setPosition(rect.left, rect.top, false);
    const maxW = Math.max(300, window.innerWidth - rect.left);
    const maxH = Math.max(180, window.innerHeight - rect.top);
    this.root.style.width = `${Math.max(300, Math.min(maxW, rect.width))}px`;
    this.root.style.height = `${Math.max(180, Math.min(maxH, rect.height))}px`;
    this.savePrefs();
  },
  applyPrefs() {
    const width = Math.max(300, Math.min(window.innerWidth, Number(this.prefs.width) || 370));
    const height = Math.max(180, Math.min(window.innerHeight, Number(this.prefs.height) || 310));
    this.root.style.width = `${width}px`;
    this.root.style.height = `${height}px`;
    const left = Number.isFinite(Number(this.prefs.left)) ? Number(this.prefs.left) : 14;
    const top = Number.isFinite(Number(this.prefs.top)) ? Number(this.prefs.top) : Math.max(20, window.innerHeight - height - 150);
    this.setPosition(left, top, false);
    this.updatePin();
  },
  savePrefs() {
    if (!this.root) return;
    const rect = this.root.getBoundingClientRect();
    Object.assign(this.prefs, { left: rect.left, top: rect.top, width: rect.width, height: rect.height, includeSystem: this.includeSystem });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.prefs)); } catch (_) { /* private browsing may deny storage */ }
  },
};
