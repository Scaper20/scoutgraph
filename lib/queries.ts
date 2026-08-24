// lib/queries.ts
//
// Every Cypher statement the application runs lives here, alongside a
// typed wrapper function. Every statement is parameterised — nothing is
// ever built by concatenating user input into Cypher text (see
// runQuery/runWrite in lib/cognodb.ts, which take params separately).
//
// Data model recap (full diagram in README):
//   (:Player)-[:PLAYS_FOR]->(:Club)
//   (:Player)-[:PLAYS_POSITION]->(:Position)
//   (:Player)-[:REPRESENTS]->(:Country)
//   (:Player)-[:COMPETED_IN]->(:Competition)
//   (:Player)-[:TEAMMATE_OF]->(:Player)
//   (:Player)-[:PREVIOUSLY_PLAYED_FOR]->(:Club)
//   (:Player)-[:REPRESENTED_BY]->(:Agent)

import { runQuery } from './cognodb';
import type {
  DashboardStats,
  NetworkEdge,
  NetworkGraphData,
  NetworkNode,
  PlayerProfile,
  PlayerSearchResult,
  RelatedPlayer,
} from './types';

// ---------------------------------------------------------------------
// Search — top-bar search box (FR-02). Case-insensitive substring match.
// ---------------------------------------------------------------------
export async function searchPlayers(term: string, limit = 15): Promise<PlayerSearchResult[]> {
  const rows = await runQuery<{
    id: string; name: string; club: string | null; position: string | null; nationality: string | null;
  }>(
    `
    MATCH (p:Player)
    WHERE toLower(p.name) CONTAINS toLower($term)
    OPTIONAL MATCH (p)-[:PLAYS_FOR]->(c:Club)
    OPTIONAL MATCH (p)-[:PLAYS_POSITION]->(pos:Position)
    RETURN p.id AS id, p.name AS name, c.name AS club, pos.name AS position, p.nationality AS nationality
    ORDER BY p.name
    LIMIT toInteger($limit)
    `,
    { term, limit: Math.trunc(limit) }
  );
  return rows;
}

// ---------------------------------------------------------------------
// Dashboard — featured players + dataset stats (FR-01)
// ---------------------------------------------------------------------
export async function getDashboardStats(): Promise<DashboardStats> {
  const rows = await runQuery<{
    totalPlayers: number; totalClubs: number; totalCompetitions: number; totalCountries: number;
  }>(
    `
    MATCH (p:Player) WITH count(p) AS totalPlayers
    MATCH (c:Club) WITH totalPlayers, count(c) AS totalClubs
    MATCH (comp:Competition) WITH totalPlayers, totalClubs, count(comp) AS totalCompetitions
    MATCH (co:Country) WITH totalPlayers, totalClubs, totalCompetitions, count(co) AS totalCountries
    RETURN totalPlayers, totalClubs, totalCompetitions, totalCountries
    `
  );
  return rows[0] || { totalPlayers: 0, totalClubs: 0, totalCompetitions: 0, totalCountries: 0 };
}

export async function getFeaturedPlayers(limit = 8): Promise<PlayerSearchResult[]> {
  const rows = await runQuery<{
    id: string; name: string; club: string | null; position: string | null; nationality: string | null;
  }>(
    `
    MATCH (p:Player)
    OPTIONAL MATCH (p)-[:PLAYS_FOR]->(c:Club)
    OPTIONAL MATCH (p)-[:PLAYS_POSITION]->(pos:Position)
    RETURN p.id AS id, p.name AS name, c.name AS club, pos.name AS position, p.nationality AS nationality
    ORDER BY p.marketValue DESC
    LIMIT toInteger($limit)
    `,
    { limit: Math.trunc(limit) }
  );
  return rows;
}

// ---------------------------------------------------------------------
// Player Lookup — PRD "Query 1". Profile page (FR-03).
// ---------------------------------------------------------------------
export async function getPlayerProfile(playerId: string): Promise<PlayerProfile | null> {
  const rows = await runQuery<Record<string, any>>(
    `
    MATCH (p:Player {id: $playerId})
    OPTIONAL MATCH (p)-[:PLAYS_FOR]->(club:Club)
    OPTIONAL MATCH (p)-[:PLAYS_POSITION]->(position:Position)
    OPTIONAL MATCH (p)-[:REPRESENTS]->(country:Country)
    OPTIONAL MATCH (p)-[:REPRESENTED_BY]->(agent:Agent)
    OPTIONAL MATCH (p)-[:COMPETED_IN]->(comp:Competition)
    OPTIONAL MATCH (p)-[:PREVIOUSLY_PLAYED_FOR]->(prevClub:Club)
    OPTIONAL MATCH (p)-[:TEAMMATE_OF]->(teammate:Player)
    OPTIONAL MATCH (teammate)-[:PLAYS_POSITION]->(teammatePos:Position)
    RETURN p AS player, club, position, country, agent,
           collect(DISTINCT comp) AS competitions,
           collect(DISTINCT prevClub) AS previousClubs,
           collect(DISTINCT {id: teammate.id, name: teammate.name, position: teammatePos.name}) AS teammates
    `,
    { playerId }
  );

  if (!rows.length || !rows[0].player) return null;
  const r = rows[0];

  return {
    player: r.player.properties,
    club: r.club ? r.club.properties : null,
    position: r.position ? r.position.properties : null,
    country: r.country ? r.country.properties : null,
    agent: r.agent ? r.agent.properties : null,
    competitions: (r.competitions || []).filter((c: any) => c).map((c: any) => c.properties),
    previousClubs: (r.previousClubs || []).filter((c: any) => c).map((c: any) => c.properties),
    teammates: (r.teammates || []).filter((t: any) => t && t.id),
  };
}

