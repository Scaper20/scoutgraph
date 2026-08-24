// scripts/seed.ts
//
// Loads a realistic, entirely fictional football dataset into CognoDB:
// players, clubs, positions, countries, competitions, and agents, wired
// together with the relationships in the data model. Uses UNWIND-based
// batch writes rather than one query per row — this matters on the
// CognoDB free tier's burstable 0.5 vCPU instance.
//
// All names, clubs, and competitions are invented — this keeps the demo
// dataset free of any real-person or real-competition trademark issues,
// per the assignment's "originality counts" guidance.
//
// Run with: npm run seed (reads connection details from .env.local)

import 'dotenv/config';
import { getDriver, closeDriver } from '../lib/cognodb';

// --- Deterministic PRNG so the dataset is reproducible across runs ---
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260824);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// --- Reference data ---
const FIRST_NAMES = [
  'Liam', 'Noah', 'Mateo', 'Lucas', 'Kai', 'Diego', 'Josef', 'Tomás', 'Anders', 'Mikael',
  'Chidi', 'Kwame', 'Youssef', 'Karim', 'Hassan', 'Ravi', 'Arjun', 'Haruto', 'Ren', 'Pedro',
  'Rafael', 'Bruno', 'Marco', 'Luca', 'Enzo', 'Dario', 'Milan', 'Ivan', 'Petar', 'Erik',
  'Sven', 'Niko', 'Théo', 'Hugo', 'Léo', 'Jonas', 'Felix', 'Oskar', 'Adrian', 'Marcin',
];
const LAST_NAMES = [
  'Silva', 'Santos', 'Costa', 'Ferreira', 'Almeida', 'Bello', 'Okafor', 'Mensah', 'Diallo', 'Traoré',
  'Novak', 'Horvat', 'Popović', 'Ivanov', 'Petrov', 'Kowalski', 'Nowak', 'Andersson', 'Nilsson', 'Larsson',
  'Müller', 'Weber', 'Schmidt', 'Fischer', 'Rossi', 'Bianchi', 'Romano', 'Conti', 'Martins', 'Fonseca',
  'Cardoso', 'Nakamura', 'Sato', 'Tanaka', 'García', 'Fernández', 'López', 'Morales', 'Dubois', 'Moreau',
];

const COUNTRIES = [
  'Brazil', 'Argentina', 'Portugal', 'Spain', 'France', 'Germany', 'Italy', 'Netherlands',
  'England', 'Nigeria', 'Ghana', 'Senegal', 'Morocco', 'Japan', 'South Korea', 'Croatia',
  'Serbia', 'Sweden',
].map((name, i) => ({ id: `country-${i + 1}`, name }));

const POSITIONS = [
  'Goalkeeper', 'Centre-Back', 'Right-Back', 'Left-Back', 'Defensive Midfielder',
  'Central Midfielder', 'Attacking Midfielder', 'Right Winger', 'Left Winger', 'Striker',
].map((name, i) => ({ id: `position-${i + 1}`, name }));

// Fictional competitions — invented names, not real tournaments.
const COMPETITIONS = [
  { name: 'Continental Champions Cup', level: 'Continental' },
  { name: 'Atlantic League', level: 'Domestic' },
  { name: 'Northern Alliance Cup', level: 'Continental' },
  { name: 'Coastal Premier League', level: 'Domestic' },
  { name: 'Iberian Trophy', level: 'Domestic' },
  { name: 'Trans-Continental Shield', level: 'International' },
  { name: 'Golden Cup Qualifiers', level: 'International' },
  { name: 'World Invitational', level: 'International' },
].map((c, i) => ({ id: `competition-${i + 1}`, name: c.name, level: c.level, country: '' }));

const AGENTS = [
  'Apex Sports Management', 'Meridian Talent Group', 'Vantage Player Management', 'NorthStar Sports Agency',
  'BluePeak Athlete Management', 'Summit Sports Partners', 'Crestline Talent', 'Ironclad Player Management',
  'Horizon Sports Group', 'Beacon Athlete Management', 'Cornerstone Sports Agency', 'Trueline Talent Management',
  'Pinnacle Player Group', 'Sterling Sports Management', 'Anchor Athlete Partners',
].map((name, i) => ({ id: `agent-${i + 1}`, name }));

