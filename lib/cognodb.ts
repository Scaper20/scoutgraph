// lib/cognodb.ts
//
// Central place that creates and exports the Neo4j driver instance pointed
// at CognoDB Cloud. CognoDB speaks Bolt and is fully compatible with the
// official Neo4j JavaScript driver — no custom SDK needed.
//
// This module is server-only: it is imported by API routes and the seed
// script, never by client components. Connection details come exclusively
// from environment variables (see .env.example) and are never sent to
// the browser.

import neo4j, { Driver } from 'neo4j-driver';

const COGNODB_URI = process.env.COGNODB_URI;
const COGNODB_USERNAME = process.env.COGNODB_USERNAME || 'cognodb';
const COGNODB_PASSWORD = process.env.COGNODB_PASSWORD;

let driver: Driver | null = null;

export class DatabaseUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('The graph database is currently unreachable.');
    this.name = 'DatabaseUnavailableError';
    if (cause) this.cause = cause as Error;
  }
}

export function getDriver(): Driver {
  if (driver) return driver;

  if (!COGNODB_URI || !COGNODB_PASSWORD) {
    throw new DatabaseUnavailableError(
      new Error('COGNODB_URI / COGNODB_PASSWORD are not set in the environment.')
    );
  }

  driver = neo4j.driver(COGNODB_URI, neo4j.auth.basic(COGNODB_USERNAME, COGNODB_PASSWORD), {
    maxConnectionPoolSize: 20,
    connectionAcquisitionTimeout: 10_000,
  });

  return driver;
}

export async function verifyConnectivity(): Promise<void> {
  const d = getDriver();
  await d.verifyConnectivity();
}

/**
 * Run a single parameterised, read-only Cypher statement and return
 * plain JS records. Never build `cypher` by concatenating user input —
 * always pass values through `params`.
 */
export async function runQuery<T = Record<string, unknown>>(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  let d: Driver;
  try {
    d = getDriver();
  } catch (err) {
    throw new DatabaseUnavailableError(err);
  }

  const session = d.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const result = await session.run(cypher, params);
    return result.records.map((r) => r.toObject() as T);
  } catch (err) {
    // Never leak driver internals (host, auth details) to API responses —
    // log server-side only, throw a generic error to the caller.
    console.error('[cognodb] query failed:', (err as Error).message);
    throw new DatabaseUnavailableError(err);
  } finally {
    await session.close();
  }
}

/** Run a parameterised write statement inside an explicit write transaction. */
export async function runWrite<T = Record<string, unknown>>(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  let d: Driver;
  try {
    d = getDriver();
  } catch (err) {
    throw new DatabaseUnavailableError(err);
  }

  const session = d.session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    const result = await session.executeWrite((tx) => tx.run(cypher, params));
    return result.records.map((r) => r.toObject() as T);
  } catch (err) {
    console.error('[cognodb] write failed:', (err as Error).message);
    throw new DatabaseUnavailableError(err);
  } finally {
    await session.close();
  }
}

export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
