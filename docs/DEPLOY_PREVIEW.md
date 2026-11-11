# Publish a review preview

The tested implementation is on `dev/sole-cult-verified-20261111` in `thebiggestkingbob/sole-cult`. Keep this branch as a Preview deployment; do not promote it to production before approval.

## Vercel project settings

Connect the existing GitHub repository to the authorised Vercel project. Use:

- Framework: Next.js
- Root directory: repository root (the directory containing package.json)
- Node.js: 24.x, matching the tested runtime and CI
- Install command: npm ci
- Build command: npm run build
- Output directory: Next.js framework default

Create a Preview deployment from `dev/sole-cult-verified-20261111`, rather than the older main branch. Share the generated HTTPS preview URL after deployment. If deployment protection is enabled, grant the reviewer access through Vercel instead of sharing credentials in chat.

## What the preview shows

Open `/preview` on that deployment to review the preserved approved scene and interact with the seven illustrative image selections, sizes and demo bag. This route uses generated reference imagery and sample prices; it makes no real orders and does not present its images as 3D.

Open `/` for the Shopify-connected storefront. Until Shopify is configured, it intentionally withholds unverified prices, sizes and stock. The missing merchant credentials do not prevent deploying and reviewing `/preview`.

Configure the variables in `.env.example` securely in Vercel's Preview environment when the merchant setup is ready. Never commit a private Storefront token or paste it in chat. Redeploy after changing build/runtime environment settings as Vercel requires.

## Verify the public deployment

Check that the generated URL is reachable, `/preview` and `/about` load, all seven selections work on desktop/mobile, search/dialogs and the demo bag work, and no horizontal overflow appears. Actual GLB controls are verified separately with licensed product models. Merchant stock, checkout and WhatsApp acceptance remain separate from this design review.

The current cloud executor has neither Vercel credentials nor access to `api.vercel.com` (the outbound proxy rejects the destination). The account owner is connecting the repository in Vercel; that does not automatically grant this executor deployment credentials. A public preview URL enables read-only browser verification if its destination is allowed by the environment's network policy.
