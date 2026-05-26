// Domain types aligned to Supabase tables:
// profiles, reps, leads, meetings, signups, commissions, activity_logs

export type Role = "admin" | "sales_rep";

export interface Profile {
  id: string;       // linked rep.id when available; otherwise '' for unlinked admin
  auth_id: string;  // auth.users.id
  full_name: string;
  email: string;
  role: Role;
}

export interface Rep {
  id: string;
  profile_id?: string | null;
  full_name: string;
  email: string;
  phone: string;
  province: string;
  region?: string;
  sport_focus: string;
  role: Role;
  active: boolean;
  invitation_status?: "pending" | "accepted" | "expired" | "revoked";
  invited_at?: string | null;
  last_invite_sent_at?: string | null;
  password_reset_sent_at?: string | null;
  user_id?: string | null;
}

export type LeadStatus =
  | "New Lead"
  | "Contacted"
  | "Meeting Scheduled"
  | "Pitched"
  | "Interested"
  | "Not Interested"
  | "Signed"
  | "Paid"
  | "Active"
  | "Lost";

export type OrgType = "School" | "Club" | "Academy" | "Other";
export type Sport =
  | "Rugby" | "Athletics" | "Swimming" | "Hockey"
  | "Netball" | "Soccer" | "Cricket" | "Multi-sport" | "Other";

export interface Lead {
  id: string;
  org_name: string;
  org_type: OrgType;
  province: string;
  city: string;
  region: string;
  sport_focus: Sport;
  contact_person: string;
  contact_role: string;
  phone: string;
  email: string;
  lead_source: string;
  assigned_rep_id: string;
  status: LeadStatus;
  notes: string;
  next_follow_up: string | null;
  created_at: string;
}

export type MeetingType = "Phone" | "WhatsApp" | "Online" | "In-person";
export type MeetingStatus = "Scheduled" | "Completed" | "Cancelled" | "Rescheduled";

export interface Meeting {
  id: string;
  lead_id: string;
  rep_id: string;
  meeting_at: string;
  meeting_type: MeetingType;
  status: MeetingStatus;
  outcome_notes: string;
  next_action: string;
  next_follow_up: string | null;
}

export type CommissionYear =
  | "1st year" | "2nd consecutive year" | "3rd consecutive year"
  | "4th consecutive year" | "5th year+";
export type CommissionPaymentStatus = "Pending" | "Approved" | "Paid" | "Rejected";

export interface Signup {
  id: string;
  lead_id: string;
  rep_id: string;
  signed_date: string;
  paid: boolean;
  payment_date: string | null;
  active_teams: number;
  paying_users_active: boolean;
  commission_year: CommissionYear;
  commission_payment_status: CommissionPaymentStatus;
  admin_notes: string;
}

export interface ActivityLog {
  id: string;
  at: string;
  actor_id: string;
  actor_name: string;
  action: string;
  detail: string;
}

export const PROVINCES = [
  "Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape",
  "Free State", "Limpopo", "Mpumalanga", "North West", "Northern Cape",
];

export const SPORTS: Sport[] = [
  "Rugby", "Athletics", "Swimming", "Hockey", "Netball",
  "Soccer", "Cricket", "Multi-sport", "Other",
];

export const LEAD_STATUSES: LeadStatus[] = [
  "New Lead", "Contacted", "Meeting Scheduled", "Pitched",
  "Interested", "Not Interested", "Signed", "Paid", "Active", "Lost",
];

export const COMMISSION_AMOUNTS: Record<CommissionYear, number> = {
  "1st year": 500,
  "2nd consecutive year": 300,
  "3rd consecutive year": 200,
  "4th consecutive year": 100,
  "5th year+": 50,
};

// Qualification: licence paid (R2,500) + ≥3 active teams + paying users active
export function commissionQualified(s: Signup): boolean {
  return s.paid && s.active_teams >= 3 && s.paying_users_active;
}

export function commissionAmount(s: Signup): number {
  return commissionQualified(s) ? COMMISSION_AMOUNTS[s.commission_year] : 0;
}
