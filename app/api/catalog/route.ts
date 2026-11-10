import { NextResponse } from "next/server";
import { getCatalog, isConfigured } from "@/lib/shopify";
import { products } from "@/data/products";
export const dynamic = "force-dynamic";
export async function GET() {
  const configured = isConfigured();
  try {
    return NextResponse.json(
      {
        products: configured ? await getCatalog() : products,
        live: configured,
        message: configured
          ? null
          : "Online ordering is not available yet. Prices and availability will be confirmed by the store.",
        whatsappNumber: /^[1-9]\d{7,14}$/.test(
          process.env.WHATSAPP_NUMBER || "",
        )
          ? process.env.WHATSAPP_NUMBER
          : null,
        accountUrl: safeAccount(process.env.SHOPIFY_CUSTOMER_ACCOUNT_URL),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        products,
        live: false,
        message:
          "The store is temporarily unavailable. Please try again later.",
        whatsappNumber: null,
        accountUrl: null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
function safeAccount(value?: string) {
  try {
    const url = new URL(value || "");
    return url.protocol === "https:" &&
      (url.hostname.endsWith(".shopify.com") ||
        url.hostname.endsWith(".myshopify.com") ||
        url.hostname === process.env.SHOPIFY_CUSTOMER_ACCOUNT_HOST)
      ? url.href
      : null;
  } catch {
    return null;
  }
}
