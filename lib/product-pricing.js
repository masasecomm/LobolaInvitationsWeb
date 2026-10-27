export function getProductPricing(product) {
  const originalPriceCents = Number.isSafeInteger(product.priceCents) && product.priceCents > 0
    ? product.priceCents
    : 0;
  const salePriceCents = Number.isSafeInteger(product.salePriceCents)
    && product.salePriceCents > 0
    && product.salePriceCents < originalPriceCents
    ? product.salePriceCents
    : null;

  return {
    originalPriceCents,
    currentPriceCents: salePriceCents || originalPriceCents,
    isOnSale: salePriceCents !== null
  };
}
