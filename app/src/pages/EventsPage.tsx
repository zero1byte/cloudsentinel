import { useInfiniteQuery } from '@tanstack/react-query'
import { Fragment, useMemo, useState, type FormEvent } from 'react'
import { Braces, CircleCheck, ChevronDown, ChevronUp, ListFilter, ScrollText, SlidersHorizontal } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { getCloudTrailEvents } from '../api/client'

const DEFAULT_LIMIT = 25
const MAX_LIMIT = 50

function getLimit(value: string | null) {
  const limit = Number(value)
  return Number.isInteger(limit) && limit >= 1 && limit <= MAX_LIMIT ? limit : DEFAULT_LIMIT
}

function eventDetail(event: { CloudTrailEvent?: string }) {
  if (!event.CloudTrailEvent) return null
  try {
    return JSON.stringify(JSON.parse(event.CloudTrailEvent), null, 2)
  } catch {
    return event.CloudTrailEvent
  }
}

export function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [lookupAttribute, setLookupAttribute] = useState(searchParams.get('lookup_attribute') ?? '')
  const [startTime, setStartTime] = useState(searchParams.get('start_time') ?? '')
  const [endTime, setEndTime] = useState(searchParams.get('end_time') ?? '')
  const [limit, setLimit] = useState(String(getLimit(searchParams.get('limit'))))
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(() => new Set())
  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    const attribute = searchParams.get('lookup_attribute')
    const start = searchParams.get('start_time')
    const end = searchParams.get('end_time')
    params.set('max_results', String(getLimit(searchParams.get('limit'))))
    if (attribute) params.set('lookup_attribute', attribute)
    if (start) params.set('start_time', start)
    if (end) params.set('end_time', end)
    return params
  }, [searchParams])

  const eventsQuery = useInfiniteQuery({
    queryKey: ['cloudtrail-events', queryParams.toString()],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams(queryParams)
      if (pageParam) params.set('next_token', pageParam)
      return getCloudTrailEvents(params)
    },
    getNextPageParam: (lastPage) => lastPage.next_token ?? undefined,
  })
  const events = eventsQuery.data?.pages.flatMap((page) => page.events) ?? []

  function toggleEventDetails(eventId: string) {
    setExpandedEvents((current) => {
      const next = new Set(current)
      if (next.has(eventId)) next.delete(eventId)
      else next.add(eventId)
      return next
    })
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const params = new URLSearchParams()
    params.set('limit', String(getLimit(limit ? limit : null)))
    if (lookupAttribute.trim()) params.set('lookup_attribute', lookupAttribute.trim())
    if (startTime) params.set('start_time', new Date(startTime).toISOString())
    if (endTime) params.set('end_time', new Date(endTime).toISOString())
    setSearchParams(params)
  }

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">AWS ACTIVITY</p>
          <h1>CloudTrail events</h1>
          <p className="page-description">Review recent activity and narrow the stream by event attributes or time.</p>
        </div>
        <span className="live-tag"><CircleCheck aria-hidden="true" /> CLOUDTRAIL</span>
      </div>

      <section className="panel filters-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">QUERY</p>
            <h2>Filter events</h2>
          </div>
          <span className="panel-icon" aria-hidden="true"><ListFilter /></span>
        </div>
        <form className="filters-form" onSubmit={handleFilterSubmit}>
          <label className="lookup-filter">
            Lookup attribute
            <input
              value={lookupAttribute}
              onChange={(event) => setLookupAttribute(event.target.value)}
              placeholder="EventName=ConsoleLogin"
              aria-describedby="lookup-help"
            />
            <span className="input-hint" id="lookup-help">Use the AWS format: AttributeKey=AttributeValue.</span>
          </label>
          <label>
            From
            <input type="datetime-local" value={startTime.slice(0, 16)} onChange={(event) => setStartTime(event.target.value)} />
          </label>
          <label>
            To
            <input type="datetime-local" value={endTime.slice(0, 16)} onChange={(event) => setEndTime(event.target.value)} />
          </label>
          <label className="limit-filter">
            Results
            <select value={limit} onChange={(event) => setLimit(event.target.value)}>
              {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <button className="button button-primary filter-button" type="submit">
            <SlidersHorizontal aria-hidden="true" />
            Apply filters
          </button>
        </form>
      </section>

      <section className="panel events-panel">
        <div className="events-heading">
          <div>
            <p className="eyebrow">EVENT LOG</p>
            <h2>Recent activity</h2>
          </div>
          {eventsQuery.data && <span className="results-count">{events.length} events</span>}
        </div>
        {eventsQuery.isLoading && <p className="empty-state">Loading CloudTrail events…</p>}
        {eventsQuery.isError && <p className="form-message error" role="alert">{eventsQuery.error.message}</p>}
        {eventsQuery.data && events.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true"><ScrollText /></span>
            <strong>No events found</strong>
            <span>Try changing the filters or check your CloudTrail connection.</span>
          </div>
        )}
        {!!events.length && (
          <div className="events-table-scroll">
            <table className="events-table">
              <caption className="sr-only">CloudTrail events returned by the current filters</caption>
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Event</th>
                  <th scope="col">User</th>
                  <th scope="col">Resources</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event, index) => {
                  const details = eventDetail(event)
                  const eventKey = event.EventId ?? `${event.EventName}-${event.EventTime}-${index}`
                  const resources = event.Resources
                    ?.map((resource) => resource.ResourceName ?? resource.ResourceType)
                    .filter((name): name is string => Boolean(name))
                    .join(', ')
                  return (
                    <Fragment key={eventKey}>
                      <tr>
                        <td className="event-time-cell">{event.EventTime ? new Date(event.EventTime).toLocaleString() : 'Time unavailable'}</td>
                        <td className="event-name-cell">
                          <strong>{event.EventName ?? 'Unnamed event'}</strong>
                          {event.EventId && <span>{event.EventId}</span>}
                          {details && (
                            <button
                              className="event-json-button"
                              type="button"
                              aria-expanded={expandedEvents.has(eventKey)}
                              onClick={() => toggleEventDetails(eventKey)}
                            >
                              {expandedEvents.has(eventKey) ? <ChevronUp aria-hidden="true" /> : <Braces aria-hidden="true" />}
                              {expandedEvents.has(eventKey) ? 'Hide JSON' : 'View JSON'}
                            </button>
                          )}
                        </td>
                        <td>{event.Username ?? 'Unknown'}</td>
                        <td className="event-resource-cell">{resources || '—'}</td>
                      </tr>
                      {details && expandedEvents.has(eventKey) && (
                        <tr className="event-json-row" key={`${eventKey}-json`}>
                          <td colSpan={4}>
                            <pre className="event-json-content">{details}</pre>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {eventsQuery.hasNextPage && (
          <div className="load-more-area">
            <button
              className="button button-secondary"
              type="button"
              onClick={() => void eventsQuery.fetchNextPage()}
              disabled={eventsQuery.isFetchingNextPage}
            >
              <ChevronDown aria-hidden="true" />
              {eventsQuery.isFetchingNextPage ? 'Loading more…' : 'Load more events'}
            </button>
          </div>
        )}
        {events.length > 0 && !eventsQuery.hasNextPage && (
          <p className="end-of-events">You’ve reached the end of the available events.</p>
        )}
      </section>
    </section>
  )
}
