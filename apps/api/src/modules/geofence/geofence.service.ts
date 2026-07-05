import { db } from "../../db/index.js"
import { geofences } from "../../db/schema.js"
import { eq, and } from "drizzle-orm"
import type { Polygon } from "../../lib/geo.js"

export type ActiveZone = { id: string; name: string; points: Polygon }

// Short-lived per-org cache so we don't hit the DB on every 10s heartbeat.
const TTL_MS = 20_000
const cache = new Map<string, { zones: ActiveZone[]; ts: number }>()

/** Active zones for an org, cached for TTL_MS. */
export async function getActiveZones(orgId: string): Promise<ActiveZone[]> {
  const hit = cache.get(orgId)
  if (hit && Date.now() - hit.ts < TTL_MS) return hit.zones

  const rows = await db
    .select({ id: geofences.id, name: geofences.name, points: geofences.points })
    .from(geofences)
    .where(and(eq(geofences.organizationId, orgId), eq(geofences.isActive, true)))

  const zones = rows as ActiveZone[]
  cache.set(orgId, { zones, ts: Date.now() })
  return zones
}

/** Clear the cache for an org after any geofence create/update/delete. */
export function invalidateGeofenceCache(orgId: string): void {
  cache.delete(orgId)
}
