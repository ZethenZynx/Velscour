import { damageNumberAboveBarZ } from '../../src/game/damage-number-layout.mjs';

for (const scenario of [
  { name: 'small enemy at normal zoom', input: { baseZ: 30, spriteHeight: 32, textHeight: 30, zoom: 1 } },
  { name: 'large champion with nameplate', input: { baseZ: 40, spriteHeight: 70, scale: 1.8, creatureZ: 5, barScale: 1.2, textHeight: 44, zoom: 1.4, labelHeight: 16 } },
  { name: 'boss and critical number at low zoom', input: { baseZ: 75, spriteHeight: 96, scale: 1.5, barHeight: 6, textHeight: 52, zoom: 0.7 } },
  { name: 'ordinary target at high zoom', input: { baseZ: 26, spriteHeight: 28, textHeight: 26, zoom: 2.5 } },
]) {
  const z = damageNumberAboveBarZ(scenario.input.baseZ, scenario.input);
  const zoom = Math.max(0.1, scenario.input.zoom || 1);
  const barTop = (scenario.input.spriteHeight || 40) * (scenario.input.scale || 1)
    + (scenario.input.creatureZ || 0) + 4 + 4 * (scenario.input.barScale || 1) + (scenario.input.barHeight || 4);
  const lowerEdgeAfterJitter = (z - 4) * zoom - (scenario.input.textHeight || 24) / 2;
  const barClearance = barTop * zoom + (scenario.input.labelHeight || 0) + (scenario.input.margin || 6);
  if (lowerEdgeAfterJitter < barClearance) throw new Error(`${scenario.name}: number can overlap its bar/nameplate`);
}
if (damageNumberAboveBarZ(100, { spriteHeight: 30, textHeight: 24, zoom: 1 }) !== 100) throw new Error('Existing higher starting positions must not be lowered');
console.log('Damage number placement OK: size/zoom cases clear life bars and nameplates, existing positions are preserved');
