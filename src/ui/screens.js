// Full-screen menus: title, class select, hero save slots, death, victory, settings, help.
import { G, saveSettings } from '../state.js';
import { KEY_BINDING_ACTIONS, getKeyBinding, keyBindingLabel, setKeyBinding, resetKeyBindings } from '../core/input.js';
import { setMacroKey, MACRO_KEYS } from '../game/macros.js';
import { camera } from '../core/view.js';
import { el, escapeHtml, fmtInt } from '../core/util.js';
import { sfx, applyVolumes, initAudio } from '../core/audio.js';
import { CLASS_IDS, A } from '../core/assets.js';
import { CLASSES, ATTRS } from '../data/classes.js';
import { UI, $ } from './ui.js';
import { listSaves, heroesByClass, deleteClassSaves, classSaves, writeSave, savesReadable, unreadableSaves } from '../game/save.js';
import { backupHeroes, listBackups } from '../game/herobackup.js';
import { heroCanvas, excitable, preloadPortraits } from './heroanim.js';
import { savedGearPreview } from '../core/gearart.js';
import { attachTitleFx } from './titlefx.js';
import { creditsScreen } from './credits.js';
import { RARITY, shownEquip } from '../data/items.js';
import { RECENT_CHANGES } from '../data/recent-changes.js';
import { FILTER_ROWS, lootFilter, lootLabelFilter, saveLootFilterSettings } from '../game/lootfilter.js';
import { isProfaneName, validateCharName } from '../core/profanity.js';
import { loadRecentChanges, getCachedRecentChanges, getRecentChangesState, RECENT_CHANGES_REFRESH_MS } from '../game/recentchanges.js';
import { changesAfterBundledBuild, showUpdateDialog, checkForGameUpdates } from '../game/updater.js';
import { initTitleForkUpdater } from '../game/forkreleaseupdater.js';
import { MOUSE_CURSOR_DEFAULTS, refreshMouseCursor } from './mousecursor.js';
import { CharacterPortrait } from './characterportrait.js';

let current = null;
let currentCleanup = null;

/** On phones, hide the browser chrome and prefer landscape (where supported). */
function goFullscreen() {
  if (!G.touch || document.fullscreenElement) return;
  const de = document.documentElement;
  const req = de.requestFullscreen || de.webkitRequestFullscreen;
  if (!req) return;
  try { const p = req.call(de, { navigationUI: 'hide' }); if (p && p.catch) p.catch(() => {}); } catch (e) { /* not allowed - fine */ }
}
function show(node) {
  hide();
  current = node;
  UI.screensEl.appendChild(node);
}
export function hide() {
  if (currentCleanup) { currentCleanup(); currentCleanup = null; }
  if (current) { current.remove(); current = null; }
}

