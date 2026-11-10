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
```

Browser tests start a production server and cover desktop and mobile Chromium, including real WebGL using an explicitly synthetic test-only mesh. Commerce contract tests use fixtures; real Shopify checkout still requires live credentials and merchant test configuration.

[Audit, implementation and missing configuration](docs/IMPLEMENTATION.md) · [Verification results](docs/VERIFICATION.md)

This work is not ready for final acceptance until genuine product assets, live commerce verification and a Vercel preview are available.
