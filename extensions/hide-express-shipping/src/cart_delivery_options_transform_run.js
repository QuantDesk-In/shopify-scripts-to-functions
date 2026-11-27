// Matches "PO Box 12", "P.O. Box", "p o box" and "Post Office Box".
const PO_BOX = /\b(p\.?\s*o\.?\s*box|post\s+office\s+box)\b/i;

export function cartDeliveryOptionsTransformRun(input) {
  // The metafield is always present here: without it $oversizedTags is null
  // and Shopify fails the run before this code is called.
  const config = input.deliveryCustomization.metafield.jsonValue;
  const titleMatch = (config.hideTitleContains ?? 'Express').toLowerCase();
  const hideForPoBox = config.hideForPoBox ?? true;

  const operations = [];
  // Each delivery group ships separately, so check them one by one.
  for (const group of input.cart.deliveryGroups) {
    const hasOversized = group.cartLines.some(
      (line) => line.merchandise.__typename === 'ProductVariant' && line.merchandise.product.hasAnyTag,
    );
    const toPoBox = hideForPoBox && isPoBox(group.deliveryAddress);
    if (!hasOversized && !toPoBox) {
      continue;
    }
    for (const option of group.deliveryOptions) {
      if (option.title?.toLowerCase().includes(titleMatch)) {
        operations.push({ deliveryOptionHide: { deliveryOptionHandle: option.handle } });
      }
    }
  }
  return { operations };
}

function isPoBox(address) {
  return [address?.address1, address?.address2].some((line) => line && PO_BOX.test(line));
}
