# Homepage guidance panel

Status: complete
Type: task
Blocked by: 01 Backend and catalog validation

Wire the existing homepage panel to the callable. Render verified evidence and server-provided product cards. Add response, retry, reset, and responsive states without persisting conversation content.

## Answer

Implemented in `src/components/storefront/guidancePanel.ts` and mounted by `src/components/ScreenRenderer.tsx`. Mocked UI checks pass at 390px and 1440px.
