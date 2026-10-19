# SOULMATE

Storefront and admin dashboard for the SOULMATE ecommerce site.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the Firebase web configuration.
3. Add `VITE_KKU_INTELSPHERE_API_KEY` if the KKU IntelSphere chat widget is enabled. This value is sent to the browser by the widget integration; treat it as a public client key and restrict it to the deployed site in KKU settings if supported.
4. Start the app with `npm run dev`.

Run `npm run lint` and `npm run build` to check the frontend.

## Deploy

See [Cloudflare Pages deployment guide](docs/deploy-cloudflare-pages.md) for the current Firebase-backed site.
