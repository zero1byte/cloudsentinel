const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export async function getServerHealth() {
  const response = await fetch('/health')
  if (!response.ok) {
    throw new Error(`Server health check failed (${response.status})`)
  }

  const health = (await response.json()) as { status?: string }
  if (health.status !== 'ok') {
    throw new Error('Backend health check returned an unexpected response')
  }

  return health
}

export interface CloudAccount {
  platform_name: string
  key: string
  secret: string
  date?: string
}

export interface CloudTrailEvent {
  EventId?: string
  EventName?: string
  EventTime?: string
  Username?: string
  Resources?: Array<{ ResourceName?: string; ResourceType?: string }>
  CloudTrailEvent?: string
  [key: string]: unknown
}

export interface CloudTrailEventsPage {
  events: CloudTrailEvent[]
  next_token?: string | null
}

export interface S3LogObject {
  key: string
  size?: number
  last_modified?: string
  compressed: boolean
  source: string
  account?: string
  region?: string
  date?: string
}

export interface S3LogsPage {
  total: number
  offset: number
  limit: number
  has_more: boolean
  items: S3LogObject[]
}

export interface S3LogContentPage {
  key: string
  source: string
  account?: string
  region?: string
  date?: string
  format: 'json' | 'text'
  total: number
  offset: number
  limit: number
  records: unknown[]
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const error = (await response.json()) as { detail?: string }
      if (error.detail) message = error.detail
    } catch {
      // Keep the HTTP status message when the server does not return JSON.
    }
    throw new Error(message)
  }

  return response.json() as Promise<T>
}

export function getAccounts() {
  return request<CloudAccount[]>('/keys/')
}

export function addAccount(account: Omit<CloudAccount, 'date'>) {
  return request<{ message: string }>('/keys/', {
    method: 'POST',
    body: JSON.stringify(account),
  })
}

export function getCloudTrailEvents(params: URLSearchParams) {
  const query = params.toString()
  return request<CloudTrailEventsPage>(`/cloudtrail/events${query ? `?${query}` : ''}`)
}

export function getS3Buckets() {
  return request<string[]>('/s3/buckets')
}

export function getS3BucketLogs(bucketName: string, params = new URLSearchParams()) {
  const query = params.toString()
  return request<S3LogsPage>(
    `/s3/buckets/${encodeURIComponent(bucketName)}/logs${query ? `?${query}` : ''}`,
  )
}

export function getS3BucketLogContent(
  bucketName: string,
  key: string,
  offset = 0,
  limit = 100,
) {
  const params = new URLSearchParams({ key, offset: String(offset), limit: String(limit) })
  return request<S3LogContentPage>(
    `/s3/buckets/${encodeURIComponent(bucketName)}/logs/content?${params.toString()}`,
  )
}

export function deleteAccount(key: string) {
  return request<{ message: string }>(`/keys/${encodeURIComponent(key)}`, {
    method: 'DELETE',
  })
}
