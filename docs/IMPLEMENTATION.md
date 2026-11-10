# SOLE CULT implementation and release status

## Status

The approved storefront has been implemented and tested locally. **The requested end-to-end delivery is not complete:** approved product imagery/models and Shopify configuration are missing, and Vercel project creation is forbidden for the connected identity. No production release or payment has been attempted.

## Populated review version

At the user’s request, `/preview` now presents the completed layout using explicitly assumed content. The normal `/` storefront and live Shopify integration retain their existing behavior.

- A real, textured GLB sneaker model is rendered interactively in seven preview colour treatments. This generic model illustrates the showroom; it does not represent the seven named branded products accurately. Its source is **Materials Variants Shoe, © 2021 Shopify, CC BY 4.0**, from the Khronos glTF Sample Assets repository. Default material and preview tints are modified; full attribution is tracked in `public/models/ATTRIBUTION.md` and linked from the preview footer.
- Seven matching thumbnail PNGs are rendered from that actual model. No missing image links are used in the review version.
- Original sample prices and ten illustrative EU size options populate the approved product panel. One size is disabled to demonstrate the sold-out state. All of these are **demo data**, not verified inventory or pricing.
- The review bag supports add, quantity changes, remove and tab-session persistence. It uses a dedicated browser-session key, never the Shopify cart cookie or commerce API.
- WhatsApp opens the composed order-message preview; no invented recipient is contacted. Account controls show an illustrative account introduction. Checkout shows a sample order summary and an explicit demo confirmation without collecting payment details, creating a real order or contacting any commerce API.
- A self-contained offline HTML preview embeds the model, seven thumbnails, JavaScript and CSS. Generate it with `npm run preview:package`; output is `artifacts/sole-cult-preview.html`. Open it in a browser without a server or credentials. About navigation, search, real 3D controls and demo checkout work within that file. The artifact is intentionally gitignored and generated from the tracked implementation and licensed assets.
- `scripts/capture-preview.mjs` can regenerate model thumbnails and desktop/mobile screenshots against a local `/preview` server. Restart the Next.js server after introducing new public asset paths before capturing the populated layout.

The user can approve the experience and replace its temporary assets later. A populated demo is not a completed live commerce release; the external configuration and final product-specific assets listed below still apply.

## Repository audit

Base commit: `d0a4ca8` on `main`.

- Next.js 15 / React 19 App Router application with Shop and About pages.
- Approved warm cream architectural showroom, brand lockup, central stage, right-hand product detail panel and seven bottom selectors already existed. Their layout and styling are preserved.
- Central sneaker was a CSS placeholder. The seven selectors used triangle glyphs. Referenced `/shoes/*.png` files did not exist; there was no `public` directory or GLB/GLTF asset.
- Cart and account controls used browser alerts. Add to Bag only appended local React state. No checkout or inventory requests existed.
- Prices, sizes and a WhatsApp recipient were hardcoded without verification. These are no longer represented as verified commerce data.
- There was no lockfile, ESLint configuration, test suite or Shopify client. No repository `AGENTS.md` was found.

## Implemented behavior

- Original showroom and product detail presentation, Shop/About navigation, search results, accessible modal dialogs, account control, size guide, live selection status, and responsive layout.
- Seven original editorial entries remain available when Shopify is unconfigured. They have no fabricated price, image, stock, size or model. Purchasing is disabled, with an explicit availability message.
- Server-only Shopify Storefront API client. Catalog reads up to seven products from the configured collection, including actual product images, GLB sources, variant IDs, option combinations, prices, currency and inventory. Sold-out variants are disabled.
- Each full option combination is selectable, so a multi-option product does not silently add the wrong colour/size. Assortments above 250 variants fail explicitly rather than exposing a partial selector.
- Add, change quantity, remove, restore and expire carts through Shopify. Add rechecks current inventory; Shopify mutation errors and quantity warnings are surfaced. An HTTP-only, SameSite=Lax cookie stores the cart identifier; deployed cookies are Secure. Checkout links come directly from Shopify.
- Same-origin JSON cart mutations and input validation. Private Storefront tokens stay in server modules; upstream internal errors are not exposed. Catalog and cart responses are not cached.
- WhatsApp links include the selected product and the exact option combination, and ask the store to confirm availability and the total. No default recipient is used; a verified number is required. No messages are sent automatically.
- Account control links to the configured Shopify hosted customer account page. No fake account session is created.
- Actual React Three Fiber / Three.js GLB/GLTF loading, normalized model scale, studio lights, 360-degree orbital rotation, scroll/pinch zoom, touch drag, keyboard-accessible rotate/zoom/reset buttons, fixed camera reset between products, and a two-phase flying full-turn flip. The next entrance waits for its model to load. Rapid selection is locked during transitions, preventing overlapping timers.
- Reduced motion skips the flying transition. Demand rendering while idle, capped pixel ratio, and limited lighting reduce GPU work. Missing models, load errors and unsupported WebGL use clearly labelled fallbacks; a photo is never represented as an interactive 3D model. Viewer controls are disabled if a model cannot be used.
- Reproducible dependency lockfile, working lint/typecheck/build scripts, unit/integration tests and desktop/mobile Playwright checks. A patched PostCSS override resolves the dependency audit findings without changing the approved frontend or forcing a Next.js major migration.

