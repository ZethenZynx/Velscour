// ==========================================================================
// VELSCOUR PC — SHARED WIKI SHELL & GLOBAL OMNI-SEARCH
// ==========================================================================

export const ELEMENT_INFO = {
  phys: { name: 'Physical', icon: '⚔️', color: '#c8b496' },
  physical: { name: 'Physical', icon: '⚔️', color: '#c8b496' },
  fire: { name: 'Fire', icon: '🔥', color: '#ff6214' },
  cold: { name: 'Cold', icon: '❄️', color: '#5ec8ff' },
  light: { name: 'Lightning', icon: '⚡', color: '#ffd232' },
  lightning: { name: 'Lightning', icon: '⚡', color: '#ffd232' },
  poison: { name: 'Poison', icon: '☠️', color: '#66e044' },
  shadow: { name: 'Shadow', icon: '🌑', color: '#b066ff' },
  arcane: { name: 'Arcane', icon: '✨', color: '#e055ff' },
  holy: { name: 'Holy', icon: '☀️', color: '#fff088' },
  blood: { name: 'Blood', icon: '🩸', color: '#e02838' },
  acid: { name: 'Acid', icon: '🧪', color: '#a0f020' },
};

export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>'"]/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[ch] || ch));
}

export function getQueryParam(key, fallback = '') {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get(key) ?? fallback;
  } catch (_) {
    return fallback;
  }
}

export const WIKI_SECTIONS = [
  { id: 'hub', label: 'Wiki Hub', icon: '📖', href: 'wiki.html' },
  { id: 'classes', label: 'Classes', icon: '🛡️', href: 'classes.html' },
  { id: 'skills', label: 'Skills', icon: '⚡', href: 'skills.html' },
  { id: 'talents', label: 'Talents', icon: '🌟', href: 'talents.html' },
  { id: 'bestiary', label: 'Bestiary', icon: '💀', href: 'bestiary.html', count: '1,090+' },
  { id: 'gear', label: 'Gear & Relics', icon: '🗡️', href: 'gear.html', count: '180+' },
  { id: 'world', label: 'World & Acts', icon: '🗺️', href: 'world.html' },
  { id: 'lore', label: 'Lore & Folk', icon: '📜', href: 'lore.html' },
];

let omniIndexPromise = null;
let omniEntries = null;

/**
 * Lazily builds the unified search index directly from the live ES game data modules.
 */
