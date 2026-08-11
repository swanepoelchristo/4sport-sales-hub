import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  FileText,
  Globe2,
  HeartPulse,
  Landmark,
  Medal,
  School,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/_app/impact")({ component: ImpactWarRoom });

type Metric = {
  label: string;
  value: string;
  detail: string;
  icon: typeof Building2;
};

type FundingOpportunity = {
  name: string;
  type: string;
  region: string;
  fit: string;
  status: string;
  next: string;
};

type ChecklistItem = {
  name: string;
  status: "Ready" | "Draft" | "Needed";
};

const metrics: Metric[] = [
  { label: "Schools in launch audience", value: "53", detail: "Primary schools at hockey tournament", icon: School },
  { label: "Tournament window", value: "4 days", detail: "Monday to Thursday proof event", icon: Medal },
  { label: "Sport code", value: "Hockey", detail: "Game Day Tech Table launch use case", icon: Target },
  { label: "Reports to send", value: "53+", detail: "PDF reporting to participating schools", icon: FileText },
  { label: "Investor story", value: "Live", detail: "Real school usage, not theory", icon: Globe2 },
  { label: "Funding model", value: "Hybrid", detail: "Commercial schools plus sponsored access", icon: Landmark },
];

const fundingOpportunities: FundingOpportunity[] = [
  {
    name: "Global sport-for-development funders",
    type: "Impact / Sport",
    region: "International",
    fit: "High",
    status: "Researching",
    next: "Build one-page impact case",
  },
  {
    name: "Education impact investors",
    type: "EdTech / Schools",
    region: "Global / Africa",
    fit: "High",
    status: "Researching",
    next: "Package 53-school tournament traction",
  },
  {
    name: "Athlete safety partners",
    type: "Health / Safety",
    region: "Global",
    fit: "Medium",
    status: "Draft target list",
    next: "Tie Game Day reports to safety roadmap",
  },
  {
    name: "Africa-focused venture capital",
    type: "VC / Growth",
    region: "Africa / Europe / US",
    fit: "Medium",
    status: "Pipeline",
    next: "Prepare commercial SaaS metrics",
  },
];

const checklist: ChecklistItem[] = [
  { name: "Founder story", status: "Draft" },
  { name: "4SPORT one-pager", status: "Draft" },
  { name: "Game Day Tech Table screenshots", status: "Ready" },
  { name: "53-school launch proof note", status: "Draft" },
  { name: "Financial projection", status: "Draft" },
  { name: "Demo video", status: "Needed" },
  { name: "Investor email template", status: "Needed" },
];

const sponsorPackages = [
  { title: "Sponsor 1 school", schools: 1, learners: "400", use: "Pilot proof" },
  { title: "Sponsor 10 schools", schools: 10, learners: "4,000", use: "District rollout" },
  { title: "Sponsor 50 schools", schools: 50, learners: "20,000", use: "Provincial proof" },
  { title: "Sponsor 100 schools", schools: 100, learners: "40,000", use: "National impact story" },
];

function statusClass(status: ChecklistItem["status"]) {
  if (status === "Ready") return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
  if (status === "Draft") return "border-cyan-400/40 bg-cyan-400/10 text-cyan-200";
  return "border-amber-400/40 bg-amber-400/10 text-amber-200";
}

function ImpactWarRoom() {
  return (
    <div className="relative left-1/2 w-[min(1280px,calc(100vw-2rem))] -translate-x-1/2 space-y-6 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-blue-700">
            4SPORT Impact War Room
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
            Turn school sport traction into fundable proof
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            This module tracks the Game Day Tech Table launch, school reach, report delivery,
            sponsorship packages, and international funding readiness.
          </p>
        </div>
        <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
          Current proof event: <span className="font-semibold">53-school hockey tournament</span>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="rounded-xl bg-cyan-400/10 p-3 text-cyan-200">
                <metric.icon className="h-5 w-5" />
              </div>
              <ShieldCheck className="h-5 w-5 text-emerald-300/80" />
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{metric.label}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{metric.value}</p>
            <p className="mt-2 text-sm text-slate-300">{metric.detail}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Tournament Impact Tracker</h2>
              <p className="text-sm text-slate-400">First version is static proof capture. Supabase wiring comes next.</p>
            </div>
            <HeartPulse className="h-5 w-5 text-cyan-200" />
          </div>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-white/[0.06] text-xs uppercase tracking-[0.18em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Tournament</th>
                  <th className="px-4 py-3">Sport</th>
                  <th className="px-4 py-3">Schools</th>
                  <th className="px-4 py-3">Reports</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-slate-200">
                <tr>
                  <td className="px-4 py-4 font-medium text-white">Primary Schools Hockey Tournament</td>
                  <td className="px-4 py-4">Hockey</td>
                  <td className="px-4 py-4">53</td>
                  <td className="px-4 py-4">PDF reports emailed</td>
                  <td className="px-4 py-4"><span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">Launch week</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl">
          <h2 className="mb-4 text-lg font-semibold text-white">Investor Pack Checklist</h2>
          <div className="space-y-3">
            {checklist.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 px-4 py-3">
                <span className="text-sm text-slate-200">{item.name}</span>
                <span className={`rounded-full border px-3 py-1 text-xs ${statusClass(item.status)}`}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl">
          <h2 className="mb-4 text-lg font-semibold text-white">International Funding Pipeline</h2>
          <div className="space-y-3">
            {fundingOpportunities.map((opportunity) => (
              <div key={opportunity.name} className="rounded-xl border border-white/10 bg-black/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{opportunity.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{opportunity.type} · {opportunity.region}</p>
                  </div>
                  <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">Fit: {opportunity.fit}</span>
                </div>
                <p className="mt-3 text-sm text-slate-300">Status: {opportunity.status}</p>
                <p className="mt-1 text-sm text-slate-400">Next: {opportunity.next}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl">
          <h2 className="mb-4 text-lg font-semibold text-white">Sponsor-a-School Packages</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {sponsorPackages.map((pkg) => (
              <div key={pkg.title} className="rounded-xl border border-white/10 bg-black/10 p-4">
                <Users className="mb-3 h-5 w-5 text-cyan-200" />
                <p className="font-medium text-white">{pkg.title}</p>
                <p className="mt-2 text-sm text-slate-300">Schools: {pkg.schools}</p>
                <p className="text-sm text-slate-300">Estimated learners: {pkg.learners}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">{pkg.use}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
