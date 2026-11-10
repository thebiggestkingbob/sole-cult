import { demoProducts } from "../data/demo-products";
import type { Cart } from "../data/products";
type Line = Cart["lines"]["nodes"][number];
function lineFor(variantId: string, quantity: number): Line {
  const product = demoProducts.find((p) =>
    p.variants.some((v) => v.id === variantId),
  );
  const variant = product?.variants.find((v) => v.id === variantId);
  if (!product || !variant?.availableForSale)
    throw new Error("Please select an available demo size.");
  return {
    id: variant.id,
    quantity,
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
  };
}
function cartFor(lines: Line[]): Cart {
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
function validQuantity(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 10
  );
}
export function restoreDemoCart(raw: string | null): Cart | null {
  if (!raw || raw.length > 131072) return null;
  try {
    const value = JSON.parse(raw);
    if (
      value?.id !== "sole-cult-demo" ||
      !Array.isArray(value.lines?.nodes) ||
      value.lines.nodes.length > 100
    )
      return null;
    const seen = new Set<string>();
    const lines = value.lines.nodes.map((entry: unknown) => {
      if (!entry || typeof entry !== "object") throw Error();
      const item = entry as {
        quantity?: unknown;
        merchandise?: { id?: unknown };
      };
      const id = item.merchandise?.id;
      if (
        typeof id !== "string" ||
        !validQuantity(item.quantity) ||
        seen.has(id)
      )
        throw Error();
      seen.add(id);
      return lineFor(id, item.quantity);
    });
    return cartFor(lines);
  } catch {
    return null;
  }
}
export function changeDemoCart(
  current: Cart | null,
  body: Record<string, unknown>,
): Cart {
  let lines = current?.lines.nodes.map((line) => ({ ...line })) || [];
  if (body.action === "add") {
    const quantity = body.quantity ?? 1;
    if (typeof body.variantId !== "string" || !validQuantity(quantity))
      throw new Error("Please select an available demo size and quantity.");
    const line = lineFor(body.variantId, quantity),
      existing = lines.find((l) => l.id === line.id);
    if (existing)
      existing.quantity = Math.min(10, existing.quantity + quantity);
    else lines.push(line);
  } else if (body.action === "remove")
    lines = lines.filter((l) => l.id !== body.lineId);
  else if (body.action === "update") {
    if (!validQuantity(body.quantity))
      throw new Error("Choose a quantity from 1 to 10.");
    const quantity = body.quantity;
    lines = lines.map((l) => (l.id === body.lineId ? { ...l, quantity } : l));
  } else throw new Error("Invalid demo bag action.");
  return cartFor(lines);
}
