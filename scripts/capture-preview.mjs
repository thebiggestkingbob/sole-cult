import { chromium, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
await mkdir("artifacts", { recursive: true });
const url =
  process.env.PREVIEW_CAPTURE_URL ||
  "file://" + process.cwd() + "/artifacts/sole-cult-preview.html";
for (const [name, options] of [
  ["desktop", { viewport: { width: 1280, height: 720 } }],
  ["mobile", devices["iPhone 13"]],
]) {
  const context = await browser.newContext({
    ...options,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.locator(".hero-photo img").waitFor();
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((img) => img.decode().catch(() => {})),
    ),
  );
  await page.screenshot({
    path: `artifacts/sole-cult-reference-${name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "ADD TO BAG", exact: true }).click();
  await page.getByRole("button", { name: "CONTINUE TO CHECKOUT" }).click();
  await page.screenshot({
    path: `artifacts/sole-cult-reference-checkout-${name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "PREVIEW ORDER CONFIRMATION" })
    .click();
  console.log(name, "demo confirmation verified; page errors:", errors);
  if (errors.length) throw new Error(errors.join(";"));
  await context.close();
}
await browser.close();
