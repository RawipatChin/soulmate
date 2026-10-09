# Add test Gemini secret and deploy

Status: ready-for-human
Type: task
Blocked by: 01 Backend and catalog validation, 02 Homepage guidance panel

In Firebase project `soulmate-web-bd695`, create Secret Manager secret `GEMINI_API_KEY` from the project owner's Gemini API key. Do not paste the key into chat or check it into files. Set `GUIDANCE_MODE=test`, then deploy only `productGuidanceChat` to the test project.

## Answer

Firebase CLI metadata check confirmed that the secret is absent. This cannot be completed by the agent without the key. After the owner sets the secret, deploy with `firebase deploy --only functions:productGuidanceChat --project soulmate-web-bd695`.
