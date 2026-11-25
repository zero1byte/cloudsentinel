import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  Braces,
  ChevronDown,
  CircleCheck,
  HardDrive,
  LoaderCircle,
  ListFilter,
  ScrollText,
  SlidersHorizontal,
} from 'lucide-react'
import { Fragment, useMemo, useState, type FormEvent } from 'react'
import {
  getS3BucketLogContent,
  getS3BucketLogs,
  getS3Buckets,
  type S3LogObject,
} from '../api/client'

const LOGS_PAGE_SIZE = 50
const CONTENT_PAGE_SIZE = 100

interface LogFilters {
  prefix: string
  region: string
  date: string
  limit: number
  includeDigest: boolean
}

const DEFAULT_FILTERS: LogFilters = {
  prefix: '',
  region: '',
  date: '',
  limit: LOGS_PAGE_SIZE,
  includeDigest: false,
}

function formatObjectDate(value?: string) {
  if (!value) return '—'
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? value : new Date(timestamp).toLocaleString()
}

function formatLogDate(value?: string) {
  if (!value) return '—'
  const timestamp = Date.parse(`${value}T00:00:00`)
  return Number.isNaN(timestamp) ? value : new Date(timestamp).toLocaleDateString()
}

function formatObjectSize(size?: number) {
  if (size === undefined) return '—'
  if (size < 1024) return `${size} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = size / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`
}

function formatSource(source: string) {
  if (source.toLowerCase() === 'vpcflowlogs') return 'VPC Flow Logs'
  return source.replaceAll('-', ' ')
}

