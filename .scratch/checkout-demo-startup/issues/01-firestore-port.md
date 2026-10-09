# Fix the checkout demo Firestore port collision

Status: resolved

Blocked by: None.

## Problem

The local checkout demo cannot start because AgentService (PID 4500 at investigation time) listens on port 8080. Firebase CLI exits before Firestore starts. Java 21 is already installed and can be selected in the terminal.

## Change

Choose a free Firestore port for the interactive demo and pass it consistently to Firebase Emulator, seed code, and web client. Smoke scripts read the port supplied by Firebase CLI. Leave other local processes running.

## Validation

- `npm run lint` passed.
- `npm run build --prefix functions` passed.
- `git diff --check` passed and port 8081 was available.
- Firebase Emulators successfully started Firestore on port 8081 with Java 21 after setting a short temporary directory for the Windows sandbox. The checkout smoke test did not complete because the Functions Emulator timed out while loading the function definition (`Cannot determine backend specification`). The local sandbox reported a Java loopback failure when using its default temporary directory; that was resolved by using a short workspace-local directory for this check.

## Answer

The interactive demo selects the first free port between 8081 and 8090 and shares it with the Firestore Emulator, seed code, and web client. Smoke scripts read the port supplied by Firebase CLI. Emulator startup waits up to five minutes for first-run downloads. Typecheck and Functions build passed. End-to-end checkout remains unverified because the Functions Emulator could not load its backend specification during the sandbox smoke test.
