# Order Cloud Functions

The browser calls `createPendingOrder` and `startPromptPay`. The functions read catalog prices and stock with Admin SDK privileges; Firestore rules keep the `orders` collection read-only to clients. `omiseWebhook` retrieves each charge from Omise using the server secret and reconciles only a charge whose order ID, amount, currency, and PromptPay method match the saved order.

## Local order test

1. Copy `.env.example` to `.env.local` and set the Firebase web configuration.
2. Set `VITE_USE_FIREBASE_EMULATORS=true` in `.env.local`.
3. Start the emulators with the same Firebase project ID used by `VITE_FIREBASE_PROJECT_ID`: `firebase emulators:start --project <project-id> --only auth,firestore,functions,storage`.
4. Start the web app with `npm run dev`.

Emulator orders are test-only and remain `pending_payment`; Omise requests are disabled in the emulator.

## Omise Test Mode

Before enabling checkout on a deployed environment, enable Anonymous sign-in in Firebase Authentication, request PromptPay activation from Omise, configure a Test Mode secret and webhook signing secret, and register the deployed `omiseWebhook` URL in Omise. Set the secrets with `firebase functions:secrets:set OMISE_SECRET_KEY` and `firebase functions:secrets:set OMISE_WEBHOOK_SECRET`; the function accepts only keys that start with `skey_test_` and verifies Omise's signed webhook payload. Set `VITE_OMISE_TEST_MODE_ENABLED=true` only after both secrets and PromptPay capability are ready. The public flag controls the UI only; the function independently checks its secret before accepting an order or starting a charge.

Deploy Functions and Firestore rules together. Do not put Omise secret keys in `.env.local`, Vite variables, source files, or Git.
