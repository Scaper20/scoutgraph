'use client';

import { useEffect, useState } from 'react';
import { apiGet, ApiError } from '@/lib/apiClient';
import { Loading, ErrorState, Empty } from '@/components/States';
import StatCard from '@/components/StatCard';
import PlayerCard from '@/components/PlayerCard';
import type { DashboardStats, PlayerSearchResult } from '@/lib/types';

type State =
  | { status: 'loading' }
  | { status: 'ready'; stats: DashboardStats; featured: PlayerSearchResult[] }
  | { status: 'error'; error: ApiError };

export default function Dashboard() {
  const [state, setState] = useState<State>({ status: 'loading' });

  async function load() {
    setState({ status: 'loading' });
    try {
      const data = await apiGet<{ stats: DashboardStats; featured: PlayerSearchResult[] }>('/api/players');
      setState({ status: 'ready', stats: data.stats, featured: data.featured });
    } catch (err) {
      setState({ status: 'error', error: err as ApiError });
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (state.status === 'loading') return <Loading label="Loading dataset overview…" rows={4} />;
  if (state.status === 'error') return <ErrorState error={state.error} onRetry={load} />;

  const { stats, featured } = state;

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <h1 style={{ fontSize: 24, margin: '0 0 6px' }}>Explore the football network</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 13.5, margin: 0 }}>
          Search a player, or jump into the network explorer to trace connections across
          clubs, teammates, and competitions.
        </p>
      </div>

      <div className="section-title">Dataset overview</div>
      <div className="grid grid-4">
        <StatCard label="Players" value={stats.totalPlayers} />
        <StatCard label="Clubs" value={stats.totalClubs} />
        <StatCard label="Competitions" value={stats.totalCompetitions} />
        <StatCard label="Countries" value={stats.totalCountries} />
      </div>

      <div className="section-title">
        Featured players
        <span className="hint">— by market value</span>
      </div>
      {featured.length === 0 ? (
        <div className="card">
          <Empty title="No players in the dataset yet" detail="Run the seed script to load demo data." />
        </div>
      ) : (
        <div className="player-card-grid">
          {featured.map((p) => (
            <PlayerCard key={p.id} player={p} />
          ))}
        </div>
      )}
    </div>
  );
}
