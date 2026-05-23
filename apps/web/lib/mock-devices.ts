export type DeviceStatus = "active" | "alert" | "offline" | "low_battery" | "pol_failed"

export interface Device {
  id: string
  name: string
  deviceId: string
  status: DeviceStatus
  battery: number
  signal: number
  lastSeen: string
  organization: string
  coordinates: [number, number]
  location: string
  heartbeat: string
  geofenceStatus: "inside" | "outside"
  polStatus: "verified" | "missed" | "failed"
  alert?: { type: string; severity: "High" | "Critical" | "Medium"; triggeredAt: string }
  timeline: { time: string; event: string }[]
}

export const mockDevices: Device[] = [
  {
    id: "gx-001",
    name: "Joshua Idele",
    deviceId: "GX-001",
    status: "alert",
    battery: 61,
    signal: 3,
    lastSeen: "2m ago",
    organization: "SS2 Student Unit",
    coordinates: [5.615785685809019, 6.403079854253942],
    location: "University of Benin Enginerring Hall",
    heartbeat: "2m ago",
    geofenceStatus: "outside",
    polStatus: "verified",
    alert: { type: "Panic Alert", severity: "Critical", triggeredAt: "1m ago" },
    timeline: [
      { time: "10:04 PM", event: "Geofence breach detected" },
      { time: "09:58 PM", event: "Approaching boundary" },
      { time: "09:42 PM", event: "Entered safe zone" },
    ],
  },
  {
    id: "gx-002",
    name: "Florence Erameh",
    deviceId: "GX-017",
    status: "active",
    battery: 8,
    signal: 4,
    lastSeen: "30s ago",
    organization: "SS2 Student Unit",
    coordinates: [5.615970324286464, 6.402961129607822],
    location: "University of Benin Enginerring Hall",
    heartbeat: "30s ago",
    geofenceStatus: "inside",
    polStatus: "verified",
    alert: { type: "Geofence Breach", severity: "Critical", triggeredAt: "2m ago" },
    timeline: [
      { time: "10:04 PM", event: "Geofence breach detected" },
      { time: "09:58 PM", event: "Approaching boundary" },
      { time: "09:42 PM", event: "Entered safe zone" },
    ],
  },
  {
    id: "gx-003",
    name: "Sofia Martins",
    deviceId: "GX-091",
    status: "active",
    battery: 45,
    signal: 2,
    lastSeen: "31m ago",
    organization: "Block A Unit",
    coordinates: [5.5914, 6.2877],
    location: "Last: Block A",
    heartbeat: "31m ago",
    geofenceStatus: "inside",
    polStatus: "missed",
    timeline: [
      { time: "10:04 PM", event: "Proof of life missed" },
      { time: "09:34 PM", event: "Proof of life verified" },
    ],
  },
  {
    id: "gx-004",
    name: "Noah Williams",
    deviceId: "GX-004",
    status: "offline",
    battery: 0,
    signal: 0,
    lastSeen: "1hr ago",
    organization: "Block B Unit",
    coordinates: [5.6482, 6.3008],
    location: "Unknown",
    heartbeat: "1hr ago",
    geofenceStatus: "inside",
    polStatus: "failed",
    timeline: [
      { time: "09:07 PM", event: "Device went offline" },
      { time: "08:55 PM", event: "Low signal detected" },
    ],
  },
  {
    id: "gx-005",
    name: "Priya Sharma",
    deviceId: "GX-033",
    status: "alert",
    battery: 52,
    signal: 3,
    lastSeen: "1m ago",
    organization: "Block B Unit",
    coordinates: [5.6174, 6.3355],
    location: "Main Hall",
    heartbeat: "1m ago",
    geofenceStatus: "inside",
    polStatus: "verified",
    alert: { type: "Panic Alert", severity: "Critical", triggeredAt: "1m ago" },
    timeline: [
      { time: "10:07 PM", event: "Emergency trigger activated" },
      { time: "10:05 PM", event: "Tamper detection triggered" },
      { time: "09:50 PM", event: "Entered safe zone" },
    ],
  },
]
