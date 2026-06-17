import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms-and-conditions")({
  component: TermsAndConditions,
});

function PageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
        <Link to="/login" className="text-sm text-cyan-400 hover:text-cyan-300">
          ← Back to 4SPORT
        </Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">{title}</h1>
        <div className="mt-6 space-y-6 text-sm leading-7 text-slate-300">{children}</div>
      </div>
    </main>
  );
}

function TermsAndConditions() {
  return (
    <PageShell title="Terms and Conditions">
      <p>
        These Terms and Conditions apply to the use of the 4SPORT platform, website, dashboards, and related services.
        By using 4SPORT, you agree to use the platform responsibly and only for lawful sporting, school, club, event,
        administrative, and communication purposes.
      </p>

      <section>
        <h2 className="text-xl font-semibold text-white">1. About 4SPORT</h2>
        <p>
          4SPORT provides digital tools for sports administration, including athlete, guardian, coach, school, team,
          event, communication, consent, and operational management. Our goal is to make sports administration easier,
          safer, and more organised.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">2. User Responsibilities</h2>
        <p>
          Users must provide accurate information, keep their account details secure, and only access information they
          are authorised to view. Users may not misuse the platform, interfere with the service, or attempt to access
          another user's information.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">3. Account Security</h2>
        <p>
          Login details, passwords, OTPs, access codes, and verification codes must be kept private. Users may not share
          their login credentials with another person. If you believe your account has been accessed without permission,
          you must notify 4SPORT immediately.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">4. Screen Sharing and Remote Access</h2>
        <p>
          Because 4SPORT may display personal, athlete, guardian, team, medical, consent, and school-related information,
          users may not share their screen, record their screen, give remote access to their device, or allow an
          unauthorised person to view platform information.
        </p>
        <p>
          Screen sharing is only allowed when clearly requested and approved by an official 4SPORT team member for
          support or troubleshooting.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">5. Data Protection</h2>
        <p>
          4SPORT works with information that may include personal and operational data. We use reasonable technical and
          organisational safeguards to protect this information. The platform is hosted using secure cloud services,
          including Supabase infrastructure, with database access controls and security measures in place.
        </p>
        <p>
          No online system can promise absolute security, but we take data protection seriously and expect every user to
          do the same.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">6. Acceptable Use</h2>
        <p>
          Users may not upload harmful content, attempt unauthorised access, copy or distribute confidential information,
          share private athlete or guardian information without authority, or use the platform for unlawful purposes.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">7. Payments</h2>
        <p>
          Where paid services are offered, payments must be made through the approved payment channels provided by
          4SPORT. Pricing, billing cycles, and service details will be shown before purchase where applicable.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">8. Limitation of Liability</h2>
        <p>
          4SPORT aims to provide a reliable service, but we cannot guarantee that the platform will always be available
          without interruption. To the extent allowed by law, 4SPORT is not responsible for indirect loss, loss of data,
          loss of profit, or damages caused by misuse of the platform.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white">9. Contact</h2>
        <p>
          For support, privacy, security, or account questions, please contact us at support@4sport.co.za.
        </p>
      </section>
    </PageShell>
  );
}
