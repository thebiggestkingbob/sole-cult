import { demoProducts } from "../data/demo-products";
import type { Cart } from "../data/products";
export function changeDemoCart(
  current: Cart | null,
  body: Record<string, unknown>,
): Cart {
  let lines = current?.lines.nodes.map((line) => ({ ...line })) || [];
  if (body.action === "add") {
    const product = demoProducts.find((p) =>
      p.variants.some((v) => v.id === body.variantId),
    );
    const variant = product?.variants.find((v) => v.id === body.variantId);
    if (!product || !variant?.availableForSale)
      throw new Error("Please select an available demo size.");
    const existing = lines.find((l) => l.merchandise.id === variant.id);
    if (existing) existing.quantity = Math.min(10, existing.quantity + 1);
    else
      lines.push({
        id: variant.id,
        quantity: 1,
        merchandise: {
          ...variant,
          product: {
            title: product.name,
            featuredImage: {
              url: product.image!,
              altText: "Illustrative preview sneaker",
            },
          },
        },
      });
  } else if (body.action === "remove")
    lines = lines.filter((l) => l.id !== body.lineId);
  else if (body.action === "update") {
    const quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10)
      throw new Error("Choose a quantity from 1 to 10.");
    lines = lines.map((l) => (l.id === body.lineId ? { ...l, quantity } : l));
  } else throw new Error("Invalid demo bag action.");
  return {
    id: "sole-cult-demo",
    checkoutUrl: "",
    totalQuantity: lines.reduce((n, l) => n + l.quantity, 0),
    cost: {
      totalAmount: {
        amount: String(
          lines.reduce(
            (n, l) => n + Number(l.merchandise.price.amount) * l.quantity,
            0,
          ),
        ),
        currencyCode: "ZAR",
      },
    },
    lines: { nodes: lines },
  };
}