export function titleScreen() {
  G.mode = 'title';
  let updatesAvailable = [];
  const s = el('div', 'screen');
  s.classList.add('title-screen');
  s.innerHTML = `<img class="title-logo intro" src="assets/ui/logo.webp" alt="VELSCOUR PC"><div class="title-tag">A world built upon something that should have stayed dead. <b>PC EDITION</b></div>`;
  const updateNotices = el('div', 'title-update-notices');
  updateNotices.setAttribute('aria-label', 'Game updates');
  const forkUpdateButton = el('button', 'btn fork-update-btn hidden', 'Fork Release Available');
  forkUpdateButton.type = 'button';
  forkUpdateButton.setAttribute('aria-label', 'Download a new release from the Velscour PC fork');
  const bundledUpdateButton = el('button', 'btn bundled-update-btn hidden', 'Update Available');
  bundledUpdateButton.type = 'button';
  bundledUpdateButton.setAttribute('aria-label', 'Reload to apply the latest game update');
  bundledUpdateButton.onclick = () => {
    if (!s.classList.contains('title-ready')) return;
    initAudio(); sfx('ui'); showUpdateDialog(updatesAvailable);
  };
  updateNotices.append(forkUpdateButton, bundledUpdateButton);
  s.appendChild(updateNotices);
  initTitleForkUpdater(forkUpdateButton);
  const menu = el('div', 'title-menu');
  const add = (label, fn, cls = 'btn big') => { const b = el('button', cls, label); b.onclick = () => { if (!s.classList.contains('title-ready')) return; initAudio(); sfx('ui'); goFullscreen(); fn(); }; menu.appendChild(b); return b; };
  // Rebuild from local browser saves whenever the title is shown.
  const fill = () => {
    menu.textContent = '';
    const last = listSaves()[0];
    const used = Object.keys(heroesByClass()).length;
    if (last) add(`Continue<br><span style="font-size:13px;color:#a8977c">${escapeHtml(last.name)} · Lv ${last.level} ${CLASSES[last.classId].name} · Depth ${last.depth}</span>`, () => {
      const c = listSaves()[0];
      if (c) G.game.loadChar(c);
    });
    add(`Heroes <span style="font-size:13px;color:#a8977c">· ${used}/${CLASS_IDS.length}</span>`, () => classSelect(last ? last.classId : 'paladin'));
    add('Settings', settingsDialog, 'btn');
    bundledUpdateButton.classList.toggle('hidden', !updatesAvailable.length);
    add('Check for Updates', checkForGameUpdates, 'btn');
    add('Credits', () => creditsScreen(titleScreen), 'btn');
    add('How to Play', helpDialog, 'btn');
  };
  fill();
  s.refresh = fill;
  s.appendChild(menu);
  const wikiBtn = el('a', 'title-wiki-btn');
  wikiBtn.id = 'title-wiki-btn';
  wikiBtn.href = new URL('wiki.html', window.location.href).href;
  wikiBtn.target = '_blank';
  wikiBtn.rel = 'noopener noreferrer';
  wikiBtn.title = 'Open the Velscour PC Wiki in a new tab';
  wikiBtn.setAttribute('aria-label', 'Open the Velscour PC Wiki in a new tab');
  wikiBtn.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg><span>Wiki</span>`;
  wikiBtn.addEventListener('click', (event) => {
    if (!s.classList.contains('title-ready')) { event.preventDefault(); return; }
    initAudio(); sfx('ui');
  });
  s.appendChild(wikiBtn);
  const changes = el('div', 'title-changes');
  changes.setAttribute('aria-label', 'Recent Changes');
  changes.innerHTML = `<section class="recent-changes-window" aria-labelledby="recent-changes-title"><header><h2 id="recent-changes-title">Recent Changes</h2></header><p class="recent-changes-status" aria-live="polite"></p><ul class="recent-changes-list"></ul></section>`;
  const changesList = changes.querySelector('.recent-changes-list');
  const changesStatus = changes.querySelector('.recent-changes-status');
  const formatDate = (date) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return 'Date unavailable';
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
  };
  const renderChanges = (items, source = getRecentChangesState()) => {
    const groups = [];
    for (const item of items) {
      const date = item.date || '';
      let group = groups[groups.length - 1];
      if (!group || group.date !== date) groups.push(group = { date, items: [] });
      group.items.push(item);
    }
    changesList.replaceChildren();
    if (!groups.length) {
      const empty = document.createElement('li');
      empty.className = 'recent-changes-empty';
      empty.textContent = 'No saved commit history yet. Connect to GitHub and reopen this window to load changes from Velscour PC.';
      changesList.appendChild(empty);
    }
    for (const group of groups) {
      const dateHeading = document.createElement('li');
      dateHeading.className = 'change-date';
      const time = document.createElement('time');
      if (group.date) time.dateTime = group.date;
      time.textContent = formatDate(group.date);
      dateHeading.appendChild(time);
      changesList.appendChild(dateHeading);
      for (const item of group.items) {
        const entry = document.createElement('li');
        entry.className = 'recent-change-entry';
        const badge = document.createElement('span');
        badge.className = `recent-change-category ${item.category === 'Maintenance' ? 'maintenance' : item.category === 'Game update' ? 'game-update' : 'other-change'}`;
        badge.textContent = item.category || 'Commit';
        const title = document.createElement('strong');
        title.textContent = item.title || 'Untitled commit';
        const meta = document.createElement('div');
        meta.className = 'recent-change-meta';
        if (item.author) {
          const author = document.createElement('span');
          author.textContent = item.author;
          meta.appendChild(author);
        }
        if (item.url) {
          const link = document.createElement('a');
          link.href = item.url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = `Commit ${item.shortSha || String(item.sha || '').slice(0, 7)}`;
          meta.appendChild(link);
        }
        entry.append(badge, title, meta);
        if (item.summary) {
          const summary = document.createElement('p');
          summary.className = 'recent-change-summary';
          summary.textContent = item.summary;
          entry.appendChild(summary);
        }
        if (item.body && item.body !== item.summary) {
          const details = document.createElement('details');
          details.className = 'recent-change-details';
          const summary = document.createElement('summary');
          summary.textContent = 'Commit details';
          const body = document.createElement('pre');
          body.textContent = item.body;
          details.append(summary, body);
          entry.appendChild(details);
        }
        changesList.appendChild(entry);
      }
    }
    const updated = source.savedAt ? formatDate(new Date(source.savedAt).toISOString().slice(0, 10)) : '';
    if (source.kind === 'live') changesStatus.textContent = `Latest commits from ZethenZynx/Velscour-PC · refreshed ${updated}`;
    else if (source.kind === 'loading') changesStatus.textContent = items.length ? 'Checking GitHub; showing saved commits…' : 'Loading commits from Velscour PC…';
    else if (source.kind === 'stale') changesStatus.textContent = `GitHub unavailable (${source.message || 'request failed'}); showing saved commits${updated ? ` from ${updated}` : ''}.`;
    else if (source.kind === 'unavailable') changesStatus.textContent = `Could not load commits from GitHub (${source.message || 'offline'}). Reopen this window when online.`;
    else if (source.kind === 'cached') changesStatus.textContent = `Saved commits from ZethenZynx/Velscour-PC · refreshed ${updated}`;
    else changesStatus.textContent = 'Commit history is loaded from the public Velscour PC repository.';
    if (source.bundledFallback) {
      if (source.kind === 'loading') changesStatus.textContent = 'Checking GitHub; showing the included change history.';
      else if (source.kind === 'stale' || source.kind === 'unavailable') changesStatus.textContent = `GitHub unavailable (${source.message || 'offline'}); showing the included change history.`;
      else changesStatus.textContent = 'Showing the included change history while GitHub has no cached commits.';
    }
  };
  const initialChanges = getCachedRecentChanges();
  renderChanges(initialChanges.length ? initialChanges : RECENT_CHANGES,
    initialChanges.length ? getRecentChangesState() : { kind: 'bundled', bundledFallback: true });
  s.appendChild(changes);
  const foot = el('div', 'title-foot');
  s.appendChild(foot);
  foot.textContent = 'Rough draft · placeholder art · progress saves in this browser';
  const gate = el('div', 'title-gate', G.touch ? 'Tap to awaken' : 'Click to awaken');
  s.appendChild(gate);
  show(s);
  const refreshChanges = () => {
    const pending = loadRecentChanges();
    const cached = getCachedRecentChanges();
    renderChanges(cached.length ? cached : RECENT_CHANGES,
      { ...getRecentChangesState(), bundledFallback: !cached.length });
    return pending.then((items) => {
    if (current !== s) return;
    renderChanges(items.length ? items : RECENT_CHANGES,
      { ...getRecentChangesState(), bundledFallback: !items.length });
    const nextUpdates = changesAfterBundledBuild(items);
    const before = updatesAvailable.map((item) => `${item.date || ''}\u0000${item.title || ''}`).join('\n');
    const after = nextUpdates.map((item) => `${item.date || ''}\u0000${item.title || ''}`).join('\n');
    updatesAvailable = nextUpdates;
    if (before !== after) fill();
    });
  };
  refreshChanges();
  const refreshTimer = setInterval(refreshChanges, RECENT_CHANGES_REFRESH_MS);
  currentCleanup = () => clearInterval(refreshTimer);
  attachTitleFx(s, s.querySelector('.title-logo'), {
    tag: s.querySelector('.title-tag'),
    menu,
    gate,
    onAwaken: (proceed) => showSeizureWarningSplash(proceed),
  });
  if (!unreadableNoted && !savesReadable()) {
    unreadableNoted = true;
    UI.dialog({ title: 'Saved heroes unreadable', html: '<p>The heroes saved in this browser could not be read. VELSCOUR will not write over them: before anything new is saved, the old data is set aside.</p><p class="dim">Settings &gt; Hero backups can download it, so it can be recovered.</p>', buttons: [{ label: 'OK' }] });
  }
}

/** Photosensitive Epilepsy & Seizure Warning splash screen shown upon awakening the game. */
export function showSeizureWarningSplash(onContinue) {
  const splash = el('div', 'seizure-warning-splash');
  const card = el('div', 'seizure-warning-card');

  card.innerHTML = `
    <div class="seizure-warning-icon">⚠️</div>
    <h2 class="seizure-warning-title">PHOTOSENSITIVE EPILEPSY &amp; SEIZURE WARNING</h2>
    <h3 class="seizure-warning-subtitle">WARNING: FLASHING LIGHTS AND VISUAL EFFECTS</h3>
    <div class="seizure-warning-body">
      <p>This game contains flashing lights, strobing effects, rapidly changing colors, and visual patterns that may trigger seizures or other adverse reactions in individuals with photosensitive epilepsy or other visual sensitivities.</p>
      <p>Some individuals may experience seizures when exposed to certain flashing lights or visual patterns, even if they have no prior history of epilepsy or seizures.</p>
      <p>Stop playing immediately if you experience dizziness, visual disturbances, eye or muscle twitching, involuntary movements, confusion, disorientation, or loss of awareness.</p>
      <p>If you experience a seizure, seek medical attention. Consult a healthcare professional before playing if you have a history of seizures or photosensitivity.</p>
      <p class="seizure-warning-advisory">PLAYER DISCRETION IS ADVISED.</p>
    </div>
    <div class="seizure-warning-toggle">
      <label class="seizure-toggle-label">
        <input type="checkbox" id="seizure-reduce-flashing-checkbox" ${G.settings.reduceFlashing ? 'checked' : ''}>
        <span>Reduce flashing &amp; strobing visual effects</span>
      </label>
    </div>
    <div class="seizure-warning-prompt">${G.touch ? 'Tap anywhere to continue' : 'Click anywhere to continue'}</div>
  `;

  splash.appendChild(card);
  document.body.appendChild(splash);

  const checkbox = card.querySelector('#seizure-reduce-flashing-checkbox');
  if (checkbox) {
    checkbox.onchange = (e) => {
      e.stopPropagation();
      G.settings.reduceFlashing = !!checkbox.checked;
      saveSettings();
    };
    checkbox.onclick = (e) => e.stopPropagation();
    checkbox.onpointerdown = (e) => e.stopPropagation();
  }

  let closed = false;
  const allowDismissAt = performance.now() + 400; // guard against the awaken tap immediately dismissing

  const dismiss = (e) => {
    if (closed || performance.now() < allowDismissAt) return;
    if (e && e.target && (e.target === checkbox || e.target.closest('.seizure-toggle-label'))) return;
    closed = true;
    window.removeEventListener('keydown', onKeyDown);
    splash.classList.add('fading');
    setTimeout(() => {
      splash.remove();
      if (onContinue) onContinue();
    }, 280);
  };

  const onKeyDown = (e) => {
    if (closed || performance.now() < allowDismissAt) return;
    if (e.key === 'Tab') return;
    dismiss();
  };

  splash.addEventListener('click', dismiss);
  splash.addEventListener('pointerup', dismiss);
  window.addEventListener('keydown', onKeyDown);
}
let unreadableNoted = false;
if (typeof addEventListener === 'function') addEventListener('velscour-save-blocked', () => {
  UI.dialog({ title: 'Not saving', html: '<p>The heroes saved in this browser could not be read, and there was no room to set them aside, so the game is not saving over them. Free some browser storage (or use another browser) and reload.</p>', buttons: [{ label: 'OK' }] });
});

// ------------------------------------------------------------ local hero backups
const WHY = { restore: 'replaced by a restored backup' };
/** Settings > Hero backups: local restore points and unreadable save recovery copies. */
export function backupsDialog() {
  const d = UI.dialog({ title: 'Hero Backups', html: '<p class="dim">Loading…</p>', buttons: [{ label: 'Done' }], cls: 'backups-dialog' });
  const body = d.box.querySelector('.dlg-body');
  Promise.all([listBackups().catch(() => null), unreadableSaves()]).then(([list, raws]) => {
    if (!d.box.isConnected) return;
    if (!list && !raws.length) { body.innerHTML = '<p>Backups can\'t be opened in this browser.</p>'; return; }
    list = list || [];
    if (!list.length && !raws.length) { body.innerHTML = '<p>No local hero backups yet. Recovery copies are kept here when you restore an older backup or when saved data cannot be read.</p>'; return; }
    body.innerHTML = `<p class="dim" style="font-size:12px">${G.mode === 'game' ? 'Return to the title screen to restore a hero.' : 'Restoring makes that copy the class\'s hero; the one it replaces is backed up too.'}</p><div class="backup-list"></div>`;
    const box = body.querySelector('.backup-list');
    for (const r of raws) {   // unreadable save data set aside by save.js: download it for recovery
      const row = el('div', 'backup-row', `<span><b>Unreadable saved heroes</b> · ${fmtInt(Math.ceil(r.text.length / 1024))} KB<br><span class="dim">set aside before a new save · ${new Date(r.at).toLocaleString()}</span></span>`);
      const btn = el('button', 'btn small', 'Download');
      btn.onclick = () => {
        sfx('ui');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([r.text], { type: 'application/json' }));
        a.download = `velscour-unreadable-saves-${new Date(r.at).toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      };
      row.appendChild(btn);
      box.appendChild(row);
    }
    for (const b of list) {
      const h = b.hero, C = CLASSES[b.cls];
      const row = el('div', 'backup-row', `<span><b>${escapeHtml(h.name)}</b> · ${C ? C.name : escapeHtml(b.cls)} · Lv ${h.level} · Depth ${h.depth} · ${fmtInt(h.gold || 0)} gold<br><span class="dim">${WHY[b.why] || escapeHtml(b.why)} · ${new Date(b.at).toLocaleString()}</span></span>`);
      const btn = el('button', 'btn small', 'Restore');
      btn.disabled = G.mode === 'game';
      btn.onclick = () => {
        sfx('ui');
        UI.confirm('Restore hero?', `Make this copy of ${escapeHtml(h.name)} (Level ${h.level}) your ${C ? C.name : 'hero'}? The current one is kept as a backup.`, async () => {
          try { await backupHeroes(classSaves(b.cls), 'restore'); } catch (e) { UI.dialog({ title: 'Hero Backups', html: '<p>Could not back up the current hero first, so nothing was restored.</p>', buttons: [{ label: 'OK' }] }); return; }
          writeSave(JSON.parse(JSON.stringify(h)));
          d.close();
          if (current && current.refresh) current.refresh();
          UI.dialog({ title: 'Hero Backups', html: `<p>${escapeHtml(h.name)} is restored.</p>`, buttons: [{ label: 'OK' }] });
        }, 'Restore');
      };
      row.appendChild(btn);
      box.appendChild(row);
    }
  }).catch((e) => { console.warn(e); if (d.box.isConnected) body.innerHTML = '<p>Backups can\'t be opened in this browser.</p>'; });
  return d;
}

