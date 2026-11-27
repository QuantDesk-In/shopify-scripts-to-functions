# Line item script: spend more, save more.
# 10% off over $100, 15% off over $200, 20% off over $300.
# Gift cards are not discounted and do not count toward the spend.

TIERS = [
  { threshold: Money.new(cents: 300_00), percent: 20 },
  { threshold: Money.new(cents: 200_00), percent: 15 },
  { threshold: Money.new(cents: 100_00), percent: 10 },
]

class TieredDiscount
  def initialize(tiers)
    @tiers = tiers
  end

  def run(cart)
    eligible = cart.line_items.reject { |line_item| line_item.variant.product.gift_card? }
    spend = eligible.map(&:line_price).reduce(Money.zero, :+)

    tier = @tiers.find { |t| spend >= t[:threshold] }
    return unless tier

    multiplier = Decimal.new(100 - tier[:percent]) / 100
    eligible.each do |line_item|
      line_item.change_line_price(
        line_item.line_price * multiplier,
        message: "#{tier[:percent]}% off"
      )
    end
  end
end

TieredDiscount.new(TIERS).run(Input.cart)

Output.cart = Input.cart
