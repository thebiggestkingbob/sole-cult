import type { Cart } from "@/data/products";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { addToCart, getCart, mutateCart, StoreError } from "@/lib/shopify";
export const dynamic = "force-dynamic";
const cookieName = "sole-cult-cart";
const options = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 10,
};
function buyerIp(request: NextRequest) {
  return process.env.VERCEL
    ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim()
    : undefined;
}
function errorResponse(error: unknown) {
  return NextResponse.json(
    {
      error:
        error instanceof StoreError
          ? error.message
          : "Your bag could not be updated. Please try again.",
    },
    {
      status: error instanceof StoreError ? error.status : 502,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
function publicCart(cart: Cart | null) {
  if (!cart) return null;
  return { checkoutUrl: cart.checkoutUrl, totalQuantity: cart.totalQuantity, cost: cart.cost, lines: cart.lines };
}
async function readMutation(
  request: NextRequest,
): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new StoreError("Invalid request.", 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 4096) {
        await reader.cancel();
        throw new StoreError("Request too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new StoreError("Invalid request.", 400);
  return value as Record<string, unknown>;
}
export async function GET(request: NextRequest) {
  try {
    const id = (await cookies()).get(cookieName)?.value;
    const cart = id ? await getCart(id, buyerIp(request)) : null;
    const response = NextResponse.json(
      { cart: publicCart(cart) },
      { headers: { "Cache-Control": "no-store" } },
    );
    if (id && !cart)
      response.cookies.set(cookieName, "", { ...options, maxAge: 0 });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    // Same-origin requests plus JSON protect cookie-backed mutations from CSRF.
    const origin = request.headers.get("origin");
    let source: URL | undefined;
    try {
      source = origin ? new URL(origin) : undefined;
    } catch {
      /* Reject malformed origins below. */
    }
    if (
      !source ||
      source.host !== request.headers.get("host") ||
      source.protocol !==
        (process.env.VERCEL ? "https:" : request.nextUrl.protocol)
    )
      throw new StoreError("Please order from the SOLE CULT website.", 403);
    if (
      request.headers
        .get("content-type")
        ?.split(";")[0]
        .trim()
        .toLowerCase() !== "application/json"
    )
      throw new StoreError("Invalid request.", 415);
    if (Number(request.headers.get("content-length")) > 4096)
      throw new StoreError("Request too large.", 413);
    const body = await readMutation(request);
    const id = (await cookies()).get(cookieName)?.value;
    const ip = buyerIp(request);
    let result;
    if (body.action === "add") {
      if (
        typeof body.variantId !== "string" ||
        !/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(body.variantId) ||
        typeof body.quantity !== "number" ||
        !Number.isInteger(body.quantity) ||
        body.quantity < 1 ||
        body.quantity > 10
      )
        throw new StoreError("Choose a valid size and quantity.", 400);
      // Expired Shopify carts are replaced on the next add, without retrying mutations.
      const existing = id ? await getCart(id, ip) : null;
      result = await addToCart(existing?.id, body.variantId, body.quantity, ip);
    } else if (body.action === "update" || body.action === "remove") {
      if (
        !id ||
        typeof body.lineId !== "string" ||
        !body.lineId.trim() ||
        body.lineId.length > 512
      )
        throw new StoreError(
          "Your bag has expired. Please add the sneaker again.",
          400,
        );
      if (
        body.action === "update" &&
        (typeof body.quantity !== "number" ||
          !Number.isInteger(body.quantity) ||
          body.quantity < 1 ||
          body.quantity > 10)
      )
        throw new StoreError("Choose a quantity between 1 and 10.", 400);
      result =
        body.action === "remove"
          ? await mutateCart(
              "cartLinesRemove",
              { cartId: id, lineIds: [body.lineId] },
              ip,
            )
          : await mutateCart(
              "cartLinesUpdate",
              {
                cartId: id,
                lines: [{ id: body.lineId, quantity: body.quantity }],
              },
              ip,
            );
    } else throw new StoreError("Invalid bag action.", 400);
    const response = NextResponse.json({ ...result, cart: publicCart(result.cart) }, {
      headers: { "Cache-Control": "no-store" },
    });
    response.cookies.set(cookieName, result.cart.id, options);
    return response;
  } catch (error) {
    return errorResponse(
      error instanceof SyntaxError
        ? new StoreError("Invalid request.", 400)
        : error,
    );
  }
}