const plaque = (name) => `<div class="plaque"><span>${escapeHtml(name)}</span></div>`;

/** Hero select: one hero per class. A class with a hero plays it; an empty class names and starts a new one.
 * Delete arms delete mode: the next class picked with a hero is deleted (after a confirm), freeing that class. */
export function classSelect(sel = 'paladin', back = titleScreen) {
  const heroes = heroesByClass();
  let delMode = false;
  preloadPortraits(CLASS_IDS);
  const s = el('div', 'screen class-screen');
  s.appendChild(el('h2', 'screen-title', `CHOOSE YOUR HERO <small>${Object.keys(heroes).length} of ${CLASS_IDS.length} heroes</small>`));
  const grid = el('div', 'class-grid');
  const info = el('div', 'class-info');
  const bigBox = el('div', 'class-big');
  const big = heroCanvas(sel, 'hero-cv');
  bigBox.appendChild(big.canvas);
  excitable(bigBox, big);
  const text = el('div', 'class-text');
  info.append(bigBox, text);
  const cards = {};
  const showSavedGear = (id, anim) => {
    const h = heroes[id];
    if (!h || !h.equip) return;
    const look = shownEquip(h);
    savedGearPreview(id, look.body, look.head).then(art => {
      if (!art || !s.isConnected || anim.id !== id) return;
      anim.setArt(art);
      anim.canvas.dataset.gearPreview = 'ready';
    });
  };
  const row = el('div', 'row');
  const name = el('input', 'name-input');
  const go = el('button', 'btn big', 'Begin');
  const delBtn = el('button', 'btn red', 'Delete');
  const renderInfo = () => {
    const C = CLASSES[sel], h = heroes[sel];
    big.setId(sel);
    showSavedGear(sel, big);
    const slots = { weapon: 'Weapon', offhand: 'Offhand', body: 'Armor', head: 'Helm', hands: 'Gloves', legs: 'Legs', feet: 'Boots', ring1: 'Ring I', ring2: 'Ring II', ring3: 'Ring III', ring4: 'Ring IV' };
    const gear = h && h.equip ? Object.entries(slots).filter(([slot]) => h.equip[slot])
      .map(([slot, label]) => '<span><b>' + label + ':</b> ' + escapeHtml(h.equip[slot].name || h.equip[slot].base || 'Equipped') + '</span>').join('') : '';
    text.innerHTML = (h ? `<h2>${escapeHtml(h.name)}</h2><p><b style="color:#ffd34a">Level ${h.level} ${C.name}</b> · Depth ${h.depth} · Deepest ${h.deepest || 0} · ${fmtInt(h.gold)} gold</p>` : `<h2>${C.name}</h2>`) +
      `<p>${escapeHtml(C.desc)}</p><p class="dim">Skill trees: <b style="color:#e9dcc4">${C.trees.join(' · ')}</b><br>Primary attribute: <b style="color:#ffd34a">${ATTRS[C.primary].name}</b> · Life ${C.life} · Mana ${C.mana}</p>` +
      (gear ? '<div class="class-gear-summary" aria-label="Saved equipped gear">' + gear + '</div>' : '');
    for (const id in cards) cards[id].classList.toggle('sel', id === sel);
    name.style.display = h ? 'none' : '';
    go.innerHTML = h ? 'Play' : 'Begin';
    s.classList.toggle('del-mode', delMode);
    delBtn.innerHTML = delMode ? 'Cancel' : 'Delete';
  };
  const delHero = (id) => {
    delMode = false;
    renderInfo();
    UI.confirm('Delete hero?', `Permanently delete ${escapeHtml(heroes[id].name)}, the ${CLASSES[id].name}? You can then start a new ${CLASSES[id].name}.`, () => { deleteClassSaves(id); classSelect(id, back); }, 'Delete');
  };
  for (const id of CLASS_IDS) {
    const card = el('div', 'class-card' + (heroes[id] ? ' has-hero' : ''));
    const anim = heroCanvas(id);
    card.appendChild(anim.canvas);
    showSavedGear(id, anim);
    const h = heroes[id];
    if (h) card.insertAdjacentHTML('beforeend', `<div class="card-lv">Lv ${h.level}</div>`);
    card.insertAdjacentHTML('beforeend', plaque(h ? h.name : CLASSES[id].name));
    card.dataset.id = id;
    excitable(card, anim);
    card.onclick = () => {
      if (delMode && heroes[id]) { sfx('ui'); delHero(id); return; }
      if (sel !== id) { sel = id; sfx('ui'); renderInfo(); } anim.burst(1.2); big.burst(1.4);
    };
    card.ondblclick = () => { if (!delMode) start(); };
    grid.appendChild(card);
    cards[id] = card;
  }
  s.appendChild(grid);
  s.appendChild(info);
  row.style.justifyContent = 'center';
  row.style.margin = '6px 0 14px';
  name.placeholder = 'Hero name';
  name.maxLength = 18;
  const backBtn = el('button', 'btn', 'Back');
  backBtn.onclick = () => { sfx('ui'); back(); };
  delBtn.onclick = () => {
    sfx('ui');
    if (!Object.keys(heroes).length) return;
    if (!delMode && heroes[sel]) { delHero(sel); return; }
    delMode = !delMode;
    renderInfo();
  };
  const start = async () => {
    sfx('ui');
    const h = heroesByClass()[sel];
    if (h) {
      G.game.loadChar(h);
    } else {
      const enteredName = name.value.trim() || CLASSES[sel].name;
      const val = validateCharName(enteredName);
      if (!val.valid) {
        UI.alert('Invalid Name', val.error);
        return;
      }
      G.game.newChar(sel, val.name);
    }
  };
  go.onclick = start;
  name.onkeydown = (e) => { if (e.key === 'Enter') start(); };
  row.append(backBtn, delBtn, name, go);
  s.appendChild(row);
  renderInfo();
  show(s);
  s.refresh = () => classSelect(sel, back);
}

