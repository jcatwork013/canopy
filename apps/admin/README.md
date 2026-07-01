# @canopy/admin — Admin portal

> **Phase 1+.** For Phase 1 the admin surface ships as a guarded `/admin` route
> group **inside** `apps/web` (Setup Wizard, config + "Test connection", KYC
> review). It is split into its own app here only if/when it outgrows that.

Responsibilities:
- First-run Setup Wizard (enter Gemini / Resend / MinIO config, test, activate).
- System config management (masked secrets, AES-256-GCM at rest).
- AI provider management (enable/disable, default, model).
- KYC review queue (approve / reject + email result via Resend).

See `docs/SPEC.md` §6 (Readiness gate) and §8 (KYC).
