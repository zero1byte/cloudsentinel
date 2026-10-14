import { Link } from "react-router-dom";
import { Cloud, GitMerge, Grid3x3, Bot } from "lucide-react";

const features = [
  { icon: Cloud, title: "One schema for both clouds", text: "CloudTrail, GuardDuty, Entra ID sign-ins and Azure Activity Logs are normalized into a single event format." },
  { icon: GitMerge, title: "Correlated incidents", text: "Failed logins, a login from a new IP and a new access key become one incident with a timeline, not three separate alerts." },
  { icon: Grid3x3, title: "MITRE ATT&CK mapping", text: "Every alert maps to cloud-matrix techniques, shown as a heatmap per provider." },
  { icon: Bot, title: "Grounded AI analyst", text: "Ask about an incident and get answers that cite the exact events and playbooks they came from." },
];

const steps = [
  "Multiple failed console logins",
  "Successful login from an unusual IP",
  "New access key created",
  "Sensitive storage accessed",
];

export default function Landing() {
  return (
    <main>
      <section className="mx-auto max-w-(--content-max-width) px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Turn raw AWS and Azure logs into incidents you can act on
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted">
              CloudSentinel detects attack sequences across clouds, scores their risk, and explains what happened with
              evidence you can verify.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/connect" className="rounded-md bg-brand px-4 py-2 font-medium text-brand-foreground hover:bg-brand-hover">
                Connect your clouds
              </Link>
              <Link to="/dashboard" className="rounded-md border border-border-strong px-4 py-2 font-medium hover:bg-surface-2">
                View demo dashboard
              </Link>
            </div>
          </div>

          {/* Golden-path attack sequence */}
          <ol className="rounded-xl border border-border bg-surface p-5 shadow-card">
            <li className="mb-3 text-sm text-muted">Example incident: compromised cloud account</li>
            {steps.map((s, i) => (
              <li key={s} className="flex items-start gap-3 border-t border-border py-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-severity-high-soft text-xs font-medium text-severity-high">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
            <li className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-muted">Risk score</span>
              <span className="rounded-sm bg-severity-critical-soft px-2 py-0.5 text-sm font-medium text-severity-critical">
                92 Critical
              </span>
            </li>
          </ol>
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto grid max-w-(--content-max-width) gap-4 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-lg border border-border bg-background p-5">
              <Icon className="mb-3 size-5 text-brand" aria-hidden />
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-1 text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}