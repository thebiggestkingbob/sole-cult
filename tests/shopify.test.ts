import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  getCatalog,
  addToCart,
  getCart,
  mutateCart,
  shopify,
  StoreError,
} from "../lib/shopify";
import { products, money } from "../data/products";
const originalFetch = globalThis.fetch;
process.env.SHOPIFY_STORE_DOMAIN = "sole-cult-test.myshopify.com";
process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN = "test-private-token";
afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.SHOPIFY_COLLECTION_HANDLE;
  process.env.SHOPIFY_STORE_DOMAIN = "sole-cult-test.myshopify.com";
  process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN = "test-private-token";
});
function mock(
  data: unknown,
  inspect?: (url: string, init: RequestInit) => void,
) {
  globalThis.fetch = async (input, init) => {
    inspect?.(String(input), init!);
    return Response.json({ data });
  };
}
test("editorial assortment contains seven entries and no fabricated sale data", () => {
  assert.equal(products.length, 7);
  assert.ok(
    products.every(
      (p) =>
        p.price === null &&
        p.model === null &&
        p.image === null &&
        p.variants.length === 0,
    ),
  );
});
test("currency formatting respects Shopify currency", () => {
  assert.match(money({ amount: "1700", currencyCode: "ZAR" }), /1.*700/);
  assert.match(money({ amount: "120", currencyCode: "USD" }), /120/);
});
test("private storefront token is sent server-side to the verified Shopify domain", async () => {
  mock({ ok: true }, (url, init) => {
    assert.equal(
      url,
      "https://sole-cult-test.myshopify.com/api/2026-10/graphql.json",
    );
    assert.equal(
      (init.headers as Record<string, string>)[
        "Shopify-Storefront-Private-Token"
      ],
      "test-private-token",
    );
    assert.equal(init.cache, "no-store");
  });
  assert.deepEqual(await shopify("query { shop { name } }"), { ok: true });
});
test("rejects a non-Shopify hostname before sending credentials", async () => {
  process.env.SHOPIFY_STORE_DOMAIN = "attacker.example";
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return Response.json({});
  };
  await assert.rejects(shopify("query {}"), StoreError);
  assert.equal(called, false);
});
test("missing credentials report service unavailable", async () => {
  delete process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN;
  await assert.rejects(
    shopify("query {}"),
    (e: unknown) => e instanceof StoreError && e.status === 503,
  );
});
test("catalog preserves real media, variant IDs, inventory and currency", async () => {
  process.env.SHOPIFY_COLLECTION_HANDLE = "showroom";
  mock(
    {
      collection: {
        products: {
          nodes: [
            {
              id: "gid://shopify/Product/1",
              handle: "sneaker",
              title: "Sneaker",
              description: "Authentic product",
              featuredImage: { url: "https://cdn.shopify.com/shoe.png" },
              priceRange: {
                minVariantPrice: { amount: "1700", currencyCode: "ZAR" },
              },
              variants: {
                nodes: [
                  {
                    id: "gid://shopify/ProductVariant/1",
                    title: "UK 8",
                    availableForSale: false,
                    quantityAvailable: 0,
                    selectedOptions: [{ name: "UK Size", value: "8" }],
                    price: { amount: "1700", currencyCode: "ZAR" },
                  },
                ],
                pageInfo: { hasNextPage: false },
              },
              media: {
                nodes: [
                  {
                    sources: [
                      {
                        url: "https://cdn.shopify.com/shoe.glb",
                        format: "glb",
                      },
                    ],
                  },
                ],
              },
            },
          ],
        },
      },
    },
    (_url, init) => {
      assert.equal(JSON.parse(String(init.body)).variables.handle, "showroom");
    },
  );
  const [p] = await getCatalog();
  assert.equal(p.model, "https://cdn.shopify.com/shoe.glb");
  assert.equal(p.variants[0].availableForSale, false);
  assert.equal(p.price?.currencyCode, "ZAR");
});
test("sold-out size prevents a cart mutation", async () => {
  let calls = 0;
  mock(
    { node: { availableForSale: false, quantityAvailable: 0 } },
    () => calls++,
  );
  await assert.rejects(
    addToCart(undefined, "gid://shopify/ProductVariant/1", 1),
    (e: unknown) => e instanceof StoreError && e.status === 409,
  );
  assert.equal(calls, 1);
});
test("insufficient inventory prevents a cart mutation", async () => {
  mock({ node: { availableForSale: true, quantityAvailable: 1 } });
  await assert.rejects(
    addToCart(undefined, "gid://shopify/ProductVariant/1", 2),
    StoreError,
  );
});
test("available size creates a real Shopify cart with selected variant and quantity", async () => {
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    const { query, variables } = JSON.parse(String(init?.body));
    calls++;
    if (query.includes("query Availability"))
      return Response.json({
        data: { node: { availableForSale: true, quantityAvailable: 2 } },
      });
    assert.ok(query.includes("cartCreate"));
    assert.deepEqual(variables.input.lines, [
      { merchandiseId: "gid://shopify/ProductVariant/9", quantity: 1 },
    ]);
    return Response.json({
      data: {
        cartCreate: {
          cart: { id: "cart-id", checkoutUrl: "https://shop.example/checkout" },
          userErrors: [],
          warnings: [],
        },
      },
    });
  };
  const result = await addToCart(
    undefined,
    "gid://shopify/ProductVariant/9",
    1,
  );
  assert.equal(result.cart.id, "cart-id");
  assert.equal(calls, 2);
});
test("Shopify validation errors are surfaced and warnings retained", async () => {
  mock({
    cartLinesUpdate: {
      cart: null,
      userErrors: [{ message: "Not enough stock." }],
      warnings: [],
    },
  });
  await assert.rejects(mutateCart("cartLinesUpdate", {}), /Not enough stock/);
  mock({
    cartLinesRemove: {
      cart: { id: "cart" },
      userErrors: [],
      warnings: [{ message: "Line quantity changed." }],
    },
  });
  assert.deepEqual((await mutateCart("cartLinesRemove", {})).warnings, [
    "Line quantity changed.",
  ]);
});
test("expired cart returns null", async () => {
  mock({ cart: null });
  assert.equal(await getCart("expired"), null);
});
test("upstream GraphQL errors do not leak private details", async () => {
  globalThis.fetch = async () =>
    Response.json({ errors: [{ message: "sensitive internal detail" }] });
  await assert.rejects(
    shopify("query {}"),
    (e: unknown) => e instanceof StoreError && !e.message.includes("sensitive"),
  );
});
