type Severity = "critical" | "high" | "medium" | "low";
type Cloud = "AWS" | "Azure";

interface Incident {
  id: string;
  title: string;
  cloud: Cloud;
  severity: Severity;
  risk: number;
  technique: string;
  time: string;
}

// Placeholder data: replace with TanStack Query calls to the FastAPI endpoints.
const kpis = [
  { label: "Events (24h)", value: "128,402" },
  { label: "Suspicious activities", value: "214" },
  { label: "Open incidents", value: "7" },
  { label: "Critical incidents", value: "2" },
];

const incidents: Incident[] = [
  { id: "INC-1042", title: "Brute force, then login from new IP, then new access key", cloud: "AWS", severity: "critical", risk: 92, technique: "T1110, T1078.004, T1098.001", time: "10 min ago" },
  { id: "INC-1041", title: "Failed sign-ins, then new service principal secret", cloud: "Azure", severity: "high", risk: 78, technique: "T1110, T1098.001", time: "1 h ago" },
  { id: "INC-1039", title: "CloudTrail logging stopped", cloud: "AWS", severity: "high", risk: 71, technique: "T1562.008", time: "3 h ago" },
  { id: "INC-1036", title: "Key Vault read spike from unfamiliar location", cloud: "Azure", severity: "medium", risk: 54, technique: "T1078.004", time: "6 h ago" },
];

const sevStyle: Record<Severity, string> = {
  critical: "bg-severity-critical-soft text-severity-critical",
  high: "bg-severity-high-soft text-severity-high",
  medium: "bg-severity-medium-soft text-severity-medium",
  low: "bg-severity-low-soft text-severity-low",
};

export default function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Overview</h1>
      <p className="mt-1 text-muted">Sample data. Connect your clouds to see live incidents.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg border border-border bg-surface p-4 shadow-card">
            <p className="text-sm text-muted">{k.label}</p>
            <p className="mt-1 text-3xl font-semibold">{k.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-semibold">Recent incidents</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-160 text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="p-3 font-medium">Incident</th>
                <th className="p-3 font-medium">Cloud</th>
                <th className="p-3 font-medium">Severity</th>
                <th className="p-3 font-medium">Risk</th>
                <th className="p-3 font-medium">ATT&amp;CK</th>
                <th className="p-3 font-medium">Detected</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((i) => (
                <tr key={i.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                  <td className="p-3">
                    <div className="font-medium">{i.title}</div>
                    <code className="text-subtle">{i.id}</code>
                  </td>
                  <td className={`p-3 font-medium ${i.cloud === "AWS" ? "text-aws" : "text-azure"}`}>{i.cloud}</td>
                  <td className="p-3">
                    <span className={`rounded-sm px-2 py-0.5 capitalize ${sevStyle[i.severity]}`}>{i.severity}</span>
                  </td>
                  <td className="p-3 font-mono">{i.risk}</td>
                  <td className="p-3"><code className="text-muted">{i.technique}</code></td>
                  <td className="p-3 text-muted">{i.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}