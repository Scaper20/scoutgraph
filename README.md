# ScoutGraph — Football Player Intelligence Platform

ScoutGraph is a football intelligence web application, backed by **CognoDB**,
that lets you explore players, clubs, competitions, and the network of
relationships connecting them — teammates, past clubs, shared competitions,
agents — as first-class, explorable data rather than isolated profile pages.

## 1. Problem statement

Typical football data apps present information as isolated tables: a
player's profile, a club's roster, a competition's standings. That works for
simple lookups but breaks down the moment the question becomes relational —
*"who is connected to this player through teammates and previous clubs?"*
requires walking several relationships at once. ScoutGraph makes that walk a
first-class feature instead of an afterthought.

## 2. Features

- **Dashboard** — dataset stats and featured players, with search.
- **Player search** — debounced, case-insensitive, parameterised.
- **Player profile** — club, position, country, competitions, previous
  clubs, teammates, agent, and a live "related players" panel.
- **Network explorer** (`/explore`) — pick any player, see their
  interactive relationship graph (pan/zoom, click-to-select, click-through
  to profiles), and run a standalone **multi-hop discovery** query against
  a chosen club.
- **Loading, empty, and error states** throughout — including a dedicated
  "database unreachable" state that never leaks internals.

## 3. Tech stack

- **Framework**: Next.js 14 (App Router) + TypeScript, deployed on Vercel.
- **Database**: CognoDB, accessed via the official `neo4j-driver` over Bolt.
- **Frontend**: React Server/Client Components, hand-written SVG for the
  network graph (no charting/graph library dependency).

## 4. Architecture

```
┌──────────────────────────┐
│        Next.js UI        │   Dashboard / Search / Player Profile / Explore
└────────────┬─────────────┘
             ▼
┌──────────────────────────┐
│  Next.js API Route Handlers │  app/api/** — parameter validation,
└────────────┬─────────────┘   error shaping (never leaks internals)
             ▼
┌──────────────────────────┐
│       Query Layer         │  lib/queries.ts — every Cypher statement,
└────────────┬─────────────┘   documented, always parameterised
             ▼
┌──────────────────────────┐
│   lib/cognodb.ts driver   │  official neo4j-driver, env-var config only
└────────────┬─────────────┘
             │ Bolt
             ▼
┌──────────────────────────┐
│         CognoDB           │
└──────────────────────────┘
```

## 5. Graph data model

**Nodes**

| Label | Properties |
|---|---|
| `Player` | `id`, `name`, `age`, `nationality`, `marketValue`, `preferredFoot` |
| `Club` | `id`, `name`, `country`, `league` |
| `Competition` | `id`, `name`, `country`, `level` |
| `Position` | `id`, `name` |
| `Country` | `id`, `name` |
| `Agent` | `id`, `name` |

**Relationships**

```
(Player)-[:PLAYS_FOR]->(Club)
(Player)-[:PLAYS_POSITION]->(Position)
(Player)-[:REPRESENTS]->(Country)
(Player)-[:COMPETED_IN]->(Competition)
(Player)-[:TEAMMATE_OF]->(Player)
(Player)-[:PREVIOUSLY_PLAYED_FOR]->(Club)
(Player)-[:REPRESENTED_BY]->(Agent)
```

**Diagram**

```
                    Competition
                         ▲
                         │ COMPETED_IN
Position ◄── PLAYS_POSITION ── Player ── PLAYS_FOR ──► Club
                                 │  │                    ▲
                        REPRESENTS │ PREVIOUSLY_PLAYED_FOR│ (same label,
                                 ▼  └────────────────────┘  different club)
                              Country
                                 ▲
                                 │
                          TEAMMATE_OF (recursive, *1..2)
                                 │
                                 ▼
                              Player ── REPRESENTED_BY ──► Agent
```

`TEAMMATE_OF` is wired two ways in the seed data: every pair of players
currently at the same club (direct club teammates), **and** a smaller set of
cross-club links between players sharing a nationality (international
teammates). The second set is what makes the 1–2 hop traversal genuinely
cross club boundaries rather than staying inside one roster — see
`scripts/seed.ts` for details.

## 6. Why a graph database?

A relational schema answers *"which club does Player X play for?"* just
fine — that's one join. The moment the question needs several relationships
chained together, or several relationship *types* combined, the SQL gets
heavy fast:

- **Multi-hop discovery** (`/explore`'s discovery panel; PRD Query 4):
  *"which players, reachable through 1–2 teammate hops from this player,
  previously played for club X?"* In SQL this is a recursive CTE over a
  self-referencing roster/teammate table, joined again to a transfer-history
  table. In Cypher:

  ```cypher
  MATCH (target:Player {id: $playerId})
        -[:TEAMMATE_OF*1..2]->
        (candidate:Player)
        -[:PREVIOUSLY_PLAYED_FOR]->
        (club:Club {id: $clubId})
  RETURN DISTINCT candidate
  ```

- **Related players** (player profile): four independent relationship
  paths — shared teammate network, current club, previous club, shared
  competition — run together. Each is a self-join in SQL; combined, with
  the recursive teammate branch, it's the kind of query that gets slower
  and harder to maintain as the roster/transfer tables grow. In Cypher,
  it's four short pattern matches joined with `UNION` (see
  `cypher/recommendations.cypher`).

