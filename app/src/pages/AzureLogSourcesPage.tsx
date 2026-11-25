import { CloudCog } from 'lucide-react'
import { PlannedPage } from '../components/PlannedPage'

export function AzureLogSourcesPage() {
  return (
    <PlannedPage
      eyebrow="MICROSOFT AZURE"
      title="Azure log sources"
      description="This area is ready for the Azure services you choose to collect logs from."
      icon={CloudCog}
    />
  )
}
