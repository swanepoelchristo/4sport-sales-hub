import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/services")({ component: ServicesPage });

type ServiceRecipeItem = {
  name: string;
  planningAmount: string;
  includedAmount: string;
  extraCharge?: string;
};

type SalonService = {
  id: string;
  category: string;
  name: string;
  durationMinutes: number;
  sellingPrice: number;
  estimatedCost: number;
  recipe: ServiceRecipeItem[];
  notes: string;
};

const SERVICES: SalonService[] = [
  {
    id: "gents-cut",
    category: "Cuts",
    name: "Gents Cut",
    durationMinutes: 45,
    sellingPrice: 180,
    estimatedCost: 20,
    recipe: [],
    notes: "Simple time-based service. No material planning required.",
  },
  {
    id: "ladies-cut",
    category: "Cuts",
    name: "Ladies Cut",
    durationMinutes: 60,
    sellingPrice: 280,
    estimatedCost: 35,
    recipe: [],
    notes: "Base client service. Useful for rebooking and loyalty tracking.",
  },
  {
    id: "blow-dry",
    category: "Styling",
    name: "Blow Dry",
    durationMinutes: 45,
    sellingPrice: 220,
    estimatedCost: 25,
    recipe: [],
    notes: "Quick booking service for WhatsApp assistant automation.",
  },
  {
    id: "short-colour",
    category: "Colour",
    name: "Short Hair Colour",
    durationMinutes: 120,
    sellingPrice: 850,
    estimatedCost: 185,
    recipe: [
      {
        name: "Colour",
        planningAmount: "150 g planning recipe",
        includedAmount: "150 g included in price",
        extraCharge: "R120 per extra 10 g",
      },
      {
        name: "Activator",
        planningAmount: "150 g at 1:1 ratio",
        includedAmount: "Included with colour recipe",
      },
    ],
    notes: "Plan with grams, but do not force the stylist to measure during work. Extra usage is charged only when needed.",
  },
  {
    id: "highlights",
    category: "Colour",
    name: "Highlights",
    durationMinutes: 180,
    sellingPrice: 1250,
    estimatedCost: 320,
    recipe: [
      {
        name: "Lightener / Colour",
        planningAmount: "180 g planning recipe",
        includedAmount: "180 g included in price",
        extraCharge: "R120 per extra 10 g",
      },
      {
        name: "Activator",
        planningAmount: "180 g at 1:1 ratio",
        includedAmount: "Included with colour recipe",
      },
      {
        name: "Foils",
        planningAmount: "25 foils estimate",
        includedAmount: "Standard highlight pack",
      },
    ],
    notes: "Longer appointment with higher material risk. Good candidate for stock-aware booking checks.",
  },
  {
    id: "extension-consultation",
    category: "Extensions",
    name: "Extension Consultation",
    durationMinutes: 45,
    sellingPrice: 0,
    estimatedCost: 15,
    recipe: [],
    notes: "Free consultation. The goal is to qualify the client and quote the correct extension service.",
  },
];

function money(value: number) {
  return `R ${value.toLocaleString("en-ZA")}`;
}

function ServicesPage() {
  const totalServices = SERVICES.length;
  const colourServices = SERVICES.filter((service) => service.category === "Colour").length;
  const avgMargin = Math.round(
    SERVICES.reduce((sum, service) => {
      if (!service.sellingPrice) return sum;
      return sum + ((service.sellingPrice - service.estimatedCost) / service.sellingPrice) * 100;
    }, 0) / SERVICES.filter((service) => service.sellingPrice > 0).length,
  );

  return (
    <div className="relative left-1/2 w-[min(1280px,calc(100vw-2rem))] -translate-x-1/2 space-y-6 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-cyan-300/80">
            Service Engine
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Services & Price List
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            The salon should configure services once. The booking assistant then uses duration, price and estimated material usage to decide if a booking can be accepted.
          </p>
        </div>

        <button
          type="button"
          className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-300"
        >
          + New service
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MiniStat label="Services" value={String(totalServices)} hint="Active price-list items" />
        <MiniStat label="Colour services" value={String(colourServices)} hint="Stock-aware booking checks" />
        <MiniStat label="Avg gross margin" value={`${avgMargin}%`} hint="Estimated from recipe cost" />
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-cyan-950/30">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-base font-bold text-slate-950">How this must work in the real salon</h2>
          <p className="mt-1 text-sm text-slate-600">
            We keep grams for planning and end-of-day stock take, but we do not force stylists to behave like pastry chefs while working with a client.
          </p>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-3">
          <InfoBox title="Planning recipe" text="The AI uses grams, ratios and duration to check if the booking is possible." />
          <InfoBox title="Included amount" text="The selling price includes a standard amount. Extra usage can be charged separately." />
          <InfoBox title="End-of-day reality" text="Stock take corrects the system after the workday, without slowing down appointments." />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {SERVICES.map((service) => {
          const grossProfit = service.sellingPrice - service.estimatedCost;
          const margin = service.sellingPrice ? Math.round((grossProfit / service.sellingPrice) * 100) : 0;

          return (
            <article key={service.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-700">
                    {service.category}
                  </span>
                  <h2 className="mt-3 font-display text-xl font-bold text-slate-950">{service.name}</h2>
                  <p className="mt-1 text-sm text-slate-600">{service.notes}</p>
                </div>

                <div className="rounded-2xl bg-slate-950 px-4 py-3 text-right text-white">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Selling price</p>
                  <p className="text-2xl font-black">{service.sellingPrice ? money(service.sellingPrice) : "Free"}</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <Metric label="Duration" value={`${service.durationMinutes} min`} />
                <Metric label="Est. cost" value={money(service.estimatedCost)} />
                <Metric label="Margin" value={service.sellingPrice ? `${margin}%` : "Lead gen"} />
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-black text-slate-950">Recipe / material planning</h3>

                {service.recipe.length ? (
                  <div className="mt-3 space-y-3">
                    {service.recipe.map((item) => (
                      <div key={`${service.id}-${item.name}`} className="rounded-xl bg-white p-3 text-sm shadow-sm">
                        <div className="flex flex-wrap justify-between gap-2">
                          <p className="font-bold text-slate-950">{item.name}</p>
                          {item.extraCharge ? <p className="font-bold text-emerald-700">{item.extraCharge}</p> : null}
                        </div>
                        <p className="mt-1 text-slate-600">{item.planningAmount}</p>
                        <p className="text-xs text-slate-500">{item.includedAmount}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">No stock-sensitive recipe needed for this service.</p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25">
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function InfoBox({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-bold text-slate-950">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 text-center">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}
