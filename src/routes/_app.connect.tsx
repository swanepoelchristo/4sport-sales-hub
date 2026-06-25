import { createFileRoute } from "@tanstack/react-router";
import { Bot, CheckCircle2, Clock, MessageCircle, PlugZap, ShieldCheck, Sparkles, Webhook } from "lucide-react";

export const Route = createFileRoute("/_app/connect")({ component: MilkBoxConnectPage });

type HealthCheck = {
  name: string;
  status: "ready" | "pending" | "blocked";
  detail: string;
};

const HEALTH_CHECKS: HealthCheck[] = [
  {
    name: "Business profile",
    status: "pending",
    detail: "Business name, industry and active WhatsApp number must be confirmed.",
  },
  {
    name: "Webhook receiver",
    status: "pending",
    detail: "Real Meta webhook will be connected after the simulator flow is stable.",
  },
  {
    name: "Message storage",
    status: "ready",
    detail: "Inbound messages should be stored before any AI action happens.",
  },
  {
    name: "AI assistant rules",
    status: "pending",
    detail: "Assistant must know when to answer, when to draft, and when to escalate.",
  },
  {
    name: "24-hour service window",
    status: "ready",
    detail: "Customer-initiated messages should be handled inside the free service window where possible.",
  },
  {
    name: "Human approval",
    status: "ready",
    detail: "Early MVP should draft replies before auto-sending anything.",
  },
];

function MilkBoxConnectPage() {
  return (
    <div className="relative left-1/2 w-[min(1280px,calc(100vw-2rem))] -translate-x-1/2 space-y-6 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-cyan-300/80">
            MilkBox Connect
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
            WhatsApp Control Room
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Standalone WhatsApp connector for salons first, then 4SPORT and other MilkBox businesses later.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-100 shadow-lg shadow-cyan-950/30">
          Meta connection: simulator mode
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MiniStat icon={<MessageCircle className="h-5 w-5" />} label="Incoming messages" value="12" hint="Simulator queue" />
        <MiniStat icon={<Clock className="h-5 w-5" />} label="Inside 24h window" value="9" hint="Low-cost service replies" />
        <MiniStat icon={<Bot className="h-5 w-5" />} label="AI draft replies" value="7" hint="Human approval first" />
        <MiniStat icon={<PlugZap className="h-5 w-5" />} label="Live webhook" value="Off" hint="Not connected yet" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-950">Incoming message simulator</h2>
              <p className="text-sm text-slate-600">Build the flow before fighting Meta setup again. Dragon stays in its cave for now.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">Sarah Smith</p>
                  <p className="text-xs text-slate-500">+27 82 000 0000 · received 12 minutes ago</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  inside 24h window
                </span>
              </div>
              <p className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm leading-6 text-slate-700">
                Hi Adele, can you fit me in tomorrow morning for a cut and colour? Short hair, same as last time.
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-cyan-800">
                <Sparkles className="h-4 w-4" />
                <p className="text-sm font-black">AI suggested action</p>
              </div>
              <p className="text-sm leading-6 text-cyan-950">
                Check Sarah's client card for previous colour formula, then check tomorrow morning availability and service duration for Cut & Colour.
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="mb-2 text-sm font-black text-slate-950">Draft reply</p>
              <textarea
                className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 outline-none ring-cyan-200 transition focus:border-cyan-400 focus:ring-4"
                defaultValue="Hi Sarah 👋 I can check that for you. I am looking at your previous colour card and Adele's available times for tomorrow morning."
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-300">
                  Approve draft
                </button>
                <button className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800">
                  Escalate to stylist
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
              <Webhook className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-950">Connector health</h2>
              <p className="text-sm text-slate-600">One checklist for every business using WhatsApp.</p>
            </div>
          </div>

          <div className="space-y-3">
            {HEALTH_CHECKS.map((check) => (
              <HealthRow key={check.name} check={check} />
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-950">Standalone connector principle</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              The salon app should not own the WhatsApp pain. MilkBox Connect receives messages, stores them, checks the service window, drafts a safe action, and passes clean events into whichever business app needs them.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
            Build backwards: simulator → inbox → AI draft → diagnostics → Meta
          </div>
        </div>
      </section>
    </div>
  );
}

function MiniStat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">{icon}</div>
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function HealthRow({ check }: { check: HealthCheck }) {
  const tone = check.status === "ready" ? "text-emerald-700 bg-emerald-50" : check.status === "blocked" ? "text-red-700 bg-red-50" : "text-amber-700 bg-amber-50";
  const label = check.status === "ready" ? "Ready" : check.status === "blocked" ? "Blocked" : "Pending";

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl ${tone}`}>
          {check.status === "ready" ? <CheckCircle2 className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-black text-slate-950">{check.name}</p>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${tone}`}>{label}</span>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">{check.detail}</p>
        </div>
      </div>
    </div>
  );
}
