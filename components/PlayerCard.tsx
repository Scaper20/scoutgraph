'use client';

import { useRouter } from 'next/navigation';

export interface PlayerCardData {
  id: string;
  name: string;
  club?: string | null;
  position?: string | null;
  nationality?: string | null;
  reason?: string;
}

export default function PlayerCard({ player }: { player: PlayerCardData }) {
  const router = useRouter();
  return (
    <div className="player-card" onClick={() => router.push(`/players/${player.id}`)}>
      <div className="player-card-name">{player.name}</div>
      <div className="player-card-meta">
        {player.club || 'Free agent'}
        {player.position ? ` · ${player.position}` : ''}
      </div>
      {player.nationality && <div className="player-card-meta">{player.nationality}</div>}
      {player.reason && <span className="player-card-reason">{player.reason}</span>}
    </div>
  );
}
