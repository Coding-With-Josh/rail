"use client"

import { useRef, useEffect, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { Plus, Minus, Locate, Layers } from 'lucide-react'
import { mockDevices, type Device } from '@/lib/mock-devices'
import DeviceMarker from '@/components/device-marker'
import HoverCard from '@/components/hover-card'
import DeviceSideSheet from '@/components/device-side-sheet'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

const PRESETS = ["dawn", "day", "dusk", "night"] as const
type Preset = typeof PRESETS[number]

const STYLES = {
  standard: "mapbox://styles/mapbox/standard",
  satellite: "mapbox://styles/mapbox/standard-satellite",
}

export default function Map() {
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const [mapReady, setMapReady] = useState(false)

  const [preset, setPreset] = useState<Preset>("day")
  const [satellite, setSatellite] = useState(false)

  const [hovered, setHovered] = useState<{ device: Device; x: number; y: number } | null>(null)
  const [selected, setSelected] = useState<Device | null>(null)

  useEffect(() => {
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current!,
      center: [5.6038, 6.3351],
      zoom: 11,
      style: STYLES.satellite,
      config: { basemap: { lightPreset: "day" } },
    })

    mapRef.current.on('load', () => setMapReady(true))

    return () => { mapRef.current?.remove() }
  }, [])

  function handlePreset(p: Preset) {
    setPreset(p)
    mapRef.current?.setConfigProperty('basemap', 'lightPreset', p)
  }

  function toggleSatellite() {
    const next = !satellite
    setSatellite(next)
    mapRef.current?.setStyle(next ? STYLES.satellite : STYLES.standard)
    // re-apply preset after style change
    mapRef.current?.once('style.load', () => {
      mapRef.current?.setConfigProperty('basemap', 'lightPreset', preset)
      setMapReady(true)
    })
    setMapReady(false)
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
      </div>

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
            {mockDevices.filter(d => d.status !== "offline").length} active
          </span>
        </div>
      </div>

      {/* Device markers */}
      {mapReady && mapRef.current && mockDevices.map((device) => (
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