export async function ensureOmniIndex() {
  if (omniEntries) return omniEntries;
  if (omniIndexPromise) return omniIndexPromise;

  omniIndexPromise = (async () => {
    const [
      classesMod,
      skillsMod,
      talentsMod,
      bestiaryMod,
      relicsMod,
      itemsMod,
      biomesMod,
      depthMod,
      heresiesMod,
      townsfolkMod,
      townMod,
      raidMod,
      affixMod,
      skyStoriesMod,
      dungeonEventMod,
    ] = await Promise.all([
      import('../data/classes.js'),
      import('../data/skills.js'),
      import('../data/talents.js'),
      import('../data/bestiary.js'),
      import('../data/relics.js'),
      import('../data/items.js'),
      import('../data/biomes.js'),
      import('../data/depth.js'),
      import('../data/heresies.js'),
      import('../data/townsfolk.js'),
      import('../world/town.js'),
      import('../game/raid.js'),
      import('../data/dungeonaffixes.js'),
      import('../data/skystories.js'),
      import('../game/dungeonevents.js'),
    ]);

    const entries = [];

    // 1. Classes from the active PC fork roster
    for (const id of Object.keys(classesMod.CLASSES)) {
      const cls = classesMod.CLASSES[id];
      if (!cls) continue;
      entries.push({
        cat: 'Hero Classes',
        badge: 'Class',
        title: cls.name,
        sub: `${cls.primary.toUpperCase()} · ${cls.trees.join(', ')}`,
        keywords: `${cls.name} ${id} ${cls.weapon || ''} ${cls.offhand || ''} ${cls.element} ${cls.trees.join(' ')}`.toLowerCase(),
        href: `classes.html?id=${encodeURIComponent(id)}`,
      });
    }

    // 2. Active skills
    for (const sk of Object.values(skillsMod.SKILLS)) {
      const cls = classesMod.CLASSES[sk.classId];
      const treeName = cls?.trees?.[sk.tree] || `Tree ${sk.tree + 1}`;
      entries.push({
        cat: 'Active Skills',
        badge: 'Skill',
        title: sk.name,
        sub: `${cls ? cls.name : sk.classId} · ${treeName} (Lv ${sk.reqLevel})`,
        keywords: `${sk.name} ${sk.id} ${cls ? cls.name : ''} ${treeName} ${sk.kind} ${sk.el}`.toLowerCase(),
        href: `skills.html?class=${encodeURIComponent(sk.classId)}&q=${encodeURIComponent(sk.name)}`,
      });
    }

    // 3. Passive talents and morphs
    for (const node of Object.values(talentsMod.TALENTS)) {
      const cls = classesMod.CLASSES[node.classId];
      const branch = talentsMod.CLASS_TALENTS[node.classId]?.[node.branch];
      const kindLabel = node.row === 4 ? 'Keystone' : node.choice ? 'Skill Morph' : 'Talent';
      entries.push({
        cat: 'Talents & Morphs',
        badge: kindLabel,
        title: node.name,
        sub: `${cls ? cls.name : node.classId} · ${branch ? branch.name : ''} (Lv ${node.reqLevel})`,
        keywords: `${node.name} ${cls ? cls.name : ''} ${branch ? branch.name : ''} ${(node.morph?.skills || []).join(' ')} ${kindLabel}`.toLowerCase(),
        href: `talents.html?class=${encodeURIComponent(node.classId)}&q=${encodeURIComponent(node.name)}#${encodeURIComponent(node.classId)}`,
      });
    }

    // 4. Relics: Heirlooms, Covenants, Glyphwords & Sigils
    for (const h of relicsMod.HEIRLOOMS) {
      const P = relicsMod.POWERS[h.power];
      entries.push({
        cat: 'Gear & Relics',
        badge: h.unbound ? 'Unbound Heirloom' : 'Heirloom',
        title: h.name,
        sub: `${h.slot.toUpperCase()}${h.base ? ' (' + h.base + ')' : ''} · ${P ? P.name : ''}`,
        keywords: `${h.name} ${h.slot} ${h.base || ''} ${P ? P.name + ' ' + P.desc : ''} heirloom relic`.toLowerCase(),
        href: `gear.html?tab=heirlooms&q=${encodeURIComponent(h.name)}`,
      });
    }

    for (const c of relicsMod.COVENANTS) {
      const P = relicsMod.POWERS[c.power];
      entries.push({
        cat: 'Gear & Relics',
        badge: 'Covenant Set',
        title: c.name,
        sub: `5-Piece Set · Power: ${P ? P.name : c.power}`,
        keywords: `${c.name} ${c.pieces.map((p) => p.name).join(' ')} ${P ? P.name : ''} covenant set`.toLowerCase(),
        href: `gear.html?tab=covenants&q=${encodeURIComponent(c.name)}`,
      });
    }

    for (const g of relicsMod.GLYPHWORDS) {
      const word = g.sig.map((idx) => itemsMod.SIGILS[idx]?.name || '?').join(' + ');
      entries.push({
        cat: 'Gear & Relics',
        badge: 'Glyphword',
        title: g.name,
        sub: `Sigils: ${word} · Slots: ${g.slots.join(', ')}`,
        keywords: `${g.name} ${word} ${g.slots.join(' ')} glyphword runeword`.toLowerCase(),
        href: `gear.html?tab=glyphwords&q=${encodeURIComponent(g.name)}`,
      });
    }

    itemsMod.SIGILS.forEach((sig, rank) => {
      entries.push({
        cat: 'Gear & Relics',
        badge: `Sigil #${rank + 1}`,
        title: `${sig.name} Sigil Stone`,
        sub: `Rank ${rank + 1} · Drops from Depth ${rank * 24}`,
        keywords: `${sig.name} sigil stone rune socket`.toLowerCase(),
        href: `gear.html?tab=gems&q=${encodeURIComponent(sig.name)}`,
      });
    });

    // 4b. Ordinary equipment, consumables, gems, tiers, and affixes from this fork.
    const equipmentFamilies = [itemsMod.WEAPONS, itemsMod.OFFHANDS, itemsMod.ARMORS];
    for (const family of equipmentFamilies) {
      for (const [kind, spec] of Object.entries(family || {})) {
        for (const name of (spec.names || [kind])) {
          entries.push({
            cat: 'Equipment', badge: kind, title: name,
            sub: `${kind} · ${spec.classes?.map((id) => classesMod.CLASSES[id]?.name || id).join(', ') || 'General equipment'}`,
            keywords: `${name} ${kind} ${spec.icon || ''} ${(spec.classes || []).join(' ')}`.toLowerCase(),
            href: `gear.html?tab=arsenal&q=${encodeURIComponent(name)}`,
          });
        }
      }
    }
    for (const [id, gem] of Object.entries(itemsMod.GEMS || {})) {
      entries.push({ cat: 'Equipment', badge: 'Gem', title: gem.name || id, sub: 'Socketable gem', keywords: `${gem.name || id} ${id} gem socket`.toLowerCase(), href: `gear.html?tab=gems&q=${encodeURIComponent(gem.name || id)}` });
    }
    for (const [id, power] of Object.entries(itemsMod.LEGENDARY || {})) {
      entries.push({ cat: 'Gear & Relics', badge: 'Legendary Power', title: power.name || id, sub: power.desc || '', keywords: `${power.name || id} ${power.desc || ''} legendary power`.toLowerCase(), href: `gear.html?tab=arsenal&q=${encodeURIComponent(power.name || id)}` });
    }
    for (const tier of itemsMod.RARITY || []) {
      entries.push({ cat: 'Equipment', badge: 'Tier', title: tier.name, sub: `Unlocks at Depth ${tier.minDepth}`, keywords: `${tier.name} equipment tier depth ${tier.minDepth}`.toLowerCase(), href: `gear.html?tab=arsenal&q=${encodeURIComponent(tier.name)}` });
    }
    for (const affix of itemsMod.AFFIXES || []) {
      const title = affix.pre || affix.t || affix.s;
      entries.push({ cat: 'Equipment', badge: 'Gear Affix', title, sub: affix.t || '', keywords: `${title} ${affix.t || ''} ${affix.s || ''} equipment gear affix`.toLowerCase(), href: `gear.html?tab=affixes&q=${encodeURIComponent(title)}` });
    }
    for (const [id, description] of Object.entries(itemsMod.POTION_INFO || {})) {
      entries.push({ cat: 'Equipment', badge: 'Consumable', title: `${id[0].toUpperCase()}${id.slice(1)} Potion`, sub: String(description), keywords: `${id} potion consumable ${description}`.toLowerCase(), href: `gear.html?tab=arsenal&q=${encodeURIComponent(id)}` });
    }
    for (const material of itemsMod.MATERIALS || []) {
      entries.push({ cat: 'Equipment', badge: 'Material', title: material.name, sub: 'Crafting material', keywords: `${material.name} crafting material`.toLowerCase(), href: `gear.html?tab=arsenal&q=${encodeURIComponent(material.name)}` });
    }
    for (const affix of affixMod.DUNGEON_AFFIXES || []) {
      entries.push({ cat: 'World & Acts', badge: 'Dungeon Affix', title: affix.name || affix.id, sub: affix.desc || 'Dungeon modifier', keywords: `${affix.name || affix.id} ${affix.id || ''} ${affix.desc || ''} affix modifier`.toLowerCase(), href: `world.html?tab=affixes&q=${encodeURIComponent(affix.name || affix.id)}` });
    }
    for (const event of dungeonEventMod.DUNGEON_EVENTS || []) {
      entries.push({ cat: 'World & Acts', badge: 'Dungeon Event', title: event.name, sub: `${event.category} · ${event.rarity}`, keywords: `${event.name} ${event.id} ${event.category} ${event.rarity} random dungeon event`.toLowerCase(), href: `world.html?tab=endgame&event=${encodeURIComponent(event.id)}` });
    }
    entries.push({ cat: 'World & Acts', badge: 'Endgame Currency', title: 'Infernal Marks', sub: 'Endgame currency and permanent bonuses', keywords: 'infernal mark marks endgame currency permanent bonuses', href: 'world.html?tab=endgame' });

    // 5. World: Acts, Biomes & Heresies
    for (const a of depthMod.ACTS) {
      entries.push({
        cat: 'World & Acts',
        badge: `Act ${a.act}`,
        title: `Act ${a.act}: ${a.name}`,
        sub: `Depths ${a.start}–${a.end} · Finale Depth ${a.finaleDepth}`,
        keywords: `act ${a.act} ${a.name} ${a.midBoss || ''} ${a.finaleBoss || ''}`.toLowerCase(),
        href: `world.html?tab=campaign`,
      });
    }

    const allBiomes = [
      biomesMod.TOWN_BIOME,
      biomesMod.ACT2_TOWN_BIOME,
      ...biomesMod.BIOMES,
      biomesMod.BREACH_BIOME,
      biomesMod.SCORPION_KING_PYRAMID_BIOME,
    ];
    const seenBiomes = new Set();
    for (const b of allBiomes) {
      if (!b || seenBiomes.has(b.id)) continue;
      seenBiomes.add(b.id);
      entries.push({
        cat: 'World & Acts',
        badge: b.town ? 'Sanctuary' : b.overworld ? 'Expedition' : 'Dungeon Biome',
        title: b.name,
        sub: `${(b.el || 'phys').toUpperCase()} · ${(b.adj || []).slice(0, 3).join(', ') || 'Realm of Velscour'}`,
        keywords: `${b.name} ${b.id} ${(b.adj || []).join(' ')} biome world`.toLowerCase(),
        href: `world.html?tab=biomes&q=${encodeURIComponent(b.name)}`,
      });
    }

    for (const h of heresiesMod.HERESIES) {
      entries.push({
        cat: 'World & Acts',
        badge: `Heresy (Rank ${h.rank})`,
        title: h.name,
        sub: h.desc,
        keywords: `${h.name} ${h.desc} heresy altar endgame`.toLowerCase(),
        href: `world.html?tab=endgame`,
      });
    }

    // 6. Lore: Superbosses, Artisans & Townsfolk
    for (const rb of raidMod.RAID_BOSSES) {
      entries.push({
        cat: 'Lore & Tyrants',
        badge: 'Raid Lord',
        title: `${rb.name}${rb.title ? ', ' + rb.title : ''}`,
        sub: `${(rb.el || 'phys').toUpperCase()} · ${rb.phases.length} Phases`,
        keywords: `${rb.name} ${rb.title || ''} ${rb.id} superboss boss lore`.toLowerCase(),
        href: `lore.html?tab=lords&q=${encodeURIComponent(rb.name)}`,
      });
    }

    for (const v of townMod.VENDORS) {
      entries.push({
        cat: 'Lore & Folk',
        badge: 'Artisan',
        title: v.name,
        sub: `${v.title} · Herrington Hollow`,
        keywords: `${v.name} ${v.title} ${v.id} vendor merchant npc town`.toLowerCase(),
        href: `lore.html?tab=folk&q=${encodeURIComponent(v.name)}`,
      });
    }

    for (const f of townsfolkMod.TOWNSFOLK) {
      entries.push({
        cat: 'Lore & Folk',
        badge: 'Townsfolk',
        title: f.name,
        sub: `${f.role} · Herrington Hollow`,
        keywords: `${f.name} ${f.role} ${f.group} townsfolk npc`.toLowerCase(),
        href: `lore.html?tab=folk&q=${encodeURIComponent(f.name)}`,
      });
    }

    for (const story of skyStoriesMod.SKY_STORIES || []) {
      entries.push({ cat: 'Lore & Folk', badge: 'Sky Story', title: story.name, sub: story.blurb || story.hazardText || '', keywords: `${story.name} ${story.id} ${story.blurb || ''} ${story.hazardText || ''} sky story`.toLowerCase(), href: `lore.html?tab=stories&q=${encodeURIComponent(story.name)}` });
    }

    // 7. Enemies and bosses from the PC bestiary
    entries.push({
      cat: 'Bestiary',
      badge: 'Demon Lord',
      title: 'Demon Lord Velscour',
      sub: `Final campaign encounter · Depth ${depthMod.FINAL_DEPTH}`,
      keywords: `demon lord velscour final boss campaign depth ${depthMod.FINAL_DEPTH}`,
      href: `world.html?tab=campaign&depth=${depthMod.FINAL_DEPTH}`,
    });

    for (const m of bestiaryMod.BESTIARY) {
      const isBoss = !!(m.boss || m.lone);
      entries.push({
        cat: 'Bestiary',
        badge: isBoss ? 'Boss' : 'Monster',
        title: m.name,
        sub: `${(m.arch || 'fiend').toUpperCase()} · ${(m.el || 'phys').toUpperCase()}`,
        keywords: `${m.name} ${m.id} ${m.arch || ''} ${m.el || ''}`.toLowerCase(),
        href: `bestiary.html?id=${encodeURIComponent(m.id)}`,
      });
    }

    omniEntries = entries;
    return entries;
  })().catch((error) => {
    omniIndexPromise = null;
    throw error;
  });

  return omniIndexPromise;
}

