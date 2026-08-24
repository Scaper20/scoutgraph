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

  const uri = process.env.COGNODB_URI;
  const username = process.env.COGNODB_USERNAME || 'cognodb';
  const password = process.env.COGNODB_PASSWORD;

  if (!uri || !password) {
    throw new DatabaseUnavailableError(
      new Error('COGNODB_URI / COGNODB_PASSWORD are not set in the environment.')
    );
  }

  driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
    maxConnectionPoolSize: 20,
    connectionAcquisitionTimeout: 10_000,
    disableLosslessIntegers: true,
  });

  return driver;
}

/** Recursively convert Neo4j Integer objects ({ low, high }) or neo4j.isInt values to JS numbers */
export function toNative<T = any>(val: any): T {
  if (val === null || val === undefined) return val;
  if (neo4j.isInt && neo4j.isInt(val)) return val.toNumber() as any;
  if (typeof val === 'object') {
    if (typeof val.low === 'number' && typeof val.high === 'number') {
      return neo4j.integer.toNumber(val) as any;
    }
    if (Array.isArray(val)) {
      return val.map(toNative) as any;
    }
    const res: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      res[key] = toNative(val[key]);
    }
    return res as any;
  }
  return val;
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
    return result.records.map((r) => toNative<T>(r.toObject()));
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
    return result.records.map((r) => toNative<T>(r.toObject()));
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
