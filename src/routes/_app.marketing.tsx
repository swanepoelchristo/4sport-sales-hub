import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BarChart3, Copy, Megaphone, Plus } from "lucide-react";
import { PageHeader, Section, EmptyState } from "@/components/ui-bits";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import {
  buildCampaignCode,
  buildTrackedLandingUrl,
  type MarketingAngle,
  type MarketingAudience,
  type MarketingCampaign,
  type MarketingObjective,
} from "@/lib/marketing";

export const Route = createFileRoute("/_app/marketing")({ component: MarketingPage });

const FACTORY_BASE_URL = "https://4sport.co.za";

function MarketingPage() {
  const { user } = useStore();
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [objective, setObjective] = useState<MarketingObjective>("book_demo");
  const [audience, setAudience] = useState<MarketingAudience>("principals");
  const [angle, setAngle] = useState<MarketingAngle>("administration");
  const [budget, setBudget] = useState("500");
  const [landingPath, setLandingPath] = useState("/schools");

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    let active = true;
    void (async () => {
      const { data, error } = await (supabase as any)
        .from("marketing_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (!active) return;
      if (error) {
        setMessage(`Marketing data could not be loaded: ${error.message}`);
      } else {
        setCampaigns((data || []) as MarketingCampaign[]);
      }
      setLoading(false);
    })();

    return () => { active = false; };
  }, [isAdmin]);

  const totalBudget = useMemo(
    () => campaigns.reduce((sum, campaign) => sum + Number(campaign.budget_zar || 0), 0),
    [campaigns],
  );

  if (!user) return null;
  if (!isAdmin) {
    return <PageHeader title="Not authorised" subtitle="Marketing Lab is admin only." />;
  }

  async function createCampaign() {
    const cleanName = name.trim();
    if (!cleanName) {
      setMessage("Campaign name is required.");
      return;
    }

    const budgetZar = Math.max(0, Number(budget || 0));
    const campaignCode = buildCampaignCode(cleanName);
    setSaving(true);
    setMessage("");

    const { data, error } = await (supabase as any)
      .from("marketing_campaigns")
      .insert({
        campaign_code: campaignCode,
        name: cleanName,
        objective,
        audience,
        angle,
        budget_zar: budgetZar,
        status: "draft",
        landing_path: landingPath || "/schools",
        created_by: user.auth_id,
      })
      .select("*")
      .single();

    setSaving(false);
    if (error) {
      setMessage(error.code === "23505"
        ? "A campaign with that code already exists. Change the campaign name slightly."
        : `Campaign could not be created: ${error.message}`);
      return;
    }

    setCampaigns((current) => [data as MarketingCampaign, ...current]);
    setName("");
    setMessage("Campaign created. Its tracked Factory link is ready to use in Meta Ads.");
  }

  async function copyTrackedUrl(campaign: MarketingCampaign) {
    const url = buildTrackedLandingUrl(
      FACTORY_BASE_URL,
      campaign.landing_path || "/schools",
      {
        campaign_code: campaign.campaign_code,
        creative_code: `${campaign.campaign_code}-a`,
        source: "meta",
        medium: "paid_social",
      },
    );

    try {
      await navigator.clipboard.writeText(url);
      setMessage(`Copied tracked link for ${campaign.name}.`);
    } catch {
      setMessage(url);
    }
  }

  return (
    <>
      <PageHeader
        title="Marketing Lab"
        subtitle="Create trackable 4SPORT campaigns first. AI generation and Meta automation come after attribution is proven."
      />

      {message && (
        <div className="mb-5 rounded-xl border border-border bg-secondary px-4 py-3 text-sm">
          {message}
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Metric label="Campaigns" value={String(campaigns.length)} icon={<Megaphone className="h-4 w-4" />} />
        <Metric label="Planned budget" value={`R ${totalBudget.toLocaleString("en-ZA")}`} icon={<BarChart3 className="h-4 w-4" />} />
        <Metric label="Current stage" value="Attribution" icon={<Copy className="h-4 w-4" />} />
      </div>

      <Section title="Create campaign">
        <div className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Campaign name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="School Admin August" className="w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm" />
          </Field>
          <Field label="Goal">
            <select value={objective} onChange={(e) => setObjective(e.target.value as MarketingObjective)} className="w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm">
              <option value="book_demo">Book school demos</option>
              <option value="generate_enquiry">Generate enquiries</option>
              <option value="awareness">Build awareness</option>
            </select>
          </Field>
          <Field label="Audience">
            <select value={audience} onChange={(e) => setAudience(e.target.value as MarketingAudience)} className="w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm">
              <option value="principals">Principals</option>
              <option value="heads_of_sport">Heads of Sport</option>
              <option value="coaches">Coaches</option>
              <option value="parents">Parents</option>
              <option value="mixed">Mixed</option>
            </select>
          </Field>
          <Field label="Message angle">
            <select value={angle} onChange={(e) => setAngle(e.target.value as MarketingAngle)} className="w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm">
              <option value="administration">Administration</option>
              <option value="safety">Safety</option>
              <option value="communication">Communication</option>
              <option value="fixtures">Fixtures</option>
              <option value="platform">Full platform</option>
            </select>
          </Field>
          <Field label="Budget (ZAR)">
            <input type="number" min="0" step="50" value={budget} onChange={(e) => setBudget(e.target.value)} className="w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm" />
          </Field>
          <Field label="Factory landing page">
            <select value={landingPath} onChange={(e) => setLandingPath(e.target.value)} className="w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm">
              <option value="/schools">/schools</option>
              <option value="/coaches">/coaches</option>
              <option value="/clubs">/clubs</option>
              <option value="/guardians">/guardians</option>
              <option value="/">Homepage</option>
            </select>
          </Field>
          <div className="md:col-span-2 lg:col-span-3">
            <button type="button" disabled={saving} onClick={() => void createCampaign()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              <Plus className="h-4 w-4" /> {saving ? "Creating…" : "Create tracked campaign"}
            </button>
          </div>
        </div>
      </Section>

      <Section title="Campaigns">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading campaigns…</div>
        ) : campaigns.length === 0 ? (
          <EmptyState>No marketing campaigns yet. Create the first campaign above.</EmptyState>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Campaign</th>
                  <th className="px-4 py-2 text-left">Audience</th>
                  <th className="px-4 py-2 text-left">Angle</th>
                  <th className="px-4 py-2 text-right">Budget</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-right">Tracked link</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="font-medium">{campaign.name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{campaign.campaign_code}</div>
                    </td>
                    <td className="px-4 py-3">{campaign.audience.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3">{campaign.angle}</td>
                    <td className="px-4 py-3 text-right">R {Number(campaign.budget_zar).toLocaleString("en-ZA")}</td>
                    <td className="px-4 py-3">{campaign.status}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => void copyTrackedUrl(campaign)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-semibold">
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">{icon}{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
