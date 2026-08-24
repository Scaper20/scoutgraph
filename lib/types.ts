// lib/types.ts
// Shared shapes for the graph entities, used by the query layer, the API
// routes, and the frontend components alike.

export interface Player {
  id: string;
  name: string;
  age: number;
  nationality: string;
  marketValue: number; // in EUR, indicative synthetic value
  preferredFoot: 'Left' | 'Right' | 'Both';
}

export interface Club {
  id: string;
  name: string;
  country: string;
  league: string;
}

export interface Competition {
  id: string;
  name: string;
  country: string;
  level: 'Domestic' | 'Continental' | 'International';
}

export interface Position {
  id: string;
  name: string;
}

export interface Country {
  id: string;
  name: string;
}

export interface Agent {
  id: string;
  name: string;
}

export interface PlayerSearchResult {
  id: string;
  name: string;
  club: string | null;
  position: string | null;
  nationality: string | null;
}

export interface PlayerProfile {
  player: Player;
  club: Club | null;
  position: Position | null;
  country: Country | null;
  competitions: Competition[];
  previousClubs: Club[];
  teammates: { id: string; name: string; position: string | null }[];
  agent: Agent | null;
}

export interface NetworkNode {
  id: string;
  label: 'Player' | 'Club' | 'Competition' | 'Position' | 'Country' | 'Agent';
  name: string;
  flagged?: boolean;
}

export interface NetworkEdge {
  source: string;
  target: string;
  type: string;
}

export interface NetworkGraphData {
  rootId: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

export interface RelatedPlayer {
  id: string;
  name: string;
  club: string | null;
  reason: string;
}

export interface DashboardStats {
  totalPlayers: number;
  totalClubs: number;
  totalCompetitions: number;
  totalCountries: number;
}
