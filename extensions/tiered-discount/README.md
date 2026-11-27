# Tiered discount

Port of a line item Script that gave a bigger percentage off as the cart got bigger. The original is in [original-script.rb](original-script.rb).

- Function API: [Discount](https://shopify.dev/docs/api/functions/latest/discount), target `cart.lines.discounts.generate.run`
- Runs only when the discount has the `PRODUCT` discount class
- Gift cards and custom products are not discounted and do not count toward the spend

## Configuration

The function reads a JSON metafield on the discount (namespace `$app`, key `function-configuration`). Amounts are in the shop currency.

```json
{
  "tiers": [
    { "minimumSubtotal": 100, "percentage": 10 },
    { "minimumSubtotal": 200, "percentage": 15 },
    { "minimumSubtotal": 300, "percentage": 20 }
  ]
}
```

If the metafield is missing or `tiers` is empty, the function uses the tiers shown above. The highest tier the cart reaches wins.

## Ruby to Function

| Script | Function |
| --- | --- |
| `Input.cart.line_items` | `cart.lines` in the input query |
| `line_item.line_price` | `cost.subtotalAmount.amount` (a decimal string) |
| `line_item.variant.product.gift_card?` | `merchandise { ... on ProductVariant { product { isGiftCard } } }` |
| `TIERS` constant in the script | JSON metafield on the discount, so tiers change without a deploy |
| `line_item.change_line_price(price, message:)` | one `productDiscountsAdd` candidate with a `percentage` value and a `message` |
| `Output.cart = Input.cart` | return `{ operations }` |

## What changes

- The Script lowered the line price. The Function offers a discount and Shopify applies it. Customers see the original price with a discount under it, and the amount shows up in reports as a discount under the discount's title.
- Stacking is set on the discount with `combinesWith`, not by the order Scripts ran in. Check it against your other automatic discounts and codes.
- The spend is measured with `subtotalAmount`, which is before line-level discounts. A Script saw prices after any earlier Script had changed them.
- Thresholds are converted with `presentmentCurrencyRate`, so a $100 tier means $100 in the shop currency for a buyer paying in another currency.
- One candidate targets every eligible line, and the tier percentage applies to each line.

## What Functions can't do here

- Set a line to an arbitrary price or raise a price. Discount Functions can only take money off. To override a line price use the Cart Transform `lineUpdate` operation, which only runs on Shopify Plus and development stores.
- Read the result of other discounts. Each Function runs on its own input, so tiers that depended on an earlier Script's output have to be merged into one Function.
- Read the product tag list. Functions can only ask `hasAnyTag` or `hasTags` with tags known when the query runs.
