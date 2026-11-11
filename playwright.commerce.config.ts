import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
export default defineConfig({
  testDir: "./tests/commerce",
  workers: 1,
  fullyParallel: false,
  reporter: "list",
  use: { baseURL: "http://localhost:3100", launchOptions: { executablePath: process.env.CHROMIUM_PATH || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined) } },
  projects: [
    { name: "desktop-commerce", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile-commerce",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command:
      "node node_modules/next/dist/bin/next start --hostname localhost --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      NODE_OPTIONS: `--import=${path.join(process.cwd(), "tests/support/shopify-fixture.mjs")}`,
      SHOPIFY_STORE_DOMAIN: "sole-cult-fixture.myshopify.com",
      SHOPIFY_STOREFRONT_PRIVATE_TOKEN: "fixture-only-not-a-credential",
      SHOPIFY_COLLECTION_HANDLE: "approved-showroom",
      WHATSAPP_NUMBER: "27000000000",
      SHOPIFY_CUSTOMER_ACCOUNT_URL:
        "https://sole-cult-fixture.myshopify.com/account",
    },
  },
});
