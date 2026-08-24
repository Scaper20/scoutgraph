-- cypher/network.cypher
-- Reference copy of the network-visualization query used by the Explore
-- page and the player profile's embedded graph. Executable version (with
-- node/edge shaping for the frontend) lives in lib/queries.ts as
-- getPlayerNetwork().

MATCH (p:Player {id: $playerId})
OPTIONAL MATCH (p)-[:PLAYS_FOR]->(club:Club)
OPTIONAL MATCH (p)-[:PLAYS_POSITION]->(position:Position)
OPTIONAL MATCH (p)-[:REPRESENTS]->(country:Country)
OPTIONAL MATCH (p)-[:REPRESENTED_BY]->(agent:Agent)
OPTIONAL MATCH (p)-[:COMPETED_IN]->(comp:Competition)
OPTIONAL MATCH (p)-[:PREVIOUSLY_PLAYED_FOR]->(prevClub:Club)
OPTIONAL MATCH (p)-[:TEAMMATE_OF]->(teammate:Player)
RETURN p, club, position, country, agent,
       collect(DISTINCT comp) AS competitions,
       collect(DISTINCT prevClub) AS previousClubs,
       collect(DISTINCT teammate) AS teammates;
