'use client';

export function Loading({ label = 'Loading…', rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 44, marginBottom: 8, opacity: 1 - i * 0.15 }} />
      ))}
      <div className="state-detail" style={{ textAlign: 'center', marginTop: 10, color: 'var(--text-dim)', fontSize: 12 }}>
        {label}
      </div>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="state-box">
      <div className="spinner" />
      {label && <div className="state-detail">{label}</div>}
    </div>
  );
}

export function Empty({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="state-box">
      <div className="state-title">{title}</div>
      {detail && <div className="state-detail">{detail}</div>}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error?: { status?: number; message?: string } | null;
  onRetry?: () => void;
}) {
  const isDbDown = error?.status === 503 || error?.status === 0;
  return (
    <div className="state-box">
      <div className="state-title">{isDbDown ? 'Database unreachable' : 'Something went wrong'}</div>
      <div className="state-detail">
        {error?.message ||
          'The graph database could not be reached. Confirm your CognoDB instance is running and the connection env vars are set correctly.'}
      </div>
      {onRetry && (
        <button className="retry-btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