/** o.where / o.note replace the "Depth N" line and the descent note (the Eternal Breach). */
export function deathScreen(depth, killer, onReturn, o = {}) {
  const s = el('div', 'screen');
  s.innerHTML = `<div class="death-title">YOU HAVE DIED</div><p style="font-size:18px">Slain ${o.where || `on Depth ${depth}`}${killer ? ` by <b style="color:#ff8060">${escapeHtml(killer)}</b>` : ''}.</p><p class="dim" style="max-width:520px;text-align:center;padding:0 12px">${o.note || `Your gear, levels and skills endure — but you must fight back down from Depth ${Math.max(1, Math.floor((depth - 1) / 5) * 5 - 4)}.`}</p>`;
  const b = el('button', 'btn big red', 'Return to Town');
  b.onclick = () => { sfx('ui'); hide(); onReturn(); };
  s.appendChild(b);
  show(s);
}

export function victoryScreen(onContinue) {
  const c = G.char;
  const s = el('div', 'screen');
  s.innerHTML = `<img class="title-logo" src="assets/ui/logo.webp" style="max-height:28vh"><div class="death-title" style="color:#ffb030;text-shadow:0 0 30px #f80">VELSCOUR HAS FALLEN</div>
  <p style="font-size:18px;text-align:center;max-width:620px;padding:0 12px">${escapeHtml(c.name)} the ${CLASSES[c.classId].name} has slain the Demon Lord at the bottom of the world.</p>
  <p class="dim">Level ${c.level} · ${fmtInt(c.kills || 0)} kills · ${c.deaths || 0} deaths</p>
  <p class="dim" style="text-align:center;max-width:560px">The campaign is complete. Endless Torment begins at Depth 101 and has no final depth.</p>`;
  const b = el('button', 'btn big', 'Continue');
  b.onclick = () => { sfx('ui'); hide(); onContinue(); };
  s.appendChild(b);
  show(s);
}

let activeSettingsTab = 'general';

