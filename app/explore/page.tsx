'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, ApiError } from '@/lib/apiClient';
import { Loading, ErrorState, Empty } from '@/components/States';
import NetworkGraph from '@/components/NetworkGraph';
import type { NetworkGraphData, PlayerSearchResult } from '@/lib/types';

export default function ExplorePage() {
  const router = useRouter();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSearchResult | null>(null);

  const [networkState, setNetworkState] = useState<
    { status: 'idle' } | { status: 'loading' } | { status: 'ready'; data: NetworkGraphData } | { status: 'error'; error: ApiError }
  >({ status: 'idle' });

  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([]);
  const [clubId, setClubId] = useState('');
  const [discovery, setDiscovery] = useState<
    { status: 'idle' } | { status: 'loading' } | { status: 'ready'; candidates: { id: string; name: string; club: string | null }[] } | { status: 'error'; error: ApiError }
  >({ status: 'idle' });

  useEffect(() => {
    apiGet<{ clubs: { id: string; name: string }[] }>('/api/clubs')
      .then((d) => setClubs(d.clubs))
      .catch(() => setClubs([]));
  }, []);

  useEffect(() => {
    const handle = setTimeout(async () => {
      if (!term.trim()) return setResults([]);
      try {
        const data = await apiGet<{ results: PlayerSearchResult[] }>(`/api/search?q=${encodeURIComponent(term.trim())}`);
        setResults(data.results);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [term]);

  async function selectPlayer(p: PlayerSearchResult) {
    setSelectedPlayer(p);
    setTerm('');
    setResults([]);
    setDiscovery({ status: 'idle' });
    setNetworkState({ status: 'loading' });
    try {
      const data = await apiGet<NetworkGraphData>(`/api/players/${p.id}/network`);
      setNetworkState({ status: 'ready', data });
    } catch (err) {
      setNetworkState({ status: 'error', error: err as ApiError });
    }
  }

  async function runDiscovery() {
    if (!selectedPlayer || !clubId) return;
    setDiscovery({ status: 'loading' });
    try {
      const data = await apiGet<{ candidates: { id: string; name: string; club: string | null }[] }>(
        `/api/recommendations/${selectedPlayer.id}?clubId=${encodeURIComponent(clubId)}`
      );
      setDiscovery({ status: 'ready', candidates: data.candidates });
    } catch (err) {
      setDiscovery({ status: 'error', error: err as ApiError });
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, margin: '0 0 6px' }}>Network explorer</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: 13.5, margin: '0 0 20px' }}>
        Pick a player to visualize their surrounding network, then try the multi-hop discovery
        query below.
      </p>

      <div className="search-wrap" style={{ maxWidth: 480, marginBottom: 24 }}>
        <input
          className="search-input"
          placeholder="Search for a player to explore…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        {results.length > 0 && (
          <div className="search-dropdown">
            {results.map((r) => (
              <div key={r.id} className="search-result" onClick={() => selectPlayer(r)}>
                <span>{r.name}</span>
                <span className="search-result-sub">{r.club || 'Free agent'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {!selectedPlayer && (
        <div className="card"><Empty title="No player selected" detail="Search above to start exploring a network." /></div>
      )}

      {selectedPlayer && (
        <>
          <div className="section-title">
            {selectedPlayer.name}'s network
            <span className="hint">— drag to pan, scroll to zoom, click a node for details</span>
          </div>
          <div className="card">
            {networkState.status === 'loading' && <Loading label="Loading network…" />}
            {networkState.status === 'error' && <ErrorState error={networkState.error} onRetry={() => selectPlayer(selectedPlayer)} />}
            {networkState.status === 'ready' && (
              <NetworkGraph rootId={networkState.data.rootId} nodes={networkState.data.nodes} edges={networkState.data.edges} />
            )}
          </div>

          <div className="section-title">
            Multi-hop discovery
            <span className="hint">— candidates reachable through 1–2 teammate hops who previously played for a chosen club</span>
          </div>
          <div className="card">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
              <select className="select" value={clubId} onChange={(e) => setClubId(e.target.value)}>
                <option value="">Select a club…</option>
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button className="retry-btn" disabled={!clubId} onClick={runDiscovery}>
                Run query
              </button>
            </div>

            {discovery.status === 'loading' && <Loading label="Traversing teammate network…" rows={2} />}
            {discovery.status === 'error' && <ErrorState error={discovery.error} onRetry={runDiscovery} />}
            {discovery.status === 'ready' && discovery.candidates.length === 0 && (
              <Empty title="No candidates found" detail="No one within 2 teammate hops previously played for that club." />
            )}
            {discovery.status === 'ready' && discovery.candidates.length > 0 && (
              <table>
                <thead><tr><th>Player</th><th>Current club</th></tr></thead>
                <tbody>
                  {discovery.candidates.map((c) => (
                    <tr key={c.id} className="clickable" onClick={() => router.push(`/players/${c.id}`)}>
                      <td>{c.name}</td><td>{c.club || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
