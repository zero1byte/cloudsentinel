import { Clock, type LucideIcon } from 'lucide-react'

interface PlannedPageProps {
  eyebrow: string
  title: string
  description: string
  icon: LucideIcon
}

export function PlannedPage({ eyebrow, title, description, icon: Icon }: PlannedPageProps) {
  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="page-description">{description}</p>
        </div>
        <span className="planned-tag"><Clock aria-hidden="true" /> PLANNED</span>
      </div>

      <section className="panel planned-panel">
        <span className="planned-icon" aria-hidden="true"><Icon /></span>
        <div className="planned-copy">
          <p className="eyebrow">PLANNED WORKSPACE</p>
          <h2>{title} will appear here</h2>
          <p>{description}</p>
        </div>
      </section>
    </section>
  )
}
