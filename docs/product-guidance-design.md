# Product guidance assistant

## Purpose

Help storefront visitors choose and compare SOULMATE products through a conversational interface. The assistant uses information recorded in published product fields and does not diagnose, treat, or promise outcomes for health conditions.

## Agreed behavior

- Visitors can start a conversation from the home page or product listing without signing in.
- A visitor can describe a general shopping goal such as increasing protein intake. The assistant asks only for missing preferences needed to narrow the choice.
- A symptom alone is not used as a product matching criterion. The assistant explains that it cannot identify a suitable treatment from symptoms, suggests professional help when appropriate, and may ask about a general shopping goal.
- The assistant recommends at most three products, ordered by fit with the visitor's stated requirements. Each recommendation includes a reason grounded in recorded catalog facts, a meaningful difference from the other choices, current price, and a product page link.
- Only published products with a purchasable option in stock can be recommended. A closer but out-of-stock product may be mentioned separately and clearly marked unavailable.
- When no available product meets every condition, the assistant says which conditions could not be met and asks which one the visitor would relax.
- If a requested fact is missing, the assistant says it cannot compare on that fact. It does not infer protein content, allergens, contraindications, or benefits from a product name or marketing language.
- Guidance uses the latest published product fields directly, with no separate bot approval workflow. Missing or placeholder fields remain unknown and cannot be used as evidence.
- Store policies and FAQ are outside the initial knowledge source until the store provides a verified source. For an unanswered store question, the assistant directs the visitor to a verified store contact channel once one exists.
- Conversation content stays only in the active browser session and is not permanently saved as a customer record.

## Initial catalog context and response flow

1. Recognize the visitor's general shopping goal, preferences, and any symptom language.
2. Apply the symptom boundary before selecting products.
3. Fetch currently published products and check stock at the purchasable option level.
4. Filter eligible options by stated constraints and rank using product facts present in the catalog.
5. For a small catalog, include the current product facts in the model prompt. If that becomes too large or expensive, include only relevant candidates. Check that the response refers only to available products and facts present in the catalog.
6. Link each available recommendation to its product page.

The first version does not need embeddings, a vector database, or a dedicated RAG framework. Providing the whole eligible catalog as prompt context is a long-context approach. Selecting relevant product records at answer time and providing only those records to the model is a simple form of retrieval-augmented generation (RAG). Product status, option availability, price, and stock checks remain deterministic; the language model handles conversation and product matching.

## Current project facts and gaps

- Product records are in Firestore. The storefront already requests `active` products; public Firestore reads are limited to active products. On 2026-10-09 the test catalog had four active products when checked online.
- Product fields include descriptions, highlights, ingredients, usage instructions, price, stock, and variants. The current product model has no structured protein-per-serving or allergen fields.
- The repository does not contain a separate approval state for bot guidance. The assistant reads the existing fields directly and ignores missing, generic placeholder, or health claim text as evidence.
- The repository does not yet contain a working chat or AI service. A Gemini package and API key instruction exist in the scaffold, but no model call is present in the application source.
- No working, verified store policy/FAQ source or store contact destination was found. These need to be supplied before the assistant can cite policies or link to a handoff channel.
- Live catalog access worked for this implementation. The published records include placeholder descriptions and health-related marketing claims; the assistant filters these out and will return insufficient-information responses where nothing usable remains.
- Firebase project `soulmate-web-bd695` does not yet have a `GEMINI_API_KEY` secret. Real model calls and deployment remain unavailable until the owner adds it.

## Release checks

- A general goal produces only available, published products with traceable reasons.
- A symptom-only prompt does not produce a treatment recommendation.
- A protein comparison without protein amounts in the product fields clearly states that the numbers are unavailable.
- A request with no full match does not fabricate a matching product.
- Price and availability are checked again when presenting recommendations.
- Placeholder catalog text is not offered as product evidence.