export function settingsDialog() {
  const st = G.settings;
  const html = `<div class="settings-tabs">
    <button type="button" class="settings-tab-btn" data-tab="general">General</button>
    <button type="button" class="settings-tab-btn" data-tab="audio">Audio</button>
    <button type="button" class="settings-tab-btn" data-tab="graphics">Graphics</button>
    <button type="button" class="settings-tab-btn" data-tab="hud">HUD &amp; UI</button>
    <button type="button" class="settings-tab-btn" data-tab="mouseCursor">Mouse Cursor</button>
    <button type="button" class="settings-tab-btn" data-tab="controls">Controls</button>
  </div>
  <div class="settings-tab-pane" data-pane="general">
    <div class="settings-grid">
      <label>Game updates</label><button type="button" class="btn small" data-check-game-updates>Check now</button>
      <label>Hero backups</label><button class="btn small" data-backups>View</button>
      <label>Pause while menus open</label><input type="checkbox" data-k="pauseMenus" ${st.pauseMenus !== false ? 'checked' : ''}>
      <label title="Keep previously seen cutscenes at normal speed">Don't fast-forward seen cutscenes</label><input type="checkbox" data-k="noSkipCine" ${st.noSkipCine ? 'checked' : ''}>
      <label title="Automatically fast-forwards all cutscenes, dialogue, and scripted camera pans/zooms, including the first time">Skip cutscenes and camera transitions</label><input type="checkbox" data-k="skipCutscenes" ${st.skipCutscenes ? 'checked' : ''}>
      <label title="Summons, totems and turrets on your skill bar are cast again the moment one is missing (timed ones only with an enemy near)">Auto-cast summons</label><input type="checkbox" data-k="autoSummon" ${st.autoSummon !== false ? 'checked' : ''}>
      <label>Auto-pickup items</label><input type="checkbox" data-k="autoLoot" ${st.autoLoot ? 'checked' : ''}>
      <label title="Automatically equip eligible gear from drops and vendor purchases when its matching equipment slot is empty">Auto-equip gear in empty slots</label><input type="checkbox" data-k="autoEquip" ${st.autoEquip !== false ? 'checked' : ''}>
      <label>Loot filter</label><button class="btn small" data-loot-filter>${lootFilter().on ? 'On' : 'Off'} · Set up</button>
    </div>
  </div>
  <div class="settings-tab-pane" data-pane="audio">
    <div class="settings-grid">
      <label>Sound effects</label><input type="range" min="0" max="1" step="0.05" value="${st.sfx}" data-k="sfx">
      <label>Music</label><input type="range" min="0" max="1" step="0.05" value="${st.music}" data-k="music">
      <label>Ambience</label><input type="range" min="0" max="1" step="0.05" value="${st.amb ?? 0.5}" data-k="amb">
    </div>
  </div>
  <div class="settings-tab-pane" data-pane="graphics">
    <div class="settings-grid">
      <label>Camera zoom</label><input type="range" min="0.7" max="1.6" step="0.05" value="${st.zoom}" data-k="zoom">
      <label title="Changes the terrain and walls on the TAB map only; important markers stay clear">TAB Map Transparency</label><div class="map-opacity-control"><input type="range" min="0" max="100" step="1" value="${st.tabMapTransparency ?? 45}" data-k="tabMapTransparency"><output data-map-opacity>${st.tabMapTransparency ?? 45}%</output><button type="button" class="btn small" data-reset-map-opacity>Reset</button></div>
      <label title="30 draws half the frames: smoother than a frame rate that keeps dipping, and a phone stays cooler (a hot phone slows itself down after a long session)">Frame rate cap</label><select data-k="fpsCap"><option value="0">None</option><option value="30">30 fps (cooler phone)</option></select>
      <label>Gore</label><select data-k="gore"><option value="0">Off</option><option value="1">Bloody</option><option value="2">Extreme</option></select>
      <label>Screen shake</label><input type="checkbox" data-k="shake" ${st.shake ? 'checked' : ''}>
      <label title="Reduce full-screen flashes, flashbangs, and rapid hit strobing">Reduce flashing effects</label><input type="checkbox" data-k="reduceFlashing" ${st.reduceFlashing ? 'checked' : ''}>
      <label title="The hero, monsters and pets keep a coloured outline over spells, walls and darkness (hidden only behind another creature)">See-through outlines</label><input type="checkbox" data-k="outlines" ${st.outlines !== false ? 'checked' : ''}>
      <label title="A line along the foot of the dungeon's walls, drawn over every spell (not over creatures)">Outline wall bases</label><input type="checkbox" data-k="wallLines" ${st.wallLines ? 'checked' : ''}>
      <label title="The hero holds his weapon and off-hand, each in its own look">Show weapons and off-hands</label><input type="checkbox" data-k="heldGear" ${st.heldGear !== false ? 'checked' : ''}>
      <label title="Glows, particles and gem sparks on held weapons, and sparkles on rare armor and helmets (with weapons shown)">Weapon and gear effects</label><input type="checkbox" data-k="heldFx" ${st.heldFx !== false ? 'checked' : ''}>
      <label title="The Death Knight's flying sword: his equipped sword as a flat 2D object, the same sword as a live 3D model, or the old Runeblade">Death Knight's flying sword</label><select data-k="dkBlade" data-str="1">${[['sprite', 'Equipped sword (2D)'], ['model', 'Equipped sword (3D)'], ['runeblade', 'Runeblade']].map(([v, n]) => `<option value="${v}"${(st.dkBlade || 'sprite') === v ? ' selected' : ''}>${n}</option>`).join('')}</select>
    </div>
  </div>
  <div class="settings-tab-pane" data-pane="controls">
    <p class="dim">Click a binding, then press the key you want to use. If another action already uses that key, the two bindings swap. Press Escape to cancel.</p>
    <div class="settings-grid">
      <label>Keyboard bindings</label><button type="button" class="btn small" data-reset-keybinds>Reset defaults</button>
      <span data-keybind-rows></span>
      <span data-macro-bindings></span>
      <label>Mouse buttons</label><span class="dim">LMB and RMB remain assigned to the action bar</span>
    </div>
    <p class="dim" data-keybind-status aria-live="polite"></p>
  </div>
  <div class="settings-tab-pane" data-pane="mouseCursor">
    <div class="cursor-live-preview" data-cursor-preview tabindex="0"><b>Live Cursor Preview</b><span>Move your mouse here to preview the cursor, trail, and locator effects.</span></div>
    <div class="cursor-settings-group"><h3>Cursor Appearance</h3><div class="cursor-settings-grid">
      <label>Color</label><select data-cursor="color"><option value="default">Default</option><option value="white">White</option><option value="black">Black</option><option value="red">Red</option><option value="orange">Orange</option><option value="yellow">Yellow</option><option value="green">Green</option><option value="cyan">Cyan</option><option value="blue">Blue</option><option value="purple">Purple</option><option value="pink">Pink</option><option value="gold">Gold</option><option value="rainbow">Rainbow</option><option value="inverted">Inverted / high contrast</option><option value="custom">Custom</option></select>
      <label>Custom cursor color</label><input type="color" data-cursor="customColor">
      <label>Cursor size <output data-cursor-output="size"></output></label><input type="range" min="50" max="300" step="25" data-cursor="size">
      <label>Transparency <output data-cursor-output="transparency"></output></label><input type="range" min="20" max="100" step="5" data-cursor="transparency">
      <label>Outline</label><input type="checkbox" data-cursor="outline">
      <label>Outline color</label><input type="color" data-cursor="outlineColor">
      <label>Outline thickness <output data-cursor-output="outlineThickness"></output></label><input type="range" min="1" max="8" step="1" data-cursor="outlineThickness">
      <label>Glow</label><input type="checkbox" data-cursor="glow">
      <label>Glow color</label><input type="color" data-cursor="glowColor">
      <label>Glow intensity <output data-cursor-output="glowIntensity"></output></label><input type="range" min="0" max="100" step="5" data-cursor="glowIntensity">
      <label>Pulsating glow</label><input type="checkbox" data-cursor="pulsatingGlow">
      <label>Highlight circle</label><input type="checkbox" data-cursor="highlightCircle">
    </div></div>
    <div class="cursor-settings-group"><h3>Cursor Trails</h3><div class="cursor-settings-grid">
      <label>Trail style</label><select data-cursor="trailStyle"><option value="none">None</option><option value="solid">Solid fading trail</option><option value="dotted">Dotted trail</option><option value="sparkles">Sparkles</option><option value="stars">Stars</option><option value="particles">Magical particles</option><option value="fire">Fire</option><option value="lightning">Lightning</option><option value="frost">Frost</option><option value="smoke">Smoke</option><option value="arcane">Arcane energy</option><option value="orbs">Glowing orbs</option><option value="rainbow">Rainbow</option><option value="ghost">Ghost cursor afterimages</option></select>
      <label>Custom trail color</label><input type="color" data-cursor="customTrailColor">
      <label>Match cursor color</label><input type="checkbox" data-cursor="matchCursorColor">
      <label>Rainbow color cycling</label><input type="checkbox" data-cursor="rainbowTrail">
      <label>Trail length <output data-cursor-output="trailLength"></output></label><input type="range" min="100" max="1500" step="50" data-cursor="trailLength">
      <label>Trail width <output data-cursor-output="trailWidth"></output></label><input type="range" min="1" max="14" step="1" data-cursor="trailWidth">
      <label>Particle size <output data-cursor-output="particleSize"></output></label><input type="range" min="1" max="20" step="1" data-cursor="particleSize">
      <label>Particle density <output data-cursor-output="particleDensity"></output></label><input type="range" min="0" max="100" step="5" data-cursor="particleDensity">
      <label>Fade speed <output data-cursor-output="fadeSpeed"></output></label><input type="range" min="0.25" max="3" step="0.25" data-cursor="fadeSpeed">
      <label>Trail glow <output data-cursor-output="trailGlow"></output></label><input type="range" min="0" max="100" step="5" data-cursor="trailGlow">
      <label>Trail opacity <output data-cursor-output="trailOpacity"></output></label><input type="range" min="10" max="100" step="5" data-cursor="trailOpacity">
    </div></div>
    <div class="cursor-settings-group"><h3>Cursor Locator</h3><div class="cursor-settings-grid">
      <label>Enable locator key</label><input type="checkbox" data-cursor="locatorEnabled">
      <label>Temporary highlight key</label><select data-cursor="locatorKey"><option value="AltLeft">Left Alt</option><option value="ShiftLeft">Left Shift</option><option value="ControlLeft">Left Control</option><option value="F2">F2</option><option value="F3">F3</option><option value="F4">F4</option><option value="F6">F6</option><option value="F7">F7</option><option value="F8">F8</option></select>
      <label>Highlight when mouse is shaken</label><input type="checkbox" data-cursor="shakeLocator">
      <label>Expanding pulse rings</label><input type="checkbox" data-cursor="locatorRings">
      <label>Locator size <output data-cursor-output="locatorSize"></output></label><input type="range" min="24" max="160" step="4" data-cursor="locatorSize">
      <label>Locator color</label><input type="color" data-cursor="locatorColor">
    </div></div>
    <button type="button" class="btn small" data-reset-cursor>Restore cursor defaults</button>
  </div>
  <div class="settings-tab-pane" data-pane="hud">
    <div class="settings-grid">
      <label>Character portrait window</label><input type="checkbox" data-portrait="visible" ${(st.characterPortrait?.visible !== false) ? 'checked' : ''}>
      <label>Lock portrait movement and resizing</label><input type="checkbox" data-portrait="locked" ${st.characterPortrait?.locked ? 'checked' : ''}>
      <label>Portrait size <output data-portrait-size>${st.characterPortrait?.size || 100}%</output></label><input type="range" min="75" max="150" step="25" value="${st.characterPortrait?.size || 100}" data-portrait="size">
      <label>Portrait position</label><button type="button" class="btn small" data-portrait-reset>Reset position</button>
      <label>Damage numbers</label><input type="checkbox" data-k="dmgNumbers" ${st.dmgNumbers ? 'checked' : ''}>
      <label title="Off: a bar shows only for a moment over a monster you hit, and never over bosses">Life bars over every enemy (bosses too)</label><input type="checkbox" data-k="lifeBars" ${st.lifeBars !== false ? 'checked' : ''}>
      <label>Hero stats plaque (Battle Ledger)</label><input type="checkbox" data-k="showHeroStats" ${st.showHeroStats !== false ? 'checked' : ''}>
      <label>Target info box</label><input type="checkbox" data-k="showTargetBox" ${st.showTargetBox !== false ? 'checked' : ''}>
      <label>Target portrait sprite</label><input type="checkbox" data-k="showTargetSprite" ${st.showTargetSprite !== false ? 'checked' : ''}>
      <label title="An icon per summoning skill next to the buffs, with how many of its minions are out">Minion counts with the buffs</label><input type="checkbox" data-k="minionCounts" ${st.minionCounts !== false ? 'checked' : ''}>
      <label>Show gold labels</label><input type="checkbox" data-k="showGoldLabels" ${st.showGoldLabels ? 'checked' : ''}>
      <label>Ground loot label filter</label><button class="btn small" data-label-filter>${lootLabelFilter().on ? 'On' : 'Off'} · Set up</button>
      <label>Hide dropped item names</label><input type="checkbox" data-k="hideItemNames" ${st.hideItemNames ? 'checked' : ''}>
      <label title="Off: the best drops are named first and lesser ones only close by, so a big fight's loot doesn't bury the screen; hover any item for its name">Show every item name</label><input type="checkbox" data-k="allItemNames" ${st.allItemNames ? 'checked' : ''}>
    </div>
  </div>
`;
  let stopKeyCaptureListener = () => {};
  const d = UI.dialog({ title: 'Settings', html, cls: 'settings-dialog', buttons: [{ label: 'Done', fn: () => { stopKeyCaptureListener(); camera.computeZoom(); if (UI.hud && UI.hud.applyVisibilitySettings) UI.hud.applyVisibilitySettings(); saveSettings(); } }] });
  const tabBtns = d.box.querySelectorAll('.settings-tab-btn');
  const tabPanes = d.box.querySelectorAll('.settings-tab-pane');
  const updateCheckButton = d.box.querySelector('[data-check-game-updates]');
  if (updateCheckButton) updateCheckButton.onclick = async () => {
    updateCheckButton.disabled = true;
    updateCheckButton.textContent = 'Checking…';
    try { await checkForGameUpdates(); }
    finally {
      if (updateCheckButton.isConnected) {
        updateCheckButton.disabled = false;
        updateCheckButton.textContent = 'Check now';
      }
    }
  };
  const setTab = (name) => {
    activeSettingsTab = name;
    tabBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === name));
    tabPanes.forEach((pane) => pane.classList.toggle('active', pane.dataset.pane === name));
  };
  tabBtns.forEach((btn) => {
    btn.onclick = () => {
      sfx('ui');
      setTab(btn.dataset.tab);
    };
  });
  if (!['general', 'audio', 'graphics', 'hud', 'controls', 'mouseCursor'].includes(activeSettingsTab)) activeSettingsTab = 'general';
  setTab(activeSettingsTab);
  const cursorSettings = () => (st.mouseCursor ||= { ...MOUSE_CURSOR_DEFAULTS });
  const cursorOutput = (key, value) => {
    const units = { size: '%', transparency: '%', outlineThickness: ' px', glowIntensity: '%', trailLength: ' ms', trailWidth: ' px', particleSize: ' px', particleDensity: '%', fadeSpeed: '×', trailGlow: '%', trailOpacity: '%', locatorSize: ' px' };
    const output = d.box.querySelector(`[data-cursor-output="${key}"]`);
    if (output) output.textContent = `${value}${units[key] || ''}`;
  };
  const refreshCursorControls = () => d.box.querySelectorAll('[data-cursor]').forEach((control) => {
    const key = control.dataset.cursor, value = cursorSettings()[key];
    if (control.type === 'checkbox') control.checked = !!value; else control.value = String(value ?? MOUSE_CURSOR_DEFAULTS[key]);
    cursorOutput(key, control.value);
  });
  refreshCursorControls();
  d.box.querySelectorAll('[data-cursor]').forEach((control) => {
    control.oninput = control.onchange = () => {
      const key = control.dataset.cursor;
      cursorSettings()[key] = control.type === 'checkbox' ? control.checked : control.type === 'range' ? Number(control.value) : control.value;
      cursorOutput(key, control.value);
      refreshMouseCursor(); saveSettings();
    };
  });
  d.box.querySelector('[data-reset-cursor]').onclick = () => {
    st.mouseCursor = { ...MOUSE_CURSOR_DEFAULTS };
    refreshCursorControls(); refreshMouseCursor(); saveSettings();
  };
  refreshMouseCursor();
  const keybindRows = d.box.querySelector("[data-keybind-rows]");
  keybindRows.outerHTML = KEY_BINDING_ACTIONS.map((action) => '<label>' + action.label + '</label><button type="button" class="btn small" data-keybind="' + action.id + '">' + keyBindingLabel(getKeyBinding(action.id)) + '</button>').join("");
  const keybindButtons = [...d.box.querySelectorAll("[data-keybind]")];
  const macroRows = d.box.querySelector("[data-macro-bindings]");
  if (G.char && Array.isArray(G.char.macros)) {
    macroRows.outerHTML = G.char.macros.map((macro, i) => '<label>Macro ' + (i + 1) + '</label><button type="button" class="btn small" data-macro-key="' + i + '">' + keyBindingLabel(macro.key) + '</button>').join('');
  } else {
    macroRows.outerHTML = '<label>Macro keys</label><span class="dim">Load a character to set its macro keys.</span>';
  }
  const macroKeyButtons = [...d.box.querySelectorAll("[data-macro-key]")];
  const keybindStatus = d.box.querySelector("[data-keybind-status]");
  let capturingKeybind = null;
  let capturingMacro = null;
  const refreshMacroButtons = () => macroKeyButtons.forEach((button) => { const macro = G.char.macros[Number(button.dataset.macroKey)]; button.textContent = keyBindingLabel(macro && macro.key); });
  const refreshKeybindButtons = () => keybindButtons.forEach((button) => { button.textContent = keyBindingLabel(getKeyBinding(button.dataset.keybind)); });
  const stopKeyCapture = (message) => {
    const button = capturingKeybind
      ? keybindButtons.find((item) => item.dataset.keybind === capturingKeybind)
      : macroKeyButtons.find((item) => Number(item.dataset.macroKey) === capturingMacro);
    if (button) button.classList.remove("keybind-capturing");
    capturingKeybind = null;
    capturingMacro = null;
    if (message) keybindStatus.textContent = message;
  };
  keybindButtons.forEach((button) => {
    button.onclick = () => {
      if (capturingKeybind || capturingMacro !== null) { stopKeyCapture(""); refreshKeybindButtons(); refreshMacroButtons(); }
      capturingKeybind = button.dataset.keybind;
      button.classList.add("keybind-capturing");
      button.textContent = "Press a key…";
      const action = KEY_BINDING_ACTIONS.find((item) => item.id === capturingKeybind);
      keybindStatus.textContent = "Press a key for " + action.label + ". Escape cancels.";
    };
  });
  macroKeyButtons.forEach((button) => {
    button.onclick = () => {
      if (capturingKeybind || capturingMacro !== null) { stopKeyCapture(""); refreshKeybindButtons(); refreshMacroButtons(); }
      capturingMacro = Number(button.dataset.macroKey);
      button.classList.add("keybind-capturing");
      button.textContent = "Press a key…";
      keybindStatus.textContent = "Press a key for Macro " + (capturingMacro + 1) + ". Escape cancels.";
    };
  });
  const captureKeydown = (e) => {
    if (!d.box.isConnected) { window.removeEventListener("keydown", captureKeydown, true); return; }
    if (!capturingKeybind && capturingMacro === null) return;
    e.preventDefault(); e.stopPropagation();
    if (e.code === "Escape") { stopKeyCapture("Binding cancelled."); refreshKeybindButtons(); refreshMacroButtons(); return; }
    if (["Tab", "Enter", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight"].includes(e.code)) {
      keybindStatus.textContent = "Choose a regular key or function key. Tab, Enter, and modifier keys are reserved.";
      return;
    }
    if (capturingMacro !== null) {
      if (e.code === "Backspace" || e.code === "Delete") {
        setMacroKey(capturingMacro, null);
        if (G.game && typeof G.game.autosave === "function") G.game.autosave();
        stopKeyCapture("Macro key cleared."); refreshMacroButtons(); return;
      }
      if (!MACRO_KEYS.includes(e.code)) { keybindStatus.textContent = "Use F1–F12 or one of the existing macro letter keys."; return; }
      const actionConflict = KEY_BINDING_ACTIONS.find((action) => getKeyBinding(action.id) === e.code);
      if (actionConflict) { keybindStatus.textContent = "That key is assigned to " + actionConflict.label + ". Rebind that action first."; return; }
      setMacroKey(capturingMacro, e.code);
      if (G.game && typeof G.game.autosave === "function") G.game.autosave();
      stopKeyCapture("Macro key saved. Any macro that used that key now uses this macro’s previous key.");
      refreshMacroButtons();
      return;
    }
    const macroConflict = G.char && G.char.macros && G.char.macros.some((macro) => macro.key === e.code);
    if (macroConflict) { keybindStatus.textContent = "That key is assigned to a macro. Rebind the macro first."; return; }
    if (setKeyBinding(capturingKeybind, e.code)) {
      stopKeyCapture("Binding saved. Any action that used that key was moved to the previous key.");
      refreshKeybindButtons();
    } else keybindStatus.textContent = "That key could not be assigned.";
  };
  window.addEventListener("keydown", captureKeydown, true);
  stopKeyCaptureListener = () => window.removeEventListener("keydown", captureKeydown, true);
  d.wrap.addEventListener("pointerdown", (e) => { if (e.target === d.wrap) stopKeyCaptureListener(); }, true);
  d.box.querySelector("[data-reset-keybinds]").onclick = () => {
    resetKeyBindings();
    stopKeyCapture("All keyboard bindings restored to their defaults.");
    refreshKeybindButtons();
    refreshMacroButtons();
  };
  d.box.querySelector('[data-k=gore]').value = String(st.gore);
  d.box.querySelector('[data-k=fpsCap]').value = String(st.fpsCap || 0);
  d.box.querySelector('[data-backups]').onclick = () => { sfx('ui'); backupsDialog(); };
  d.box.querySelector('[data-reset-map-opacity]').onclick = () => {
    st.tabMapTransparency = 45;
    const range = d.box.querySelector('[data-k="tabMapTransparency"]'); range.value = '45';
    d.box.querySelector('[data-map-opacity]').textContent = '45%';
    saveSettings();
  };
  const lf = d.box.querySelector('[data-loot-filter]');
  lf.onclick = () => { sfx('ui'); lootFilterDialog(() => { lf.textContent = `${lootFilter().on ? 'On' : 'Off'} · Set up`; }); };
  const labelFilterButton = d.box.querySelector('[data-label-filter]');
  labelFilterButton.onclick = () => { sfx('ui'); groundLabelFilterDialog(() => { labelFilterButton.textContent = `${lootLabelFilter().on ? 'On' : 'Off'} · Set up`; }); };
  d.box.querySelectorAll('[data-k]').forEach((inp) => {
    inp.oninput = inp.onchange = () => {
      const k = inp.dataset.k;
      st[k] = inp.type === 'checkbox' ? inp.checked : inp.dataset.str ? inp.value : Number(inp.value);
      if (k === 'tabMapTransparency') d.box.querySelector('[data-map-opacity]').textContent = `${st[k]}%`;
      if ((k === 'showHeroStats' || k === 'showTargetBox' || k === 'showTargetSprite') && UI.hud && UI.hud.applyVisibilitySettings) UI.hud.applyVisibilitySettings();
      applyVolumes();
      saveSettings();
    };
  });
  d.box.querySelectorAll('[data-portrait]').forEach((inp) => {
    inp.oninput = inp.onchange = () => {
      const c = (st.characterPortrait ||= { visible: true, locked: false, size: 100, position: null });
      const key = inp.dataset.portrait;
      c[key] = inp.type === 'checkbox' ? inp.checked : Number(inp.value);
      if (key === 'size') d.box.querySelector('[data-portrait-size]').textContent = `${c.size}%`;
      CharacterPortrait.refreshSettings(); saveSettings();
    };
  });
  d.box.querySelector('[data-portrait-reset]').onclick = () => { CharacterPortrait.resetPosition(); };
}

