# Product guidance assistant

Status: testing-blocked-on-secret

## Goal

Activate the existing homepage panel “ให้ SOULMATE ช่วยเลือกสินค้า” for visitors, using current public product facts and Gemini on the test Firebase project.

## Decisions

- Read current Firestore `active` product facts directly; no separate administrator approval.
- Treat blank fields, generic placeholders, instruction-like text, and health claims as unusable evidence. An absent allergen field does not mean the product is allergen-free.
- Validate product IDs, evidence, price, stock, variant, and product link in server code. List out-of-stock matches separately.
- Do not match symptoms to products as treatment. Keep chat history in page memory only.
- Restrict the callable to the test Firebase project and localhost origins; limit requests to 10 per UID per 10 minutes and 200 per day globally.
- Do not deploy to customers. A Gemini Secret must first be added to the test project.

## Implementation state

- Backend callable and catalog validation implemented.
- Existing homepage panel now has conversation, cards, retry, and reset behavior.
- Live test catalog contained four published products when checked; placeholders and symptom-oriented marketing copy are filtered.
- Unit tests, TypeScript, Functions build, app build, and mocked browser checks are passing.
- Real Gemini call and test-project deployment are blocked because `GEMINI_API_KEY` does not exist in project `soulmate-web-bd695`.
