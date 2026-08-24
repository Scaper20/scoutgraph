'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { NetworkEdge, NetworkNode } from '@/lib/types';
import { Empty } from './States';

const COLORS: Record<NetworkNode['label'], string> = {
  Player: '#4FBF7A',
  Club: '#D9B45C',
  Competition: '#6E9BE0',
  Position: '#B486E0',
  Country: '#E0925A',
  Agent: '#E2685C',
};

function radialPositions(count: number, radius: number, cx: number, cy: number, startAngle = -Math.PI / 2) {
  if (count === 0) return [];
  const step = (2 * Math.PI) / count;
  return Array.from({ length: count }, (_, i) => {
    const angle = startAngle + i * step;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
}

function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

export default function NetworkGraph({
  rootId,
  nodes,
  edges,
}: {
  rootId: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<NetworkNode | null>(null);
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const dragRef = useRef<{ dragging: boolean; startX: number; startY: number }>({
    dragging: false, startX: 0, startY: 0,
  });

  const width = 620;
  const height = 460;
  const cx = width / 2;
  const cy = height / 2;

  const others = nodes.filter((n) => n.id !== rootId);
  const positions = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>();
    pos.set(rootId, { x: cx, y: cy });
    const ring = radialPositions(others.length, 180, cx, cy);
    others.forEach((n, i) => pos.set(n.id, ring[i]));
    return pos;
  }, [nodes, rootId]);

  if (nodes.length <= 1) {
    return <Empty title="No connections to visualize" detail="This player has no recorded relationships yet." />;
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setTransform((t) => ({ ...t, scale: Math.min(2.5, Math.max(0.5, t.scale - e.deltaY * 0.001)) }));
  }
  function onMouseDown(e: React.MouseEvent) {
    dragRef.current = { dragging: true, startX: e.clientX - transform.x, startY: e.clientY - transform.y };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragRef.current.dragging) return;
    setTransform((t) => ({ ...t, x: e.clientX - dragRef.current.startX, y: e.clientY - dragRef.current.startY }));
  }
  function onMouseUp() {
    dragRef.current.dragging = false;
  }

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ maxHeight: 420, cursor: dragRef.current.dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {edges.map((e, i) => {
            const s = positions.get(e.source);
            const t = positions.get(e.target);
            if (!s || !t) return null;
            const midX = (s.x + t.x) / 2;
            const midY = (s.y + t.y) / 2;
            return (
              <g key={i}>
                <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="#234438" strokeWidth={1.3} />
                <text x={midX} y={midY} fontSize={8} fill="#5A7768" textAnchor="middle">
                  {e.type}
                </text>
              </g>
            );
          })}

          {nodes.map((n) => {
            const p = positions.get(n.id);
            if (!p) return null;
            const isRoot = n.id === rootId;
            const isSelected = selected?.id === n.id;
            const r = isRoot ? 22 : 13;
            return (
              <g
                key={n.id}
                transform={`translate(${p.x}, ${p.y})`}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelected(n)}
              >
                <circle
                  r={r}
                  fill={COLORS[n.label]}
                  stroke={isSelected ? '#EAF3EE' : '#0A1410'}
                  strokeWidth={isSelected ? 2.5 : 2}
                />
                <text y={r + 13} textAnchor="middle" fill="#8FAA9C" fontSize={10.5}>
                  {truncate(n.name, 16)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', margin: '10px 0', fontSize: 11 }}>
        {Object.entries(COLORS).map(([label, color]) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-dim)' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, display: 'inline-block' }} />
            {label}
          </span>
        ))}
      </div>

      {selected && (
        <div className="card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{selected.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{selected.label}</div>
          </div>
          {(selected.label === 'Player') && selected.id !== rootId && (
            <button className="retry-btn" onClick={() => router.push(`/players/${selected.id}`)}>
              Open profile
            </button>
          )}
        </div>
      )}
    </div>
  );
}
