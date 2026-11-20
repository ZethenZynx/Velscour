// Paint the shared Wiki header before each page's module data loads.
(function () {
  if (document.querySelector('.wiki-shell-header')) return;
  var scriptEl = document.currentScript;
  var active = (scriptEl && scriptEl.getAttribute('data-wiki-active')) || 'hub';
  var sections = [
    ['hub', 'Wiki Hub', '📖', 'wiki.html'],
    ['classes', 'Classes', '🛡️', 'classes.html'],
    ['skills', 'Skills', '⚡', 'skills.html'],
    ['talents', 'Talents', '🌟', 'talents.html'],
    ['gear', 'Gear', '💎', 'gear.html'],
    ['world', 'World', '🗺️', 'world.html'],
    ['bestiary', 'Bestiary', '🐉', 'bestiary.html'],
    ['lore', 'Lore', '📜', 'lore.html']
  ];
  var nav = sections.map(function (s) {
    return '<a href="' + s[3] + '" class="wiki-nav-link' + (s[0] === active ? ' active' : '') + '"><span>' + s[2] + '</span><span>' + s[1] + '</span></a>';
  }).join('');
  var header = document.createElement('header');
  header.className = 'wiki-shell-header';
  header.innerHTML = '<div class="wiki-topbar">' +
    '<a href="wiki.html" class="wiki-brand"><img class="wiki-brand-logo" src="assets/ui/velscour_contact_skull.png" alt="Velscour PC Wiki"><div class="wiki-brand-text"><span class="wiki-brand-title">VELSCOUR <span>WIKI</span></span><span class="wiki-brand-sub">PC Edition Game Compendium</span></div></a>' +
    '<div class="wiki-omnisearch" id="wiki-omnisearch"><div class="wiki-omnisearch-input-wrap"><span class="wiki-omnisearch-icon">⌕</span><input type="search" id="wiki-omni-input" autocomplete="off" placeholder="Search classes, skills, gear, enemies, lore…"><span class="wiki-omnisearch-kbd">Ctrl+K</span></div><div class="wiki-omni-dropdown" id="wiki-omni-dropdown"></div></div>' +
    '<div class="wiki-top-actions"><a href="index.html" class="btn-wiki-play" title="Return to Velscour PC">⚔️ Return to Game</a></div></div>' +
    '<nav class="wiki-subnav" aria-label="Wiki Sections"><div class="wiki-subnav-inner">' + nav + '</div></nav>';
  document.body.insertBefore(header, document.body.firstChild);
})();
