# Verification — 10 November 2026

## User journey

Browse the approved SOLE CULT showroom → select a sneaker → rotate/zoom its actual model when supplied → select an available Shopify variant → add it to a persistent cart → adjust/remove lines → continue to Shopify checkout, or open a WhatsApp order containing the selected options.

## Executed checks

| Check                              | Result                   | Evidence and scope                                                                                                                                                                                                                                                               |
| ---------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint                             | Passed                   | `npm run lint`, no warnings or errors                                                                                                                                                                                                                                            |
| TypeScript                         | Passed                   | `npm run typecheck`                                                                                                                                                                                                                                                              |
| Production build                   | Passed                   | `npm run build`, Next.js 15.5.29; Shop/About static pages and dynamic catalog/cart endpoints                                                                                                                                                                                     |
| Shopify integration contracts      | 12 passed                | `npm test`; mocked Storefront responses check credential isolation, host validation, real media/variant mapping, currency, sold-out inventory, insufficient inventory, exact add payload, cart creation, mutation errors/warnings, expired carts and upstream error sanitization |
| Desktop/mobile browser checks      | 18 passed (25.6 seconds) | `npm run test:e2e`; production server, Chromium desktop and iPhone 13 viewport/touch emulation                                                                                                                                                                                   |
| Production dependency audit        | Passed                   | `npm audit --omit=dev --audit-level=high`: zero vulnerabilities after the PostCSS override                                                                                                                                                                                       |
| Live Shopify order/checkout        | Blocked                  | No store hostname/private Storefront token or merchant test-mode configuration was supplied                                                                                                                                                                                      |
| Genuine sneaker model verification | Blocked                  | None of the seven approved photographs or licensed sneaker models was supplied                                                                                                                                                                                                   |
| Vercel preview                     | Blocked                  | Connected team returned HTTP 403 on project creation; CLI fallback has no local credentials                                                                                                                                                                                      |

Browser coverage includes the seven unnamed thumbnail selectors, search and empty search, account fallback, reduced motion, size reset on product changes, disabled sold-out sizes, exact WhatsApp option text, add/quantity/remove/checkout rendering, stock errors, API origin/input validation, actual WebGL rendering, rotate/zoom, pointer and touch drag, transition locking, model loading errors, absent WebGL and slow model arrival. Tests watch page errors and compare rendered canvas images after interaction. Desktop and mobile fallback layouts are checked for horizontal overflow.

The WebGL mesh is explicitly synthetic and test-only. The commerce responses are fixtures intercepted by tests, not verified store inventory. No real recipient was messaged, no payment was made and no order was created against an actual merchant store. Mobile verification is Chromium touch emulation; a physical iPhone/Safari pass remains necessary with the genuine assets.

## Acceptance still required

1. Configure the existing Shopify Headless channel with product/inventory/cart access and seven published products in the approved collection order.
2. Supply the corresponding licensed GLB models and featured images as Shopify product media; verify product identity, texture quality, orientation, normalization and mobile load cost.
3. Verify the WhatsApp recipient and optional hosted customer account URL.
4. Resolve Vercel team project-creation access, connect the repository and deploy `dev/immersive-storefront` as a preview with scoped secrets.
5. On that preview, verify actual product/size/price/inventory, sold-out behavior, cart persistence after refresh, quantity changes, removal, Shopify checkout and hosted account access. Use merchant-approved test mode for payment verification.
6. Verify real desktop mouse/scroll and physical-phone rotate/pinch interactions, all seven flying transitions, reduced motion, missing-asset/error fallbacks and the preserved approved product-detail design. Obtain approval before any production release.

## Populated design-preview follow-up

The user authorized an assumed-content review version before supplying final HD assets. The `/preview` route and self-contained HTML artifact were added and checked separately from live commerce.

- Unit/integration suite expanded to **13 tests**, including isolation of the demo cart, selected sizes, sample total calculation and disabled demo variants.
- Browser suite expanded to **20 passing tests (38.4 seconds)** with desktop/mobile checks of the actual licensed sneaker model and generated thumbnails, WhatsApp message preview, bag persistence across refresh, and the complete demo checkout/confirmation flow. The test asserts that this flow makes **zero commerce API requests** and produces no page errors.
- The self-contained HTML was opened from a local `file://` URL in Chromium. The GLB loaded and demo checkout reached confirmation with **zero external HTTP requests and zero page errors**. Desktop and mobile screenshots were captured. About navigation returns to the demo showroom within the offline file.
- The actual shoe asset is an attributed generic model, not verified branded product geometry. The final merchant catalog, actual product models, real checkout, physical-device testing and Vercel deployment remain the acceptance requirements above.

