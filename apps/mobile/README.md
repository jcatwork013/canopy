# @canopy/mobile — React Native (Expo)

> **Phase 8.** Scaffolded later. This app reuses `@canopy/shared` for 100% of the
> API client + domain types — the only platform swaps are storage, camera,
> notifications, and navigation.

## Porting checklist (when Phase 8 starts)

1. `npx create-expo-app@latest . --template` (TypeScript, expo-router or React Navigation).
2. Add the workspace dep: `@canopy/shared` (Metro `watchFolders` → repo root, `nodeModulesPaths`).
3. Implement `TokenStore` with `expo-secure-store` (mirror of `apps/web/src/lib/tokenStore.ts`).
4. Construct the client identically:
   ```ts
   import { CanopyClient } from '@canopy/shared';
   export const api = new CanopyClient({ baseUrl: API_URL, tokenStore: new SecureTokenStore() });
   ```
5. Reuse the same TanStack Query patterns and the `useSystemStatus` gate logic.
6. Camera → `expo-camera` / `expo-image-picker`; upload via the same presign flow.
7. Push → `expo-notifications`; register the device token via `POST /push-tokens`.
8. Map the design tokens (`apps/web/src/styles/tokens.css`) to a JS theme object
   (see `docs/DESIGN_SYSTEM.md` §RN theme).

See `docs/ARCHITECTURE.md` → "Porting to React Native".
