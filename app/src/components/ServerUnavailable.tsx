interface ServerUnavailableProps {
  message: string
  onRetry: () => void
  retrying: boolean
}

export function ServerUnavailable({ message, onRetry, retrying }: ServerUnavailableProps) {
  return (
    <section className="server-unavailable" role="alert">
      <span className="unavailable-icon" aria-hidden="true">!</span>
      <p className="eyebrow">CONNECTION ISSUE</p>
      <h1>Server not reachable</h1>
      <p className="page-description">
        CloudSentinel can’t connect to the backend. Check that the server is running and that its URL is configured correctly.
      </p>
      <p className="connection-error">{message}</p>
      <button className="button button-primary" type="button" onClick={onRetry} disabled={retrying}>
        {retrying ? 'Checking…' : 'Try again'}
      </button>
    </section>
  )
}