- **Irregular schema**: some players have an agent, some don't; some have
  one previous club, some have none, some have several. Modeling that
  relationally means a lot of nullable join tables. In a property graph
  it's simply the presence or absence of an edge.

The application treats this traversal capability as a product feature (the
Explore page), not just a backend implementation detail.

## 7. Example Cypher queries

All queries live in `lib/queries.ts`, with plain reference copies grouped
by concern in `cypher/players.cypher`, `cypher/network.cypher`, and
`cypher/recommendations.cypher`. Highlights:

- `searchPlayers` — case-insensitive substring search, parameterised.
- `getPlayerProfile` — single round trip collecting club, position,
  country, agent, competitions, previous clubs, and teammates.
- `getPlayerNetwork` — shapes a player's direct relationships into
  `{nodes, edges}` for the SVG graph.
- `getRelatedPlayers` — the four-branch `UNION` query described above.
- `discoverConnectedPlayers` — PRD Query 4, verbatim, exposed on `/explore`.

## 8. Project structure

```
scoutgraph/
├── app/
│   ├── api/
│   │   ├── players/            # GET list+stats, GET /:id, GET /:id/network
│   │   ├── search/              # GET quick search
│   │   ├── recommendations/     # GET related players / discovery
│   │   └── clubs/                # GET club list (Explore picker)
│   ├── players/[id]/page.tsx    # Player profile
│   ├── explore/page.tsx         # Network explorer + discovery demo
│   ├── page.tsx                  # Dashboard
│   └── globals.css
├── components/                   # PlayerCard, PlayerSearch, NetworkGraph,
│                                  # StatCard, States (loading/empty/error)
├── lib/
│   ├── cognodb.ts                # driver singleton, env-var only
│   ├── queries.ts                # every Cypher statement, documented
│   ├── apiError.ts               # uniform 503/500 error shaping
│   ├── apiClient.ts              # frontend fetch wrapper
│   └── types.ts
├── scripts/seed.ts               # deterministic synthetic dataset loader
├── cypher/                       # plain-text reference copies of queries
└── .env.example
```

## 9. CognoDB setup

1. Sign up at [console.cognodb.com/signup](https://console.cognodb.com/signup) (free tier, no card).
2. Create a free **c0** instance and pick a region — provisions in under a minute.
3. Copy the connection URI (`bolt+s://<instance-id>.databases.cognodb.cloud`)
   and the generated password for user `cognodb` — **shown once**, save it
   immediately.

## 10. Environment variables

```
COGNODB_URI=bolt+s://<your-instance-id>.databases.cognodb.cloud
COGNODB_USERNAME=cognodb
COGNODB_PASSWORD=<your generated password>
```

See `.env.example`. Copy it to `.env.local` for local development — never
commit the real file. These are read server-side only and are never sent to
the browser.

## 11. Local development

```bash
npm install
cp .env.example .env.local     # then fill in your CognoDB credentials
npm run seed                    # loads the synthetic dataset (~140 players)
npm run dev                     # http://localhost:3000
```

## 12. Seed data

`npm run seed` (`scripts/seed.ts`) generates a deterministic, entirely
fictional dataset — no real players, clubs, or competitions, to keep the
demo free of any real-person or trademark concerns:

- ~140 players across 24 clubs (5–7 per roster)
- 18 countries, 10 positions, 8 fictional competitions, 15 fictional agents
- `TEAMMATE_OF` edges both within each club and across clubs for players
  sharing a nationality (so 2-hop traversals cross roster boundaries)
- ~35% of players have a previous club, ~70% have an agent — deliberately
  irregular, to exercise the app's empty states

The script uses `UNWIND`-based batch writes (not one query per row) to stay
comfortable on CognoDB's free-tier burstable instance, and starts with
`MATCH (n) DETACH DELETE n`, so it's safe to re-run.

## 13. Deployment

**Application**: deploy to Vercel's free tier — connect the GitHub repo,
set the three `COGNODB_*` environment variables in the Vercel project
settings, deploy.

**Database**: CognoDB Cloud free instance (see §9). Keep it running until
Wexa AI confirms review is complete, per the assignment's requirements.

## 14. Security notes

- CognoDB credentials are read only from environment variables, never
  committed, never sent to the client (`.env.local` is git-ignored).
- All Cypher is parameterised — no string concatenation of user input.
- API routes never return raw database errors or stack traces; failures
  are logged server-side and returned as a generic `503`
  (`{"error": "database_unavailable"}`).
- Database access happens only in server-side code (`lib/cognodb.ts`,
  imported exclusively by route handlers and the seed script).

## 15. Testing performed

- `npx tsc --noEmit` — clean, no type errors.
- `npm run build` — clean production build (all API routes correctly
  dynamic, all pages statically optimized where possible).
- Runtime check against an intentionally unreachable CognoDB URI: every
  API route returns a clean `503` with no leaked connection details or
  stack traces, and the homepage still renders (client-side error states
  take over) instead of crashing.

## 16. Screenshots & demo

_Add screenshots of the dashboard, a player profile, and the network
explorer here, along with the hosted Vercel demo link and a short screen
recording, before submitting._
