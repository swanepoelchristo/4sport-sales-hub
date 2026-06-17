import {
  createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { pushAuthEvent } from "./auth-debug";
import type {
  Rep, Lead, Meeting, Signup, ActivityLog, Profile, Role,
  CallCenterAgent, LeadActivity, LeadCandidate,
} from "./types";

interface State {
  reps: Rep[];
  leads: Lead[];
  meetings: Meeting[];
  signups: Signup[];
  activity: ActivityLog[];
  callCenterAgents: CallCenterAgent[];
  leadActivity: LeadActivity[];
  leadCandidates: LeadCandidate[];
}

const emptyState: State = {
  reps: [],
  leads: [],
  meetings: [],
  signups: [],
  activity: [],
  callCenterAgents: [],
  leadActivity: [],
  leadCandidates: [],
};

interface Ctx {
  state: State;
  user: Profile | null;
  loading: boolean;
  finalizing: boolean;
  login: (email: string, password: string) => Promise<Profile | { error: string }>;
  retryProfileLoad: () => Promise<Profile | { error: string }>;
  logout: () => Promise<void>;
  setState: (updater: (s: State) => State) => void;
  addActivity: (action: string, detail: string, entity?: { type?: string; id?: string }) => Promise<void>;
  uid: () => string;
}

const StoreContext = createContext<Ctx | null>(null);
export const PROFILE_LOAD_ERROR = "Profile could not be loaded. Please refresh.";

// ---------- Row mappers (DB <-> domain) ----------
const repFromRow = (r: any): Rep => ({
  id: r.id,
  profile_id: r.profile_id ?? null,
  user_id: r.user_id ?? null,
  full_name: r.full_name,
  email: r.email,
  phone: r.phone ?? "",
  province: r.province ?? "",
  region: r.region ?? "",
  sport_focus: r.sport_focus ?? "",
  role: r.role as Role,
  active: !!r.active,
  invitation_status: r.invitation_status ?? "pending",
  invited_at: r.invited_at ?? null,
  last_invite_sent_at: r.last_invite_sent_at ?? null,
  password_reset_sent_at: r.password_reset_sent_at ?? null,
});

const leadFromRow = (r: any): Lead => ({
  id: r.id,
  org_name: r.org_name,
  org_type: r.org_type,
  province: r.province ?? "",
  city: r.city ?? "",
  region: r.region ?? "",
  sport_focus: r.sport_focus ?? "",
  contact_person: r.contact_person ?? "",
  contact_role: r.contact_role ?? "",
  phone: r.phone ?? "",
  email: r.email ?? "",
  lead_source: r.lead_source ?? "",

  website: r.website ?? "",
  public_phone: r.public_phone ?? r.phone ?? "",
  public_email: r.public_email ?? r.email ?? "",
  source_url: r.source_url ?? "",
  source_note: r.source_note ?? r.lead_source ?? "",
  assigned_agent_id: r.assigned_agent_id ?? "",
  do_not_contact: !!r.do_not_contact,
  last_call_outcome: r.last_call_outcome ?? "",
  last_call_note: r.last_call_note ?? "",
  last_contacted_at: r.last_contacted_at ?? null,

  assigned_rep_id: r.assigned_rep_id ?? "",
  status: r.status,
  notes: r.notes ?? "",
  next_follow_up: r.next_follow_up ?? null,
  created_at: r.created_at,
});

const meetingFromRow = (r: any): Meeting => ({
  id: r.id,
  lead_id: r.lead_id,
  rep_id: r.rep_id ?? "",
  meeting_at: r.meeting_at,
  meeting_type: r.meeting_type,
  status: r.status,
  outcome_notes: r.outcome_notes ?? "",
  next_action: r.next_action ?? "",
  next_follow_up: r.next_follow_up ?? null,
});

const signupFromRow = (r: any): Signup => ({
  id: r.id,
  lead_id: r.lead_id,
  rep_id: r.rep_id ?? "",
  signed_date: r.signed_date,
  paid: !!r.paid,
  payment_date: r.payment_date ?? null,
  active_teams: r.active_teams ?? 0,
  paying_users_active: !!r.paying_users_active,

  deal_type: r.deal_type ?? "School",

  base_price: Number(r.base_price ?? 2500),
  quoted_price: Number(r.quoted_price ?? 2500),
  final_agreed_price: Number(r.final_agreed_price ?? 2500),

  contract_term: r.contract_term ?? "Annual",
  pricing_notes: r.pricing_notes ?? "",

  approval_required: !!r.approval_required,
  approved_by: r.approved_by ?? null,

  first_payment_received: !!r.first_payment_received,

  support_package: r.support_package ?? "None",
  support_term_months: Number(r.support_term_months ?? 0),
  support_response_sla: r.support_response_sla ?? "",
  included_support_issues: Number(r.included_support_issues ?? 0),
  monthly_support_fee: Number(r.monthly_support_fee ?? 0),
  rep_support_commission_rate: Number(r.rep_support_commission_rate ?? 1.5),
  pain_point_notes: r.pain_point_notes ?? "",
  operational_risk_notes: r.operational_risk_notes ?? "",

  risk_level: r.risk_level ?? "LOW",
  risk_score: Number(r.risk_score ?? 0),
  support_tickets_used: Number(r.support_tickets_used ?? 0),
  last_support_contact: r.last_support_contact ?? null,

  commission_year: r.commission_year,
  commission_payment_status: r.commission_payment_status,
  admin_notes: r.admin_notes ?? "",
});

const activityFromRow = (r: any): ActivityLog => ({
  id: r.id,
  at: r.created_at,
  actor_id: r.actor_id ?? "",
  actor_name: r.actor_name ?? "",
  action: r.action,
  detail: r.detail ?? "",
});

const callCenterAgentFromRow = (r: any): CallCenterAgent => ({
  id: r.id,
  auth_user_id: r.auth_user_id ?? null,
  name: r.name ?? "",
  email: r.email ?? "",
  phone: r.phone ?? "",
  status: r.status ?? "pending",
  created_at: r.created_at,
});

const leadActivityFromRow = (r: any): LeadActivity => ({
  id: r.id,
  lead_id: r.lead_id,
  agent_id: r.agent_id ?? null,
  activity_type: r.activity_type,
  outcome: r.outcome ?? "",
  notes: r.notes ?? "",
  next_follow_up_at: r.next_follow_up_at ?? null,
  created_at: r.created_at,
});

const leadCandidateFromRow = (r: any): LeadCandidate => ({
  id: r.id,
  org_name: r.org_name ?? "",
  org_type: r.org_type ?? "School",
  province: r.province ?? "",
  city: r.city ?? "",
  region: r.region ?? "",
  sport_focus: r.sport_focus ?? "Other",

  contact_person: r.contact_person ?? "",
  contact_role: r.contact_role ?? "",
  public_phone: r.public_phone ?? "",
  public_email: r.public_email ?? "",
  website: r.website ?? "",

  source_url_1: r.source_url_1 ?? "",
  source_url_2: r.source_url_2 ?? "",
  source_url_3: r.source_url_3 ?? "",
  source_note: r.source_note ?? "",

  verification_status: r.verification_status ?? "draft",

  check_1_by: r.check_1_by ?? null,
  check_1_at: r.check_1_at ?? null,
  check_1_note: r.check_1_note ?? "",

  check_2_by: r.check_2_by ?? null,
  check_2_at: r.check_2_at ?? null,
  check_2_note: r.check_2_note ?? "",

  approved_by: r.approved_by ?? null,
  approved_at: r.approved_at ?? null,

  rejected_by: r.rejected_by ?? null,
  rejected_at: r.rejected_at ?? null,
  rejected_reason: r.rejected_reason ?? "",

  converted_lead_id: r.converted_lead_id ?? null,

  created_by: r.created_by ?? null,
  created_at: r.created_at,
  updated_at: r.updated_at ?? null,
});

// ---------- Diff to DB ----------
function eq(a: any, b: any) { return JSON.stringify(a) === JSON.stringify(b); }

// NOTE: We never hard-delete via diff sync. Removals from local state
// translate to soft-archive in DB (archived=true, deleted_at, deleted_by).
async function syncTable<T extends { id: string }>(
  table: "reps" | "leads" | "meetings" | "signups",
  oldList: T[],
  newList: T[],
  toRow: (x: T) => any,
) {
  const oldMap = new Map(oldList.map((x) => [x.id, x]));
  const newMap = new Map(newList.map((x) => [x.id, x]));
  const upserts: any[] = [];
  for (const [id, n] of newMap) {
    const o = oldMap.get(id);
    if (!o || !eq(o, n)) upserts.push(toRow(n));
  }
  const archives: string[] = [];
  for (const id of oldMap.keys()) if (!newMap.has(id)) archives.push(id);

  if (upserts.length) {
    const { error } = await supabase.from(table).upsert(upserts);
    if (error) console.error(`[sync ${table} upsert]`, error);
  }
  if (archives.length) {
    const { data: { user: au } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from(table)
      .update({ archived: true, deleted_at: new Date().toISOString(), deleted_by: au?.id ?? null })
      .in("id", archives);
    if (error) console.error(`[sync ${table} archive]`, error);
  }
}

const repToRow = (r: Rep) => ({
  id: r.id, profile_id: r.profile_id ?? null, user_id: r.user_id ?? null,
  full_name: r.full_name, email: r.email,
  phone: r.phone, province: r.province, region: r.region ?? "", sport_focus: r.sport_focus,
  role: r.role, active: r.active,
});
const leadToRow = (l: Lead) => ({
  id: l.id, org_name: l.org_name, org_type: l.org_type, province: l.province,
  city: l.city, region: l.region, sport_focus: l.sport_focus,
  contact_person: l.contact_person, contact_role: l.contact_role,
  phone: l.phone, email: l.email, lead_source: l.lead_source,
  website: l.website, public_phone: l.public_phone, public_email: l.public_email,
  source_url: l.source_url, source_note: l.source_note,
  assigned_agent_id: l.assigned_agent_id || null,
  do_not_contact: l.do_not_contact,
  last_call_outcome: l.last_call_outcome,
  last_call_note: l.last_call_note,
  last_contacted_at: l.last_contacted_at,
  assigned_rep_id: l.assigned_rep_id || null,
  status: l.status, notes: l.notes, next_follow_up: l.next_follow_up,
});
const meetingToRow = (m: Meeting) => ({
  id: m.id, lead_id: m.lead_id, rep_id: m.rep_id || null,
  meeting_at: m.meeting_at, meeting_type: m.meeting_type, status: m.status,
  outcome_notes: m.outcome_notes, next_action: m.next_action,
  next_follow_up: m.next_follow_up,
});
const signupToRow = (s: Signup) => ({
  id: s.id, lead_id: s.lead_id, rep_id: s.rep_id || null,
  signed_date: s.signed_date, paid: s.paid, payment_date: s.payment_date,
  active_teams: s.active_teams,
  paying_users_active: s.paying_users_active,

  deal_type: s.deal_type,

  base_price: s.base_price,
  quoted_price: s.quoted_price,
  final_agreed_price: s.final_agreed_price,

  contract_term: s.contract_term,
  pricing_notes: s.pricing_notes,

  approval_required: s.approval_required,
  approved_by: s.approved_by,

  first_payment_received: s.first_payment_received,

  support_package: s.support_package,
  support_term_months: s.support_term_months,
  support_response_sla: s.support_response_sla,
  included_support_issues: s.included_support_issues,
  monthly_support_fee: s.monthly_support_fee,
  rep_support_commission_rate: s.rep_support_commission_rate,
  pain_point_notes: s.pain_point_notes,
  operational_risk_notes: s.operational_risk_notes,

  risk_level: s.risk_level,
  risk_score: s.risk_score,
  support_tickets_used: s.support_tickets_used,
  last_support_contact: s.last_support_contact,

  commission_year: s.commission_year,
  commission_payment_status: s.commission_payment_status,
  admin_notes: s.admin_notes,
});

// ---------- Provider ----------
export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setStateInner] = useState<State>(emptyState);
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const loadAll = useCallback(async (profile: Profile) => {
    const [reps, leads, meetings, signups, activity, callCenterAgents, leadActivity, leadCandidates] = await Promise.all([
      supabase.from("reps").select("*").eq("archived", false).order("full_name"),
      supabase.from("leads").select("*").eq("archived", false).order("created_at", { ascending: false }),
      supabase.from("meetings").select("*").eq("archived", false).order("meeting_at", { ascending: false }),
      supabase.from("signups").select("*").eq("archived", false).order("created_at", { ascending: false }),
      supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(500),
      (supabase as any).from("call_center_agents").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("lead_activity").select("*").order("created_at", { ascending: false }).limit(1000),
      (supabase as any).from("lead_candidates").select("*").order("created_at", { ascending: false }).limit(1000),
    ]);
    setStateInner({
      reps: (reps.data ?? []).map(repFromRow),
      leads: (leads.data ?? []).map(leadFromRow),
      meetings: (meetings.data ?? []).map(meetingFromRow),
      signups: (signups.data ?? []).map(signupFromRow),
      activity: (activity.data ?? []).map(activityFromRow),
      callCenterAgents: (callCenterAgents.data ?? []).map(callCenterAgentFromRow),
      leadActivity: (leadActivity.data ?? []).map(leadActivityFromRow),
      leadCandidates: (leadCandidates.data ?? []).map(leadCandidateFromRow),
    });
    if (!profile.id) {
      const mine = (reps.data ?? []).find((r: any) => r.user_id === profile.auth_id);
      if (mine) setUser({ ...profile, id: mine.id });
    }
  }, []);

  // Returns: Profile (success) | "empty" (auth ok but profile row not returned) | null (no session)
  const buildProfileFromSession = useCallback(async (): Promise<Profile | "empty" | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    console.log("[session.check]", {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      userId: session?.user?.id,
    });

    if (!session?.access_token) {
      console.warn("[session.missing]");
      return null;
    }

    await new Promise((r) => setTimeout(r, 1000));

    const authUser = session.user;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .limit(1);

    console.log("[profile.query.result]", {
      data,
      error,
    });

    const profile = data?.[0] ?? null;

    if (error) {
      return "empty";
    }
    if (!profile) {
      return "empty";
    }

    const { data: roles, error: rolesErr } = await supabase
      .from("user_roles").select("role").eq("user_id", authUser.id);
    if (rolesErr) console.warn("[roles.lookup.error]", rolesErr.message);
    const { data: repRows } = await supabase
      .from("reps").select("id").eq("user_id", authUser.id).limit(1);
    const { data: agentRows } = await (supabase as any)
      .from("call_center_agents").select("id,status").eq("auth_user_id", authUser.id).limit(1);

    const rep = repRows?.[0] ?? null;
    const agent = agentRows?.[0] ?? null;
    const roleList = roles ?? [];
    const profileRole = profile.role as Role;
    const role: Role = roleList.some((r: any) => r.role === "admin")
      ? "admin"
      : profileRole === "call_center_agent"
        ? "call_center_agent"
        : "sales_rep";

    return {
      id: role === "call_center_agent" ? agent?.id ?? "" : rep?.id ?? "",
      auth_id: authUser.id,
      full_name: profile.full_name || profile.email,
      email: profile.email,
      role,
      call_center_status: agent?.status,
    };
  }, []);

  // Resolve profile with one silent retry after 1500ms if first attempt is empty.
  const resolveProfile = useCallback(async (): Promise<Profile | "empty" | null> => {
    const first = await buildProfileFromSession();
    if (first === "empty") {
      setFinalizing(true);
      await new Promise((r) => setTimeout(r, 1500));
      const second = await buildProfileFromSession();
      setFinalizing(false);
      return second;
    }
    return first;
  }, [buildProfileFromSession]);




  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      pushAuthEvent(event, session);
      // Gate: only run profile lookup on real sign-in transitions.
      // INITIAL_SESSION is handled by the session bootstrap below.
      // PASSWORD_RECOVERY / SIGNED_OUT must never trigger a profile query.
      if (event === "PASSWORD_RECOVERY" || event === "INITIAL_SESSION") return;
      if (event === "SIGNED_OUT" || !session?.user) {
        setUser(null);
        setStateInner(emptyState);
        setLoading(false);
        return;
      }
      if (event !== "SIGNED_IN" && event !== "TOKEN_REFRESHED" && event !== "USER_UPDATED") return;
      // Defer to avoid deadlock with supabase client
      setTimeout(async () => {
        if (!active) return;
        const profile = await resolveProfile();
        if (!active) return;
        if (profile && profile !== "empty") {
          setUser(profile);
          await loadAll(profile);
        } else {
          setUser(null);
        }
        setLoading(false);
      }, 0);
    });

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (!data.session?.user) { setLoading(false); return; }
      const profile = await resolveProfile();
      if (!active) return;
      if (profile && profile !== "empty") {
        setUser(profile);
        await loadAll(profile);
      }
      setLoading(false);
    })();

    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [resolveProfile, loadAll]);

  const setState = useCallback((updater: (s: State) => State) => {
    setStateInner((prev) => {
      const next = updater(prev);
      // Fire-and-forget DB sync for the four mutable tables
      void syncTable("reps", prev.reps, next.reps, repToRow);
      void syncTable("leads", prev.leads, next.leads, leadToRow);
      void syncTable("meetings", prev.meetings, next.meetings, meetingToRow);
      void syncTable("signups", prev.signups, next.signups, signupToRow);
      return next;
    });
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<Profile | { error: string }> => {
    // Clear any stale recovery / partial session before signing in.
    try { await supabase.auth.signOut({ scope: "local" } as never); } catch { /* noop */ }
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) return { error: error?.message ?? "Sign-in failed." };
    const profile = await resolveProfile();
    if (!profile || profile === "empty") {
      return { error: PROFILE_LOAD_ERROR };
    }
    setUser(profile);
    await loadAll(profile);
    return profile;
  }, [resolveProfile, loadAll]);

  const retryProfileLoad = useCallback(async (): Promise<Profile | { error: string }> => {
    const profile = await resolveProfile();
    if (!profile || profile === "empty") return { error: PROFILE_LOAD_ERROR };
    setUser(profile);
    await loadAll(profile);
    return profile;
  }, [resolveProfile, loadAll]);



  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setStateInner(emptyState);
  }, []);

  const uid = useCallback(() => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
    return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }, []);

  const addActivity = useCallback(async (
    action: string, detail: string, entity?: { type?: string; id?: string },
  ) => {
    const u = user;
    if (!u) return;
    const row = {
      actor_id: u.auth_id,
      actor_name: u.full_name,
      action,
      detail,
      entity_type: entity?.type ?? "",
      entity_id: entity?.id ?? null,
    };
    const { data, error } = await supabase.from("activity_logs").insert(row).select().single();
    if (error) { console.error("[activity insert]", error); return; }
    setStateInner((s) => ({
      ...s,
      activity: [activityFromRow(data), ...s.activity].slice(0, 500),
    }));
  }, [user]);

  return (
    <StoreContext.Provider value={{ state, user, loading, finalizing, login, retryProfileLoad, logout, setState, addActivity, uid }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