export function S3AccessLogsPage() {
  const [selectedBucket, setSelectedBucket] = useState('')
  const [selectedSource, setSelectedSource] = useState('')
  const [draftFilters, setDraftFilters] = useState<LogFilters>(DEFAULT_FILTERS)
  const [filters, setFilters] = useState<LogFilters>(DEFAULT_FILTERS)
  const [selectedLog, setSelectedLog] = useState<S3LogObject | null>(null)
  const bucketsQuery = useQuery({ queryKey: ['s3-buckets'], queryFn: getS3Buckets })
  const facetsQuery = useQuery({
    queryKey: ['s3-bucket-log-facets', selectedBucket],
    queryFn: () => getS3BucketLogs(
      selectedBucket,
      new URLSearchParams({ include_digest: 'true', limit: '500' }),
    ),
    enabled: Boolean(selectedBucket),
    staleTime: 30_000,
  })
  const logsQuery = useInfiniteQuery({
    queryKey: [
      's3-bucket-logs',
      selectedBucket,
      selectedSource,
      filters.prefix,
      filters.region,
      filters.date,
      filters.limit,
      filters.includeDigest,
    ],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({
        offset: String(pageParam),
        limit: String(filters.limit),
        include_digest: String(filters.includeDigest),
      })
      if (selectedSource) params.set('source', selectedSource)
      if (filters.prefix) params.set('prefix', filters.prefix)
      if (filters.region) params.set('region', filters.region)
      if (filters.date) params.set('date', filters.date)
      return getS3BucketLogs(selectedBucket, params)
    },
    getNextPageParam: (lastPage) => (
      lastPage.has_more ? lastPage.offset + lastPage.limit : undefined
    ),
    enabled: Boolean(selectedBucket),
  })
  const contentQuery = useInfiniteQuery({
    queryKey: ['s3-bucket-log-content', selectedBucket, selectedLog?.key],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => getS3BucketLogContent(
      selectedBucket,
      selectedLog?.key ?? '',
      pageParam,
      CONTENT_PAGE_SIZE,
    ),
    getNextPageParam: (lastPage) => (
      lastPage.offset + lastPage.records.length < lastPage.total
        ? lastPage.offset + lastPage.records.length
        : undefined
    ),
    enabled: Boolean(selectedBucket && selectedLog),
  })
  const buckets = bucketsQuery.data ?? []
  const objects = logsQuery.data?.pages.flatMap((page) => page.items) ?? []
  const totalObjects = logsQuery.data?.pages[0]?.total ?? 0
  const availableSources = useMemo(() => {
    const sources = [...new Set(facetsQuery.data?.items.map((item) => item.source) ?? [])]
    return sources.sort((left, right) => left.localeCompare(right))
  }, [facetsQuery.data])
  const availableRegions = useMemo(() => {
    const regions = [...new Set(
      facetsQuery.data?.items.map((item) => item.region).filter((region): region is string => Boolean(region)) ?? [],
    )]
    return regions.sort((left, right) => left.localeCompare(right))
  }, [facetsQuery.data])
  const records = contentQuery.data?.pages.flatMap((page) => page.records) ?? []

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFilters({ ...draftFilters, prefix: draftFilters.prefix.trim() })
    setSelectedLog(null)
  }

  function selectSource(source: string) {
    setSelectedSource(source)
    if (source.toLowerCase() === 'cloudtrail-digest') {
      setDraftFilters((current) => ({ ...current, includeDigest: true }))
      setFilters((current) => ({ ...current, includeDigest: true }))
    }
    setSelectedLog(null)
  }

  function changeBucket(bucket: string) {
    setSelectedBucket(bucket)
    setSelectedSource('')
    setDraftFilters(DEFAULT_FILTERS)
    setFilters(DEFAULT_FILTERS)
    setSelectedLog(null)
  }

  function toggleLogContent(object: S3LogObject) {
    setSelectedLog((current) => current?.key === object.key ? null : object)
  }

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">AWS / STORAGE</p>
          <h1>S3 log manager</h1>
          <p className="page-description">Filter, inspect, and review log records stored across your S3 buckets.</p>
        </div>
        <span className="live-tag"><CircleCheck aria-hidden="true" /> S3 LOGS</span>
      </div>

      <section className="panel filters-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">STORAGE SOURCE</p>
            <h2>Choose a bucket</h2>
          </div>
          <span className="panel-icon" aria-hidden="true"><HardDrive /></span>
        </div>
        <div className="account-form bucket-select-form">
          <label htmlFor="s3-bucket-select">S3 bucket</label>
          <select
            id="s3-bucket-select"
            value={selectedBucket}
            onChange={(event) => changeBucket(event.target.value)}
            disabled={bucketsQuery.isLoading || buckets.length === 0}
          >
            <option value="">
              {bucketsQuery.isLoading ? 'Loading buckets…' : 'Choose a bucket'}
            </option>
            {buckets.map((bucket) => <option key={bucket} value={bucket}>{bucket}</option>)}
          </select>
        </div>
        {bucketsQuery.isError && (
          <p className="form-message error" role="alert">{bucketsQuery.error.message}</p>
        )}
        {bucketsQuery.isLoading && <p className="input-hint">Loading available S3 buckets…</p>}
        {bucketsQuery.data && buckets.length === 0 && (
          <p className="empty-state">No S3 buckets are available for the configured AWS account.</p>
        )}
      </section>

      {selectedBucket && (
        <section className="panel filters-panel s3-query-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">LOG SEARCH</p>
              <h2>Filter bucket logs</h2>
            </div>
            <span className="panel-icon" aria-hidden="true"><ListFilter /></span>
          </div>
          <form className="filters-form s3-filters-form" onSubmit={handleFilterSubmit}>
            <label>
              Key prefix
              <input
                value={draftFilters.prefix}
                onChange={(event) => setDraftFilters((current) => ({ ...current, prefix: event.target.value }))}
                placeholder="AWSLogs/123456789012/"
              />
            </label>
            <label>
              Region
              <select
                value={draftFilters.region}
                onChange={(event) => setDraftFilters((current) => ({ ...current, region: event.target.value }))}
              >
                <option value="">All regions</option>
                {availableRegions.map((region) => <option key={region} value={region}>{region}</option>)}
              </select>
            </label>
            <label>
              Log date
              <input
                type="date"
                value={draftFilters.date}
                onChange={(event) => setDraftFilters((current) => ({ ...current, date: event.target.value }))}
              />
            </label>
            <label>
              Rows per page
              <select
                value={draftFilters.limit}
                onChange={(event) => setDraftFilters((current) => ({ ...current, limit: Number(event.target.value) }))}
              >
                {[25, 50, 100, 250, 500].map((limit) => <option key={limit} value={limit}>{limit}</option>)}
              </select>
            </label>
            <label className="s3-digest-filter">
              <input
                type="checkbox"
                checked={draftFilters.includeDigest}
                onChange={(event) => setDraftFilters((current) => ({ ...current, includeDigest: event.target.checked }))}
              />
              Include CloudTrail digest files
            </label>
            <button className="button button-primary filter-button" type="submit">
              <SlidersHorizontal aria-hidden="true" />
              Apply filters
            </button>
          </form>
          {facetsQuery.isError && <p className="form-message error" role="alert">{facetsQuery.error.message}</p>}
          <div className="s3-source-tabs" role="tablist" aria-label="Filter logs by source type">
            <button
              className={`s3-source-tab${selectedSource ? '' : ' active'}`}
              type="button"
              role="tab"
              aria-selected={!selectedSource}
              onClick={() => selectSource('')}
            >
              All sources
            </button>
            {availableSources.map((source) => (
              <button
                className={`s3-source-tab${selectedSource === source ? ' active' : ''}`}
                key={source}
                type="button"
                role="tab"
                aria-selected={selectedSource === source}
                onClick={() => selectSource(source)}
              >
                {formatSource(source)}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="panel events-panel s3-logs-panel">
        <div className="events-heading">
          <div>
            <p className="eyebrow">LOG FILES</p>
            <h2>{selectedBucket || 'Select a bucket to view its logs'}</h2>
          </div>
          {logsQuery.data && (
            <span className="results-count">{totalObjects.toLocaleString()} log files</span>
          )}
        </div>
        {!selectedBucket && (
          <p className="empty-state">Select a bucket above to load its log files and objects.</p>
        )}
        {selectedBucket && logsQuery.isLoading && (
          <p className="empty-state" role="status">
            <LoaderCircle className="icon-spin" aria-hidden="true" />
            Loading log files…
          </p>
        )}
        {logsQuery.isError && <p className="form-message error" role="alert">{logsQuery.error.message}</p>}
        {logsQuery.data && objects.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true"><ScrollText /></span>
            <strong>No log files found</strong>
            <span>Try another source type or adjust your filters.</span>
          </div>
        )}
        {!!objects.length && (
          <div className="events-table-scroll s3-table-scroll">
            <table className="events-table">
              <caption className="sr-only">Log files in the selected S3 bucket</caption>
              <thead>
                <tr>
                  <th scope="col">Source</th>
                  <th scope="col">Region</th>
                  <th scope="col">Log date</th>
                  <th scope="col">Object key</th>
                  <th scope="col">Last updated</th>
                  <th scope="col">Size</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {objects.map((object, index) => {
                  const isExpanded = selectedLog?.key === object.key
                  const contentId = `s3-log-content-${index}`
                  return (
                    <Fragment key={object.key}>
                      <tr className={isExpanded ? 's3-selected-row' : undefined}>
                        <td><span className="s3-source-badge">{formatSource(object.source)}</span></td>
                        <td>{object.region ?? '—'}</td>
                        <td>{formatLogDate(object.date)}</td>
                        <td className="event-resource-cell s3-object-key" title={object.key}>{object.key}</td>
                        <td className="event-time-cell">{formatObjectDate(object.last_modified)}</td>
                        <td>{formatObjectSize(object.size)}</td>
                        <td>
                          <button
                            className="text-button s3-view-button"
                            type="button"
                            aria-expanded={isExpanded}
                            aria-controls={isExpanded ? contentId : undefined}
                            aria-label={`${isExpanded ? 'Hide' : 'View'} JSON for ${object.key}`}
                            onClick={() => toggleLogContent(object)}
                          >
                            <Braces aria-hidden="true" />
                            {isExpanded ? 'Hide JSON' : 'View JSON'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="event-json-row">
                          <td id={contentId} colSpan={7}>
                            <div className="s3-inline-json-heading">
                              <strong>Log content</strong>
                              {contentQuery.data && (
                                <span>
                                  {records.length.toLocaleString()} of {contentQuery.data.pages[0]?.total.toLocaleString()} records
                                </span>
                              )}
                            </div>
                            {contentQuery.isLoading && (
                              <p className="s3-inline-status" role="status">
                                <LoaderCircle className="icon-spin" aria-hidden="true" />
                                Fetching log content…
                              </p>
                            )}
                            {contentQuery.isError && (
                              <p className="form-message error" role="alert">{contentQuery.error.message}</p>
                            )}
                            {contentQuery.data && records.length === 0 && (
                              <p className="s3-inline-status">This log file contains no records.</p>
                            )}
                            {!!records.length && (
                              <pre className="event-json-content s3-inline-json">
                                {JSON.stringify(records, null, 2) ?? '[]'}
                              </pre>
                            )}
                            {contentQuery.hasNextPage && (
                              <button
                                className="button button-secondary s3-inline-load-more"
                                type="button"
                                onClick={() => void contentQuery.fetchNextPage()}
                                disabled={contentQuery.isFetchingNextPage}
                              >
                                {contentQuery.isFetchingNextPage
                                  ? <LoaderCircle className="icon-spin" aria-hidden="true" />
                                  : <ChevronDown aria-hidden="true" />}
                                {contentQuery.isFetchingNextPage ? 'Loading…' : 'Load more records'}
                              </button>
                            )}
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
        {logsQuery.hasNextPage && (
          <div className="load-more-area">
            <button
              className="button button-secondary"
              type="button"
              onClick={() => void logsQuery.fetchNextPage()}
              disabled={logsQuery.isFetchingNextPage}
            >
              {logsQuery.isFetchingNextPage
                ? <LoaderCircle className="icon-spin" aria-hidden="true" />
                : <ChevronDown aria-hidden="true" />}
              {logsQuery.isFetchingNextPage ? 'Loading…' : 'Load more log files'}
            </button>
          </div>
        )}
      </section>

    </section>
  )
}
