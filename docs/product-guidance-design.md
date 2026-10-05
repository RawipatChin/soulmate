# Product guidance assistant

## Purpose

Help storefront visitors choose and compare SOULMATE products through a conversational interface. The assistant uses confirmed store facts and does not diagnose, treat, or promise outcomes for health conditions.

## Agreed behavior

- Visitors can start a conversation from the home page or product listing without signing in.
- A visitor can describe a general shopping goal such as increasing protein intake. The assistant asks only for missing preferences needed to narrow the choice.
- A symptom alone is not used as a product matching criterion. The assistant explains that it cannot identify a suitable treatment from symptoms, suggests professional help when appropriate, and may ask about a general shopping goal.
- The assistant recommends at most three products, ordered by fit with the visitor's stated requirements. Each recommendation includes a reason grounded in approved product facts, a meaningful difference from the other choices, current price, and a product page link.
- Only published products with a purchasable option in stock can be recommended. A closer but out-of-stock product may be mentioned separately and clearly marked unavailable.
- When no available product meets every condition, the assistant says which conditions could not be met and asks which one the visitor would relax.
- If a requested fact is missing, the assistant says it cannot compare on that fact. It does not infer protein content, allergens, contraindications, or benefits from a product name or marketing language.
- Product facts used in guidance require store approval separate from publishing the product. This applies especially to nutrition, ingredients, allergens, precautions, and benefit statements.
- Store policies and FAQ are outside the initial knowledge source until the store provides a verified source. For an unanswered store question, the assistant directs the visitor to a verified store contact channel once one exists.
- Conversation content stays only in the active browser session and is not permanently saved as a customer record.

## Retrieval and response flow

1. Recognize the visitor's general shopping goal, preferences, and any symptom language.
2. Apply the symptom boundary before selecting products.
3. Fetch currently published products and check stock at the purchasable option level.
4. Filter and rank using stated requirements and store-approved facts.
5. Give the language model only the relevant approved facts for the selected products to explain and compare them. Check that the response refers only to those products and facts.
6. Link each available recommendation to its product page.

This is retrieval-augmented generation (RAG) when the assistant retrieves product facts at answer time and uses them to generate a grounded response. A vector database is not required for the initial catalog retrieval. Product selection rules and stock checks remain deterministic; the language model handles conversation and explanation.

## Current project facts and gaps

- Product records are in Firestore. The storefront already requests `active` products; public Firestore reads are limited to active products.
- Product fields include descriptions, highlights, ingredients, usage instructions, price, stock, and variants. The current product model has no structured protein-per-serving or allergen fields.
- The current product model has no separate approval state for facts used by the assistant; that review process must be added before such facts are used in guidance.
- The repository does not yet contain a working chat or AI service. A Gemini package and API key instruction exist in the scaffold, but no model call is present in the application source.
- No working, verified store policy/FAQ source or store contact destination was found. These need to be supplied before the assistant can cite policies or link to a handoff channel.
- The actual Firestore catalog contents and size were not available from the repository, so data quality must be checked against the live catalog before release.

## Release checks

- A general goal produces only available, published products with traceable reasons.
- A symptom-only prompt does not produce a treatment recommendation.
- A protein comparison without confirmed protein amounts clearly states that the numbers are unavailable.
- A request with no full match does not fabricate a matching product.
- Price and availability are checked again when presenting recommendations.
