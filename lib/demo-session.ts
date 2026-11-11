import { restoreDemoCart } from "./demo-cart";
import type { Cart } from "../data/products";
const key = "sole-cult-demo-cart";
export function loadDemoSession(): Cart | null {
  try {
    const raw = sessionStorage.getItem(key);
    const cart = restoreDemoCart(raw);
    if (raw && !cart) sessionStorage.removeItem(key);
    return cart;
  } catch {
    return null;
  }
}
export function saveDemoSession(cart: Omit<Cart, "id"> | null) {
  try {
    if (cart)
      sessionStorage.setItem(
        key,
        JSON.stringify({
          id: "sole-cult-demo",
          lines: {
            nodes: cart.lines.nodes.map((line) => ({
              quantity: line.quantity,
              merchandise: { id: line.merchandise.id },
            })),
          },
        }),
      );
    else sessionStorage.removeItem(key);
  } catch {
    /* The preview still works when browser storage is unavailable. */
  }
}
