# Payment script: hide Cash on Delivery for orders over $500
# or for customers tagged "no-cod".

GATEWAY_NAME = "Cash on Delivery"
MAXIMUM_SUBTOTAL = Money.new(cents: 500_00)
BLOCKED_TAG = "no-cod"

class HideCashOnDelivery
  def run(cart, payment_gateways)
    over_limit = cart.subtotal_price > MAXIMUM_SUBTOTAL
    tagged = cart.customer && cart.customer.tags.include?(BLOCKED_TAG)
    return unless over_limit || tagged

    payment_gateways.delete_if do |payment_gateway|
      payment_gateway.name.include?(GATEWAY_NAME)
    end
  end
end

HideCashOnDelivery.new.run(Input.cart, Input.payment_gateways)

Output.payment_gateways = Input.payment_gateways
