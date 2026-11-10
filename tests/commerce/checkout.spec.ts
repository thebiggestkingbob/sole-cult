import { test, expect } from "@playwright/test";
// No browser API interception: every request runs through the real Next.js routes
// and server-only Shopify client. Only the upstream Shopify fetch is a fixture.
test("catalog → selected variant → server cart cookie → persistence → inventory warning → checkout → remove", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator(".product h2")).toHaveText("Fixture Sneaker 1");
  await expect(
    page.getByRole("button", { name: "EU Size: 41 — sold out" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "EU Size: 40", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "ORDER ON WHATSAPP" }),
  ).toHaveAttribute("href", /EU%20Size%3A%2040/);
  await page.getByRole("button", { name: "ADD TO BAG", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Added to your bag.");
  const cookie = (await context.cookies()).find(
    (c) => c.name === "sole-cult-cart",
  );
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.secure).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    "sole-cult-cart",
  );
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("button", { name: "Bag: 1 items" }).click();
  await page.getByRole("combobox").selectOption("2");
  await expect(
    page.getByRole("button", { name: "Bag: 2 items" }),
  ).toBeVisible();
  await page.getByRole("combobox").selectOption("3");
  await expect(page.getByRole("dialog")).toContainText(
    "Your quantity was adjusted.",
  );
  await expect(page.getByRole("combobox")).toHaveValue("2");
  await expect(
    page.getByRole("link", { name: "CONTINUE TO CHECKOUT" }),
  ).toHaveAttribute(
    "href",
    "https://sole-cult-fixture.myshopify.com/checkouts/test-only",
  );
  const catalog = await (await page.request.get("/api/catalog")).json();
  expect(JSON.stringify(catalog)).not.toContain(
    "fixture-only-not-a-credential",
  );
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Your bag is empty.");
  expect(errors).toEqual([]);
});
test("expired server cart is replaced safely on the next add", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "sole-cult-cart",
      value: "gid://shopify/Cart/expired?key=test-only",
      url: "http://localhost:3100",
      httpOnly: true,
      sameSite: "Lax",
      secure: true,
    },
  ]);
  await page.goto("/");
  await page.getByRole("button", { name: "EU Size: 40", exact: true }).click();
  await page.getByRole("button", { name: "ADD TO BAG", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Added to your bag.");
  await expect(
    page.getByRole("button", { name: "Bag: 1 items" }),
  ).toBeVisible();
});

test("the API rejects malformed origins, primitive payloads and oversized streamed bodies", async ({
  request,
}) => {
  const origin = "http://localhost:3100";
  expect(
    (
      await request.post("/api/cart", {
        headers: { origin: "null" },
        data: { action: "add" },
      })
    ).status(),
  ).toBe(403);
  for (const body of ["null", "[]", "42", "true"])
    expect(
      (
        await request.post("/api/cart", {
          headers: { origin, "content-type": "application/json" },
          data: body,
        })
      ).status(),
    ).toBe(400);
  const { request: send } = await import("node:http");
  const status = await new Promise<number>((resolve, reject) => {
    const req = send(
      "http://localhost:3100/api/cart",
      {
        method: "POST",
        headers: {
          origin,
          "content-type": "application/json",
          "transfer-encoding": "chunked",
        },
      },
      (res) => {
        res.resume();
        resolve(res.statusCode!);
      },
    );
    req.on("error", reject);
    req.write('{"action":"');
    req.write("x".repeat(5000));
    req.end('"}');
  });
  expect(status).toBe(413);
});
