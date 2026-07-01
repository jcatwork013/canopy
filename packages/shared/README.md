# @canopy/shared

Platform-agnostic core shared by the **web PWA** and the **React Native** app.
Zero browser/RN globals beyond an injectable `fetch` + a `TokenStore` interface —
this is what makes the codebase "RN-ready".

## What's inside

- **`types/`** — DTOs mirroring the Postgres schema and the AI output schemas
  (`User`, `SystemStatus`, `IdentifyResult`, `DiagnoseResult`, `TreatmentPlan`,
  `CareProfile`, `Listing`, …) + `roleHelpers` + `AI_DISCLAIMER`.
- **`api/`** —
  - `HttpClient`: transport with bearer auth, single-flight refresh-on-401,
    timeout, and `ApiError` normalization.
  - `CanopyClient`: typed resource groups (`system`, `auth`, `uploads`, `plants`,
    `ai`, `listings`) — the one entrypoint both apps use.
  - `TokenStore` interface + `MemoryTokenStore`. Web injects a localStorage impl;
    RN injects SecureStore/AsyncStorage.

## Usage

```ts
import { CanopyClient } from '@canopy/shared';

const api = new CanopyClient({
  baseUrl: 'http://localhost:8088/api/v1',
  tokenStore: new MyPlatformTokenStore(),   // localStorage / SecureStore
  onAuthError: () => { /* redirect to login */ },
});

const status = await api.system.status();   // typed SystemStatus
```

`pnpm --filter @canopy/shared typecheck`
