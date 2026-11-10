import { chromium, devices } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
await mkdir("artifacts", { recursive: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const url = process.env.PREVIEW_CAPTURE_URL || "http://127.0.0.1:3001/preview";
await page.goto(url);
for (let i = 0; i < 7; i++) {
  if (i) await page.locator(".thumb").nth(i).click();
  await page.waitForFunction(
    () => !document.querySelector(".interaction button").disabled,
  );
  await page.locator("canvas").screenshot();
  const data = await page
    .locator("canvas")
    .evaluate((c) => c.toDataURL("image/png").split(",")[1]);
  await writeFile(
    `public/shoes/preview-${i + 1}.png`,
    Buffer.from(data, "base64"),
  );
  console.log("Captured sneaker", i + 1);
}
await page.goto(url);
await page.waitForFunction(
  () => !document.querySelector(".interaction button").disabled,
);
await page.screenshot({
  path: "artifacts/sole-cult-desktop.png",
  fullPage: true,
});
const mobile = await browser.newContext({
  ...devices["iPhone 13"],
  reducedMotion: "reduce",
});
const phone = await mobile.newPage();
await phone.goto(url);
await phone.waitForFunction(
  () => !document.querySelector(".interaction button").disabled,
);
await phone.screenshot({
  path: "artifacts/sole-cult-mobile.png",
  fullPage: true,
});
await page.getByRole("button", { name: "EU Size: 40", exact: true }).click();
await page.getByRole("button", { name: "ADD TO BAG", exact: true }).click();
await page.getByRole("button", { name: "CONTINUE TO CHECKOUT" }).click();
await page.screenshot({
  path: "artifacts/sole-cult-checkout.png",
  fullPage: true,
});
await browser.close();
if (errors.length) throw new Error(errors.join("\n"));
console.log("Desktop, mobile and checkout screenshots captured.");
