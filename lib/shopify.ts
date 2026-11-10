import "server-only";
import type { Sneaker, Variant, Money, Cart } from "@/data/products";

export class StoreError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}
function config() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN;
  if (!domain || !token)
    throw new StoreError("Online ordering is not configured yet.", 503);
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain))
    throw new StoreError("Store configuration needs attention.", 503);
  const version = process.env.SHOPIFY_API_VERSION || "2026-10";
  if (!/^20\d{2}-(01|04|07|10)$/.test(version))
    throw new StoreError("Store configuration needs attention.", 503);
  return { domain, token, version };
}
export const isConfigured = () =>
  Boolean(
    process.env.SHOPIFY_STORE_DOMAIN &&
      process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN,
  );
export async function shopify<T>(
  query: string,
  variables: Record<string, unknown> = {},
  buyerIp?: string,
): Promise<T> {
  const { domain, token, version } = config();
  const response = await fetch(
    `https://${domain}/api/${version}/graphql.json`,
    {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
      headers: {
        "Content-Type": "application/json",
        "Shopify-Storefront-Private-Token": token,
        ...(buyerIp ? { "Shopify-Storefront-Buyer-IP": buyerIp } : {}),
      },
      body: JSON.stringify({ query, variables }),
    },
  );
  if (!response.ok)
    throw new StoreError(
      "The store is temporarily unavailable. Please try again.",
    );
  const result = await response.json();
  if (result.errors || !result.data)
    throw new StoreError(
      "The store could not complete this request. Please try again.",
    );
  return result.data as T;
}
const variantFields = `id title availableForSale quantityAvailable selectedOptions { name value } price { amount currencyCode }`;
const productFields = `id handle title description options { name } featuredImage { url altText } priceRange { minVariantPrice { amount currencyCode } } variants(first: 250) { nodes { ${variantFields} } pageInfo { hasNextPage } } media(first: 20) { nodes { ... on Model3d { sources { url format } } } }`;
type ShopifyProduct = {
  id: string;
  handle: string;
  title: string;
  description: string;
  featuredImage: { url: string } | null;
  priceRange: { minVariantPrice: Money };
  variants: { nodes: Variant[]; pageInfo: { hasNextPage: boolean } };
  media: { nodes: { sources?: { url: string; format: string }[] }[] };
};
export async function getCatalog(): Promise<Sneaker[]> {
  const handle = process.env.SHOPIFY_COLLECTION_HANDLE;
  const result = handle
    ? await shopify<{
        collection: { products: { nodes: ShopifyProduct[] } } | null;
      }>(
        `query Catalog($handle: String!) { collection(handle:$handle) { products(first:7) { nodes { ${productFields} } } } }`,
        { handle },
      )
    : await shopify<{ products: { nodes: ShopifyProduct[] } }>(
        `query Catalog { products(first:7, sortKey:BEST_SELLING) { nodes { ${productFields} } } }`,
      );
  const items =
    "collection" in result
      ? result.collection?.products.nodes
      : result.products.nodes;
  if (!items)
    throw new StoreError("The showroom collection is unavailable.", 503);
  return items.map((p) => {
    // Do not expose an incomplete variant selector as if it were the full assortment.
    if (p.variants.pageInfo.hasNextPage)
      throw new StoreError(
        "This product has too many variants for the showroom. Please contact the store.",
        503,
      );
    const model = p.media.nodes
      .flatMap((m) => m.sources || [])
      .find((s) => /glb|gltf/i.test(s.format));
    return {
      id: p.id,
      handle: p.handle,
      name: p.title,
      description: p.description,
      color: "",
      image: p.featuredImage?.url || null,
      model: model?.url || null,
      variants: p.variants.nodes,
      price: p.priceRange.minVariantPrice,
    };
  });
}
const cartFields = `id checkoutUrl totalQuantity cost { totalAmount { amount currencyCode } } lines(first:100) { nodes { id quantity merchandise { ... on ProductVariant { id title selectedOptions { name value } price { amount currencyCode } product { title featuredImage { url altText } } } } } }`;
export async function getCart(id: string, ip?: string) {
  const data = await shopify<{ cart: Cart | null }>(
    `query Cart($id:ID!) { cart(id:$id) { ${cartFields} } }`,
    { id },
    ip,
  );
  return data.cart;
}
export async function addToCart(
  cartId: string | undefined,
  variantId: string,
  quantity: number,
  ip?: string,
) {
  const { node } = await shopify<{
    node: {
      availableForSale: boolean;
      quantityAvailable: number | null;
    } | null;
  }>(
    `query Availability($id:ID!) { node(id:$id) { ... on ProductVariant { availableForSale quantityAvailable } } }`,
    { id: variantId },
    ip,
  );
  if (!node?.availableForSale)
    throw new StoreError(
      "This size is no longer available. Choose another size.",
      409,
    );
  if (node.quantityAvailable != null && quantity > node.quantityAvailable)
    throw new StoreError("The requested quantity is no longer available.", 409);
  return mutateCart(
    cartId ? "cartLinesAdd" : "cartCreate",
    cartId
      ? { cartId, lines: [{ merchandiseId: variantId, quantity }] }
      : { input: { lines: [{ merchandiseId: variantId, quantity }] } },
    ip,
  );
}
export async function mutateCart(
  action: "cartCreate" | "cartLinesAdd" | "cartLinesUpdate" | "cartLinesRemove",
  variables: Record<string, unknown>,
  ip?: string,
): Promise<{ cart: Cart; warnings: string[] }> {
  const defs = {
    cartCreate: "$input:CartInput!",
    cartLinesAdd: "$cartId:ID!, $lines:[CartLineInput!]!",
    cartLinesUpdate: "$cartId:ID!, $lines:[CartLineUpdateInput!]!",
    cartLinesRemove: "$cartId:ID!, $lineIds:[ID!]!",
  }[action];
  const args = {
    cartCreate: "input:$input",
    cartLinesAdd: "cartId:$cartId, lines:$lines",
    cartLinesUpdate: "cartId:$cartId, lines:$lines",
    cartLinesRemove: "cartId:$cartId, lineIds:$lineIds",
  }[action];
  const data = await shopify<
    Record<
      string,
      {
        cart: Cart | null;
        userErrors: { message: string }[];
        warnings: { message: string }[];
      }
    >
  >(
    `mutation ChangeCart(${defs}) { ${action}(${args}) { cart { ${cartFields} } userErrors { message } warnings { message } } }`,
    variables,
    ip,
  );
  const result = data[action];
  if (result.userErrors.length || !result.cart)
    throw new StoreError(
      result.userErrors[0]?.message || "Your bag could not be updated.",
      409,
    );
  return {
    cart: result.cart,
    warnings: (result.warnings || []).map((w) => w.message),
  };
}
