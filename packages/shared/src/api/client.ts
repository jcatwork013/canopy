import type {
  AdminKycSubmission,
  AuthResponse,
  AuthTokens,
  KycStatus,
  KycStatusInfo,
  KycSubmitRequest,
  LoginRequest,
  RegisterRequest,
  User,
} from '../types/auth';
import type {
  AdminConfig,
  CreateProviderRequest,
  TestResult,
  TestTarget,
  VerifyAIRequest,
  VerifyAIResult,
} from '../types/admin';
import type {
  CarePlan,
  CarePlanStep,
  CarePlanStatus,
  DiagnoseResult,
  GenerateCarePlanRequest,
  IdentifyResult,
  Listing,
  TreatmentPlan,
  UserPlant,
} from '../types/domain';
import type { GuideArticle, SiteConfig, SystemStatus } from '../types/system';
import { HttpClient } from './http';
import type { ClientConfig } from './types';

/**
 * CanopyClient is the single typed entrypoint used by both the web PWA and the
 * React Native app. Resource groups mirror docs/SPEC.md §10. Phases fill in the
 * remaining endpoints; signatures here define the contract.
 */
export class CanopyClient {
  private readonly http: HttpClient;

  constructor(cfg: ClientConfig) {
    this.http = new HttpClient(cfg);
  }

  /** Direct access to token storage (e.g. to hydrate auth state on boot). */
  get tokens() {
    return this.http.tokens;
  }

  // --- System (public, ungated) -------------------------------------------
  system = {
    status: () => this.http.request<SystemStatus>('/system/status', { anonymous: true }),
    site: () => this.http.request<SiteConfig>('/system/site', { anonymous: true }),
    guides: () =>
      this.http.request<{ articles: GuideArticle[] }>('/system/guides', { anonymous: true }),
    health: () =>
      this.http.request<{ status: string; version: string }>('/system/health', {
        anonymous: true,
      }),
  };

  // --- Auth ----------------------------------------------------------------
  auth = {
    register: (body: RegisterRequest) =>
      this.persistAuth(this.http.request<AuthResponse>('/auth/register', { method: 'POST', body, anonymous: true })),
    login: (body: LoginRequest) =>
      this.persistAuth(this.http.request<AuthResponse>('/auth/login', { method: 'POST', body, anonymous: true })),
    me: () => this.http.request<User>('/auth/me'),
    verifyEmail: (token: string) =>
      this.http.request<void>('/auth/verify-email', { method: 'POST', body: { token }, anonymous: true }),
    forgotPassword: (email: string) =>
      this.http.request<void>('/auth/forgot-password', { method: 'POST', body: { email }, anonymous: true }),
    resetPassword: (token: string, password: string) =>
      this.http.request<void>('/auth/reset-password', {
        method: 'POST',
        body: { token, password },
        anonymous: true,
      }),
    resendVerification: (email: string) =>
      this.http.request<void>('/auth/resend-verification', {
        method: 'POST',
        body: { email },
        anonymous: true,
      }),
    logout: async () => {
      const t = await this.http.tokens.get();
      if (t?.refresh_token) {
        await this.http
          .request<void>('/auth/logout', { method: 'POST', body: { refresh_token: t.refresh_token } })
          .catch(() => undefined);
      }
      await this.http.tokens.set(null);
    },
  };

  // --- Uploads -------------------------------------------------------------
  uploads = {
    presign: (body: { content_type: string; purpose: string }) =>
      this.http.request<{ upload_url: string; object_key: string }>('/uploads/presign', {
        method: 'POST',
        body,
      }),
  };

  // --- Plants --------------------------------------------------------------
  plants = {
    list: () => this.http.request<UserPlant[]>('/plants'),
    get: (id: string) => this.http.request<UserPlant>(`/plants/${id}`),
    create: (body: Partial<UserPlant>) =>
      this.http.request<UserPlant>('/plants', { method: 'POST', body }),
    update: (id: string, body: Partial<UserPlant>) =>
      this.http.request<UserPlant>(`/plants/${id}`, { method: 'PUT', body }),
    remove: (id: string) => this.http.request<void>(`/plants/${id}`, { method: 'DELETE' }),
  };

