"use client"

import { useRef, useEffect, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { useSession } from 'next-auth/react'
import { Plus, Minus, Locate, Layers, Pentagon, Check, X } from 'lucide-react'
import { type Device, type DeviceStatus } from '@/lib/mock-devices'
import { useRailSocket } from '@/hooks/use-rail-socket'
import DeviceMarker from '@/components/device-marker'
import HoverCard from '@/components/hover-card'
import DeviceSideSheet from '@/components/device-side-sheet'

type Geofence = { id: string; name: string; points: [number, number][]; isActive: boolean }

const ZONE_SOURCE = "geofences"
const ZONE_FILL = "geofences-fill"
const ZONE_LINE = "geofences-line"
const DRAFT_SOURCE = "geofence-draft"
const DRAFT_FILL = "geofence-draft-fill"
const DRAFT_LINE = "geofence-draft-line"

// Build a GeoJSON FeatureCollection of polygons from zones (each ring closed).
function zonesToGeoJSON(zones: Geofence[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = zones
    .filter((z) => z.points.length >= 3)
    .map((z) => ({
      type: "Feature",
      properties: { id: z.id, name: z.name },
      geometry: { type: "Polygon", coordinates: [[...z.points, z.points[0]]] },
    }))
  return { type: "FeatureCollection", features }
}

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

const PRESETS = ["dawn", "day", "dusk", "night"] as const
type Preset = typeof PRESETS[number]

const STYLES = {
  standard: "mapbox://styles/mapbox/standard",
  satellite: "mapbox://styles/mapbox/standard-satellite",
}

/* ---- live data plumbing ---------------------------------------------------- */

// Shape returned by GET /devices (via the /api/devices proxy).
type ApiDevice = {
  id: string
  deviceId: string
  assignedUserId: string | null
  isOnline: boolean
  isRevoked: boolean
  lastSeenAt: string | null
  lat: number | null
  lng: number | null
  latestHeartbeat: { battery: number | null; signal: number | null; status: string } | null
}

function relativeTime(iso: string | null): string {
  if (!iso) return "Never"
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

function deriveStatus(isOnline: boolean, isRevoked: boolean, battery: number): DeviceStatus {
  if (isRevoked || !isOnline) return "offline"
  if (battery > 0 && battery <= 20) return "low_battery"
  return "active"
}

// Map a backend device (must already have a position) into the marker's shape.
function apiToDevice(d: ApiDevice): Device | null {
  if (d.lat == null || d.lng == null) return null
  const battery = d.latestHeartbeat?.battery ?? 0
  return {
    id: d.id,
    name: d.assignedUserId ?? d.deviceId,
    deviceId: d.deviceId,
    status: deriveStatus(d.isOnline, d.isRevoked, battery),
    battery,
    signal: d.latestHeartbeat?.signal ?? 0,
    lastSeen: relativeTime(d.lastSeenAt),
    organization: "—",
    coordinates: [d.lng, d.lat],
    location: `${d.lat.toFixed(5)}, ${d.lng.toFixed(5)}`,
    heartbeat: relativeTime(d.lastSeenAt),
    geofenceStatus: "inside",
    polStatus: "verified",
    timeline: [],
  }
}

export default function Map() {
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const [mapReady, setMapReady] = useState(false)

  const [preset, setPreset] = useState<Preset>("day")
  const [satellite, setSatellite] = useState(false)

  const [hovered, setHovered] = useState<{ device: Device; x: number; y: number } | null>(null)
  const [selected, setSelected] = useState<Device | null>(null)

  // Live devices, keyed by public deviceId.
  const [devices, setDevices] = useState<Record<string, Device>>({})
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | null
  const isAdmin = (session?.user as any)?.role === "admin"
  const hasFlown = useRef(false)

  // Geofence zones + draw mode.
  const [zones, setZones] = useState<Geofence[]>([])
  const [drawing, setDrawing] = useState(false)
  const [draftPoints, setDraftPoints] = useState<[number, number][]>([])
  const drawingRef = useRef(false)
  drawingRef.current = drawing

  const loadZones = useCallback(() => {
    fetch("/api/geofences")
      .then(r => r.json())
      .then((data: { geofences?: Geofence[] }) => setZones(data.geofences ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => { loadZones() }, [loadZones])

  // Initial snapshot from the API.
  useEffect(() => {
    fetch("/api/devices")
      .then(r => r.json())
      .then((data: { devices?: ApiDevice[] }) => {
        const next: Record<string, Device> = {}
        for (const d of data.devices ?? []) {
          const mapped = apiToDevice(d)
          if (mapped) next[d.deviceId] = mapped
        }
        setDevices(next)
      })
      .catch(() => {})
  }, [])

  // Live updates over the org WebSocket.
  useRailSocket(token, (msg) => {
    if (msg.event === "device.heartbeat") {
      const d = msg.data as { deviceId: string; battery?: number; signal?: number; lat?: number; lng?: number }
      const lat = d.lat, lng = d.lng
      if (lat == null || lng == null) return   // no GPS fix in this beat — ignore
      setDevices(prev => {
        const existing = prev[d.deviceId]
        const battery = d.battery ?? existing?.battery ?? 0
        const base: Device = existing ?? {
          id: d.deviceId, name: d.deviceId, deviceId: d.deviceId,
          status: "active", battery: 0, signal: 0, lastSeen: "Just now",
          organization: "—", coordinates: [lng, lat], location: "",
          heartbeat: "Just now", geofenceStatus: "inside", polStatus: "verified", timeline: [],
        }
        const merged: Device = {
          ...base,
          coordinates: [lng, lat],
          battery,
          signal: d.signal ?? base.signal,
          status: base.status === "alert" ? "alert" : deriveStatus(true, false, battery),
          lastSeen: "Just now",
          heartbeat: "Just now",
          location: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        }
        return { ...prev, [d.deviceId]: merged }
      })
    }

    if (msg.event === "alert.sos" || msg.event === "alert.geofence") {
      const d = msg.data as { deviceId: string }
      setDevices(prev => prev[d.deviceId]
        ? { ...prev, [d.deviceId]: { ...prev[d.deviceId], status: "alert", geofenceStatus: msg.event === "alert.geofence" ? "outside" : prev[d.deviceId].geofenceStatus } }
        : prev)
    }

    if (msg.event === "device.revoked") {
      const d = msg.data as { deviceId: string }
      setDevices(prev => prev[d.deviceId] ? { ...prev, [d.deviceId]: { ...prev[d.deviceId], status: "offline" } } : prev)
    }
  })

  // Add the geofence + draft sources/layers to the map. Safe to call repeatedly
  // (after a style change Mapbox drops custom layers, so we re-add them).
  const addZoneLayers = useCallback((map: mapboxgl.Map) => {
    if (!map.getSource(ZONE_SOURCE)) {
      map.addSource(ZONE_SOURCE, { type: "geojson", data: zonesToGeoJSON([]) })
      map.addLayer({ id: ZONE_FILL, type: "fill", source: ZONE_SOURCE, paint: { "fill-color": "#3b82f6", "fill-opacity": 0.12 } })
      map.addLayer({ id: ZONE_LINE, type: "line", source: ZONE_SOURCE, paint: { "line-color": "#3b82f6", "line-width": 2 } })
    }
    if (!map.getSource(DRAFT_SOURCE)) {
      map.addSource(DRAFT_SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] } })
      map.addLayer({ id: DRAFT_FILL, type: "fill", source: DRAFT_SOURCE, paint: { "fill-color": "#f59e0b", "fill-opacity": 0.2 } })
      map.addLayer({ id: DRAFT_LINE, type: "line", source: DRAFT_SOURCE, paint: { "line-color": "#f59e0b", "line-width": 2, "line-dasharray": [2, 1] } })
    }
  }, [])

  useEffect(() => {
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current!,
      center: [5.6038, 6.3351],
      zoom: 11,
      style: STYLES.satellite,
      config: { basemap: { lightPreset: "day" } },
    })

    const map = mapRef.current

    map.on('load', () => {
      addZoneLayers(map)
      setMapReady(true)
    })

    // Click while drawing → append a vertex.
    map.on('click', (e) => {
      if (!drawingRef.current) return
      setDraftPoints(prev => [...prev, [e.lngLat.lng, e.lngLat.lat]])
    })

    return () => { map.remove() }
  }, [addZoneLayers])

  // Push zone data into the source whenever zones change.
  useEffect(() => {
    if (!mapReady) return
    const src = mapRef.current?.getSource(ZONE_SOURCE) as mapboxgl.GeoJSONSource | undefined
    src?.setData(zonesToGeoJSON(zones))
  }, [zones, mapReady])

  // Render the in-progress draft polygon.
  useEffect(() => {
    if (!mapReady) return
    const src = mapRef.current?.getSource(DRAFT_SOURCE) as mapboxgl.GeoJSONSource | undefined
    if (!src) return
    const features: GeoJSON.Feature[] = []
    if (draftPoints.length >= 1) {
      features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: draftPoints } })
    }
    if (draftPoints.length >= 3) {
      features.push({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[...draftPoints, draftPoints[0]]] } })
    }
    src.setData({ type: "FeatureCollection", features })
  }, [draftPoints, mapReady])

  // Fly to the first device that reports a position (once).
  useEffect(() => {
    if (hasFlown.current || !mapReady) return
    const first = Object.values(devices)[0]
    if (first) {
      mapRef.current?.flyTo({ center: first.coordinates, zoom: 15, duration: 1500 })
      hasFlown.current = true
    }
  }, [devices, mapReady])

  function handlePreset(p: Preset) {
    setPreset(p)
    mapRef.current?.setConfigProperty('basemap', 'lightPreset', p)
  }

  function toggleSatellite() {
    const next = !satellite
    setSatellite(next)
    mapRef.current?.setStyle(next ? STYLES.satellite : STYLES.standard)
    // re-apply preset + re-add custom layers after the style swap wipes them
    mapRef.current?.once('style.load', () => {
      const map = mapRef.current
      if (!map) return
      map.setConfigProperty('basemap', 'lightPreset', preset)
      addZoneLayers(map)
      ;(map.getSource(ZONE_SOURCE) as mapboxgl.GeoJSONSource | undefined)?.setData(zonesToGeoJSON(zones))
      setMapReady(true)
    })
    setMapReady(false)
  }

  function startDraw() {
    setDraftPoints([])
    setDrawing(true)
  }

  function cancelDraw() {
    setDrawing(false)
    setDraftPoints([])
  }

  async function finishDraw() {
    if (draftPoints.length < 3) {
      cancelDraw()
      return
    }
    const name = window.prompt("Name this safe zone:", `Zone ${zones.length + 1}`)
    if (!name) { cancelDraw(); return }
    try {
      const res = await fetch("/api/geofences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, points: draftPoints }),
      })
      if (!res.ok) throw new Error("Failed to save zone")
      loadZones()
    } catch {
      window.alert("Could not save the zone. Try again.")
    } finally {
      cancelDraw()
    }
  }

  const handleHover = useCallback((device: Device | null, x: number, y: number) => {
    setHovered(device ? { device, x, y } : null)
  }, [])

  const handleMarkerClick = useCallback((device: Device) => {
    setSelected(prev => prev?.id === device.id ? null : device)
    mapRef.current?.flyTo({ center: device.coordinates, zoom: 13, duration: 600 })
  }, [])

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden">

      {/* Map canvas */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Light preset chips — top left */}
      <div className="absolute top-3 left-3 z-10 flex gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => handlePreset(p)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border capitalize ${
              preset === p
                ? "bg-white text-black border-transparent shadow"
                : "bg-black/30 border-white/10 text-white/80 hover:bg-black/40 backdrop-blur-sm"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Map controls — top right */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
        <ControlBtn onClick={() => mapRef.current?.zoomIn()}>
          <Plus className="size-3.5" />
        </ControlBtn>
        <ControlBtn onClick={() => mapRef.current?.zoomOut()}>
          <Minus className="size-3.5" />
        </ControlBtn>
        <ControlBtn onClick={() => mapRef.current?.flyTo({ center: [6.3328, 5.6219], zoom: 11, duration: 600 })}>
          <Locate className="size-3.5" />
        </ControlBtn>
        <ControlBtn onClick={toggleSatellite} active={satellite}>
          <Layers className="size-3.5" />
        </ControlBtn>
        {isAdmin && !drawing && (
          <ControlBtn onClick={startDraw}>
            <Pentagon className="size-3.5" />
          </ControlBtn>
        )}
      </div>

      {/* Draw-mode toolbar */}
      {drawing && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/70 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2">
          <span className="text-xs text-white/80">
            Click the map to add corners ({draftPoints.length}) · then Finish
          </span>
          <button
            onClick={finishDraw}
            disabled={draftPoints.length < 3}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-white text-black disabled:opacity-40"
          >
            <Check className="size-3" /> Finish
          </button>
          <button
            onClick={cancelDraw}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-white/10 text-white hover:bg-white/20"
          >
            <X className="size-3" /> Cancel
          </button>
        </div>
      )}

      {/* Legend — bottom left */}
      <div className="absolute bottom-4 left-3 z-10 bg-white/90 dark:bg-black/70 backdrop-blur-sm border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 flex flex-col gap-1.5">
        {[
          { color: "#3b82f6", label: "Active" },
          { color: "#ef4444", label: "Alert" },
          { color: "#f97316", label: "Low Battery" },
          { color: "#eab308", label: "PoL Failed" },
          { color: "#6b7280", label: "Offline" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
            <span className="text-xs text-black/60 dark:text-white/60">{label}</span>
          </div>
        ))}
        <div className="border-t border-black/10 dark:border-white/10 mt-0.5 pt-1.5">
          <span className="text-xs font-medium text-black/80 dark:text-white/80">
            {Object.values(devices).filter(d => d.status !== "offline").length} active
          </span>
        </div>
      </div>

      {/* Device markers */}
      {mapReady && mapRef.current && Object.values(devices).map((device) => (
        <DeviceMarker
          key={device.id}
          map={mapRef.current!}
          device={device}
          isSelected={selected?.id === device.id}
          onHover={handleHover}
          onClick={handleMarkerClick}
        />
      ))}

      {/* Hover card */}
      {hovered && !selected && (
        <HoverCard device={hovered.device} x={hovered.x} y={hovered.y} />
      )}

      {/* Side sheet */}
      {selected && (
        <DeviceSideSheet device={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

function ControlBtn({ onClick, children, active }: { onClick: () => void; children: React.ReactNode; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`size-8 flex items-center justify-center rounded-xl border transition-colors shadow-sm ${
        active
          ? "bg-white text-black border-transparent"
          : "bg-black/30 border-white/10 text-white/80 hover:bg-black/40 backdrop-blur-sm"
      }`}
    >
      {children}
    </button>
  )
}
