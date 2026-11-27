# Shopify Scripts to Functions

Three common Shopify Scripts ported to Shopify Functions. Each port sits next to the Ruby Script it replaces, with tests and notes on what behaves differently.

Shopify Scripts were Ruby snippets that Plus stores ran from the Script Editor app to change line item prices, shipping rates and payment methods at checkout. Shopify stopped running them on 30 June 2026. Stores that relied on them now need Functions, delivered through an app. See Shopify's notice: https://help.shopify.com/en/manual/checkout-settings/script-editor/transitioning-to-functions

## The ports

| Script type | Function API | What it does | Folder |
| --- | --- | --- | --- |
| Line item | [Discount](https://shopify.dev/docs/api/functions/latest/discount) (`cart.lines.discounts.generate.run`) | 10% off over $100, 15% over $200, 20% over $300 on product lines. Tiers come from a metafield on the discount. | [extensions/tiered-discount](extensions/tiered-discount) |
| Shipping | [Delivery Customization](https://shopify.dev/docs/api/functions/latest/delivery-customization) (`cart.delivery-options.transform.run`) | Hides Express options when a delivery group has a product tagged `oversized` or ships to a PO box. | [extensions/hide-express-shipping](extensions/hide-express-shipping) |
| Payment | [Payment Customization](https://shopify.dev/docs/api/functions/latest/payment-customization) (`cart.payment-methods.transform.run`) | Hides Cash on Delivery when the cart total is over a limit or the customer has a given tag. | [extensions/hide-cash-on-delivery](extensions/hide-cash-on-delivery) |

Each folder has:

- `original-script.rb`: the Script Editor version
- `src/*.graphql`: the input query
- `src/*.js`: the function
- `tests/`: vitest tests and JSON fixtures
- `README.md`: configuration, how the Ruby maps to the Function, and what Functions can't do

All three target Functions API version `2026-10` and are written in JavaScript.

## Run the tests

Needs Node 22.12 or later.

```sh
npm install
npm test
```

The tests call each exported function with the JSON fixtures in `tests/fixtures` and compare the returned operations. They don't build Wasm and don't need a network connection or a Shopify account.

## Try it on a dev store

You need a Shopify Partner or Dev Dashboard account and a development store.

1. Link the repo to an app. This fills in `client_id` in `shopify.app.toml`.

   ```sh
   npx shopify app config link
   ```

2. Pull the function schema for each extension. The build reads `schema.graphql` and checks that it matches the `api_version` in the extension's TOML.

   ```sh
   npx shopify app function schema --path extensions/tiered-discount
   npx shopify app function schema --path extensions/hide-express-shipping
   npx shopify app function schema --path extensions/hide-cash-on-delivery
   ```

3. Start the dev session and install the app on your store when asked.

   ```sh
   npx shopify app dev
   ```

4. Create the discount and customizations through the Admin API, since the app has no admin UI. Press `g` in the dev session to open GraphiQL, or save each mutation below to a file and run `npx shopify app execute --store <your-store>.myshopify.com --query-file <file>`. `functionHandle` is the `handle` from each extension's TOML.

Tiered discount:

```graphql
mutation {
  discountAutomaticAppCreate(
    automaticAppDiscount: {
      title: "Spend more, save more"
      functionHandle: "tiered-discount"
      discountClasses: [PRODUCT]
      startsAt: "2026-11-25T00:00:00Z"
      combinesWith: { orderDiscounts: false, productDiscounts: false, shippingDiscounts: true }
      metafields: [
        {
          namespace: "$app"
          key: "function-configuration"
          type: "json"
          value: "{\"tiers\":[{\"minimumSubtotal\":100,\"percentage\":10},{\"minimumSubtotal\":200,\"percentage\":15},{\"minimumSubtotal\":300,\"percentage\":20}]}"
        }
      ]
    }
  ) {
    automaticAppDiscount { discountId }
    userErrors { field message }
  }
}
```

Hide express shipping:

```graphql
mutation {
  deliveryCustomizationCreate(
    deliveryCustomization: {
      title: "Hide Express for oversized items and PO boxes"
      functionHandle: "hide-express-shipping"
      enabled: true
      metafields: [
        {
          namespace: "$app"
          key: "function-configuration"
          type: "json"
          value: "{\"oversizedTags\":[\"oversized\"],\"hideTitleContains\":\"Express\",\"hideForPoBox\":true}"
        }
      ]
    }
  ) {
    deliveryCustomization { id }
    userErrors { field message }
  }
}
```

Hide cash on delivery:

```graphql
mutation {
  paymentCustomizationCreate(
    paymentCustomization: {
      title: "Hide COD over 500 or for no-cod customers"
      functionHandle: "hide-cash-on-delivery"
      enabled: true
      metafields: [
        {
          namespace: "$app"
          key: "function-configuration"
          type: "json"
          value: "{\"customerTags\":[\"no-cod\"],\"maximumTotal\":500,\"methodNameContains\":\"Cash on Delivery\"}"
        }
      ]
    }
  ) {
    paymentCustomization { id }
    userErrors { field message }
  }
}
```

5. Build a cart on the store and go to checkout. Each run shows up in the `app dev` output. `npx shopify app function replay` replays a run locally against your current code.

The app asks for `write_discounts`, `write_delivery_customizations` and `write_payment_customizations`. To change the configuration later, update the metafield with `metafieldsSet` on the discount or customization ID.

## Using a port in your own app

Copy the extension folder into your app's `extensions/` directory, add the matching scope to your `shopify.app.toml`, and run `shopify app function schema` in the new folder. Each function only depends on `@shopify/shopify_function`.

## Known limits

- Functions can't change a line's price the way `change_line_price` did. Discount Functions take money off and show it as a discount. Overriding a price needs the Cart Transform `lineUpdate` operation, which only runs on Shopify Plus and development stores.
- Functions can't read tag lists. They can only ask whether a product or customer has specific tags, so the tags are passed in through the metafield as query variables. The delivery and payment ports fail their run, and change nothing, if that metafield is missing.
- Each Function sees only its own input. Scripts that built on another Script's result need to be merged into one Function.
- Custom apps that use Function APIs need a Shopify Plus store. Public App Store apps with Functions work on any plan.
- JavaScript functions run inside Shopify's instruction limits. Very large carts can hit them. Shopify recommends Rust for that case.
- Fixtures are hand written from the input queries. Check a few real runs from `app dev` before going live.

## Need your Scripts ported?

Quantdesk ports Scripts to Functions for Plus stores and agencies: https://shopify.quantdesk.in

## License

MIT. See [LICENSE](LICENSE).