/**
 * Searches the unified Wiki index and returns up to `limit` ranked matches.
 */
export async function searchWikiIndex(rawQuery, limit = 18) {
  const q = String(rawQuery || '').trim().toLowerCase();
  if (!q) return [];
  const entries = await ensureOmniIndex();
  const terms = q.split(/\s+/).filter(Boolean);

  const scored = [];
  for (const item of entries) {
    const titleLow = item.title.toLowerCase();
    let ok = true;
    for (const t of terms) {
      if (!item.keywords.includes(t)) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    let score = 10;
    if (titleLow === q) score += 100;
    else if (titleLow.startsWith(q)) score += 60;
    else if (titleLow.includes(q)) score += 35;
    if (item.badge === 'Class') score += 15;
    else if (item.badge === 'Skill' || item.badge === 'Keystone' || item.badge === 'Skill Morph') score += 8;
    else if (item.badge.includes('Heirloom') || item.badge === 'Covenant Set' || item.badge === 'Glyphword') score += 8;

    scored.push({ item, score });
  }

  scored.sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));
  return scored.slice(0, limit).map((s) => s.item);
}

/**
 * Mounts the shared Wiki Header, Omni-Search, Category Navigation, Footer, and Back-to-Top button.
 */
export function mountWikiShell({ active = 'hub' } = {}) {
  // 1. Header Shell (reuses synchronous wiki-boot.js header if already painted on Frame 1)
  let headerEl = document.querySelector('.wiki-shell-header');
  if (!headerEl) {
    headerEl = document.createElement('header');
    headerEl.className = 'wiki-shell-header';

    const navLinksHtml = WIKI_SECTIONS.map((sec) => {
      const isAct = sec.id === active ? 'active' : '';
      const countHtml = sec.count ? `<span class="wiki-nav-count">${escapeHtml(sec.count)}</span>` : '';
      return `<a href="${sec.href}" class="wiki-nav-link ${isAct}"><span>${sec.icon}</span><span>${escapeHtml(sec.label)}</span>${countHtml}</a>`;
    }).join('');

    headerEl.innerHTML = `
      <div class="wiki-topbar">
        <a href="wiki.html" class="wiki-brand">
          <img class="wiki-brand-logo" src="assets/ui/velscour_contact_skull.png" alt="Velscour Wiki">
          <div class="wiki-brand-text">
            <span class="wiki-brand-title">VELSCOUR <span>WIKI</span></span>
            <span class="wiki-brand-sub">PC Edition Game Compendium</span>
          </div>
        </a>

        <div class="wiki-omnisearch" id="wiki-omnisearch">
          <div class="wiki-omnisearch-input-wrap">
            <span class="wiki-omnisearch-icon">🔍</span>
            <input type="search" id="wiki-omni-input" autocomplete="off"
              placeholder="Search classes, skills, gear, enemies, environments, lore…">
            <span class="wiki-omnisearch-kbd">Ctrl+K</span>
          </div>
          <div class="wiki-omni-dropdown" id="wiki-omni-dropdown"></div>
        </div>

        <div class="wiki-top-actions"><a href="index.html" class="btn-wiki-play" title="Return to Velscour PC">⚔️ Return to Game</a></div>
      </div>
      <nav class="wiki-subnav" aria-label="Wiki Sections">
        <div class="wiki-subnav-inner">
          ${navLinksHtml}
        </div>
      </nav>
    `;

    document.body.prepend(headerEl);
  }

  // 2. Footer + Back-to-Top
  const footerEl = document.createElement('footer');
  footerEl.className = 'wiki-footer';
  footerEl.innerHTML = `
    <div class="wiki-footer-inner">
      <ul class="wiki-footer-links">
        <li><a href="index.html">Return to Velscour PC</a></li>
        <li><a href="wiki.html">Wiki Hub</a></li>
        <li><a href="classes.html">Classes</a></li>
        <li><a href="skills.html">Skills</a></li>
        <li><a href="talents.html">Talents</a></li>
        <li><a href="bestiary.html">Bestiary</a></li>
        <li><a href="gear.html">Gear &amp; Relics</a></li>
        <li><a href="world.html">World &amp; Acts</a></li>
        <li><a href="lore.html">Lore &amp; Folk</a></li>
      </ul>
      <p class="wiki-footer-copy">&copy; 2026 VELSCOUR PC · Game Data Compendium · <i>"A world built upon something that should have stayed dead."</i></p>
    </div>
  `;
  document.body.appendChild(footerEl);

  let backBtn = document.getElementById('wiki-back-to-top');
  if (!backBtn) {
    backBtn = document.createElement('button');
    backBtn.id = 'wiki-back-to-top';
    backBtn.setAttribute('aria-label', 'Back to Top');
    backBtn.textContent = '▲';
    document.body.appendChild(backBtn);
  }

  window.addEventListener('scroll', () => {
    if (window.scrollY > 320) backBtn.classList.add('visible');
    else backBtn.classList.remove('visible');
  });
  backBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // 3. Omni-Search Interactivity
  const omniWrap = document.getElementById('wiki-omnisearch');
  const omniInput = document.getElementById('wiki-omni-input');
  const omniDrop = document.getElementById('wiki-omni-dropdown');
  let activeIdx = -1;
  let currentResults = [];

  function renderDropdown(results, query) {
    currentResults = results;
    activeIdx = results.length ? 0 : -1;
    if (!query.trim()) {
      omniDrop.classList.remove('open');
      omniDrop.innerHTML = '';
      return;
    }

    if (!results.length) {
      omniDrop.innerHTML = `<div class="wiki-omni-empty">No entries matched "<b>${escapeHtml(query)}</b>"</div>`;
      omniDrop.classList.add('open');
      return;
    }

    // Group preserving rank order per first appearance of category
    const byCat = new Map();
    results.forEach((r, idx) => {
      if (!byCat.has(r.cat)) byCat.set(r.cat, []);
      byCat.get(r.cat).push({ r, idx });
    });

    let html = '';
    for (const [cat, items] of byCat.entries()) {
      html += `<div class="wiki-omni-group">${escapeHtml(cat)}</div>`;
      for (const { r, idx } of items) {
        html += `
          <a href="${r.href}" class="wiki-omni-item ${idx === activeIdx ? 'active' : ''}" data-idx="${idx}">
            <div class="wiki-omni-item-main">
              <span class="wiki-omni-item-title">${escapeHtml(r.title)}</span>
              <span class="wiki-omni-item-sub">${escapeHtml(r.sub)}</span>
            </div>
            <span class="wiki-omni-badge">${escapeHtml(r.badge)}</span>
          </a>
        `;
      }
    }
    omniDrop.innerHTML = html;
    omniDrop.classList.add('open');
  }

  function runSearch(query) {
    searchWikiIndex(query).then((results) => {
      if (omniInput.value === query) renderDropdown(results, query);
    }).catch(() => {
      if (omniInput.value !== query) return;
      omniDrop.innerHTML = '<div class="wiki-omni-empty">Search data could not be loaded. Try again after refreshing the Wiki.</div>';
      omniDrop.classList.add('open');
    });
  }

  function highlightActive() {
    omniDrop.querySelectorAll('.wiki-omni-item').forEach((el) => {
      const idx = Number(el.dataset.idx);
      el.classList.toggle('active', idx === activeIdx);
      if (idx === activeIdx) el.scrollIntoView({ block: 'nearest' });
    });
  }

  omniInput.addEventListener('focus', () => {
    ensureOmniIndex().catch(() => {});
    if (omniInput.value.trim()) {
      runSearch(omniInput.value);
    }
  });

  omniInput.addEventListener('input', () => {
    const val = omniInput.value;
    if (!val.trim()) {
      omniDrop.classList.remove('open');
      return;
    }
    runSearch(val);
  });

  omniInput.addEventListener('keydown', (e) => {
    if (!omniDrop.classList.contains('open')) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentResults.length) {
        activeIdx = (activeIdx + 1) % currentResults.length;
        highlightActive();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentResults.length) {
        activeIdx = (activeIdx - 1 + currentResults.length) % currentResults.length;
        highlightActive();
      }
    } else if (e.key === 'Enter') {
      const activeLink = omniDrop.querySelector(`.wiki-omni-item[data-idx="${activeIdx}"]`);
      if (activeLink) {
        e.preventDefault();
        window.location.href = activeLink.getAttribute('href');
      }
    } else if (e.key === 'Escape') {
      omniDrop.classList.remove('open');
      omniInput.blur();
    }
  });

  document.addEventListener('click', (e) => {
    if (!omniWrap.contains(e.target)) {
      omniDrop.classList.remove('open');
    }
  });

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      omniInput.focus();
      omniInput.select();
    }
  });
}