## Required external configuration

Configure values in `.env.local` for local development and as scoped Vercel environment variables for the preview. Never post private tokens in chat or commit them. All keys are documented in `.env.example`.

| Key                                | Requirement                                                                                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SHOPIFY_STORE_DOMAIN`             | Existing store hostname, e.g. the verified `*.myshopify.com` hostname; no scheme or path                                                            |
| `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` | Headless channel **private Storefront** token, not an Admin API token; store as a Secret                                                            |
| `SHOPIFY_API_VERSION`              | Defaults to `2026-10`; verify the API version on the target store                                                                                   |
| `SHOPIFY_COLLECTION_HANDLE`        | Curated collection containing the seven approved sneakers in the intended order; otherwise the first seven best-selling published products are used |
| `WHATSAPP_NUMBER`                  | Verified international recipient, digits only; there is no default                                                                                  |
| `SHOPIFY_CUSTOMER_ACCOUNT_URL`     | Optional Shopify hosted account URL                                                                                                                 |
| `SHOPIFY_CUSTOMER_ACCOUNT_HOST`    | Only needed for a verified custom customer-account hostname                                                                                         |

The Storefront token needs product listings, inventory reading (`unauthenticated_read_product_inventory`) and cart/checkout read/write access for the Headless channel. Publish the products and collection to that channel, set genuine variants/prices/inventory, and configure Shopify shipping, taxes, markets, checkout and payment methods in the merchant dashboard. No payment credentials belong in this application.

### Product assets

No approved product photographs, licensed 3D sneaker models, model licences, or asset URLs were supplied in the repository. Upload each matching licensed GLB model and product photograph to the corresponding Shopify product media. The catalog automatically uses the GLB source and featured image. GLB models should embed their textures, share a consistent side-facing orientation, and be optimized for mobile (target under 5 MB each). Check decoder/CDN availability if assets use compression.

Required products: Nike Air Force 1 '07, New Balance 9060, Nike P-6000, Nike Dunk Low, Nike Air Zoom Vomero 5, Adidas Samba and Adidas Suede Mule, in the approved colourways. Do not reuse a different shoe model or claim an illustrative mesh represents these products.

The synthetic mesh and stock in the automated tests are test-only fixtures intercepted by Playwright or a mocked fetch. They never enter the production catalog and are not product assets.

### Vercel access

The connected team is `kingbob-3860` (`team_v8zAj6GZvTNVlH2l3yObf0dc`). No matching existing project was found. Creating the `sole-cult` project with the repository connection returned HTTP 403: **"You don't have permission to create the project."** The recommended CLI fallback also failed because no local Vercel credentials exist. No preview URL was created.

A team owner must grant project creation access to the connected identity or create/link `sole-cult` to `thebiggestkingbob/sole-cult` in that team. Set preview environment variables, deploy the development branch to a **preview** environment, and keep production untouched until approval. Local CLI Shopify discovery likewise required login; no new store or paid integration was provisioned.

## Verification and limits

See `docs/VERIFICATION.md` for the executed checks. Shopify contract tests use mocked responses, and browser commerce tests intercept the API. **A successful mocked test does not establish that the real store or payment checkout works.** Before approval, repeat the entire live catalog → exact variant → inventory → persistent cart → Shopify checkout journey using the actual preview and merchant-approved test mode, then verify all seven genuine product models on desktop and a physical phone.
