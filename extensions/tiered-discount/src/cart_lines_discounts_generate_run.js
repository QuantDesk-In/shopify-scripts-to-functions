// Used when the discount has no configuration metafield.
const DEFAULT_TIERS = [
  { minimumSubtotal: 100, percentage: 10 },
  { minimumSubtotal: 200, percentage: 15 },
  { minimumSubtotal: 300, percentage: 20 },
];

const NO_DISCOUNT = { operations: [] };

export function cartLinesDiscountsGenerateRun(input) {
  if (!input.discount.discountClasses.includes('PRODUCT')) {
    return NO_DISCOUNT;
  }

  const lines = input.cart.lines.filter(
    (line) =>
      line.merchandise.__typename === 'ProductVariant' &&
      !line.merchandise.product.isGiftCard,
  );
  if (lines.length === 0) {
    return NO_DISCOUNT;
  }

  // Work in cents so a $100.00 cart meets a $100 tier exactly.
  const subtotalCents = lines.reduce(
    (sum, line) => sum + toCents(line.cost.subtotalAmount.amount),
    0,
  );

  // Tiers are set in the shop currency. Cart amounts arrive in the
  // buyer's currency, so convert the thresholds before comparing.
  const rate = Number(input.presentmentCurrencyRate);
  const tier = tiersFrom(input.discount.metafield)
    .sort((a, b) => b.minimumSubtotal - a.minimumSubtotal)
    .find((t) => subtotalCents >= toCents(t.minimumSubtotal * rate));
  if (!tier) {
    return NO_DISCOUNT;
  }

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates: [
            {
              message: `${tier.percentage}% off`,
              targets: lines.map((line) => ({ cartLine: { id: line.id } })),
              value: { percentage: { value: tier.percentage } },
            },
          ],
          selectionStrategy: 'FIRST',
        },
      },
    ],
  };
}

function tiersFrom(metafield) {
  const tiers = metafield?.jsonValue?.tiers;
  return Array.isArray(tiers) && tiers.length > 0 ? [...tiers] : [...DEFAULT_TIERS];
}

function toCents(amount) {
  return Math.round(Number(amount) * 100);
}
