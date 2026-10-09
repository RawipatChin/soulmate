# Backend and catalog validation

Status: complete
Type: task
Blocked by: none

Add the `productGuidanceChat` callable with current Firestore catalog reads, input and quota limits, Gemini structured output, evidence validation, fresh price and stock checks, safe response templates, and unit coverage.

## Answer

Implemented in `functions/src/guidance.ts` and `functions/src/guidance-domain.ts`. Eight domain tests cover catalog filtering, evidence, stock changes, medical claims, HTML, and input bounds.
