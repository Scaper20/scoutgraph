// scripts/seed.ts
//
// Loads a real-world football dataset into CognoDB:
// Real players, clubs, positions, countries, competitions, and agents.
//
// Run with: npm run seed (reads connection details from .env.local)

import 'dotenv/config';
import { getDriver, closeDriver } from '../lib/cognodb';

// --- Reference Data ---

const COUNTRIES = [
  'Norway', 'France', 'England', 'Brazil', 'Spain', 'Belgium', 'Egypt', 'Germany',
  'Poland', 'Portugal', 'Argentina', 'Uruguay', 'Nigeria', 'Netherlands', 'Croatia',
  'Morocco', 'Sweden', 'Hungary', 'Canada', 'Georgia', 'Senegal', 'Italy', 'Ghana', 'Japan'
].map((name, i) => ({ id: `country-${i + 1}`, name }));

const POSITIONS = [
  'Goalkeeper', 'Centre-Back', 'Right-Back', 'Left-Back', 'Defensive Midfielder',
  'Central Midfielder', 'Attacking Midfielder', 'Right Winger', 'Left Winger', 'Striker', 'Forward'
].map((name, i) => ({ id: `position-${i + 1}`, name }));

const COMPETITIONS = [
  { name: 'UEFA Champions League', level: 'Continental' },
  { name: 'Premier League', level: 'Domestic' },
  { name: 'La Liga', level: 'Domestic' },
  { name: 'Bundesliga', level: 'Domestic' },
  { name: 'Serie A', level: 'Domestic' },
  { name: 'Ligue 1', level: 'Domestic' },
  { name: 'UEFA Europa League', level: 'Continental' },
  { name: 'FIFA World Cup', level: 'International' },
].map((c, i) => ({ id: `competition-${i + 1}`, name: c.name, level: c.level, country: '' }));

const AGENTS = [
  'Pimenta Sports', 'Wasserman', 'Gestifute', 'CAA Stellar', 'Sports360',
  'Unique Sports Group', 'Pini Zahavi Management', 'ROOF Group', 'Lian Sports',
  'Matchstat Sports', 'Epic Sports Management', 'PLG Group', '11Wins'
].map((name, i) => ({ id: `agent-${i + 1}`, name }));

const CLUBS_DATA = [
  { id: 'club-1', name: 'Real Madrid', country: 'Spain', league: 'La Liga' },
  { id: 'club-2', name: 'Manchester City', country: 'England', league: 'Premier League' },
  { id: 'club-3', name: 'Arsenal', country: 'England', league: 'Premier League' },
  { id: 'club-4', name: 'Barcelona', country: 'Spain', league: 'La Liga' },
  { id: 'club-5', name: 'Bayern Munich', country: 'Germany', league: 'Bundesliga' },
  { id: 'club-6', name: 'Liverpool', country: 'England', league: 'Premier League' },
  { id: 'club-7', name: 'Paris Saint-Germain', country: 'France', league: 'Ligue 1' },
  { id: 'club-8', name: 'Inter Milan', country: 'Italy', league: 'Serie A' },
  { id: 'club-9', name: 'Bayer Leverkusen', country: 'Germany', league: 'Bundesliga' },
  { id: 'club-10', name: 'Chelsea', country: 'England', league: 'Premier League' },
  { id: 'club-11', name: 'Borussia Dortmund', country: 'Germany', league: 'Bundesliga' },
  { id: 'club-12', name: 'Atletico Madrid', country: 'Spain', league: 'La Liga' },
  { id: 'club-13', name: 'AC Milan', country: 'Italy', league: 'Serie A' },
  { id: 'club-14', name: 'Napoli', country: 'Italy', league: 'Serie A' },
  { id: 'club-15', name: 'Manchester United', country: 'England', league: 'Premier League' },
  { id: 'club-16', name: 'Tottenham Hotspur', country: 'England', league: 'Premier League' },
  { id: 'club-17', name: 'Sporting CP', country: 'Portugal', league: 'Primeira Liga' },
  { id: 'club-18', name: 'RB Leipzig', country: 'Germany', league: 'Bundesliga' },
];

