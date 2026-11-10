import { test, expect, type Page } from "@playwright/test";
const variant = {
  id: "gid://shopify/ProductVariant/1",
  title: "UK 8",
  availableForSale: true,
  quantityAvailable: 2,
  selectedOptions: [{ name: "UK Size", value: "8" }],
  price: { amount: "1700", currencyCode: "ZAR" },
};
function catalog(model: string | null = null) {
  return {
    live: true,
    message: null,
    whatsappNumber: "27000000000",
    accountUrl: "https://test.myshopify.com/account",
    products: Array.from({ length: 7 }, (_, i) => ({
      id: `product-${i}`,
      handle: `sneaker-${i}`,
      name: `Test Sneaker ${i + 1}`,
      color: "Cream",
      description: "Test catalog fixture",
      image: null,
      model,
      variants: [
        { ...variant, id: `gid://shopify/ProductVariant/${i + 1}` },
        {
          ...variant,
          id: `gid://shopify/ProductVariant/${i + 101}`,
          title: "UK 9",
          availableForSale: false,
          selectedOptions: [{ name: "UK Size", value: "9" }],
        },
      ],
      price: variant.price,
    })),
  };
}
function cart(quantity = 1) {
  return {
    id: "server-cart",
    checkoutUrl: "https://test.myshopify.com/checkouts/fixture",
    totalQuantity: quantity,
    cost: {
      totalAmount: { amount: String(1700 * quantity), currencyCode: "ZAR" },
    },
    lines: {
      nodes: quantity
        ? [
            {
              id: "line-1",
              quantity,
              merchandise: {
                ...variant,
                product: { title: "Test Sneaker 1", featuredImage: null },
              },
            },
          ]
        : [],
    },
  };
}
async function mockCatalog(page: Page, model: string | null = null) {
  await page.route("**/api/catalog", (route) =>
    route.fulfill({ json: catalog(model) }),
  );
}
test("unconfigured storefront is honest, usable, and preserves seven unnamed thumbnails", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /FOR THE OBSESSED/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "ADD TO BAG", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText("Price on request")).toBeVisible();
  await expect(page.locator(".thumb")).toHaveCount(7);
  await expect(page.locator(".thumb").first()).toHaveText("");
  await expect(page.getByText("Product image not yet available")).toBeVisible();
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Customer accounts are not available yet",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("textbox", { name: "Search sneakers" }).fill("zzzz");
  await expect(page.getByText("No sneakers found.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("search selects a sneaker, resets size, and respects reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockCatalog(page);
  await page.goto("/");
  await page.getByRole("button", { name: "UK Size: 8", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "ADD TO BAG", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search sneakers" })
    .fill("Sneaker 3");
  await page
    .getByRole("button", { name: "Test Sneaker 3", exact: true })
    .click();
  await expect(page.locator(".product h2")).toHaveText("Test Sneaker 3");
  await expect(
    page.getByRole("button", { name: "ADD TO BAG", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".product h2")).toHaveText("Test Sneaker 4");
});
test("size, WhatsApp, cart quantity, remove, and checkout use the selected Shopify variant", async ({
  page,
}) => {
  await mockCatalog(page);
  let quantity = 0;
  const mutations: Record<string, unknown>[] = [];
  await page.route("**/api/cart", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { cart: quantity ? cart(quantity) : null } });
      return;
    }
    const body = route.request().postDataJSON();
    mutations.push(body);
    quantity = body.action === "remove" ? 0 : body.quantity;
    await route.fulfill({ json: { cart: cart(quantity), warnings: [] } });
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "UK Size: 9 — sold out" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "UK Size: 8", exact: true }).click();
  const link = page.getByRole("link", { name: "ORDER ON WHATSAPP" });
  await expect(link).toHaveAttribute("href", /wa.me\/27000000000/);
  expect(decodeURIComponent((await link.getAttribute("href")) || "")).toContain(
    "UK Size: 8",
  );
  await page.getByRole("button", { name: "ADD TO BAG", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Your bag" })).toContainText(
    "Test Sneaker 1",
  );
  expect(mutations[0]).toEqual({
    action: "add",
    variantId: variant.id,
    quantity: 1,
  });
  await expect(
    page.getByRole("link", { name: "CONTINUE TO CHECKOUT" }),
  ).toHaveAttribute("href", cart().checkoutUrl);
  await page.getByRole("combobox").selectOption("2");
  await expect(
    page.getByRole("button", { name: "Bag: 2 items" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Your bag is empty");
});
test("stock errors are shown without inventing a cart", async ({ page }) => {
  await mockCatalog(page);
  await page.route("**/api/cart", (route) =>
    route.fulfill({
      status: route.request().method() === "GET" ? 200 : 409,
      json:
        route.request().method() === "GET"
          ? { cart: null }
          : { error: "This size is no longer available." },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "UK Size: 8", exact: true }).click();
  await page.getByRole("button", { name: "ADD TO BAG", exact: true }).click();
  await expect(
    page.getByText("This size is no longer available."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bag: 0 items" }),
  ).toBeVisible();
});
test("API rejects cross-origin, invalid JSON and invalid variant mutations", async ({
  request,
}) => {
  const origin = "http://127.0.0.1:3000";
  expect(
    (
      await request.post("/api/cart", {
        headers: { origin: "https://evil.example" },
        data: { action: "add" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/cart", {
        headers: { origin },
        data: { action: "add", variantId: "fake", quantity: 1 },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/cart", {
        headers: { origin, "content-type": "application/json" },
        data: "{",
      })
    ).status(),
  ).toBe(400);
  expect((await request.get("/api/cart")).headers()["cache-control"]).toBe(
    "no-store",
  );
});
// Explicitly synthetic test mesh; never included in the production catalog or represented as a sneaker.
function testModel() {
  const positions = new Float32Array([
    -1, -0.5, 0, 1, -0.5, 0, 0, 0.7, 0.4, -1, -0.5, 0, 0, 0.7, 0.4, 0, 0, -0.7,
  ]);
  return {
    asset: { version: "2.0", generator: "SOLE CULT test fixture" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
    materials: [
      {
        doubleSided: true,
        pbrMetallicRoughness: {
          baseColorFactor: [0.6, 0.3, 0.15, 1],
          metallicFactor: 0,
          roughnessFactor: 0.8,
        },
      },
    ],
    buffers: [
      {
        byteLength: positions.byteLength,
        uri:
          "data:application/octet-stream;base64," +
          Buffer.from(positions.buffer).toString("base64"),
      },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positions.byteLength },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 6,
        type: "VEC3",
        min: [-1, -0.5, -0.7],
        max: [1, 0.7, 0.4],
      },
    ],
  };
}
test("real WebGL model loading, rotate, zoom and flying transition", async ({
  page,
  isMobile,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await mockCatalog(page, "/synthetic-test.gltf");
  await page.route("**/synthetic-test.gltf", (route) =>
    route.fulfill({ json: testModel() }),
  );
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(700);
  await expect(page.locator(".asset-fallback")).toHaveCount(0);
  const before = await page.locator("canvas").screenshot();
  await page.getByRole("button", { name: "Rotate", exact: true }).click();
  await page.waitForTimeout(100);
  expect(
    Buffer.compare(before, await page.locator("canvas").screenshot()),
  ).not.toBe(0);
  await page.getByRole("button", { name: "Zoom", exact: true }).click();
  await expect(page.getByRole("button", { name: "Reset zoom" })).toBeVisible();
  await page
    .getByRole("button", { name: "View Test Sneaker 2", exact: true })
    .click();
  await expect(page.locator(".thumb").last()).toBeDisabled();
  await expect(page.locator(".product h2")).toHaveText("Test Sneaker 2");
  await expect(page.locator(".thumb").last()).toBeEnabled();
  await page.getByRole("button", { name: "Reset 3D view" }).click();
  const canvas = page.locator("canvas");
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  const gestureBefore = await canvas.screenshot();
  const x = bounds!.x + bounds!.width / 2,
    y = bounds!.y + bounds!.height / 2;
  if (isMobile) {
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (let i = 1; i <= 6; i++)
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x + i * 12, y: y + i * 3 }],
      });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await session.detach();
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 80, y + 20, { steps: 6 });
    await page.mouse.up();
    await page.mouse.wheel(0, -100);
  }
  expect(Buffer.compare(gestureBefore, await canvas.screenshot())).not.toBe(0);
  expect(errors).toEqual([]);
});
test("model loading failure falls back to a clearly labelled image state", async ({
  page,
}) => {
  await mockCatalog(page, "/missing-model.glb");
  await page.route("**/missing-model.glb", (route) =>
    route.fulfill({ status: 404, body: "Missing" }),
  );
  await page.goto("/");
  await expect(
    page.getByText("The 3D model could not load.", { exact: false }),
  ).toBeVisible();
});

test("no WebGL uses an honest fallback and disables 3D controls", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof original>
    ) {
      if (String(args[0]).startsWith("webgl")) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await mockCatalog(page, "/synthetic-test.gltf");
  await page.goto("/");
  await expect(
    page.getByText("3D is unavailable on this device.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Rotate", exact: true }),
  ).toBeDisabled();
});
test("the entrance animation waits for a slow model to load", async ({
  page,
}) => {
  const data = catalog("/first.gltf");
  data.products[1].model = "/slow.gltf";
  await page.route("**/api/catalog", (r) => r.fulfill({ json: data }));
  await page.route("**/first.gltf", (r) => r.fulfill({ json: testModel() }));
  await page.route("**/slow.gltf", async (r) => {
    await new Promise((resolve) => setTimeout(resolve, 1800));
    await r.fulfill({ json: testModel() });
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Rotate", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "View Test Sneaker 2", exact: true })
    .click();
  await expect(page.locator(".product h2")).toHaveText("Test Sneaker 2");
  await expect(page.locator(".thumb").last()).toBeDisabled();
  await expect(page.locator(".thumb").last()).toBeEnabled({
    timeout: 10000,
  });
  await expect(page.locator("canvas")).toBeVisible();
});

test("reference-matched preview renders distinct image assets and a safe demo checkout", async ({
  page,
}) => {
  const calls: string[] = [];
  const errors: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/")) calls.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/preview");
  await expect(page.getByText("DESIGN PREVIEW", { exact: true })).toBeVisible();
  await expect(page.locator(".hero-photo img")).toBeVisible();
  await expect(page.locator(".thumb img,.thumb svg")).toHaveCount(7);
  await expect(page.locator(".interaction")).toBeHidden();
  for (let i = 1; i < 7; i++) {
    await page.locator(".thumb").nth(i).click();
    await expect(page.locator(".hero-photo svg")).toBeVisible();
    await expect(page.locator(".thumb").nth(i)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  }
  await page.locator(".thumb").first().click();

  expect(
    await page
      .locator(".hero-photo img")
      .evaluate((img) => (img as HTMLImageElement).naturalWidth > 0),
  ).toBe(true);
  await page.getByRole("button", { name: "EU Size: 40", exact: true }).click();
  await page
    .getByRole("button", { name: "ORDER ON WHATSAPP", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("EU Size: 40");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "ADD TO BAG", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Added to your preview bag.",
  );
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("button", { name: "Bag: 1 items" }).click();
  await page.getByRole("button", { name: "CONTINUE TO CHECKOUT" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "No payment details are collected.",
  );
  await page
    .getByRole("button", { name: "PREVIEW ORDER CONFIRMATION" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("No order was placed");
  expect(calls).toEqual([]);
  expect(errors).toEqual([]);
});

test("a corrupted saved preview bag is discarded without breaking the storefront", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    sessionStorage.setItem(
      "sole-cult-demo-cart",
      '{"id":"sole-cult-demo","lines":{"nodes":[null]}}',
    ),
  );
  await page.goto("/preview");
  await page.getByRole("button", { name: "Bag: 0 items" }).click();
  await expect(page.getByRole("dialog")).toContainText("Your bag is empty.");
  expect(errors).toEqual([]);
});
test("the preview bag still works when the browser blocks storage", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    Object.defineProperty(window, "sessionStorage", {
      get() {
        throw new DOMException("Storage blocked", "SecurityError");
      },
    }),
  );
  await page.goto("/preview");
  await page.getByRole("button", { name: "ADD TO BAG", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Added to your preview bag.",
  );
  await expect(
    page.getByRole("button", { name: "Bag: 1 items" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("a stalled model falls back and releases sneaker selection", async ({
  page,
}) => {
  await page.clock.install();
  await mockCatalog(page, "/never-finishes.glb");
  await page.route("**/never-finishes.glb", () => new Promise(() => {}));
  await page.goto("/");
  await expect(page.getByText("Loading 3D model…")).toBeVisible();
  await page.clock.fastForward(15001);
  await expect(
    page.getByText("The 3D model is taking too long.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Rotate", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".thumb").last()).toBeEnabled();
});