/** Shared item type and rarity controls for pickup and ground-label filters. */
function itemFilterDialog(title, f, enabledLabel, help, onDone) {
  const opts = `<option value="-1">None</option>` + RARITY.map((r, i) => `<option value="${i}" style="color:${r.color}">${r.name}${i < RARITY.length - 1 ? ' or better' : ''}</option>`).join('');
  const gemGradeNames = ['Chipped', 'Flawed', 'Standard', 'Flawless', 'Perfect', 'Royal', 'Imperial', 'Celestial', 'Abyssal', 'Eternal'];
  const gemOpts = `<option value="-1">None</option>` + gemGradeNames.map((name, i) => `<option value="${i}">${name}${i < gemGradeNames.length - 1 ? ' or better' : ''}</option>`).join('');
  const html = `<div class="settings-grid">
    <label><b>${enabledLabel}</b></label><input type="checkbox" data-f="on" ${f.on ? 'checked' : ''}>
    ${(FILTER_ROWS || []).map((r) => `<label>${r.name}</label><select data-f="${r.k}">${opts}</select>`).join('')}
    <label>Gems &amp; Runes</label><select data-f="gems">${gemOpts}</select>
  </div><p class="dim" style="font-size:12px;max-width:520px">${help}</p>`;
  const d = UI.dialog({ title, html, buttons: [{ label: 'Done', fn: () => { saveLootFilterSettings(); onDone && onDone(); } }] });
  d.box.querySelectorAll('[data-f]').forEach((inp) => {
    if (inp.tagName === 'SELECT') inp.value = String(f[inp.dataset.f] ?? 0);
    inp.onchange = () => { f[inp.dataset.f] = inp.type === 'checkbox' ? inp.checked : Number(inp.value); saveLootFilterSettings(); onDone && onDone(); };
  });
  return d;
}

