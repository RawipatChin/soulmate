# COD with express checkout

Status: ready-for-human

The signed-in customer checkout failed only for express shipping with COD.
Reproduced with both standard and express shipping having free-shipping thresholds
(1500 and 2000 THB) and payment methods ordered PromptPay then COD. The existing
fixture had no standard threshold and did not exercise customer authentication.

The emulator reported the maximum 1000 evaluated expressions at order creation.
Repeated settings lookups and eager fee calculations exhausted the evaluation
budget. Cache settings once, pass lists to helpers, calculate fees only after the
shipping method matches, and dispatch payment validation by the chosen method.
Keep the existing authorization, fee, stock, numbering, and payment checks.

Verification command (with Node, Java and Firebase CLI on PATH):

```sh
firebase emulators:exec --only auth,firestore,storage --project demo-soulmate "node scripts/order-emulator-smoke.mjs --checkout-only"
```

Coverage: 16 guest/customer, shipping, payment and free-threshold combinations;
the reported mixed-pack variant at 161900 satang plus 10000 shipping; rejection of
forged fees/totals, unknown methods and disabled COD, preserving stock on rejection.

The larger existing order smoke suite still fails outside this checkout matrix
in its later multi-item scenario. Its old multi-item fixtures also lacked the
required shippingMethodId; those fixtures have been corrected. Do not describe
the full lifecycle suite as passing.

Deployment to soulmate-web-bd695 has not been performed. Publish the updated
firestore.rules and verify the original checkout in the app after deployment.
