import { createFileRoute } from "@tanstack/react-router";
import { Camera, Cloud, FileText, Search, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_app/client-cards")({ component: ClientCardsPage });

type VisitRecord = {
  date: string;
  stylist: string;
  service: string;
  productsUsed: string;
  price: string;
};

const SAMPLE_VISITS: VisitRecord[] = [
  {
    date: "2026-06-12",
    stylist: "Nick Ashley",
    service: "Root tint / grey coverage",
    productsUsed: "60 g colour + 90 g activator, 20 volume, 35 min process",
    price: "R850",
  },
  {
    date: "2026-05-01",
    stylist: "Nick Ashley",
    service: "Cut & blow",
    productsUsed: "No colour used. Aftercare retail recommended.",
    price: "R420",
  },
];

function ClientCardsPage() {
  return (
    <div className="relative left-1/2 w-[min(1280px,calc(100vw-2rem))] -translate-x-1/2 space-y-6 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-cyan-300/80">
            Client Memory Engine
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Digital Client Cards
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Replace paper salon cards with searchable cloud records. Scan the old card, review the AI extraction, then build the client history from there.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-300"
        >
          <Camera className="h-4 w-4" />
          Scan paper card
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ProcessCard
          icon={<Camera className="h-5 w-5" />}
          title="1. Capture"
          text="Take a photo of the paper card or upload an existing image."
        />
        <ProcessCard
          icon={<Sparkles className="h-5 w-5" />}
          title="2. Extract"
          text="AI reads client details, allergies, hair info, services and notes."
        />
        <ProcessCard
          icon={<Cloud className="h-5 w-5" />}
          title="3. Confirm"
          text="The stylist checks the result before it becomes the official digital card."
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-950">Paper card scan</h2>
              <p className="text-sm text-slate-600">MVP placeholder. OCR and image storage come next.</p>
            </div>
          </div>

          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-cyan-700 shadow-sm">
              <Camera className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-black text-slate-950">Drop card image here</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
              The real version will accept a phone camera photo of the salon card and extract the card into editable fields.
            </p>
            <button className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
              Upload image
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>Important:</strong> AI extraction must never auto-save as truth. The stylist reviews and confirms every field first.
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-950">Review digital client card</h2>
              <p className="text-sm text-slate-600">Example of what the scan should become after human confirmation.</p>
            </div>
            <button className="rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-300">
              Save card
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Client name" value="Sarah Smith" />
            <Field label="Phone" value="082 000 0000" />
            <Field label="Email" value="sarah@example.com" />
            <Field label="Preferred stylist" value="Nick Ashley" />
            <Field label="Allergies" value="None recorded" />
            <Field label="Hair porosity" value="Normal" />
            <Field label="Hair texture" value="Medium" />
            <Field label="Recommended retail" value="Aftercare shampoo + conditioner" />
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-3 text-sm font-black text-slate-950">What was done last time</h3>
            <div className="space-y-3">
              {SAMPLE_VISITS.map((visit) => (
                <div key={`${visit.date}-${visit.service}`} className="rounded-xl bg-white p-3 shadow-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-bold text-slate-950">{visit.service}</p>
                    <p className="font-bold text-emerald-700">{visit.price}</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{visit.date} · {visit.stylist}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{visit.productsUsed}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-950">Searchable cloud cards</h2>
            <p className="text-sm text-slate-600">The stylist should find the full client history by name or phone number before the client sits down.</p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none ring-cyan-200 transition focus:border-cyan-400 focus:ring-4"
              placeholder="Search by client name or phone"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function ProcessCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">{icon}</div>
      <h2 className="text-sm font-black text-slate-950">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <input className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none ring-cyan-200 transition focus:border-cyan-400 focus:ring-4" value={value} readOnly />
    </label>
  );
}
