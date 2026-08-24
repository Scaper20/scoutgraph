-- cypher/recommendations.cypher
-- Reference copy of the discovery queries. Executable versions live in
-- lib/queries.ts as getRelatedPlayers() and discoverConnectedPlayers().

-- Query 4 — Multi-Hop Player Discovery.
-- The headline "why a graph database" example: candidates reachable from
-- the target player through 1-2 TEAMMATE_OF hops who previously played
-- for a given club. In a relational schema this needs a recursive CTE
-- over the roster/teammate join table, then another join to a transfer
-- history table — here it's one readable pattern.
MATCH (target:Player {name: $playerName})
      -[:TEAMMATE_OF*1..2]->
      (candidate:Player)
      -[:PREVIOUSLY_PLAYED_FOR]->
      (club:Club {name: $clubName})
RETURN DISTINCT candidate;

-- Related Players — four independent relationship paths (shared teammate
-- network, current club, previous club, shared competition), combined
-- with UNION. Each branch alone is a simple self-join in SQL, but running
-- all four together — especially with the 2-hop teammate branch — is
-- exactly the kind of query relational schemas make awkward.
MATCH (target:Player {id: $playerId})-[:TEAMMATE_OF*1..2]->(candidate:Player)
WHERE candidate.id <> $playerId
RETURN DISTINCT candidate.id AS id, candidate.name AS name, 'Shared teammate network' AS reason
UNION
MATCH (target:Player {id: $playerId})-[:PLAYS_FOR]->(:Club)<-[:PLAYS_FOR]-(candidate:Player)
WHERE candidate.id <> $playerId
RETURN DISTINCT candidate.id AS id, candidate.name AS name, 'Current club' AS reason
UNION
MATCH (target:Player {id: $playerId})-[:PREVIOUSLY_PLAYED_FOR]->(:Club)<-[:PREVIOUSLY_PLAYED_FOR]-(candidate:Player)
WHERE candidate.id <> $playerId
RETURN DISTINCT candidate.id AS id, candidate.name AS name, 'Previous club' AS reason
UNION
MATCH (target:Player {id: $playerId})-[:COMPETED_IN]->(:Competition)<-[:COMPETED_IN]-(candidate:Player)
WHERE candidate.id <> $playerId
RETURN DISTINCT candidate.id AS id, candidate.name AS name, 'Shared competition' AS reason;
