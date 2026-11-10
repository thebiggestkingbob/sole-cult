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
export async function GET(request: NextRequest) {
  try {
    const id = (await cookies()).get(cookieName)?.value;
    const cart = id ? await getCart(id, buyerIp(request)) : null;
    const response = NextResponse.json(
      { cart },
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
    if (
      !origin ||
      new URL(origin).host !== request.headers.get("host") ||
      new URL(origin).protocol !==
        (process.env.VERCEL ? "https:" : request.nextUrl.protocol)
    )
      throw new StoreError("Please order from the SOLE CULT website.", 403);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new StoreError("Invalid request.", 415);
    if (Number(request.headers.get("content-length")) > 4096)
      throw new StoreError("Request too large.", 413);
    const body = await request.json();
    const id = (await cookies()).get(cookieName)?.value;
    const ip = buyerIp(request);
    let result;
    if (body.action === "add") {
      if (
        typeof body.variantId !== "string" ||
        !/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(body.variantId) ||
        !Number.isInteger(body.quantity) ||
        body.quantity < 1 ||
        body.quantity > 10
      )
        throw new StoreError("Choose a valid size and quantity.", 400);
      // Expired Shopify carts are replaced on the next add, without retrying mutations.
      const existing = id ? await getCart(id, ip) : null;
      result = await addToCart(existing?.id, body.variantId, body.quantity, ip);
    } else if (body.action === "update" || body.action === "remove") {
      if (!id || typeof body.lineId !== "string" || body.lineId.length > 512)
        throw new StoreError(
          "Your bag has expired. Please add the sneaker again.",
          400,
        );
      if (
        body.action === "update" &&
        (!Number.isInteger(body.quantity) ||
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
    const response = NextResponse.json(result, {
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