interface RealPlayerInput {
  id: string;
  name: string;
  age: number;
  nationality: string;
  marketValue: number;
  preferredFoot: string;
  clubName: string;
  positionName: string;
  competitionNames: string[];
  previousClubName?: string;
  agentName?: string;
}

const REAL_PLAYERS: RealPlayerInput[] = [
  // --- Real Madrid ---
  {
    id: 'player-1',
    name: 'Kylian Mbappé',
    age: 25,
    nationality: 'France',
    marketValue: 180000000,
    preferredFoot: 'Right',
    clubName: 'Real Madrid',
    positionName: 'Left Winger',
    competitionNames: ['UEFA Champions League', 'La Liga', 'FIFA World Cup'],
    previousClubName: 'Paris Saint-Germain',
    agentName: 'Pimenta Sports',
  },
  {
    id: 'player-2',
    name: 'Jude Bellingham',
    age: 21,
    nationality: 'England',
    marketValue: 180000000,
    preferredFoot: 'Right',
    clubName: 'Real Madrid',
    positionName: 'Attacking Midfielder',
    competitionNames: ['UEFA Champions League', 'La Liga', 'FIFA World Cup'],
    previousClubName: 'Borussia Dortmund',
    agentName: 'Wasserman',
  },
  {
    id: 'player-3',
    name: 'Vinícius Júnior',
    age: 24,
    nationality: 'Brazil',
    marketValue: 180000000,
    preferredFoot: 'Right',
    clubName: 'Real Madrid',
    positionName: 'Left Winger',
    competitionNames: ['UEFA Champions League', 'La Liga', 'FIFA World Cup'],
    agentName: 'TFM Agency',
  },
  {
    id: 'player-4',
    name: 'Federico Valverde',
    age: 26,
    nationality: 'Uruguay',
    marketValue: 120000000,
    preferredFoot: 'Right',
    clubName: 'Real Madrid',
    positionName: 'Central Midfielder',
    competitionNames: ['UEFA Champions League', 'La Liga', 'FIFA World Cup'],
    agentName: 'Wasserman',
  },
  {
    id: 'player-5',
    name: 'Rodrygo',
    age: 23,
    nationality: 'Brazil',
    marketValue: 110000000,
    preferredFoot: 'Right',
    clubName: 'Real Madrid',
    positionName: 'Right Winger',
    competitionNames: ['UEFA Champions League', 'La Liga'],
    agentName: 'Gestifute',
  },
  {
    id: 'player-6',
    name: 'Eduardo Camavinga',
    age: 21,
    nationality: 'France',
    marketValue: 100000000,
    preferredFoot: 'Left',
    clubName: 'Real Madrid',
    positionName: 'Central Midfielder',
    competitionNames: ['UEFA Champions League', 'La Liga'],
    agentName: 'CAA Stellar',
  },
  {
    id: 'player-7',
    name: 'Aurélien Tchouaméni',
    age: 24,
    nationality: 'France',
    marketValue: 90000000,
    preferredFoot: 'Right',
    clubName: 'Real Madrid',
    positionName: 'Defensive Midfielder',
    competitionNames: ['UEFA Champions League', 'La Liga', 'FIFA World Cup'],
    agentName: 'CAA Stellar',
  },
  {
    id: 'player-8',
    name: 'Thibaut Courtois',
    age: 32,
    nationality: 'Belgium',
    marketValue: 28000000,
    preferredFoot: 'Left',
    clubName: 'Real Madrid',
    positionName: 'Goalkeeper',
    competitionNames: ['UEFA Champions League', 'La Liga'],
    previousClubName: 'Chelsea',
  },

  // --- Manchester City ---
  {
    id: 'player-9',
    name: 'Erling Haaland',
    age: 24,
    nationality: 'Norway',
    marketValue: 180000000,
    preferredFoot: 'Left',
    clubName: 'Manchester City',
    positionName: 'Striker',
    competitionNames: ['UEFA Champions League', 'Premier League'],
    previousClubName: 'Borussia Dortmund',
    agentName: 'Pimenta Sports',
  },
  {
    id: 'player-10',
    name: 'Rodri',
    age: 28,
    nationality: 'Spain',
    marketValue: 130000000,
    preferredFoot: 'Right',
    clubName: 'Manchester City',
    positionName: 'Defensive Midfielder',
    competitionNames: ['UEFA Champions League', 'Premier League', 'FIFA World Cup'],
    previousClubName: 'Atletico Madrid',
    agentName: 'Sports360',
  },
  {
    id: 'player-11',
    name: 'Phil Foden',
    age: 24,
    nationality: 'England',
    marketValue: 150000000,
    preferredFoot: 'Left',
    clubName: 'Manchester City',
    positionName: 'Right Winger',
    competitionNames: ['UEFA Champions League', 'Premier League', 'FIFA World Cup'],
  },
  {
    id: 'player-12',
    name: 'Kevin De Bruyne',
    age: 33,
    nationality: 'Belgium',
    marketValue: 50000000,
    preferredFoot: 'Right',
    clubName: 'Manchester City',
    positionName: 'Central Midfielder',
    competitionNames: ['UEFA Champions League', 'Premier League', 'FIFA World Cup'],
    agentName: 'Wasserman',
  },
  {
    id: 'player-13',
    name: 'Josko Gvardiol',
    age: 22,
    nationality: 'Croatia',
    marketValue: 75000000,
    preferredFoot: 'Left',
    clubName: 'Manchester City',
    positionName: 'Left-Back',
    competitionNames: ['UEFA Champions League', 'Premier League', 'FIFA World Cup'],
    previousClubName: 'RB Leipzig',
  },
  {
    id: 'player-14',
    name: 'Ederson',
    age: 31,
    nationality: 'Brazil',
    marketValue: 35000000,
    preferredFoot: 'Left',
    clubName: 'Manchester City',
    positionName: 'Goalkeeper',
    competitionNames: ['UEFA Champions League', 'Premier League'],
    agentName: 'Gestifute',
  },

  // --- Arsenal ---
  {
    id: 'player-15',
    name: 'Bukayo Saka',
    age: 22,
    nationality: 'England',
    marketValue: 140000000,
    preferredFoot: 'Left',
    clubName: 'Arsenal',
    positionName: 'Right Winger',
    competitionNames: ['UEFA Champions League', 'Premier League', 'FIFA World Cup'],
    agentName: 'CAA Stellar',
  },
  {
    id: 'player-16',
    name: 'Declan Rice',
    age: 25,
    nationality: 'England',
    marketValue: 120000000,
    preferredFoot: 'Right',
    clubName: 'Arsenal',
    positionName: 'Defensive Midfielder',
    competitionNames: ['UEFA Champions League', 'Premier League', 'FIFA World Cup'],
    agentName: 'Wasserman',
  },
  {
    id: 'player-17',
    name: 'Martin Ødegaard',
    age: 25,
    nationality: 'Norway',
    marketValue: 110000000,
    preferredFoot: 'Left',
    clubName: 'Arsenal',
    positionName: 'Attacking Midfielder',
    competitionNames: ['UEFA Champions League', 'Premier League'],
    previousClubName: 'Real Madrid',
    agentName: 'Pimenta Sports',
  },
  {
    id: 'player-18',
    name: 'William Saliba',
    age: 23,
    nationality: 'France',
    marketValue: 80000000,
    preferredFoot: 'Right',
    clubName: 'Arsenal',
    positionName: 'Centre-Back',
    competitionNames: ['UEFA Champions League', 'Premier League', 'FIFA World Cup'],
  },
  {
    id: 'player-19',
    name: 'Gabriel Martinelli',
    age: 23,
    nationality: 'Brazil',
    marketValue: 70000000,
    preferredFoot: 'Right',
    clubName: 'Arsenal',
    positionName: 'Left Winger',
    competitionNames: ['UEFA Champions League', 'Premier League'],
  },
  {
    id: 'player-20',
    name: 'Kai Havertz',
    age: 25,
    nationality: 'Germany',
    marketValue: 75000000,
    preferredFoot: 'Left',
    clubName: 'Arsenal',
    positionName: 'Forward',
    competitionNames: ['UEFA Champions League', 'Premier League', 'FIFA World Cup'],
    previousClubName: 'Chelsea',
    agentName: 'ROOF Group',
  },

  // --- Barcelona ---
  {
    id: 'player-21',
    name: 'Lamine Yamal',
    age: 17,
    nationality: 'Spain',
    marketValue: 150000000,
    preferredFoot: 'Left',
    clubName: 'Barcelona',
    positionName: 'Right Winger',
    competitionNames: ['UEFA Champions League', 'La Liga'],
    agentName: 'Gestifute',
  },
  {
    id: 'player-22',
    name: 'Pedri',
    age: 21,
    nationality: 'Spain',
    marketValue: 80000000,
    preferredFoot: 'Right',
    clubName: 'Barcelona',
    positionName: 'Central Midfielder',
    competitionNames: ['UEFA Champions League', 'La Liga', 'FIFA World Cup'],
  },
  {
    id: 'player-23',
    name: 'Gavi',
    age: 20,
    nationality: 'Spain',
    marketValue: 90000000,
    preferredFoot: 'Right',
    clubName: 'Barcelona',
    positionName: 'Central Midfielder',
    competitionNames: ['UEFA Champions League', 'La Liga', 'FIFA World Cup'],
  },
  {
    id: 'player-24',
    name: 'Robert Lewandowski',
    age: 36,
    nationality: 'Poland',
    marketValue: 15000000,
    preferredFoot: 'Right',
    clubName: 'Barcelona',
    positionName: 'Striker',
    competitionNames: ['UEFA Champions League', 'La Liga', 'FIFA World Cup'],
    previousClubName: 'Bayern Munich',
    agentName: 'Pini Zahavi Management',
  },
  {
    id: 'player-25',
    name: 'Dani Olmo',
    age: 26,
    nationality: 'Spain',
    marketValue: 60000000,
    preferredFoot: 'Right',
    clubName: 'Barcelona',
    positionName: 'Attacking Midfielder',
    competitionNames: ['UEFA Champions League', 'La Liga'],
    previousClubName: 'RB Leipzig',
  },

  // --- Bayern Munich ---
  {
    id: 'player-26',
    name: 'Harry Kane',
    age: 31,
    nationality: 'England',
    marketValue: 100000000,
    preferredFoot: 'Right',
    clubName: 'Bayern Munich',
    positionName: 'Striker',
    competitionNames: ['UEFA Champions League', 'Bundesliga', 'FIFA World Cup'],
    previousClubName: 'Tottenham Hotspur',
    agentName: 'PLG Group',
  },
  {
    id: 'player-27',
    name: 'Jamal Musiala',
    age: 21,
    nationality: 'Germany',
    marketValue: 130000000,
    preferredFoot: 'Right',
    clubName: 'Bayern Munich',
    positionName: 'Attacking Midfielder',
    competitionNames: ['UEFA Champions League', 'Bundesliga', 'FIFA World Cup'],
    previousClubName: 'Chelsea',
    agentName: '11Wins',
  },
  {
    id: 'player-28',
    name: 'Leroy Sané',
    age: 28,
    nationality: 'Germany',
    marketValue: 70000000,
    preferredFoot: 'Left',
    clubName: 'Bayern Munich',
    positionName: 'Right Winger',
    competitionNames: ['UEFA Champions League', 'Bundesliga'],
    previousClubName: 'Manchester City',
    agentName: '11Wins',
  },
  {
    id: 'player-29',
    name: 'Alphonso Davies',
    age: 23,
    nationality: 'Canada',
    marketValue: 50000000,
    preferredFoot: 'Left',
    clubName: 'Bayern Munich',
    positionName: 'Left-Back',
    competitionNames: ['UEFA Champions League', 'Bundesliga', 'FIFA World Cup'],
  },

  // --- Liverpool ---
  {
    id: 'player-30',
    name: 'Mohamed Salah',
    age: 32,
    nationality: 'Egypt',
    marketValue: 55000000,
    preferredFoot: 'Left',
    clubName: 'Liverpool',
    positionName: 'Right Winger',
    competitionNames: ['UEFA Champions League', 'Premier League', 'FIFA World Cup'],
    previousClubName: 'Chelsea',
  },
  {
    id: 'player-31',
    name: 'Virgil van Dijk',
    age: 33,
    nationality: 'Netherlands',
    marketValue: 30000000,
    preferredFoot: 'Right',
    clubName: 'Liverpool',
    positionName: 'Centre-Back',
    competitionNames: ['UEFA Champions League', 'Premier League', 'FIFA World Cup'],
    agentName: 'Wasserman',
  },
  {
    id: 'player-32',
    name: 'Trent Alexander-Arnold',
    age: 25,
    nationality: 'England',
    marketValue: 70000000,
    preferredFoot: 'Right',
    clubName: 'Liverpool',
    positionName: 'Right-Back',
    competitionNames: ['UEFA Champions League', 'Premier League', 'FIFA World Cup'],
    agentName: 'PLG Group',
  },
  {
    id: 'player-33',
    name: 'Alexis Mac Allister',
    age: 25,
    nationality: 'Argentina',
    marketValue: 75000000,
    preferredFoot: 'Right',
    clubName: 'Liverpool',
    positionName: 'Central Midfielder',
    competitionNames: ['UEFA Champions League', 'Premier League', 'FIFA World Cup'],
  },
  {
    id: 'player-34',
    name: 'Dominik Szoboszlai',
    age: 23,
    nationality: 'Hungary',
    marketValue: 75000000,
    preferredFoot: 'Right',
    clubName: 'Liverpool',
    positionName: 'Central Midfielder',
    competitionNames: ['UEFA Champions League', 'Premier League'],
    previousClubName: 'RB Leipzig',
  },

  // --- Bayer Leverkusen ---
  {
    id: 'player-35',
    name: 'Florian Wirtz',
    age: 21,
    nationality: 'Germany',
    marketValue: 130000000,
    preferredFoot: 'Right',
    clubName: 'Bayer Leverkusen',
    positionName: 'Attacking Midfielder',
    competitionNames: ['UEFA Champions League', 'Bundesliga'],
    agentName: 'Sports360',
  },

  // --- Chelsea ---
  {
    id: 'player-36',
    name: 'Cole Palmer',
    age: 22,
    nationality: 'England',
    marketValue: 90000000,
    preferredFoot: 'Left',
    clubName: 'Chelsea',
    positionName: 'Attacking Midfielder',
    competitionNames: ['Premier League', 'UEFA Europa League'],
    previousClubName: 'Manchester City',
    agentName: 'Unique Sports Group',
  },
  {
    id: 'player-37',
    name: 'Enzo Fernández',
    age: 23,
    nationality: 'Argentina',
    marketValue: 75000000,
    preferredFoot: 'Right',
    clubName: 'Chelsea',
    positionName: 'Central Midfielder',
    competitionNames: ['Premier League', 'FIFA World Cup'],
  },

  // --- Atletico Madrid ---
  {
    id: 'player-38',
    name: 'Julián Alvarez',
    age: 24,
    nationality: 'Argentina',
    marketValue: 90000000,
    preferredFoot: 'Right',
    clubName: 'Atletico Madrid',
    positionName: 'Striker',
    competitionNames: ['UEFA Champions League', 'La Liga', 'FIFA World Cup'],
    previousClubName: 'Manchester City',
  },
  {
    id: 'player-39',
    name: 'Antoine Griezmann',
    age: 33,
    nationality: 'France',
    marketValue: 25000000,
    preferredFoot: 'Left',
    clubName: 'Atletico Madrid',
    positionName: 'Forward',
    competitionNames: ['UEFA Champions League', 'La Liga', 'FIFA World Cup'],
    previousClubName: 'Barcelona',
  },

  // --- Inter Milan ---
  {
    id: 'player-40',
    name: 'Lautaro Martínez',
    age: 27,
    nationality: 'Argentina',
    marketValue: 110000000,
    preferredFoot: 'Right',
    clubName: 'Inter Milan',
    positionName: 'Striker',
    competitionNames: ['UEFA Champions League', 'Serie A', 'FIFA World Cup'],
  },
  {
    id: 'player-41',
    name: 'Nicolò Barella',
    age: 27,
    nationality: 'Italy',
    marketValue: 80000000,
    preferredFoot: 'Right',
    clubName: 'Inter Milan',
    positionName: 'Central Midfielder',
    competitionNames: ['UEFA Champions League', 'Serie A'],
  },

  // --- Paris Saint-Germain ---
  {
    id: 'player-42',
    name: 'Ousmane Dembélé',
    age: 27,
    nationality: 'France',
    marketValue: 60000000,
    preferredFoot: 'Both',
    clubName: 'Paris Saint-Germain',
    positionName: 'Right Winger',
    competitionNames: ['UEFA Champions League', 'Ligue 1', 'FIFA World Cup'],
    previousClubName: 'Barcelona',
  },
  {
    id: 'player-43',
    name: 'Achraf Hakimi',
    age: 25,
    nationality: 'Morocco',
    marketValue: 60000000,
    preferredFoot: 'Right',
    clubName: 'Paris Saint-Germain',
    positionName: 'Right-Back',
    competitionNames: ['UEFA Champions League', 'Ligue 1', 'FIFA World Cup'],
    previousClubName: 'Inter Milan',
  },

  // --- Sporting CP & others ---
  {
    id: 'player-44',
    name: 'Viktor Gyökeres',
    age: 26,
    nationality: 'Sweden',
    marketValue: 65000000,
    preferredFoot: 'Right',
    clubName: 'Sporting CP',
    positionName: 'Striker',
    competitionNames: ['UEFA Champions League'],
  },
  {
    id: 'player-45',
    name: 'Rafael Leão',
    age: 25,
    nationality: 'Portugal',
    marketValue: 90000000,
    preferredFoot: 'Right',
    clubName: 'AC Milan',
    positionName: 'Left Winger',
    competitionNames: ['UEFA Champions League', 'Serie A'],
  },
  {
    id: 'player-46',
    name: 'Khvicha Kvaratskhelia',
    age: 23,
    nationality: 'Georgia',
    marketValue: 80000000,
    preferredFoot: 'Both',
    clubName: 'Napoli',
    positionName: 'Left Winger',
    competitionNames: ['Serie A'],
  },
  {
    id: 'player-47',
    name: 'Victor Osimhen',
    age: 25,
    nationality: 'Nigeria',
    marketValue: 75000000,
    preferredFoot: 'Right',
    clubName: 'Napoli',
    positionName: 'Striker',
    competitionNames: ['Serie A'],
    agentName: 'Epic Sports Management',
  },
  {
    id: 'player-48',
    name: 'Bruno Fernandes',
    age: 29,
    nationality: 'Portugal',
    marketValue: 65000000,
    preferredFoot: 'Right',
    clubName: 'Manchester United',
    positionName: 'Attacking Midfielder',
    competitionNames: ['Premier League', 'UEFA Europa League'],
    previousClubName: 'Sporting CP',
    agentName: 'Gestifute',
  },
];

