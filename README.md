# SOLE CULT

SOLE CULT is a sneaker storefront with a WebGL campaign on the Shop homepage and a seven-product catalogue.

## Development

```bash
npm ci
npm run dev
```

This repository is public. Never commit Shopify private credentials or environment secrets.

## Campaign preview

The homepage wordmark is rendered with Three.js using editable procedural glyph geometry, studio reflections and separate ivory, chrome and leather materials. The camera and glyphs respond to pointer movement and catalogue navigation. Reduced-motion and no-WebGL modes retain catalogue and storefront controls.

The shoe assets in `public/shoes` are derived from illustrative review images in the earlier `dev/sole-cult-verified-20261111` branch, documented there in `public/reference/ASSETS.md`. The six-shoe sheet was separated into individual transparent images, with stray background pixels removed. Replace these with verified merchant photos or accurate 3D product media for a production campaign. The preview animates a single image per shoe using perspective transforms. The approved Panda is absent from the catalogue, so the opening product remains the existing beige Air Force 1.

Run `npm ci`, `npm run lint`, and `npm run build` to check the preview. The shopping bag is stored in the browser, orders are enquiries via WhatsApp, and the account panel retains the Shopify availability notice.
