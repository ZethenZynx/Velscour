import assert from 'node:assert/strict';
import { POTION_BELT_CAPACITY, potionPurchaseQuote } from '../../src/game/potionpurchase.js';

assert.equal(POTION_BELT_CAPACITY, 30);
assert.deepEqual(potionPurchaseQuote(6, 1000, 10, 'max'), { quantity: 24, total: 240, remaining: 24, canBuy: true });
assert.deepEqual(potionPurchaseQuote(29, 10, 10, 'max'), { quantity: 1, total: 10, remaining: 1, canBuy: true });
assert.equal(potionPurchaseQuote(6, 239, 10, 'max').canBuy, false, 'Buy Max is all-or-nothing when gold is short');
assert.equal(potionPurchaseQuote(6, 100, 10, 'max').quantity, 24, 'unaffordable max quantity is not silently reduced');
assert.equal(potionPurchaseQuote(30, 1000, 10, 'max').canBuy, false, 'max capacity disables Buy Max');
assert.equal(potionPurchaseQuote(29, 1000, 10, 5).canBuy, false, 'fixed buys cannot exceed capacity');
assert.equal(potionPurchaseQuote(6, 999, 10, 5).total, 50, 'displayed purchase total matches charged amount');
console.log('Alchemist Buy Max capacity and pricing checks passed.');