/** Settings > Loot filter: the lowest rarity auto-pickup accepts for each item type. */
export function lootFilterDialog(onDone) {
  return itemFilterDialog(
    'Loot Filter',
    lootFilter(),
    'Use the loot filter',
    'With the filter on, auto-pickup and walk-over pickup take only what passes. Clicking or tapping an item still picks it up, and sealed treasures always pass.',
    onDone
  );
}

/** Settings > HUD & UI > Ground loot label filter; never changes drops or pickup. */
export function groundLabelFilterDialog(onDone) {
  return itemFilterDialog(
    'Ground Label Filter',
    lootLabelFilter(),
    'Use the ground label filter',
    'This only filters unprompted item labels. It does not change drops or pickup; filtered items can still be picked up and named when hovered. Use Show gold labels to control gold piles.',
    onDone
  );
}

export function helpDialog() {
  const html = `<div class="help-keys">
    <div><b style="color:#ffe2a0">PC</b></div>
    <div><kbd>Left click</kbd> move / attack / pick up / talk</div>
    <div><kbd>Shift</kbd>+click attack in place</div>
    <div><kbd>W A S D</kbd> move directly</div>
    <div><kbd>Right click</kbd> right-click skill</div>
    <div><kbd>&#96;</kbd> <kbd>1</kbd>–<kbd>9</kbd> <kbd>0</kbd> <kbd>-</kbd> <kbd>=</kbd> cast skills at the cursor (13 keys + both mouse buttons)</div>
    <div><kbd>Z</kbd> <kbd>X</kbd> <kbd>C</kbd> <kbd>V</kbd> potions</div>
    <div><kbd>R</kbd> <kbd>E</kbd> <kbd>Y</kbd> <kbd>U</kbd> <kbd>O</kbd> macros: several skills on one key, set up from the skill tree's <b>Macros</b> button (or the menu)</div>
    <div><kbd>C</kbd> character · <kbd>I</kbd> bag · <kbd>K</kbd> skill tree · <kbd>T</kbd> passive talent tree · <kbd>Q</kbd> quest log</div>
    <div><kbd>Tab</kbd>/<kbd>M</kbd> map · <kbd>Esc</kbd> menu · wheel zoom</div>
    <div><kbd>G</kbd> MADNESS · <kbd>F</kbd> CLASS ULTIMATE (Smite, Cataclysm, Supernova, etc.), then click where it should strike (both fill as you fight) · <kbd>H</kbd> HEARTHSTONE (two-way town portal) · <kbd>F12</kbd> How to Play</div>
    <div><b style="color:#ffe2a0">While the hero plays</b></div>
    <div>Click or tap <b style="color:#ffd040">gilded critters</b> before they get away (follow the red arrows): each is worth a big sum of experience (a Golden Scarab, a pile of gold). </div>
    <div>Now and then a Green or better item drops <b style="color:#ffdf8a">sealed</b>: break the seals from the SEALED button or the inventory. The inventory panel shows the available space.</div>
    <div><b>Loot filter</b> (Settings): pick which weapons, off-hands, armor and rings (by rarity) and whether gems get picked up, by auto-pickup and by walking over them.</div>
    <div>Pick one of three portals at each cleared exit, and pull the <b style="color:#ffc040">Greed</b> lever for tougher depths and richer drops; a death loses the Hoard.</div>
    <div><b style="color:#ffe2a0">Goal</b></div>
    <div>Enter the portal in town. Find the exit of each depth — it is sealed until its guardian falls.</div>
    <div>Die and you restart a few depths back (the start of the previous five), keeping everything else.</div>
    <div>Reach Depth 100 and slay Demon Lord Velscour to complete the campaign and unlock the endgame.</div>
    <div><b style="color:#ffe2a0">Growing stronger</b></div>
    <div><b>Rings</b> (four slots): each carries augments that change a skill, a kind of skill or every skill — burning or venomous hits, chain lightning, a storm tether to your orbiting weapons, meteors, extra projectiles and more. The Jeweler sells them; guardians drop them.</div>
    <div><b>Skill mastery</b>: every skill levels from 1 to 1000 as you use it and kill with it, growing stronger and its effects bigger.</div>
    <div><b>Gem Forge</b> (Gem Merchant): fuse three gems into the next grade, or refine one, up to Eternal.</div>
  </div>`;
  UI.dialog({ title: 'How to Play', html, buttons: [{ label: 'Got it' }] });
}

