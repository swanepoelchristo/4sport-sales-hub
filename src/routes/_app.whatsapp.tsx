import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

type InboxItem = {
  id: string;
  from_number: string;
  sender_name: string;
  message_text: string;
  created_at: string;
  category?: string;
  status?: string;
};

export const Route = createFileRoute("/_app/whatsapp")({
  component: WhatsAppInboxPage,
});

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

  return (
    <div>
      <h1 className="font-display text-3xl uppercase tracking-wider brand-gradient-text">
        WhatsApp Inbox
      </h1>

      <p className="mt-2 text-muted-foreground">
        Human triage inbox. No chatbot automation.
      </p>

      <div className="mt-6 rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold">Manual WhatsApp test message</h2>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input className="rounded-lg border border-border bg-secondary px-3 py-2" value={testName} onChange={(e) => setTestName(e.target.value)} />
          <input className="rounded-lg border border-border bg-secondary px-3 py-2" value={testNumber} onChange={(e) => setTestNumber(e.target.value)} />
        </div>

        <textarea className="mt-3 w-full rounded-lg border border-border bg-secondary px-3 py-2" value={testMessage} onChange={(e) => setTestMessage(e.target.value)} />

        <button onClick={createTestMessage} className="mt-3 rounded-lg border px-4 py-2 text-sm">
          Add test message
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">
                  {msg.sender_name || "Unknown"}
                </div>

                <div className="text-sm text-muted-foreground">
                  {msg.from_number}
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                {new Date(msg.created_at).toLocaleString()}
              </div>
            </div>

            <div className="mt-4 text-sm">
              {msg.message_text}
            </div>

            <div className="mt-3 flex gap-2 text-xs">
              <span className="rounded-full border px-2 py-1">
                {msg.category || "Unsorted"}
              </span>

              <span className="rounded-full border px-2 py-1">
                {msg.status || "New"}
              </span>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => createSupportTicket(msg)}
                disabled={busyId === msg.id}
                className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
              >
                {busyId === msg.id ? "Creating..." : "Assign Support"}
              </button>

              <button
                onClick={() =>
                  updateMessage(msg.id, {
                    category: "Rep",
                    status: "Assigned",
                  })
                }
                className="rounded-lg border px-3 py-1 text-sm"
              >
                Assign Rep
              </button>

              <button
                onClick={() =>
                  updateMessage(msg.id, {
                    status: "Handled",
                  })
                }
                className="rounded-lg border px-3 py-1 text-sm"
              >
                Resolved
              </button>

              <a
                href={`/whatsapp/thread/${msg.from_number}`}
                className="rounded-lg border px-3 py-1 text-sm"
              >
                View thread
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