## Approved-screen correction

The earlier generic model review was rejected. The user then supplied the actual approved 1280×720 screenshot. The current preview is rebuilt against that screenshot rather than the earlier repository scaffold.

- Visual inspection uses a **1280×720** desktop capture and an iPhone 13 viewport capture. The temporary background, hero sneaker, six distinct secondary sneakers and wordmark are derived from the supplied reference.
- The design-review tests now explicitly assert seven distinct image selections and **hidden 3D controls for image-only products**. The existing WebGL tests still verify true GLB rendering, rotation, zoom, mouse/touch gestures, model failures and slow loading separately.
- Offline demo checkout remains checked on desktop and mobile. Cart thumbnails use the correct product image crop instead of displaying the entire six-product contact sheet.
- This correction does not establish genuine product assets, merchant stock, a live order, physical-phone performance or a hosted Vercel preview. Those acceptance requirements remain unchanged.

Final corrected-layout run: **20 browser checks passed in 26.5 seconds**; **13 unit/integration tests passed**; lint, TypeScript and the production build passed. Desktop and mobile offline demo confirmations produced no page errors. The mobile model-backed layout was adjusted to keep 3D controls clear of the thumbnail row.

## Continued build: server-backed commerce and recovery

- **14 unit/integration tests passed**, including invalid saved bags, duplicate/unknown variants and rebuilding sample prices from known catalog data.
- **26 desktop/mobile browser checks passed** in 27.3 seconds. New cases verify blocked storage, corrupted saved bags and a stalled-model fallback after 15 seconds.
- **6 server-backed commerce checks passed** in 5.7 seconds. This suite runs the real Next.js routes and server-only Storefront client against an isolated upstream fixture. It verifies actual HTTP-only/Secure/SameSite cookies, refresh persistence, stock-adjustment warnings, variant identity, Shopify checkout URLs, expired carts, malformed origins, primitive JSON and oversized chunked bodies. It does not intercept browser API responses.
- Lint, TypeScript and the production build passed. GitHub Actions now runs the same checks on development pushes and pull requests.

These are stronger integration checks, not evidence of successful communication with a real merchant store or a completed payment. Real Shopify credentials, product-specific licensed GLBs, WhatsApp confirmation and Vercel project-creation access are still required for final acceptance.

## 11 November 2026 — preserved reference design, private carts and model delivery

Validated on `dev/sole-cult-verified-20261111`, based on the existing approved-reference implementation at `0fdb41c`:

- Lint, TypeScript and production build passed.
- **14 unit tests**, **30 desktop/mobile browser tests**, and **6 server-backed commerce tests** passed in this cloud instance.
- The added commerce assertions verify that the real cart create/read routes omit the private Shopify cart ID while keeping cart persistence working through the HTTP-only cookie.
- The added viewer assertions verify that data-saver mode prevents GLTF requests until explicit opt-in, and that the local Draco WASM decoder is served with the expected file signature and content type.
- Browser tests use one worker locally and two in CI, with explicit startup timeouts. The initial parallel run hit two startup/hydration timing failures; the complete serial rerun passed all 30 unchanged behavior assertions.
- `npm audit --omit=dev` reported zero vulnerabilities. The private Storefront header/token environment names are absent from the generated browser assets.
- `npm run preview:package` generated the existing illustrative, self-contained review artifact successfully (11.6 MB). It remains separate from real merchant commerce.

These results verify the implementation and isolated fixtures, not a live merchant transaction. Authentic product-specific photography/GLBs, Shopify credentials and merchant checkout configuration, the verified WhatsApp recipient, physical-phone acceptance, and an authorised Vercel preview deployment remain required. The current network policy rejects the Vercel API destination, and no local deployment credentials are configured. No environment publication or production deployment was performed.

The packaged HTML was generated, but opening it through a `file://` URL in this cloud browser was rejected with `ERR_BLOCKED_BY_ADMINISTRATOR`. This continuation does not claim offline-file browser verification; the production `/preview` route is covered by the passing desktop/mobile suite.
