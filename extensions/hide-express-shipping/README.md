# Hide express shipping

Port of a shipping Script that removed Express rates for oversized products and PO box addresses. The original is in [original-script.rb](original-script.rb).

- Function API: [Delivery Customization](https://shopify.dev/docs/api/functions/latest/delivery-customization), target `cart.delivery-options.transform.run`
- Output: one `deliveryOptionHide` operation per hidden option

## Configuration

The function reads a JSON metafield on the delivery customization (namespace `$app`, key `function-configuration`).

```json
{
  "oversizedTags": ["oversized"],
  "hideTitleContains": "Express",
  "hideForPoBox": true
}
```

- `oversizedTags` is required. It is passed to the input query as the `$oversizedTags` variable through `input_variables` in `shopify.extension.toml`. If the metafield or the key is missing, the variable is null and Shopify fails the run, which leaves every option visible.
- `hideTitleContains` is matched against the option title, ignoring case. Default `Express`.
- `hideForPoBox` defaults to `true`.

## Ruby to Function

| Script | Function |
| --- | --- |
| `product.tags.include?("oversized")` | `product { hasAnyTag(tags: $oversizedTags) }` |
| `Input.cart.shipping_address` | `deliveryGroups.deliveryAddress` |
| `Input.shipping_rates` | `deliveryGroups.deliveryOptions` (`handle`, `title`) |
| `shipping_rates.delete_if { ... }` | `deliveryOptionHide` with the option's `handle` |
| `Output.shipping_rates = ...` | return `{ operations }` |

## What changes

- A cart can have several delivery groups, each with its own address and options. The Function checks each group on its own, so an oversized item only affects the options of the group it ships in. The Script looked at the whole cart.
- Options are hidden by `handle`. The title is only used to find them.
- The PO box check is a regular expression and also catches `P.O. Box`, `p o box` and `Post Office Box` in either address line.
- With Apple Pay and Google Pay, the street address is not available until payment is authorized. Before that, only country, province, city and zip are in the input, so the PO box rule can't fire on the first pass.

## What Functions can't do here

- Change the price of a rate. Shipping discounts belong in a Discount Function on the `cart.delivery-options.discounts.generate.run` target.
- Add new rates. That needs a carrier service or a delivery option generator.
- Read the product tag list. The tags to check must be passed in, here through the metafield.