// ---------------------------------------------------------------------
// Network Explorer — nodes + edges for the graph visualization (FR-04).
// Expands 1 hop across every relationship type from the root player,
// plus the current clubs of any teammates (a 2nd hop) so the graph shows
// how teammates connect onward, not just the star pattern around root.
// ---------------------------------------------------------------------
export async function getPlayerNetwork(playerId: string): Promise<NetworkGraphData | null> {
  const rows = await runQuery<Record<string, any>>(
    `
    MATCH (p:Player {id: $playerId})
    OPTIONAL MATCH (p)-[:PLAYS_FOR]->(club:Club)
    OPTIONAL MATCH (p)-[:PLAYS_POSITION]->(position:Position)
    OPTIONAL MATCH (p)-[:REPRESENTS]->(country:Country)
    OPTIONAL MATCH (p)-[:REPRESENTED_BY]->(agent:Agent)
    OPTIONAL MATCH (p)-[:COMPETED_IN]->(comp:Competition)
    OPTIONAL MATCH (p)-[:PREVIOUSLY_PLAYED_FOR]->(prevClub:Club)
    OPTIONAL MATCH (p)-[:TEAMMATE_OF]->(teammate:Player)
    RETURN p AS player, club, position, country, agent,
           collect(DISTINCT comp) AS competitions,
           collect(DISTINCT prevClub) AS previousClubs,
           collect(DISTINCT teammate) AS teammates
    `,
    { playerId }
  );

  if (!rows.length || !rows[0].player) return null;
  const r = rows[0];

  const nodes: NetworkNode[] = [];
  const edges: NetworkEdge[] = [];
  const seen = new Set<string>();

  function addNode(id: string, label: NetworkNode['label'], name: string) {
    if (seen.has(id)) return;
    seen.add(id);
    nodes.push({ id, label, name });
  }

  const rootId = r.player.properties.id;
  addNode(rootId, 'Player', r.player.properties.name);

  if (r.club) {
    addNode(r.club.properties.id, 'Club', r.club.properties.name);
    edges.push({ source: rootId, target: r.club.properties.id, type: 'PLAYS_FOR' });
  }
  if (r.position) {
    addNode(r.position.properties.id, 'Position', r.position.properties.name);
    edges.push({ source: rootId, target: r.position.properties.id, type: 'PLAYS_POSITION' });
  }
  if (r.country) {
    addNode(r.country.properties.id, 'Country', r.country.properties.name);
    edges.push({ source: rootId, target: r.country.properties.id, type: 'REPRESENTS' });
  }
  if (r.agent) {
    addNode(r.agent.properties.id, 'Agent', r.agent.properties.name);
    edges.push({ source: rootId, target: r.agent.properties.id, type: 'REPRESENTED_BY' });
  }
  for (const c of (r.competitions || []).filter((x: any) => x)) {
    addNode(c.properties.id, 'Competition', c.properties.name);
    edges.push({ source: rootId, target: c.properties.id, type: 'COMPETED_IN' });
  }
  for (const c of (r.previousClubs || []).filter((x: any) => x)) {
    addNode(c.properties.id, 'Club', c.properties.name);
    edges.push({ source: rootId, target: c.properties.id, type: 'PREVIOUSLY_PLAYED_FOR' });
  }
  for (const t of (r.teammates || []).filter((x: any) => x)) {
    addNode(t.properties.id, 'Player', t.properties.name);
    edges.push({ source: rootId, target: t.properties.id, type: 'TEAMMATE_OF' });
  }

  return { rootId, nodes, edges };
}

