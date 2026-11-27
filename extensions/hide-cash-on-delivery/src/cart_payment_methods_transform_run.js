export function cartPaymentMethodsTransformRun(input) {
  // The metafield is always present here: without it $customerTags is null
  // and Shopify fails the run before this code is called.
  const config = input.paymentCustomization.metafield.jsonValue;
  const nameMatch = (config.methodNameContains ?? 'Cash on Delivery').toLowerCase();

  const taggedCustomer = input.cart.buyerIdentity?.customer?.hasAnyTag ?? false;
  const overLimit =
    config.maximumTotal != null &&
    toCents(input.cart.cost.totalAmount.amount) >
      // maximumTotal is in the shop currency; the cart total is in the buyer's.
      toCents(config.maximumTotal * Number(input.presentmentCurrencyRate));

  if (!taggedCustomer && !overLimit) {
    return { operations: [] };
  }

  return {
    operations: input.paymentMethods
      .filter((method) => method.name.toLowerCase().includes(nameMatch))
      .map((method) => ({ paymentMethodHide: { paymentMethodId: method.id } })),
  };
}

function toCents(amount) {
  return Math.round(Number(amount) * 100);
}
