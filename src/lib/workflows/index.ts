// Future-proofing: workflow state machines for onboarding and commission approval.
// Currently informational only — the UI does not enforce these transitions yet.

export type OnboardingStage =
  | "lead_captured"
  | "intro_sent"
  | "meeting_booked"
  | "pitched"
  | "agreement_sent"
  | "agreement_signed"
  | "licence_paid"
  | "teams_activated"
  | "active";

export const ONBOARDING_STAGES: OnboardingStage[] = [
  "lead_captured", "intro_sent", "meeting_booked", "pitched",
  "agreement_sent", "agreement_signed", "licence_paid", "teams_activated", "active",
];

export type CommissionApprovalStage =
  | "submitted"
  | "reviewed"
  | "approved"
  | "paid"
  | "rejected";

export const COMMISSION_STAGES: CommissionApprovalStage[] = [
  "submitted", "reviewed", "approved", "paid", "rejected",
];
