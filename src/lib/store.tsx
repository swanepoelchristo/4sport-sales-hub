import {
  createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { pushAuthEvent } from "./auth-debug";
import type {
  Rep, Lead, Meeting, Signup, ActivityLog, Profile, Role,
} from "./types";

interface State {
  reps: Rep[];
  leads: Lead[];
  meetings: Meeting[];
  signups: Signup[];
  activity: ActivityLog[];
}

const emptyState: State = { reps: [], leads: [], meetings: [], signups: [], activity: [] };

export interface DebugReport {
  sessionExists: boolean;
  accessTokenExists: boolean;
  authUserId: string | null;
  authEmail: string | null;
  profileData: unknown;
  profileError: unknown;
  userRolesData: unknown;
  userRolesError: unknown;
  hostname: string;
  timestamp: string;
}

interface Ctx {
  state: State;
  user: Profile | null;
  loading: boolean;
  finalizing: boolean;
  login: (email: string, password: string) => Promise<Profile | { error: string }>;
  retryProfileLoad: () => Promise<Profile | { error: string }>;
  collectDebugReport: () => Promise<DebugReport>;
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
  active_teams: s.active_teams, paying_users_active: s.paying_users_active,
  commission_year: s.commission_year, commission_payment_status: s.commission_payment_status,
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
    const [reps, leads, meetings, signups, activity] = await Promise.all([
      supabase.from("reps").select("*").eq("archived", false).order("full_name"),
      supabase.from("leads").select("*").eq("archived", false).order("created_at", { ascending: false }),
      supabase.from("meetings").select("*").eq("archived", false).order("meeting_at", { ascending: false }),
      supabase.from("signups").select("*").eq("archived", false).order("created_at", { ascending: false }),
      supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    setStateInner({
      reps: (reps.data ?? []).map(repFromRow),
      leads: (leads.data ?? []).map(leadFromRow),
      meetings: (meetings.data ?? []).map(meetingFromRow),
      signups: (signups.data ?? []).map(signupFromRow),
      activity: (activity.data ?? []).map(activityFromRow),
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
    const rep = repRows?.[0] ?? null;
    const roleList = roles ?? [];
    const role = roleList.some((r: any) => r.role === "admin") ? "admin" : "sales_rep";
    return {
      id: rep?.id ?? "",
      auth_id: authUser.id,
      full_name: profile.full_name || profile.email,
      email: profile.email,
      role,
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
    <StoreContext.Provider value={{ state, user, loading, finalizing, login, retryProfileLoad, collectDebugReport, logout, setState, addActivity, uid }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
