import { Sparkles } from 'lucide-react'
import { PlannedPage } from '../components/PlannedPage'

export function AiInvestigationsPage() {
  return (
    <PlannedPage
      eyebrow="SECURITY INTELLIGENCE"
      title="AI investigations"
      description="A future analysis workspace for evidence-grounded incident summaries and investigation guidance based on collected logs."
      icon={Sparkles}
    />
  )
}
