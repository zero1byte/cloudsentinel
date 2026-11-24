import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { addAccount, deleteAccount, getAccounts } from '../api/client'

export function KeysPage() {
  const queryClient = useQueryClient()
  const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: getAccounts })
  const [platformName, setPlatformName] = useState('AWS')
  const [accessKey, setAccessKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [visibleSecrets, setVisibleSecrets] = useState<string[]>([])
  const [formError, setFormError] = useState('')

  const createAccount = useMutation({
    mutationFn: addAccount,
    onSuccess: async () => {
      setAccessKey('')
      setSecretKey('')
      setFormError('')
      await queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
    onError: (error) => setFormError(error.message),
  })
  const removeAccount = useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    createAccount.mutate({
      platform_name: platformName.trim(),
      key: accessKey.trim(),
      secret: secretKey,
    })
  }

  function toggleSecret(key: string) {
    setVisibleSecrets((current) =>
      current.includes(key) ? current.filter((value) => value !== key) : [...current, key],
    )
  }

  function handleDeleteAccount(platformName: string, key: string) {
    if (!window.confirm(`Delete the saved ${platformName} credentials? This cannot be undone.`)) return
    removeAccount.reset()
    removeAccount.mutate(key)
  }

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CLOUD CONNECTIONS</p>
          <h1>Cloud accounts</h1>
          <p className="page-description">Manage the credentials CloudSentinel uses to connect to your cloud providers.</p>
        </div>
        <span className="heading-tag">Credentials</span>
      </div>

      <div className="keys-grid">
        <section className="panel form-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">NEW CONNECTION</p>
              <h2>Add cloud account</h2>
            </div>
            <span className="panel-icon" aria-hidden="true">＋</span>
          </div>
          <form className="account-form" onSubmit={handleSubmit}>
            <label>
              Provider
              <select value={platformName} onChange={(event) => setPlatformName(event.target.value)}>
                <option value="AWS">Amazon Web Services</option>
                <option value="Azure">Microsoft Azure</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label>
              Access key
              <input
                autoComplete="off"
                required
                value={accessKey}
                onChange={(event) => setAccessKey(event.target.value)}
                placeholder="Enter access key"
              />
            </label>
            <label>
              Secret key
              <input
                autoComplete="new-password"
                required
                type="password"
                value={secretKey}
                onChange={(event) => setSecretKey(event.target.value)}
                placeholder="Enter secret key"
              />
            </label>
            {formError && <p className="form-message error" role="alert">{formError}</p>}
            {createAccount.isSuccess && <p className="form-message success" role="status">Account added successfully.</p>}
            <button className="button button-primary full-width" type="submit" disabled={createAccount.isPending}>
              {createAccount.isPending ? 'Saving account…' : 'Save cloud account'}
            </button>
            <p className="form-hint">Use read-only credentials with the least privileges needed.</p>
          </form>
        </section>

        <section className="panel accounts-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">SAVED CONNECTIONS</p>
              <h2>Your accounts</h2>
            </div>
            {!accountsQuery.isLoading && !accountsQuery.isError && (
              <span className="count-badge">{accountsQuery.data.length}</span>
            )}
          </div>
          {accountsQuery.isLoading && <p className="empty-state">Loading cloud accounts…</p>}
          {accountsQuery.isError && <p className="form-message error" role="alert">{accountsQuery.error.message}</p>}
          {accountsQuery.data?.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true">◇</span>
              <strong>No accounts yet</strong>
              <span>Add a cloud account to get started.</span>
            </div>
          )}
          {!!accountsQuery.data?.length && (
            <div className="account-list">
              {removeAccount.isError && <p className="form-message error" role="alert">{removeAccount.error.message}</p>}
              {accountsQuery.data.map((account) => {
                const isSecretVisible = visibleSecrets.includes(account.key)
                const isDeleting = removeAccount.isPending && removeAccount.variables === account.key
                return (
                  <article className="account-card" key={`${account.platform_name}-${account.key}`}>
                    <div className="account-card-top">
                      <span className="provider-mark">{account.platform_name.slice(0, 1).toUpperCase()}</span>
                      <div className="account-title">
                        <strong>{account.platform_name}</strong>
                        <span>{account.date ? `Added ${new Date(account.date).toLocaleDateString()}` : 'Cloud connection'}</span>
                      </div>
                      <span className="connected-badge"><span className="status-dot" /> Stored</span>
                    </div>
                    <div className="credential-row">
                      <span>Access key</span>
                      <code>{account.key}</code>
                    </div>
                    <div className="credential-row">
                      <span>Secret key</span>
                      <code>{isSecretVisible ? account.secret : '••••••••••••••••'}</code>
                      <button className="text-button" type="button" onClick={() => toggleSecret(account.key)}>
                        {isSecretVisible ? 'Hide' : 'Reveal'}
                      </button>
                    </div>
                    <div className="account-actions">
                      <button
                        className="delete-button"
                        type="button"
                        disabled={removeAccount.isPending}
                        onClick={() => handleDeleteAccount(account.platform_name, account.key)}
                      >
                        {isDeleting ? 'Deleting…' : 'Delete credentials'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </section>
  )
}
