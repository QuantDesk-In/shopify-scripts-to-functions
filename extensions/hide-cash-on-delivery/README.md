# Hide cash on delivery

Port of a payment Script that removed Cash on Delivery for large orders and for tagged customers. The original is in [original-script.rb](original-script.rb).

- Function API: [Payment Customization](https://shopify.dev/docs/api/functions/latest/payment-customization), target `cart.payment-methods.transform.run`
- Output: one `paymentMethodHide` operation per hidden method

## Configuration

The function reads a JSON metafield on the payment customization (namespace `$app`, key `function-configuration`). `maximumTotal` is in the shop currency.

```json
{
  "customerTags": ["no-cod"],
  "maximumTotal": 500,
  "methodNameContains": "Cash on Delivery"
}
```

- `customerTags` is required. It is passed to the input query as the `$customerTags` variable through `input_variables` in `shopify.extension.toml`. If the metafield or the key is missing, the variable is null and Shopify fails the run, which leaves every method visible.
- Leave out `maximumTotal` to use the tag rule only.
- `methodNameContains` is matched against the method name, ignoring case. Default `Cash on Delivery`, which matches Shopify's "Cash on Delivery (COD)".

## Ruby to Function

| Script | Function |
| --- | --- |
| `cart.subtotal_price` | `cart.cost.totalAmount` |
| `cart.customer.tags.include?("no-cod")` | `buyerIdentity { customer { hasAnyTag(tags: $customerTags) } }` |
| `Input.payment_gateways` | `paymentMethods` (`id`, `name`) |
| `payment_gateways.delete_if { ... }` | `paymentMethodHide` with the method's `id` |
| `Output.payment_gateways = ...` | return `{ operations }` |

## What changes

- The limit is checked against the cart total, which includes shipping and tax once checkout knows them. The Script used the subtotal. Switch the query to `cost { subtotalAmount { amount } }` if you want the old behaviour.
- The limit is converted with `presentmentCurrencyRate`, so a 500 limit means 500 in the shop currency for every buyer.
- Guests have no customer, so the tag rule only applies to logged-in customers. That matches the Script.
- Methods are hidden by `id`. The name is only used to find them.

## What Functions can't do here

- Read the customer's tag list. The tags to check must be passed in, here through the metafield.
- Hide a method for only some placements unless the store is on Shopify Plus. Without `placements`, `paymentMethodHide` hides the method everywhere.