  // --- AI ------------------------------------------------------------------
  ai = {
    identify: (body: { image_base64: string; mime_type: string }) =>
      this.http.request<IdentifyResult>('/ai/identify', { method: 'POST', body }),
    diagnose: (body: { images_base64: string[]; mime_type: string; symptoms_text?: string }) =>
      this.http.request<DiagnoseResult>('/ai/diagnose', { method: 'POST', body }),
    chat: (body: {
      messages: { role: 'user' | 'assistant'; content: string }[];
      image_base64?: string;
      mime_type?: string;
    }) => this.http.request<{ reply: string; model: string }>('/ai/chat', { method: 'POST', body }),
    treatmentPlan: (body: { diagnosis_id: string }) =>
      this.http.request<TreatmentPlan>('/ai/treatment-plan', { method: 'POST', body }),
  };

  // --- Care plans (phác đồ chăm sóc) --------------------------------------
  care = {
    list: () => this.http.request<CarePlan[]>('/care/plans'),
    get: (id: string) => this.http.request<CarePlan>(`/care/plans/${id}`),
    /** Generate a roadmap from a scan result (or notes) and save it. */
    generate: (body: GenerateCarePlanRequest) =>
      this.http.request<CarePlan>('/care/plans', { method: 'POST', body }),
    remove: (id: string) => this.http.request<void>(`/care/plans/${id}`, { method: 'DELETE' }),
    setStatus: (id: string, status: CarePlanStatus) =>
      this.http.request<CarePlan>(`/care/plans/${id}`, { method: 'PATCH', body: { status } }),
    /** Tick / untick a single step. */
    setStep: (planId: string, stepId: string, done: boolean) =>
      this.http.request<CarePlanStep>(`/care/plans/${planId}/steps/${stepId}`, {
        method: 'PATCH',
        body: { done },
      }),
  };

  // --- KYC / role applications --------------------------------------------
  kyc = {
    me: () => this.http.request<KycStatusInfo>('/kyc/me'),
    submit: (body: KycSubmitRequest) =>
      this.http.request<{ status: KycStatus }>('/kyc', { method: 'POST', body }),
  };

  // --- Admin (system_admin only) ------------------------------------------
  admin = {
    getConfig: () => this.http.request<AdminConfig>('/admin/config'),
    putConfig: (values: Record<string, string>) =>
      this.http.request<{ ok: boolean }>('/admin/config', { method: 'PUT', body: { values } }),
    testConnection: (
      target: TestTarget,
      opts?: { api_key?: string; provider_id?: string; provider?: string },
    ) =>
      this.http.request<TestResult>('/admin/config/test', {
        method: 'POST',
        body: { target, ...opts },
      }),
    /** Validate an AI key and list the models it can use ("best model" picker). */
    verifyAI: (body: VerifyAIRequest) =>
      this.http.request<VerifyAIResult>('/admin/ai/verify', { method: 'POST', body }),
    createProvider: (body: CreateProviderRequest) =>
      this.http.request<{ id: string }>('/admin/ai-providers', { method: 'POST', body }),
    updateProvider: (id: string, body: { model: string; enabled: boolean; api_key?: string }) =>
      this.http.request<{ ok: boolean }>(`/admin/ai-providers/${id}`, { method: 'PUT', body }),
    setDefaultProvider: (id: string) =>
      this.http.request<{ ok: boolean }>(`/admin/ai-providers/${id}/default`, { method: 'POST' }),

    // KYC review queue.
    listKyc: (status?: string) =>
      this.http.request<{ submissions: AdminKycSubmission[] }>('/admin/kyc', {
        query: { status },
      }),
    approveKyc: (id: string) =>
      this.http.request<{ ok: boolean }>(`/admin/kyc/${id}/approve`, { method: 'POST' }),
    rejectKyc: (id: string, reason: string) =>
      this.http.request<{ ok: boolean }>(`/admin/kyc/${id}/reject`, {
        method: 'POST',
        body: { reason },
      }),
  };

  // --- Marketplace ---------------------------------------------------------
  listings = {
    list: (query?: { kind?: string; species_id?: string; location?: string }) =>
      this.http.request<Listing[]>('/listings', { query }),
    create: (body: Partial<Listing>) =>
      this.http.request<Listing>('/listings', { method: 'POST', body }),
  };

  private async persistAuth(p: Promise<AuthResponse>): Promise<AuthResponse> {
    const res = await p;
    await this.http.tokens.set(res.tokens as AuthTokens);
    return res;
  }
}
