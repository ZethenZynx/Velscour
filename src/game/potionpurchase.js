export const POTION_BELT_CAPACITY = 30;

/** Quote one fixed purchase or an all-or-nothing purchase to belt capacity. */
export function potionPurchaseQuote(current, gold, unitPrice, requested = 'max') {
  const held = Math.max(0, Number(current) || 0);
  const available = Math.max(0, POTION_BELT_CAPACITY - held);
  const quantity = requested === 'max' ? available : Math.max(0, Math.floor(Number(requested) || 0));
  const total = Math.max(0, Math.ceil(Number(unitPrice) || 0)) * quantity;
  return {
    quantity,
    total,
    remaining: available,
    canBuy: quantity > 0 && quantity <= available && Number(gold) >= total,
  };
}
