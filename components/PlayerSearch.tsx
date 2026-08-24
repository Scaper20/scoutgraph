'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/apiClient';
import type { PlayerSearchResult } from '@/lib/types';

export default function PlayerSearch() {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!term.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await apiGet<{ results: PlayerSearchResult[] }>(
          `/api/search?q=${encodeURIComponent(term.trim())}`
        );
        setResults(data.results);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [term]);

  function goTo(r: PlayerSearchResult) {
    setOpen(false);
    setTerm('');
    router.push(`/players/${r.id}`);
  }

  return (
    <div className="search-wrap" ref={boxRef}>
      <input
        className="search-input"
        placeholder="Search players…"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onFocus={() => term && setOpen(true)}
      />
      {open && results.length > 0 && (
        <div className="search-dropdown">
          {results.map((r) => (
            <div key={r.id} className="search-result" onClick={() => goTo(r)}>
              <span>{r.name}</span>
              <span className="search-result-sub">
                {r.club || 'Free agent'} {r.position ? `· ${r.position}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
      {open && term.trim() && results.length === 0 && (
        <div className="search-dropdown">
          <div className="search-result" style={{ color: 'var(--text-dim)' }}>
            No players found
          </div>
        </div>
      )}
    </div>
  );
}
