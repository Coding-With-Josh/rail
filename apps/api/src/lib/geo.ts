// Geofence geometry helpers. All coordinates are [lng, lat] (Mapbox order) to
// stay consistent with how zones are stored and rendered on the dashboard.

export type Point = [number, number]   // [lng, lat]
export type Polygon = Point[]

/**
 * Ray-casting point-in-polygon test. Returns true if the point lies inside the
 * polygon. Polygons with fewer than 3 vertices are never "inside".
 */
export function pointInPolygon(point: Point, polygon: Polygon): boolean {
  if (!polygon || polygon.length < 3) return false

  const [x, y] = point
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]

    const intersects =
      (yi > y) !== (yj > y) &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi

    if (intersects) inside = !inside
  }

  return inside
}

/**
 * True if the point is inside ANY of the given zones. An empty zone list means
 * no geofencing is configured, so nothing is ever "outside".
 */
export function isInsideAnyZone(point: Point, zones: { points: Polygon }[]): boolean {
  if (!zones || zones.length === 0) return true
  return zones.some((z) => pointInPolygon(point, z.points))
}
