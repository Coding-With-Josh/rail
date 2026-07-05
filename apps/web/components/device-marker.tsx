"use client"

import { useEffect, useRef } from "react"
import mapboxgl from "mapbox-gl"
import { createPortal } from "react-dom"
import type { Device } from "@/lib/mock-devices"

const statusColor: Record<Device["status"], string> = {
  active: "#3b82f6",
  alert: "#ef4444",
  offline: "#6b7280",
  low_battery: "#f97316",
  pol_failed: "#eab308",
}

interface Props {
  map: mapboxgl.Map
  device: Device
  isSelected: boolean
  onHover: (device: Device | null, x: number, y: number) => void
  onClick: (device: Device) => void
}

const DeviceMarker = ({ map, device, isSelected, onHover, onClick }: Props) => {
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const contentRef = useRef(document.createElement("div"))

  useEffect(() => {
    markerRef.current = new mapboxgl.Marker(contentRef.current)
      .setLngLat(device.coordinates)
      .addTo(map)

    return () => { markerRef.current?.remove() }
  }, [])

  // Move the marker live when the device reports a new position.
  useEffect(() => {
    markerRef.current?.setLngLat(device.coordinates)
  }, [device.coordinates[0], device.coordinates[1]])

  const color = statusColor[device.status]
  const isAlert = device.status === "alert"

  return createPortal(
    <div
      onClick={() => onClick(device)}
      onMouseEnter={(e) => onHover(device, e.clientX, e.clientY)}
      onMouseLeave={() => onHover(null, 0, 0)}
      onMouseMove={(e) => onHover(device, e.clientX, e.clientY)}
      style={{ cursor: "pointer", position: "relative", width: 32, height: 32 }}
    >
      {/* Pulse ring for alert */}
      {isAlert && (
        <span style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          backgroundColor: color, opacity: 0.3,
          animation: "ping 1.2s cubic-bezier(0,0,0.2,1) infinite",
        }} />
      )}
      {/* Outer selection ring */}
      {isSelected && (
        <span style={{
          position: "absolute", inset: -4, borderRadius: "50%",
          border: "2px solid white",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.3)",
        }} />
      )}
      {/* Main dot */}
      <span style={{
        position: "absolute", inset: 6, borderRadius: "50%",
        backgroundColor: color,
        boxShadow: `0 0 0 2px white, 0 2px 6px rgba(0,0,0,0.35)`,
        opacity: device.status === "offline" ? 0.5 : 1,
      }} />
    </div>,
    contentRef.current
  )
}

export default DeviceMarker