// Fictional clubs — invented names, each assigned a fictional league + a country.
const CLUB_NAMES = [
  'Riverside FC', 'Northgate United', 'Portside Athletic', 'Harborview FC', 'Ironbridge United',
  'Sunhaven FC', 'Westfield Rovers', 'Cliffside United', 'Meadowbrook FC', 'Stonegate Athletic',
  'Silverlake FC', 'Ashford United', 'Brightside FC', 'Kingsmere Rovers', 'Fairhaven United',
  'Oakridge FC', 'Millbrook Athletic', 'Redcliff United', 'Glendale FC', 'Thornwood Rovers',
  'Bellmont United', 'Pinehurst FC', 'Eastgate Athletic', 'Wintervale United',
];
const LEAGUE_NAMES = ['Premier Division', 'First League', 'Top Flight', 'Elite Division'];

const CLUBS = CLUB_NAMES.map((name, i) => ({
  id: `club-${i + 1}`,
  name,
  country: pick(COUNTRIES).name,
  league: pick(LEAGUE_NAMES),
}));

// --- Player generation ---
interface GenPlayer {
  id: string; name: string; age: number; nationality: string; marketValue: number; preferredFoot: string;
  clubId: string; positionId: string; competitionIds: string[]; previousClubId: string | null; agentId: string | null;
}

const players: GenPlayer[] = [];
let playerCounter = 0;
const usedNames = new Set<string>();

for (const club of CLUBS) {
  const rosterSize = 5 + Math.floor(rand() * 3); // 5-7 players per club
  for (let i = 0; i < rosterSize; i++) {
    let name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    while (usedNames.has(name)) name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    usedNames.add(name);
    playerCounter += 1;

    const isGoalkeeper = i === 0; // ensure every club has a keeper
    const position = isGoalkeeper ? POSITIONS[0] : pick(POSITIONS.slice(1));
    const nationality = pick(COUNTRIES).name;
    const competitionIds = shuffle(COMPETITIONS.map((c) => c.id)).slice(0, 1 + Math.floor(rand() * 2));
    const hasPreviousClub = rand() < 0.35;
    const previousClub = hasPreviousClub
      ? pick(CLUBS.filter((c) => c.id !== club.id))
      : null;
    const hasAgent = rand() < 0.7;

    players.push({
      id: `player-${playerCounter}`,
      name,
      age: 18 + Math.floor(rand() * 18),
      nationality,
      marketValue: Math.round((200_000 + rand() * 78_000_000) / 50_000) * 50_000,
      preferredFoot: rand() < 0.62 ? 'Right' : rand() < 0.85 ? 'Left' : 'Both',
      clubId: club.id,
      positionId: position.id,
      competitionIds,
      previousClubId: previousClub ? previousClub.id : null,
      agentId: hasAgent ? pick(AGENTS).id : null,
    });
  }
}

// --- TEAMMATE_OF edges ---
// (a) Every pair of players at the same current club — direct club teammates.
const teammateEdges: { from: string; to: string }[] = [];
const byClub = new Map<string, GenPlayer[]>();
for (const p of players) {
  if (!byClub.has(p.clubId)) byClub.set(p.clubId, []);
  byClub.get(p.clubId)!.push(p);
}
for (const roster of byClub.values()) {
  for (let i = 0; i < roster.length; i++) {
    for (let j = 0; j < roster.length; j++) {
      if (i !== j) teammateEdges.push({ from: roster[i].id, to: roster[j].id });
    }
  }
}

