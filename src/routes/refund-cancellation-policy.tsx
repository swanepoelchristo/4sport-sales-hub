import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/refund-cancellation-policy")({
  component: RefundCancellationPolicy,
});

function RefundCancellationPolicy() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
        <Link to="/login" className="text-sm text-cyan-400 hover:text-cyan-300">
          ← Back to 4SPORT
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight">Refund and Cancellation Policy</h1>

        <div className="mt-6 space-y-6 text-sm leading-7 text-slate-300">
          <section>
            <h2 className="text-xl font-semibold text-white">1. 30-Day Money-Back Guarantee</h2>
            <p>
              4SPORT offers a 30-day money-back guarantee on eligible first-time subscription purchases. If you are not
              satisfied with the service within 30 days of your initial purchase, you may contact us to request a refund.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">2. Refund Requests</h2>
            <p>
              Refund requests must be sent to support@4sport.co.za with your account details, payment reference, and the
              reason for the request. We will review the request and respond as soon as reasonably possible.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">3. Items Not Covered</h2>
            <p>
              The 30-day guarantee does not apply to custom development work, once-off setup fees, consulting services,
              third-party costs, or services already fully delivered outside a standard subscription unless agreed in
              writing by 4SPORT.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">4. Subscription Cancellation</h2>
            <p>
              Customers may cancel their subscription at any time by contacting 4SPORT. Cancellation stops future billing
              but does not automatically create a refund unless the request qualifies under the 30-day money-back
              guarantee.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">5. Processing Time</h2>
            <p>
              Approved refunds will be processed through the original payment method where possible. Bank and payment
              provider processing times may vary.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">6. Account Access After Cancellation</h2>
            <p>
              After cancellation, access to paid features may continue until the end of the current paid period unless
              otherwise agreed. 4SPORT may limit or remove access where required for security, non-payment, misuse, or
              legal reasons.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">7. Contact</h2>
            <p>
              For refund or cancellation questions, contact support@4sport.co.za.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
