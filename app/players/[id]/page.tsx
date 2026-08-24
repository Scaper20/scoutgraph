'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet, ApiError } from '@/lib/apiClient';
import { Loading, ErrorState, Empty } from '@/components/States';
import NetworkGraph from '@/components/NetworkGraph';
import PlayerCard from '@/components/PlayerCard';
import type { NetworkGraphData, PlayerProfile, RelatedPlayer } from '@/lib/types';

type State =
  | { status: 'loading' }
  | { status: 'ready'; profile: PlayerProfile; network: NetworkGraphData; related: RelatedPlayer[] }
  | { status: 'error'; error: ApiError };

export default function PlayerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<State>({ status: 'loading' });

  async function load() {
    setState({ status: 'loading' });
    try {
      const [profile, network, relatedRes] = await Promise.all([
        apiGet<PlayerProfile>(`/api/players/${id}`),
        apiGet<NetworkGraphData>(`/api/players/${id}/network`),
        apiGet<{ related: RelatedPlayer[] }>(`/api/recommendations/${id}`),
      ]);
      setState({ status: 'ready', profile, network, related: relatedRes.related });
    } catch (err) {
      setState({ status: 'error', error: err as ApiError });
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (state.status === 'loading') return <Loading label="Loading player profile…" rows={5} />;
  if (state.status === 'error') return <ErrorState error={state.error} onRetry={load} />;

  const { profile, network, related } = state;
  const { player, club, position, country, competitions, previousClubs, teammates, agent } = profile;

  return (
    <div>
      <Link href="/" className="back-link">← Back to dashboard</Link>

      <div className="entity-header">
        <div>
          <h1 className="entity-title">{player.name}</h1>
          <div className="entity-sub">
            {player.age} yrs · {player.nationality} · {player.preferredFoot}-footed · €
            {Number(player.marketValue).toLocaleString('en-GB')}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        {club && <span className="pill">Plays for {club.name}</span>}
        {position && <span className="pill">{position.name}</span>}
        {country && <span className="pill">Represents {country.name}</span>}
        {agent && <span className="pill">Agent: {agent.name}</span>}
      </div>

      <div className="two-col">
        <div>
          <div className="section-title">Competitions</div>
          {competitions.length === 0 ? (
            <div className="card"><Empty title="No competitions on record" /></div>
          ) : (
            <div className="card">
              {competitions.map((c) => (
                <span key={c.id} className="pill">{c.name} ({c.level})</span>
              ))}
            </div>
          )}

          <div className="section-title">Previous clubs</div>
          {previousClubs.length === 0 ? (
            <div className="card"><Empty title="No previous clubs on record" detail="This player has only ever played for their current club." /></div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <table>
                <thead><tr><th>Club</th><th>League</th><th>Country</th></tr></thead>
                <tbody>
                  {previousClubs.map((c) => (
                    <tr key={c.id}><td>{c.name}</td><td>{c.league}</td><td>{c.country}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="section-title">Teammates</div>
          {teammates.length === 0 ? (
            <div className="card"><Empty title="No teammates on record" /></div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <table>
                <thead><tr><th>Name</th><th>Position</th></tr></thead>
                <tbody>
                  {teammates.map((t) => (
                    <tr key={t.id} className="clickable" onClick={() => (window.location.href = `/players/${t.id}`)}>
                      <td>{t.name}</td><td>{t.position || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="section-title">
            Related players
            <span className="hint">— shared teammates, clubs, or competitions</span>
          </div>
          {related.length === 0 ? (
            <div className="card"><Empty title="No related players found" /></div>
          ) : (
            <div className="player-card-grid">
              {related.map((r) => (
                <PlayerCard key={r.id} player={{ id: r.id, name: r.name, club: r.club, reason: r.reason }} />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="section-title">Network</div>
          <div className="card">
            <NetworkGraph rootId={network.rootId} nodes={network.nodes} edges={network.edges} />
          </div>
        </div>
      </div>
    </div>
  );
}
