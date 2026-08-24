import type { Metadata } from 'next';
import Link from 'next/link';
import SearchBar from '@/components/PlayerSearch';
import './globals.css';

export const metadata: Metadata = {
  title: 'ScoutGraph — Football Player Intelligence',
  description: 'Explore football players, clubs, and the network connecting them.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="app-shell">
          <header className="topbar">
            <Link href="/" className="brand">
              <span className="brand-mark">SG</span>
              ScoutGraph
            </Link>
            <nav className="nav-links">
              <Link href="/">Dashboard</Link>
              <Link href="/explore">Explore</Link>
            </nav>
            <SearchBar />
          </header>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
