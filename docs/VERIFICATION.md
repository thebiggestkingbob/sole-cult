# Verification — 10 November 2026

## User journey

Browse the approved SOLE CULT showroom → select a sneaker → rotate/zoom its actual model when supplied → select an available Shopify variant → add it to a persistent cart → adjust/remove lines → continue to Shopify checkout, or open a WhatsApp order containing the selected options.

## Executed checks

| Check | Result | Evidence and scope |
| --- | --- | --- |
| ESLint | Passed | `npm run lint`, no warnings or errors |
| TypeScript | Passed | `npm run typecheck` |
| Production build | Passed | `npm run build`, Next.js 15.5.29; Shop/About static pages and dynamic catalog/cart endpoints |
| Shopify integration contracts | 12 passed | `npm test`; mocked Storefront responses check credential isolation, host validation, real media/variant mapping, currency, sold-out inventory, insufficient inventory, exact add payload, cart creation, mutation errors/warnings, expired carts and upstream error sanitization |
| Desktop/mobile browser checks | 18 passed (25.6 seconds) | `npm run test:e2e`; production server, Chromium desktop and iPhone 13 viewport/touch emulation |
| Production dependency audit | Passed | `npm audit --omit=dev --audit-level=high`: zero vulnerabilities after the PostCSS override |
| Live Shopify order/checkout | Blocked | No store hostname/private Storefront token or merchant test-mode configuration was supplied |
| Genuine sneaker model verification | Blocked | None of the seven approved photographs or licensed sneaker models was supplied |
| Vercel preview | Blocked | Connected team returned HTTP 403 on project creation; CLI fallback has no local credentials |

Browser coverage includes the seven unnamed thumbnail selectors, search and empty search, account fallback, reduced motion, size reset on product changes, disabled sold-out sizes, exact WhatsApp option text, add/quantity/remove/checkout rendering, stock errors, API origin/input validation, actual WebGL rendering, rotate/zoom, pointer and touch drag, transition locking, model loading errors, absent WebGL and slow model arrival. Tests watch page errors and compare rendered canvas images after interaction. Desktop and mobile fallback layouts are checked for horizontal overflow.

The WebGL mesh is explicitly synthetic and test-only. The commerce responses are fixtures intercepted by tests, not verified store inventory. No real recipient was messaged, no payment was made and no order was created against an actual merchant store. Mobile verification is Chromium touch emulation; a physical iPhone/Safari pass remains necessary with the genuine assets.

## Acceptance still required

1. Configure the existing Shopify Headless channel with product/inventory/cart access and seven published products in the approved collection order.
2. Supply the corresponding licensed GLB models and featured images as Shopify product media; verify product identity, texture quality, orientation, normalization and mobile load cost.
3. Verify the WhatsApp recipient and optional hosted customer account URL.
4. Resolve Vercel team project-creation access, connect the repository and deploy `dev/immersive-storefront` as a preview with scoped secrets.
5. On that preview, verify actual product/size/price/inventory, sold-out behavior, cart persistence after refresh, quantity changes, removal, Shopify checkout and hosted account access. Use merchant-approved test mode for payment verification.
6. Verify real desktop mouse/scroll and physical-phone rotate/pinch interactions, all seven flying transitions, reduced motion, missing-asset/error fallbacks and the preserved approved product-detail design. Obtain approval before any production release.