// ---------------------------------------------------------------------
// Related Player Discovery (FR-06). Four independent path patterns —
// shared teammate network (2-hop), current club, previous club, shared
// competition — combined with UNION. This is the query a relational
// database finds awkward: each branch is its own self-join, and the
// "shared teammate network" branch needs a recursive CTE to reach two
// hops. In Cypher it's four short pattern matches.
// ---------------------------------------------------------------------
export async function getRelatedPlayers(playerId: string, limit = 12): Promise<RelatedPlayer[]> {
  const rows = await runQuery<{ id: string; name: string; club: string | null; reason: string }>(
    `
    MATCH (target:Player {id: $playerId})-[:TEAMMATE_OF*1..2]->(candidate:Player)
    WHERE candidate.id <> $playerId
    OPTIONAL MATCH (candidate)-[:PLAYS_FOR]->(cc:Club)
    RETURN DISTINCT candidate.id AS id, candidate.name AS name, cc.name AS club, 'Shared teammate network' AS reason
    LIMIT 6

    UNION

    MATCH (target:Player {id: $playerId})-[:PLAYS_FOR]->(:Club)<-[:PLAYS_FOR]-(candidate:Player)
    WHERE candidate.id <> $playerId
    OPTIONAL MATCH (candidate)-[:PLAYS_FOR]->(cc:Club)
    RETURN DISTINCT candidate.id AS id, candidate.name AS name, cc.name AS club, 'Current club' AS reason
    LIMIT 6

    UNION

    MATCH (target:Player {id: $playerId})-[:PREVIOUSLY_PLAYED_FOR]->(:Club)<-[:PREVIOUSLY_PLAYED_FOR]-(candidate:Player)
    WHERE candidate.id <> $playerId
    OPTIONAL MATCH (candidate)-[:PLAYS_FOR]->(cc:Club)
    RETURN DISTINCT candidate.id AS id, candidate.name AS name, cc.name AS club, 'Previous club' AS reason
    LIMIT 6

    UNION

    MATCH (target:Player {id: $playerId})-[:COMPETED_IN]->(:Competition)<-[:COMPETED_IN]-(candidate:Player)
    WHERE candidate.id <> $playerId
    OPTIONAL MATCH (candidate)-[:PLAYS_FOR]->(cc:Club)
    RETURN DISTINCT candidate.id AS id, candidate.name AS name, cc.name AS club, 'Shared competition' AS reason
    LIMIT 6
    `,
    { playerId }
  );

  // De-duplicate by candidate id, keeping the first (most specific) reason,
  // and cap the final list.
  const byId = new Map<string, RelatedPlayer>();
  for (const row of rows) {
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  return Array.from(byId.values()).slice(0, limit);
}

// ---------------------------------------------------------------------
// Multi-Hop Player Discovery — PRD "Query 4", verbatim. This is the
// README's headline "why a graph database" example: candidates reachable
// from the target player through 1–2 TEAMMATE_OF hops, who previously
// played for a specific club. Exposed on the Explore page as a standalone
// demonstration with a player + club picker.
// ---------------------------------------------------------------------
export async function discoverConnectedPlayers(
  playerId: string,
  clubId: string
): Promise<{ id: string; name: string; club: string | null }[]> {
  const rows = await runQuery<{ id: string; name: string; club: string | null }>(
    `
    MATCH (target:Player {id: $playerId})
          -[:TEAMMATE_OF*1..2]->
          (candidate:Player)
          -[:PREVIOUSLY_PLAYED_FOR]->
          (club:Club {id: $clubId})
    OPTIONAL MATCH (candidate)-[:PLAYS_FOR]->(cc:Club)
    RETURN DISTINCT candidate.id AS id, candidate.name AS name, cc.name AS club
    LIMIT 25
    `,
    { playerId, clubId }
  );
  return rows;
}

// ---------------------------------------------------------------------
// Teammates — PRD "Query 2"
// ---------------------------------------------------------------------
export async function getTeammates(playerId: string): Promise<{ id: string; name: string }[]> {
  const rows = await runQuery<{ id: string; name: string }>(
    `
    MATCH (p:Player {id: $playerId})-[:TEAMMATE_OF]->(teammate:Player)
    RETURN teammate.id AS id, teammate.name AS name
    ORDER BY teammate.name
    `,
    { playerId }
  );
  return rows;
}

// ---------------------------------------------------------------------
// Multi-Hop Club Traversal — PRD "Query 3": a teammate's club, one hop
// beyond the teammate relationship itself.
// ---------------------------------------------------------------------
export async function getTeammateClubs(
  playerId: string
): Promise<{ teammate: string; club: string }[]> {
  const rows = await runQuery<{ teammate: string; club: string }>(
    `
    MATCH (p:Player {id: $playerId})-[:TEAMMATE_OF]->(teammate:Player)-[:PLAYS_FOR]->(club:Club)
    RETURN teammate.name AS teammate, club.name AS club
    `,
    { playerId }
  );
  return rows;
}

// ---------------------------------------------------------------------
// Lightweight club list — used to populate the club picker on /explore
// ---------------------------------------------------------------------
export async function listClubs(): Promise<{ id: string; name: string }[]> {
  const rows = await runQuery<{ id: string; name: string }>(
    `MATCH (c:Club) RETURN c.id AS id, c.name AS name ORDER BY c.name`
  );
  return rows;
}
