-- cypher/players.cypher
-- Reference copy of the player-centric queries. The executable versions,
-- wired to the Neo4j driver with parameters, live in lib/queries.ts.

-- Query 1 — Player Lookup
MATCH (p:Player {name: $name})
OPTIONAL MATCH (p)-[:PLAYS_FOR]->(club:Club)
OPTIONAL MATCH (p)-[:PLAYS_POSITION]->(position:Position)
RETURN p, club, position;

-- Query 2 — Teammates
MATCH (p:Player {name: $name})-[:TEAMMATE_OF]->(teammate:Player)
RETURN teammate
ORDER BY teammate.name;

-- Query 3 — Multi-Hop Club Traversal (2 hops: player -> teammate -> club)
MATCH (p:Player {name: $name})-[:TEAMMATE_OF]->(teammate:Player)-[:PLAYS_FOR]->(club:Club)
RETURN teammate, club;
