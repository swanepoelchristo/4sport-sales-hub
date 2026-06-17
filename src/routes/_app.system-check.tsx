import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  MessageCircle,
  Plus,
  UserCheck,
  CheckCircle2,
  ExternalLink,
  Inbox,
  FlaskConical,
  Phone,
  Clock,
  Tags,
  Headset,
} from "lucide-react";

type InboxItem = {
  id: string;
  from_number: string;
  sender_name: string;
  message_text: string;
  created_at: string;
  category?: string;
  status?: string;
  linked_support_ticket_id?: string | null;
  outbound_confirmation_status?: string | null;
};

export const Route = createFileRoute("/_app/system-check")({
  component: WhatsAppInboxPage,
});

function fmtDateTime(value: string) {
  return new Date(value).toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function WhatsAppInboxPage() {
  const [messages, setMessages] = useState<InboxItem[]>([]);
  const [testName, setTestName] = useState("Test Club Manager");
  const [testNumber, setTestNumber] = useState("27821234567");
  const [testMessage, setTestMessage] = useState("We need help on game day. No technical person is next to the field.");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadMessages() {
    try {
      const res = await fetch("/api/whatsapp-inbox");
      const data = await res.json();
      setMessages(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadMessages();
  }, []);

  async function createTestMessage() {
    await fetch("/api/whatsapp-inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "create_test",
        sender_name: testName,
        from_number: testNumber,
        message_text: testMessage,
      }),
    });

    await loadMessages();
  }

  async function updateMessage(id: string, patch: Partial<InboxItem>) {
    await fetch("/api/whatsapp-inbox", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, patch }),
    });

    await loadMessages();
  }

  async function createSupportTicket(msg: InboxItem) {
    setBusyId(msg.id);

    try {
      const res = await fetch("/api/whatsapp-inbox", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "create_support_ticket",
          message: msg,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Could not create support ticket");
        return;
      }

      await loadMessages();
    } finally {
      setBusyId(null);
    }
  }

  const newCount = useMemo(
    () => messages.filter((m) => (m.status || "New") === "New").length,
    [messages],
  );

  const assignedCount = useMemo(
    () => messages.filter((m) => (m.status || "") === "Assigned").length,
    [messages],
  );

  const handledCount = useMemo(
    () => messages.filter((m) => (m.status || "") === "Handled").length,
    [messages],
  );

  return (
    <div className="relative left-1/2 w-[min(1280px,calc(100vw-2rem))] -translate-x-1/2 space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-cyan-300/80">
            4SPORT Sales Hub
          </p>

          <h1 className="font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
            WhatsApp Inbox
          </h1>

          <p className="mt-2 text-sm text-slate-300">
            Human triage inbox. No chatbot automation.
          </p>
        </div>

        <button
          type="button"
          onClick={loadMessages}
          className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-100 shadow-lg shadow-cyan-950/30 transition hover:border-cyan-300 hover:bg-cyan-400/15"
        >
          <Inbox className="h-4 w-4" />
          Refresh inbox
        </button>
      </div>

      {/* Guide */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-cyan-950/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-100 bg-cyan-50 text-xl">
              💬
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-950">How to use this page</h2>
              <p className="text-sm text-slate-600">
                Review incoming WhatsApp messages and route them to the right human workflow.
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-600">
            WhatsApp guide
          </span>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-3">
          <InfoBox
            icon="🎧"
            title="Support triage"
            text="Use Assign Support to create a support ticket from a WhatsApp message."
          />

          <InfoBox
            icon="🧑‍💼"
            title="Rep follow-up"
            text="Use Assign Rep when the message is a lead or sales conversation."
          />

          <InfoBox
            icon="✅"
            title="Close handled items"
            text="Mark messages as resolved once a human has handled the request."
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <MiniStat icon={<MessageCircle className="h-5 w-5" />} label="Messages" value={messages.length} tone="info" />
        <MiniStat icon={<Inbox className="h-5 w-5" />} label="New" value={newCount} tone="warning" />
        <MiniStat icon={<UserCheck className="h-5 w-5" />} label="Assigned" value={assignedCount} tone="info" />
        <MiniStat icon={<CheckCircle2 className="h-5 w-5" />} label="Handled" value={handledCount} tone="success" />
      </div>

      {/* Manual test message */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
            <FlaskConical className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-display text-lg font-semibold text-slate-950">Manual WhatsApp test message</h2>
            <p className="text-sm text-slate-600">Create a safe test inbox item without touching the real webhook.</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Sender name</span>
            <input
              className={inp}
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">WhatsApp number</span>
            <input
              className={inp}
              value={testNumber}
              onChange={(e) => setTestNumber(e.target.value)}
            />
          </label>
        </div>

        <label className="mt-3 block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Message</span>
          <textarea
            className={`${inp} min-h-24`}
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
          />
        </label>

        <button
          type="button"
          onClick={createTestMessage}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300"
        >
          <Plus className="h-4 w-4" />
          Add test message
        </button>
      </section>

      {/* Inbox queue */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
              <Inbox className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-slate-950">Inbox queue</h2>
              <p className="text-sm text-slate-600">
                Showing {messages.length} WhatsApp message{messages.length === 1 ? "" : "s"}.
              </p>
            </div>
          </div>
        </div>

        {messages.length === 0 ? (
          <EmptyPanel icon="💬" title="No WhatsApp messages yet." subtitle="Incoming messages and test messages will appear here." />
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <article
                key={msg.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-cyan-950/10 transition hover:border-cyan-300 hover:shadow-2xl"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
                      <MessageCircle className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="font-semibold text-slate-950">
                        {msg.sender_name || "Unknown"}
                      </p>

                      <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="h-4 w-4 text-cyan-500" />
                        {msg.from_number}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Clock className="h-4 w-4" />
                    {fmtDateTime(msg.created_at)}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                  {msg.message_text}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 font-bold uppercase tracking-wider text-cyan-700">
                    <Tags className="h-3 w-3" />
                    {msg.category || "Unsorted"}
                  </span>

                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-bold uppercase tracking-wider text-slate-600">
                    {msg.status || "New"}
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => createSupportTicket(msg)}
                    disabled={busyId === msg.id}
                    className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
                  >
                    <Headset className="h-4 w-4" />
                    {busyId === msg.id ? "Creating..." : "Assign Support"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updateMessage(msg.id, {
                        category: "Rep",
                        status: "Assigned",
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50"
                  >
                    <UserCheck className="h-4 w-4" />
                    Assign Rep
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updateMessage(msg.id, {
                        status: "Handled",
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Resolved
                  </button>

                  <a
                    href={`/whatsapp/thread/${msg.from_number}`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View thread
                  </a>

                    {msg.linked_support_ticket_id && (
                      <a
                        href="/support"
                        className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-bold text-cyan-700 transition hover:border-cyan-300 hover:bg-cyan-100"
                      >
                        <Headset className="h-4 w-4" />
                        Support Ticket
                      </a>
                    )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const inp =
  "mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100";

function InfoBox({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-xl">
        {icon}
      </div>

      <p className="font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  tone = "info",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone?: "info" | "success" | "warning";
}) {
  const toneClass = {
    info: "bg-cyan-50 text-cyan-600",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
  }[tone];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-cyan-950/20">
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass}`}>
        {icon}
      </div>

      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function EmptyPanel({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
        {icon}
      </div>

      <p className="font-semibold text-slate-950">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
    </div>
  );
}

