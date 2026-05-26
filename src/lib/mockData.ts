import type { Rep, Lead, Meeting, Signup, ActivityLog, Profile } from "./types";

// Demo users (passwords are demo-only, replace with Supabase Auth later)
export const DEMO_USERS: Array<Profile & { password: string }> = [
  { id: "u-christo", full_name: "Christo Admin", email: "christo@4sport.co.za", role: "admin", password: "admin123" },
  { id: "u-mariaan", full_name: "Mariaan Admin", email: "mariaan@4sport.co.za", role: "admin", password: "admin123" },
  { id: "u-rep1",    full_name: "Sales Rep Demo", email: "rep@4sport.co.za",    role: "rep",   password: "rep123" },
];

export const INITIAL_REPS: Rep[] = [
  { id: "u-christo", full_name: "Christo Admin",  email: "christo@4sport.co.za", phone: "+27 82 000 0001", province: "Gauteng",      sport_focus: "Multi-sport", role: "admin", active: true },
  { id: "u-mariaan", full_name: "Mariaan Admin",  email: "mariaan@4sport.co.za", phone: "+27 82 000 0002", province: "Western Cape", sport_focus: "Multi-sport", role: "admin", active: true },
  { id: "u-rep1",    full_name: "Sales Rep Demo", email: "rep@4sport.co.za",     phone: "+27 82 000 0003", province: "KwaZulu-Natal",sport_focus: "Rugby",       role: "rep",   active: true },
];

const today = new Date();
const iso = (d: Date) => d.toISOString();
const addDays = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d); };

export const INITIAL_LEADS: Lead[] = [
  { id: "l-1", org_name: "Grey College", org_type: "School", province: "Free State", city: "Bloemfontein", region: "Central", sport_focus: "Rugby",   contact_person: "P. van Wyk", contact_role: "Sports Head", phone: "+27 51 111 1111", email: "sport@grey.za", lead_source: "Referral", assigned_rep_id: "u-rep1", status: "Meeting Scheduled", notes: "Strong interest", next_follow_up: addDays(3), created_at: addDays(-10) },
  { id: "l-2", org_name: "Maritzburg College", org_type: "School", province: "KwaZulu-Natal", city: "Pietermaritzburg", region: "Midlands", sport_focus: "Cricket", contact_person: "S. Naidoo", contact_role: "Director", phone: "+27 33 222 2222", email: "info@mc.za", lead_source: "Cold call", assigned_rep_id: "u-rep1", status: "Signed", notes: "Signed, pending payment", next_follow_up: addDays(5), created_at: addDays(-30) },
  { id: "l-3", org_name: "Paarl Boys' High", org_type: "School", province: "Western Cape", city: "Paarl", region: "Cape Winelands", sport_focus: "Rugby", contact_person: "J. Smit", contact_role: "Coach", phone: "+27 21 333 3333", email: "rugby@pbh.za", lead_source: "Event", assigned_rep_id: "u-mariaan", status: "Active", notes: "Live and paying", next_follow_up: null, created_at: addDays(-90) },
  { id: "l-4", org_name: "Jeppe Hockey Club", org_type: "Club", province: "Gauteng", city: "Johannesburg", region: "East Rand", sport_focus: "Hockey", contact_person: "T. Khumalo", contact_role: "Chair", phone: "+27 11 444 4444", email: "hello@jhc.za", lead_source: "Web", assigned_rep_id: "u-rep1", status: "Contacted", notes: "Awaiting meeting date", next_follow_up: addDays(1), created_at: addDays(-4) },
  { id: "l-5", org_name: "Stellenbosch Academy", org_type: "Academy", province: "Western Cape", city: "Stellenbosch", region: "Cape Winelands", sport_focus: "Multi-sport", contact_person: "L. Botha", contact_role: "Manager", phone: "+27 21 555 5555", email: "admin@sa.za", lead_source: "Referral", assigned_rep_id: "u-christo", status: "Pitched", notes: "Reviewing internally", next_follow_up: addDays(7), created_at: addDays(-18) },
];

export const INITIAL_MEETINGS: Meeting[] = [
  { id: "m-1", lead_id: "l-1", rep_id: "u-rep1",    meeting_at: addDays(3),  meeting_type: "In-person", status: "Scheduled", outcome_notes: "", next_action: "Demo onsite", next_follow_up: addDays(10) },
  { id: "m-2", lead_id: "l-2", rep_id: "u-rep1",    meeting_at: addDays(-5), meeting_type: "Online",    status: "Completed", outcome_notes: "Signed", next_action: "Send invoice", next_follow_up: addDays(2) },
  { id: "m-3", lead_id: "l-3", rep_id: "u-mariaan", meeting_at: addDays(-40),meeting_type: "In-person", status: "Completed", outcome_notes: "Activation done", next_action: "Quarterly check-in", next_follow_up: addDays(30) },
  { id: "m-4", lead_id: "l-5", rep_id: "u-christo", meeting_at: addDays(1),  meeting_type: "WhatsApp",  status: "Scheduled", outcome_notes: "", next_action: "Follow up on review", next_follow_up: addDays(7) },
];

export const INITIAL_SIGNUPS: Signup[] = [
  { id: "s-1", lead_id: "l-2", rep_id: "u-rep1",    signed_date: addDays(-5),  paid: false, payment_date: null,         active_teams: 2, paying_users_active: false, commission_year: "1st year", commission_payment_status: "Pending",  admin_notes: "Awaiting payment" },
  { id: "s-2", lead_id: "l-3", rep_id: "u-mariaan", signed_date: addDays(-85), paid: true,  payment_date: addDays(-80), active_teams: 5, paying_users_active: true,  commission_year: "2nd consecutive year", commission_payment_status: "Paid", admin_notes: "Renewed" },
];

export const INITIAL_ACTIVITY: ActivityLog[] = [
  { id: "a-1", at: addDays(-1), actor_id: "u-rep1", actor_name: "Sales Rep Demo", action: "Lead created", detail: "Jeppe Hockey Club" },
  { id: "a-2", at: addDays(-5), actor_id: "u-rep1", actor_name: "Sales Rep Demo", action: "Signup recorded", detail: "Maritzburg College" },
  { id: "a-3", at: addDays(-80), actor_id: "u-mariaan", actor_name: "Mariaan Admin", action: "Payment confirmed", detail: "Paarl Boys' High" },
];
