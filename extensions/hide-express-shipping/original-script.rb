# Shipping script: hide Express rates when the cart has an oversized
# product or the order ships to a PO box.

HIDDEN_RATE_NAME = "Express"
OVERSIZED_TAG = "oversized"
PO_BOX_KEYWORDS = ["po box", "p.o. box", "p o box", "post office box"]

class HideExpressShipping
  def run(cart, shipping_rates)
    return unless oversized?(cart) || po_box?(cart.shipping_address)

    shipping_rates.delete_if do |shipping_rate|
      shipping_rate.name.downcase.include?(HIDDEN_RATE_NAME.downcase)
    end
  end

  private

  def oversized?(cart)
    cart.line_items.any? do |line_item|
      line_item.variant.product.tags.include?(OVERSIZED_TAG)
    end
  end

  def po_box?(address)
    return false if address.nil?

    [address.address1, address.address2].compact.any? do |line|
      PO_BOX_KEYWORDS.any? { |keyword| line.downcase.include?(keyword) }
    end
  end
end

HideExpressShipping.new.run(Input.cart, Input.shipping_rates)

Output.shipping_rates = Input.shipping_rates