export function pauseMenu() {
  const d = UI.dialog({
    title: 'Paused',
    html: `<p class="dim">${escapeHtml(G.char.name)} · Level ${G.char.level} · Depth ${G.char.depth}</p>`,
    buttons: [
      { label: 'Resume' },
      { label: 'Settings', fn: settingsDialog },
      { label: 'Macros', fn: () => G.ui.macros.open() },
      { label: 'How to Play', fn: helpDialog },
      {
        label: 'Save & Quit',
        cls: 'red',
        keepOpen: true,
        fn: () => confirmSaveAndQuit(d),
      },
    ],
  });
  return d;
}

function confirmSaveAndQuit(pauseDialog) {
  let saving = false;
  const confirm = UI.dialog({
    title: 'Save and Quit',
    html: '<p>Are you sure you want to save and quit?</p>',
    closable: false,
    buttons: [
      { label: 'Cancel', fn: () => pauseDialog.close() },
      {
        label: 'Save and Quit', cls: 'red', keepOpen: true,
        fn: async () => {
          if (saving) return;
          saving = true;
          const buttons = confirm.box.querySelectorAll('button');
          const saveButton = confirm.box.querySelector('.btn.red');
          buttons.forEach((button) => { button.disabled = true; });
          if (saveButton) saveButton.textContent = 'Saving...';
          const error = confirm.box.querySelector('.save-quit-error');
          if (error) error.remove();
          try {
            const completed = await G.game.quitToTitle();
            if (completed) return; // quitToTitle closes all dialogs after a successful save
            throw new Error('The game did not confirm that the save completed.');
          } catch (e) {
            const message = document.createElement('p');
            message.className = 'save-quit-error';
            message.textContent = 'Could not save your progress. You are still in the game; please try again.';
            confirm.box.querySelector('.dlg-body')?.append(message);
            saving = false;
            buttons.forEach((button) => { button.disabled = false; });
            if (saveButton) saveButton.textContent = 'Save and Quit';
          }
        },
      },
    ],
  });
  // Escape is routed through the game's existing modal-cancel path as a pointerdown
  // on the top dialog. Close the underlying pause menu too, so Cancel resumes play.
  confirm.wrap.addEventListener('pointerdown', (event) => {
    if (event.target !== confirm.wrap || saving) return;
    confirm.close();
    pauseDialog.close();
  });
}

export { $, A };
