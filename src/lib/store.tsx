import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Rep, Lead, Meeting, Signup, ActivityLog, Profile } from "./types";
import {
  INITIAL_REPS, INITIAL_LEADS, INITIAL_MEETINGS, INITIAL_SIGNUPS,
  INITIAL_ACTIVITY, DEMO_USERS,
} from "./mockData";

const LS_KEY = "4sport-state-v1";
const SESSION_KEY = "4sport-session-v1";

interface State {
  reps: Rep[];
  leads: Lead[];
  meetings: Meeting[];
  signups: Signup[];
  activity: ActivityLog[];
}

const initialState: State = {
  reps: INITIAL_REPS,
  leads: INITIAL_LEADS,
  meetings: INITIAL_MEETINGS,
  signups: INITIAL_SIGNUPS,
  activity: INITIAL_ACTIVITY,
};

function loadState(): State {
  if (typeof window === "undefined") return initialState;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return initialState;
}

interface Ctx {
  state: State;
  user: Profile | null;
  login: (email: string, password: string) => Profile | null;
  logout: () => void;
  setState: (updater: (s: State) => State) => void;
  addActivity: (action: string, detail: string) => void;
  uid: () => string;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setStateInner] = useState<State>(initialState);
  const [user, setUser] = useState<Profile | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on client only (SSR-safe)
  useEffect(() => {
    setStateInner(loadState());
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const setState = (updater: (s: State) => State) => setStateInner(updater);

  const login = (email: string, password: string) => {
    const found = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
    );
    if (!found) return null;
    const profile: Profile = { id: found.id, full_name: found.full_name, email: found.email, role: found.role };
    setUser(profile);
    localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
    return profile;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const uid = () => Math.random().toString(36).slice(2, 10);

  const addActivity = (action: string, detail: string) => {
    if (!user) return;
    setStateInner((s) => ({
      ...s,
      activity: [
        { id: uid(), at: new Date().toISOString(), actor_id: user.id, actor_name: user.full_name, action, detail },
        ...s.activity,
      ].slice(0, 500),
    }));
  };

  return (
    <StoreContext.Provider value={{ state, user, login, logout, setState, addActivity, uid }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
