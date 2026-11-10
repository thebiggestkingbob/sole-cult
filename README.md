# SOLE CULT

The approved warm cream sneaker showroom, built with Next.js, React Three Fiber, Three.js and Shopify Storefront API. The existing design is preserved.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Set server-only Shopify credentials and the verified WhatsApp number in `.env.local`. Never commit credentials. Without configuration the site shows the original editorial assortment, honest missing-asset messages and disabled purchasing.

Upload the approved product images and licensed GLB models as Shopify product media. No authentic assets were supplied with this repository; static images are never presented as interactive 3D models.

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:commerce
```

Browser tests start a production server and cover desktop and mobile Chromium, including real WebGL using an explicitly synthetic test-only mesh. Commerce contract tests use fixtures; real Shopify checkout still requires live credentials and merchant test configuration.

[Audit, implementation and missing configuration](docs/IMPLEMENTATION.md) · [Verification results](docs/VERIFICATION.md)

This work is not ready for final acceptance until genuine product assets, live commerce verification and a Vercel preview are available.

## Review the populated design now

Open `/preview` for the approved showroom with a reference-matched Air Force image, seven distinct sneaker selections, sample prices and sizes, and a complete demo bag/checkout flow. The normal storefront remains connected to the real Shopify implementation when configured.

For a version that needs no server or credentials:

```bash
npm run preview:package
```

Download and open `artifacts/sole-cult-preview.html` in a browser. It includes its imagery, scene and code and works offline. All product imagery, pricing and size availability in this version are clearly labelled illustrative. No real order or payment is made. The review imagery is generated from the user-supplied approved screen; see `public/reference/ASSETS.md`. The preview does not misrepresent images as 3D; real model interaction remains available for Shopify products with matching GLB files.

## Continuous verification

GitHub Actions runs lint, types, unit/integration tests, the production build, desktop/mobile browser tests, server-backed commerce tests, and offline preview packaging on development pushes and pull requests. This job uses no merchant or deployment credentials and does not publish production.

`npm run test:commerce` starts a separate production server on `localhost:3100`. Its real Next.js routes and server-only Shopify client talk to an explicitly isolated test fixture loaded into that child process. It verifies HTTP-only cart cookies, persistence, selected variants, inventory warnings, expired-cart recovery and checkout URLs without intercepting browser API calls or creating real orders. Never load the fixture into a live deployment.
