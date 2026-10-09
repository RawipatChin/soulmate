# Order Cloud Functions

The deployed entrypoint (`src/index.ts`) exports only `createPendingOrder` and `reconcileOrderExpirations`. It does not load Omise or require Secret Manager. Firestore rules let buyers read only their own Orders and let Cloud Functions create or update them. The previous Omise implementation is preserved in `deferred-payment/index.ts` for a later payment phase; it is outside the Functions build and is not deployed.

An Order is created with `pending_payment` status and no payment method. Its stock reservation expires after 30 minutes. Expiration runs on the next Order read or checkout request, restores stock once, and retains the Order as `expired`. No scheduler is configured, so abandoned stock can remain reserved beyond 30 minutes until another request arrives.

## Test project

The server-side `CHECKOUT_MODE=test` parameter belongs in `functions/.env.soulmate-web-bd695`; it defaults to disabled elsewhere. Set `VITE_CHECKOUT_TEST_MODE_ENABLED=true` and `VITE_OMISE_TEST_MODE_ENABLED=false` in the local web app. The web flag alone cannot enable server-side order creation.

Build Functions, then deploy the two order functions to the existing test project with:

```sh
npm run build --prefix functions
firebase deploy --only functions:createPendingOrder,functions:reconcileOrderExpirations --project soulmate-web-bd695
firebase functions:list --project soulmate-web-bd695
```

Firestore rules have already been deployed to this test project. There is no Firebase Hosting configuration in this repository, so test the web app locally against the test project using `npm run dev`.

The CLI account must be allowed to set Cloud Run service IAM policies so Firebase can make these callable endpoints reachable from the web. If deployment reports `run.services.setIamPolicy` denied, a project administrator must either grant the account Cloud Run Admin or allow public invocation (`allUsers` with Cloud Run Invoker) on both services. Firebase Auth inside each callable still checks the buyer identity. A function listed as `ACTIVE` can still return HTTP 403 until this IAM step succeeds.

## Emulator checks

### Clickable local checkout demo

From the repository root, run `npm run demo:checkout`. This builds Functions, starts the Auth, Firestore, Functions and Storage Emulators under the isolated `demo-soulmate` project, seeds two test products plus a customer account, starts the web app at `http://127.0.0.1:3100/products`, and opens Chrome. Use the catalog to add a product and finish checkout as a guest. To try a member, sign in as `demo.customer@example.test` with password `DemoCheckout123!`. Orders appear in the Emulator UI at `http://127.0.0.1:4000/firestore` under `orders`; they remain visible while the command is running and disappear after Ctrl+C. The demo does not use the real Firebase project or collect payment. `CHECKOUT_DEMO_NO_BROWSER=1` skips opening Chrome when running automated checks; `FIREBASE_CLI_PATH` can point to an installed `firebase.js` if the CLI is not in the local npm cache.

The interactive demo picks the first free Firestore port from `8081` through `8090`, then passes it to the Emulator, seed step, and web client. It allows five minutes for the first download and startup of Firebase emulators; keep the terminal open until the products page is ready. Smoke scripts read the port supplied by `firebase emulators:exec`. Firebase CLI 15.33 requires Java 21 or newer; check `java -version` in the terminal running the demo.

### Automated checks

Run `npm run build --prefix functions`, then use Firebase Emulator Suite with Java on `PATH`:

```sh
firebase emulators:exec --project demo-soulmate --only auth,firestore,functions "node scripts/order-emulator-smoke.mjs"
firebase emulators:exec --project demo-soulmate --only auth,firestore,functions "node scripts/order-browser-emulator-smoke.mjs"
```

The first script verifies guest/customer persistence, idempotency, price review, stock restoration, and Firestore access. The second drives the cart and checkout UI in Chrome. Payment confirmation, QR generation, and webhooks are deferred.
