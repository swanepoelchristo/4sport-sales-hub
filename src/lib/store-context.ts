import { createContext, useContext } from "react";
import type {
  ActivityLog, CallCenterAgent, Lead, LeadActivity, LeadCandidate,
  Meeting, Profile, Rep, Signup,
} from "./types";

export interface State {
  reps: Rep[];
  leads: Lead[];
  meetings: Meeting[];
  signups: Signup[];
  activity: ActivityLog[];
  callCenterAgents: CallCenterAgent[];
  leadActivity: LeadActivity[];
  leadCandidates: LeadCandidate[];
}

export interface StoreContextValue {
  state: State;
  user: Profile | null;
  loading: boolean;
  finalizing: boolean;
  dataError: string | null;
  mutationError: string | null;
  clearMutationError: () => void;
  reloadData: () => Promise<void>;
  login: (email: string, password: string) => Promise<Profile | { error: string }>;
  retryProfileLoad: () => Promise<Profile | { error: string }>;
  logout: () => Promise<void>;
  setState: (updater: (state: State) => State) => void;
  addActivity: (action: string, detail: string, entity?: { type?: string; id?: string }) => Promise<void>;
  uid: () => string;
}

export const StoreContext = createContext<StoreContextValue | null>(null);
export const PROFILE_LOAD_ERROR = "Profile could not be loaded. Please refresh.";

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
}
