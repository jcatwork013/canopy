// Admin config DTOs (system_admin only). Secrets are always masked on read.

export interface MaskedSecret {
  set: boolean;
  masked: string;
}

export interface AdminAIProvider {
  id: string;
  name: string;
  type: string;
  model: string;
  enabled: boolean;
  is_default: boolean;
  key_set: boolean;
  key_masked: string;
}

export interface AdminConfig {
  email: {
    resend_api_key: MaskedSecret;
    resend_from: string;
  };
  storage: { reachable: boolean };
  providers: AdminAIProvider[];
}

export type TestTarget = 'ai' | 'email' | 'storage';

/** Supported AI vendors. `string` elsewhere stays permissive for forward-compat. */
export type AIProviderType = 'gemini' | 'openai';

export interface TestResult {
  ok: boolean;
  detail?: string;
}

/** Validate an AI key and, on success, return the models it can access. */
export interface VerifyAIRequest {
  provider: AIProviderType;
  api_key?: string;
}

export interface VerifyAIResult {
  ok: boolean;
  detail?: string;
  models: string[];
}

export interface CreateProviderRequest {
  name: string;
  type: string;
  api_key: string;
  model: string;
  enabled: boolean;
}
