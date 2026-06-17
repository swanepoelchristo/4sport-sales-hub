import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy-policy")({
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
        <Link to="/login" className="text-sm text-cyan-400 hover:text-cyan-300">
          ← Back to 4SPORT
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight">Privacy Policy</h1>

        <div className="mt-6 space-y-6 text-sm leading-7 text-slate-300">
          <p>
            4SPORT respects your privacy. We collect and process information only to provide and improve our sports
            administration, communication, event, consent, and management services.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-white">1. Information We May Collect</h2>
            <p>
              We may collect account details, contact information, athlete information, guardian information, school or
              club information, team and event details, consent records, support messages, and payment-related records
              where applicable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">2. How We Use Information</h2>
            <p>
              We use information to operate the platform, manage sports participation, support users, process payments,
              improve our services, communicate important updates, and meet legal or administrative requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">3. Protection of Information</h2>
            <p>
              4SPORT uses reasonable technical and organisational safeguards to protect information against unauthorised
              access, loss, misuse, alteration, or disclosure. Our database infrastructure is hosted on secure cloud
              services, including Supabase, with access control and security measures in place.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">4. Sharing of Information</h2>
            <p>
              We do not sell personal information. Information may be shared only where needed to provide the service,
              support the user, comply with the law, process payments, or work with approved service providers who help
              us operate 4SPORT.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">5. User Security Duties</h2>
            <p>
              Users must keep passwords, OTPs, access codes, and account details private. Users may not share screens,
              allow remote access, or show private platform information to unauthorised people unless 4SPORT has clearly
              authorised it for support purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">6. Children and Athlete Information</h2>
            <p>
              Because 4SPORT may process information relating to minor athletes, we expect guardians, schools, clubs,
              coaches, and authorised users to treat this information with extra care and only use it for proper sporting
              and administrative purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">7. Data Retention</h2>
            <p>
              We keep information only for as long as reasonably needed for platform operations, legal requirements,
              support, record keeping, and legitimate business purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">8. Your Rights</h2>
            <p>
              Users may contact us to request access to, correction of, or deletion of their personal information,
              subject to legal, safety, operational, and record-keeping requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">9. Contact</h2>
            <p>
              For privacy questions or data protection requests, contact us at support@4sport.co.za.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
