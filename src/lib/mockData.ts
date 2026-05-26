// Optional reference data for seeding. NOT used by the live app.
// To seed real Supabase data, use the scripts in `scripts/` and run
// against your Supabase project (see README).

import type { Lead, Meeting, Signup } from "./types";

export const SAMPLE_LEADS: Partial<Lead>[] = [
  { org_name: "Grey College", org_type: "School", province: "Free State", city: "Bloemfontein", sport_focus: "Rugby", contact_person: "P. van Wyk", phone: "+27 51 111 1111", email: "sport@grey.za", status: "Meeting Scheduled" },
  { org_name: "Maritzburg College", org_type: "School", province: "KwaZulu-Natal", city: "Pietermaritzburg", sport_focus: "Cricket", contact_person: "S. Naidoo", phone: "+27 33 222 2222", email: "info@mc.za", status: "Signed" },
  { org_name: "Paarl Boys' High", org_type: "School", province: "Western Cape", city: "Paarl", sport_focus: "Rugby", contact_person: "J. Smit", phone: "+27 21 333 3333", email: "rugby@pbh.za", status: "Active" },
];

export const SAMPLE_MEETINGS: Partial<Meeting>[] = [];
export const SAMPLE_SIGNUPS: Partial<Signup>[] = [];
