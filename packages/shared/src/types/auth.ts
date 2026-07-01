export type AccountStatus = 'pending' | 'active' | 'suspended' | 'banned';
export type KycStatus = 'none' | 'submitted' | 'in_review' | 'verified' | 'rejected';

/** A user can hold multiple roles via independent boolean flags. */
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  is_player: boolean;
  is_seller: boolean;
  is_caretaker: boolean;
  is_system_admin: boolean;
  account_status: AccountStatus;
  email_verified_at?: string | null;
  kyc_status: KycStatus;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  /** Seconds until the access token expires. */
  expires_in: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// --- KYC / role applications ------------------------------------------------
export type KycDocumentType = 'national_id' | 'passport' | 'driver_license';

/** Payload to submit a verification + seller/caretaker role application. */
export interface KycSubmitRequest {
  document_type: KycDocumentType;
  document_number?: string;
  request_seller: boolean;
  request_caretaker: boolean;
  front_base64: string;
  front_mime: string;
  back_base64?: string;
  back_mime?: string;
  selfie_base64?: string;
  selfie_mime?: string;
}

/** The current user's KYC state (status 'none' when never submitted). */
export interface KycStatusInfo {
  status: KycStatus;
  document_type?: KycDocumentType | null;
  requested_seller: boolean;
  requested_caretaker: boolean;
  rejection_reason?: string | null;
  created_at?: string | null;
  reviewed_at?: string | null;
}

/** Admin reviewer view — includes the applicant + presigned document URLs. */
export interface AdminKycSubmission {
  id: string;
  user_id: string;
  user_email: string;
  user_full_name: string;
  document_type: KycDocumentType;
  document_number?: string | null;
  requested_seller: boolean;
  requested_caretaker: boolean;
  status: KycStatus;
  rejection_reason?: string | null;
  created_at: string;
  /** Short-lived presigned URLs (empty string when not provided). */
  front_url: string;
  back_url: string;
  selfie_url: string;
}

/** Convenience role helpers used by both clients for nav/permission gating. */
export const roleHelpers = {
  isAdmin: (u: User | null | undefined) => !!u?.is_system_admin,
  canSell: (u: User | null | undefined) => !!u?.is_seller && u?.kyc_status === 'verified',
  canOfferCare: (u: User | null | undefined) => !!u?.is_caretaker && u?.kyc_status === 'verified',
  emailVerified: (u: User | null | undefined) => !!u?.email_verified_at,
} as const;