// (b) International teammates — players sharing a nationality (national-team
// teammates), linking players across different clubs. This is what makes
// the 1-2 hop TEAMMATE_OF traversal meaningfully cross club boundaries
// instead of staying inside one club's roster.
const byNationality = new Map<string, GenPlayer[]>();
for (const p of players) {
  if (!byNationality.has(p.nationality)) byNationality.set(p.nationality, []);
  byNationality.get(p.nationality)!.push(p);
}
for (const group of byNationality.values()) {
  if (group.length < 4) continue;
  for (const p of group) {
    const others = shuffle(group.filter((o) => o.id !== p.id)).slice(0, 2);
    for (const o of others) {
      teammateEdges.push({ from: p.id, to: o.id });
      teammateEdges.push({ from: o.id, to: p.id });
    }
  }
}

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
        { rows: CLUBS }
      )
    );

    console.log(`[seed] Loading ${players.length} players...`);
    await session.executeWrite((tx) =>
      tx.run(
        `UNWIND $rows AS row
         CREATE (p:Player {id: row.id, name: row.name, age: row.age, nationality: row.nationality,
                            marketValue: row.marketValue, preferredFoot: row.preferredFoot})`,
        { rows: players }
      )
    );

    console.log('[seed] Wiring PLAYS_FOR, PLAYS_POSITION, REPRESENTS...');
    await session.executeWrite((tx) =>
      tx.run(
        `UNWIND $rows AS row
         MATCH (p:Player {id: row.id}), (c:Club {id: row.clubId})
         CREATE (p)-[:PLAYS_FOR]->(c)`,
        { rows: players }
      )
    );
    await session.executeWrite((tx) =>
      tx.run(
        `UNWIND $rows AS row
         MATCH (p:Player {id: row.id}), (pos:Position {id: row.positionId})
         CREATE (p)-[:PLAYS_POSITION]->(pos)`,
        { rows: players }
      )
    );
    await session.executeWrite((tx) =>
      tx.run(
        `UNWIND $rows AS row
         MATCH (p:Player {id: row.id}), (co:Country {name: row.nationality})
         CREATE (p)-[:REPRESENTS]->(co)`,
        { rows: players }
      )
    );

    console.log('[seed] Wiring COMPETED_IN...');
    const competedRows = players.flatMap((p) => p.competitionIds.map((cid) => ({ playerId: p.id, compId: cid })));
    await session.executeWrite((tx) =>
      tx.run(
        `UNWIND $rows AS row
         MATCH (p:Player {id: row.playerId}), (comp:Competition {id: row.compId})
         CREATE (p)-[:COMPETED_IN]->(comp)`,
        { rows: competedRows }
      )
    );

    console.log('[seed] Wiring PREVIOUSLY_PLAYED_FOR...');
    const prevRows = players.filter((p) => p.previousClubId).map((p) => ({ playerId: p.id, clubId: p.previousClubId }));
    await session.executeWrite((tx) =>
      tx.run(
        `UNWIND $rows AS row
         MATCH (p:Player {id: row.playerId}), (c:Club {id: row.clubId})
         CREATE (p)-[:PREVIOUSLY_PLAYED_FOR]->(c)`,
        { rows: prevRows }
      )
    );

    console.log('[seed] Wiring REPRESENTED_BY...');
    const agentRows = players.filter((p) => p.agentId).map((p) => ({ playerId: p.id, agentId: p.agentId }));
    await session.executeWrite((tx) =>
      tx.run(
        `UNWIND $rows AS row
         MATCH (p:Player {id: row.playerId}), (a:Agent {id: row.agentId})
         CREATE (p)-[:REPRESENTED_BY]->(a)`,
        { rows: agentRows }
      )
    );

    console.log(`[seed] Wiring ${teammateEdges.length} TEAMMATE_OF edges...`);
    // Batch in chunks to stay well within the free tier's memory limits.
    const CHUNK = 500;
    for (let i = 0; i < teammateEdges.length; i += CHUNK) {
      const chunk = teammateEdges.slice(i, i + CHUNK);
      await session.executeWrite((tx) =>
        tx.run(
          `UNWIND $rows AS row
           MATCH (a:Player {id: row.from}), (b:Player {id: row.to})
           CREATE (a)-[:TEAMMATE_OF]->(b)`,
          { rows: chunk }
        )
      );
    }

    console.log('[seed] Done. Loaded:');
    console.log(`  ${COUNTRIES.length} countries, ${POSITIONS.length} positions, ${COMPETITIONS.length} competitions`);
    console.log(`  ${AGENTS.length} agents, ${CLUBS.length} clubs`);
    console.log(`  ${players.length} players, ${teammateEdges.length} TEAMMATE_OF edges`);
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
