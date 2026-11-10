// Test-only upstream fixture. Loaded explicitly by playwright.commerce.config.ts;
// never imported by the application, build, deployment or default start command.
if (
  process.env.SHOPIFY_STORE_DOMAIN !== "sole-cult-fixture.myshopify.com" ||
  process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN !==
    "fixture-only-not-a-credential"
)
  throw Error("The commerce fixture requires its isolated test configuration.");
const originalFetch = globalThis.fetch;
const carts = new Map();
const price = { amount: "1700", currencyCode: "ZAR" };
const variants = [
  {
    id: "gid://shopify/ProductVariant/1",
    title: "40",
    availableForSale: true,
    quantityAvailable: 2,
    selectedOptions: [{ name: "EU Size", value: "40" }],
    price,
  },
  {
    id: "gid://shopify/ProductVariant/2",
    title: "41",
    availableForSale: false,
    quantityAvailable: 0,
    selectedOptions: [{ name: "EU Size", value: "41" }],
    price,
  },
];
const products = Array.from({ length: 7 }, (_, i) => ({
  id: `gid://shopify/Product/${i + 1}`,
  handle: `fixture-sneaker-${i + 1}`,
  title: `Fixture Sneaker ${i + 1}`,
  description: "Isolated server integration fixture.",
  options: [{ name: "EU Size" }],
  featuredImage: {
    url: "http://localhost:3100/reference/air-force.png",
    altText: "Fixture image",
  },
  priceRange: { minVariantPrice: price },
  variants: { nodes: variants, pageInfo: { hasNextPage: false } },
  media: { nodes: [] },
}));
function serialize(cart) {
  const lines = [...cart.lines.values()];
  return {
    id: cart.id,
    checkoutUrl: "https://sole-cult-fixture.myshopify.com/checkouts/test-only",
    totalQuantity: lines.reduce((n, l) => n + l.quantity, 0),
    cost: {
      totalAmount: {
        amount: String(lines.reduce((n, l) => n + l.quantity * 1700, 0)),
        currencyCode: "ZAR",
      },
    },
    lines: { nodes: lines },
  };
}
function response(data) {
  return Response.json({ data });
}
globalThis.fetch = async (input, init) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  if (new URL(url).hostname !== "sole-cult-fixture.myshopify.com")
    return originalFetch(input, init);
  const headers = new Headers(init?.headers);
  if (
    headers.get("Shopify-Storefront-Private-Token") !==
    "fixture-only-not-a-credential"
  )
    return Response.json(
      { errors: [{ message: "Fixture private header missing." }] },
      { status: 401 },
    );
  const { query, variables = {} } = JSON.parse(String(init?.body));
  if (query.includes("query Catalog")) {
    if (variables.handle !== "approved-showroom")
      return response({ collection: null });
    return response({ collection: { products: { nodes: products } } });
  }
  if (query.includes("query Availability"))
    return response({
      node: variants.find((v) => v.id === variables.id) || null,
    });
  if (query.includes("query Cart"))
    return response({
      cart: carts.has(variables.id) ? serialize(carts.get(variables.id)) : null,
    });
  const action = [
    "cartCreate",
    "cartLinesAdd",
    "cartLinesUpdate",
    "cartLinesRemove",
  ].find((a) => query.includes(a + "("));
  if (!action)
    return Response.json({
      errors: [{ message: "Unsupported test operation." }],
    });
  let cart = carts.get(variables.cartId);
  if (action === "cartCreate") {
    const id = `gid://shopify/Cart/${crypto.randomUUID()}?key=test-only`;
    cart = { id, lines: new Map() };
    carts.set(id, cart);
  }
  if (!cart)
    return response({
      [action]: {
        cart: null,
        userErrors: [{ message: "Your cart has expired." }],
        warnings: [],
      },
    });
  const warnings = [];
  if (action === "cartLinesRemove")
    for (const id of variables.lineIds) cart.lines.delete(id);
  else
    for (const line of variables.input?.lines || variables.lines) {
      const id =
        line.id ||
        `gid://shopify/CartLine/${line.merchandiseId.split("/").at(-1)}`;
      const existing = cart.lines.get(id);
      const variant = variants.find(
        (v) => v.id === (line.merchandiseId || existing?.merchandise.id),
      );
      if (!variant?.availableForSale)
        return response({
          [action]: {
            cart: serialize(cart),
            userErrors: [{ message: "This size is no longer available." }],
            warnings: [],
          },
        });
      const requested =
        action === "cartLinesUpdate"
          ? line.quantity
          : (existing?.quantity || 0) + line.quantity;
      const quantity = Math.min(requested, variant.quantityAvailable);
      if (requested > quantity)
        warnings.push({
          message: "Only 2 pairs are available. Your quantity was adjusted.",
        });
      cart.lines.set(id, {
        id,
        quantity,
        merchandise: {
          ...variant,
          product: {
            title: "Fixture Sneaker 1",
            featuredImage: products[0].featuredImage,
          },
        },
      });
    }
  return response({
    [action]: { cart: serialize(cart), userErrors: [], warnings },
  });
};