async function run() {
  const driver = getDriver();
  const session = driver.session({ defaultAccessMode: 'WRITE' as any });

  try {
    console.log('[seed] Creating uniqueness constraints...');
    for (const label of ['Player', 'Club', 'Position', 'Country', 'Competition', 'Agent']) {
      await session.executeWrite((tx) =>
        tx.run(`CREATE CONSTRAINT ${label.toLowerCase()}_id IF NOT EXISTS FOR (n:${label}) REQUIRE n.id IS UNIQUE`)
      );
    }

    console.log('[seed] Clearing existing data...');
    await session.executeWrite((tx) => tx.run('MATCH (n) DETACH DELETE n'));

    console.log('[seed] Loading reference nodes (countries, positions, competitions, agents, clubs)...');
    await session.executeWrite((tx) =>
      tx.run('UNWIND $rows AS row CREATE (n:Country {id: row.id, name: row.name})', { rows: COUNTRIES })
    );
    await session.executeWrite((tx) =>
      tx.run('UNWIND $rows AS row CREATE (n:Position {id: row.id, name: row.name})', { rows: POSITIONS })
    );
    await session.executeWrite((tx) =>
      tx.run(
        'UNWIND $rows AS row CREATE (n:Competition {id: row.id, name: row.name, level: row.level})',
        { rows: COMPETITIONS }
      )
    );
    await session.executeWrite((tx) =>
      tx.run('UNWIND $rows AS row CREATE (n:Agent {id: row.id, name: row.name})', { rows: AGENTS })
    );
    await session.executeWrite((tx) =>
      tx.run(
        'UNWIND $rows AS row CREATE (n:Club {id: row.id, name: row.name, country: row.country, league: row.league})',
        { rows: CLUBS_DATA }
      )
    );

    console.log(`[seed] Loading ${REAL_PLAYERS.length} real players...`);
    const playerRows = REAL_PLAYERS.map((p) => ({
      id: p.id,
      name: p.name,
      age: p.age,
      nationality: p.nationality,
      marketValue: p.marketValue,
      preferredFoot: p.preferredFoot,
    }));

    await session.executeWrite((tx) =>
      tx.run(
        `UNWIND $rows AS row
         CREATE (p:Player {id: row.id, name: row.name, age: row.age, nationality: row.nationality,
                            marketValue: row.marketValue, preferredFoot: row.preferredFoot})`,
        { rows: playerRows }
      )
    );

    console.log('[seed] Wiring PLAYS_FOR, PLAYS_POSITION, REPRESENTS...');
    const playsForRows = REAL_PLAYERS.map((p) => ({ playerId: p.id, clubName: p.clubName }));
    await session.executeWrite((tx) =>
      tx.run(
        `UNWIND $rows AS row
         MATCH (p:Player {id: row.playerId}), (c:Club {name: row.clubName})
         CREATE (p)-[:PLAYS_FOR]->(c)`,
        { rows: playsForRows }
      )
    );

    const playsPositionRows = REAL_PLAYERS.map((p) => ({ playerId: p.id, positionName: p.positionName }));
    await session.executeWrite((tx) =>
      tx.run(
        `UNWIND $rows AS row
         MATCH (p:Player {id: row.playerId}), (pos:Position {name: row.positionName})
         CREATE (p)-[:PLAYS_POSITION]->(pos)`,
        { rows: playsPositionRows }
      )
    );

    const representsRows = REAL_PLAYERS.map((p) => ({ playerId: p.id, countryName: p.nationality }));
    await session.executeWrite((tx) =>
      tx.run(
        `UNWIND $rows AS row
         MATCH (p:Player {id: row.playerId}), (co:Country {name: row.countryName})
         CREATE (p)-[:REPRESENTS]->(co)`,
        { rows: representsRows }
      )
    );

    console.log('[seed] Wiring COMPETED_IN...');
    const competedRows = REAL_PLAYERS.flatMap((p) =>
      p.competitionNames.map((compName) => ({ playerId: p.id, compName }))
    );
    await session.executeWrite((tx) =>
      tx.run(
        `UNWIND $rows AS row
         MATCH (p:Player {id: row.playerId}), (comp:Competition {name: row.compName})
         CREATE (p)-[:COMPETED_IN]->(comp)`,
        { rows: competedRows }
      )
    );

    console.log('[seed] Wiring PREVIOUSLY_PLAYED_FOR...');
    const prevRows = REAL_PLAYERS.filter((p) => p.previousClubName).map((p) => ({
      playerId: p.id,
      clubName: p.previousClubName!,
    }));
    await session.executeWrite((tx) =>
      tx.run(
        `UNWIND $rows AS row
         MATCH (p:Player {id: row.playerId}), (c:Club {name: row.clubName})
         CREATE (p)-[:PREVIOUSLY_PLAYED_FOR]->(c)`,
        { rows: prevRows }
      )
    );

    console.log('[seed] Wiring REPRESENTED_BY...');
    const agentRows = REAL_PLAYERS.filter((p) => p.agentName).map((p) => ({
      playerId: p.id,
      agentName: p.agentName!,
    }));
    await session.executeWrite((tx) =>
      tx.run(
        `UNWIND $rows AS row
         MATCH (p:Player {id: row.playerId}), (a:Agent {name: row.agentName})
         CREATE (p)-[:REPRESENTED_BY]->(a)`,
        { rows: agentRows }
      )
    );

    console.log('[seed] Wiring TEAMMATE_OF edges...');
    const teammateEdges: { from: string; to: string }[] = [];

    // Club teammates
    const byClub = new Map<string, RealPlayerInput[]>();
    for (const p of REAL_PLAYERS) {
      if (!byClub.has(p.clubName)) byClub.set(p.clubName, []);
      byClub.get(p.clubName)!.push(p);
    }
    for (const roster of byClub.values()) {
      for (let i = 0; i < roster.length; i++) {
        for (let j = 0; j < roster.length; j++) {
          if (i !== j) teammateEdges.push({ from: roster[i].id, to: roster[j].id });
        }
      }
    }

    // National team teammates
    const byCountry = new Map<string, RealPlayerInput[]>();
    for (const p of REAL_PLAYERS) {
      if (!byCountry.has(p.nationality)) byCountry.set(p.nationality, []);
      byCountry.get(p.nationality)!.push(p);
    }
    for (const squad of byCountry.values()) {
      for (let i = 0; i < squad.length; i++) {
        for (let j = 0; j < squad.length; j++) {
          if (i !== j && squad[i].clubName !== squad[j].clubName) {
            teammateEdges.push({ from: squad[i].id, to: squad[j].id });
          }
        }
      }
    }

    await session.executeWrite((tx) =>
      tx.run(
        `UNWIND $rows AS row
         MATCH (a:Player {id: row.from}), (b:Player {id: row.to})
         CREATE (a)-[:TEAMMATE_OF]->(b)`,
        { rows: teammateEdges }
      )
    );

    console.log('[seed] Done! Successfully loaded real-world football dataset:');
    console.log(`  ${COUNTRIES.length} countries, ${POSITIONS.length} positions, ${COMPETITIONS.length} competitions`);
    console.log(`  ${AGENTS.length} agents, ${CLUBS_DATA.length} clubs`);
    console.log(`  ${REAL_PLAYERS.length} real players, ${teammateEdges.length} TEAMMATE_OF edges`);
    console.log(`  ${competedRows.length} COMPETED_IN, ${prevRows.length} PREVIOUSLY_PLAYED_FOR, ${agentRows.length} REPRESENTED_BY`);
  } finally {
    await session.close();
    await closeDriver();
  }
}

run().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
