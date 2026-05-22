import type {
  AlertSeverity, AlertStatus, AlertType,
  BatteryState, CommandStatus, CommandType,
  DeviceConnectionType, DeviceState,
  PairingState, ProofOfLifeMethod, ProofOfLifeStatus,
  SubscriptionTier, UserRole, UserStatus,
} from "./enums"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  organizationId: string
  emailVerified: boolean
  twoFactorEnabled: boolean
  lastLoginAt: string | null
  lastLoginIp: string | null
  invitedBy: string | null
  invitedAt: string | null
  onboardedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  primaryColor: string | null
  subscriptionTier: SubscriptionTier
  subscriptionExpiresAt: string | null
  deviceQuota: number
  ownerId: string
  createdAt: string
  updatedAt: string
}

export interface Device {
  id: string
  deviceId: string
  organizationId: string
  assignedUserId: string | null
  model: string
  firmwareVersion: string
  hardwareRevision: string
  state: DeviceState
  isOnline: boolean
  lastSeenAt: string | null
  lastHeartbeatAt: string | null
  batteryPercent: number
  batteryState: BatteryState
  isCharging: boolean
  connectionType: DeviceConnectionType
  signalStrength: number | null
  lastLatitude: number | null
  lastLongitude: number | null
  lastLocationAt: string | null
  isPaired: boolean
  pairedAt: string | null
  sensorsHealthy: boolean
  hasActiveAlert: boolean
  isRecording: boolean
  polStatus: ProofOfLifeStatus
  lastPolAt: string | null
  enrolledAt: string
  updatedAt: string
}

export interface Alert {
  id: string
  organizationId: string
  deviceId: string
  userId: string | null
  type: AlertType
  severity: AlertSeverity
  status: AlertStatus
  latitude: number | null
  longitude: number | null
  acknowledgedBy: string | null
  acknowledgedAt: string | null
  resolvedBy: string | null
  resolvedAt: string | null
  notes: string | null
  notificationSent: boolean
  notificationSentAt: string | null
  triggeredAt: string
  updatedAt: string
}

export interface Telemetry {
  id: string
  deviceId: string
  organizationId: string
  timestamp: string
  heartRate: number | null
  stepCount: number | null
  temperature: number | null
  ambientLight: number | null
  accelerometerX: number | null
  accelerometerY: number | null
  accelerometerZ: number | null
  isMoving: boolean
  batteryPercent: number
  batteryVoltage: number | null
  isCharging: boolean
  signalStrength: number | null
  connectionType: DeviceConnectionType
  activityLevel: "stationary" | "walking" | "running" | null
}

export interface Location {
  id: string
  deviceId: string
  organizationId: string
  timestamp: string
  latitude: number
  longitude: number
  altitude: number | null
  accuracy: number | null
  speed: number | null
  heading: number | null
  provider: "gps" | "network" | "fused"
  confidence: number
}

export interface ProofOfLife {
  id: string
  deviceId: string
  organizationId: string
  userId: string | null
  status: ProofOfLifeStatus
  method: ProofOfLifeMethod | null
  challengeIssuedAt: string
  timeoutSeconds: number
  respondedAt: string | null
  escalatedAt: string | null
  escalationReason: string | null
  triggeredBy: "scheduled" | "random" | "inactivity" | "manual"
}

export interface DeviceSession {
  id: string
  deviceId: string
  organizationId: string
  token: string
  issuedAt: string
  expiresAt: string
  revokedAt: string | null
  ipAddress: string | null
  connectionMethod: DeviceConnectionType
  firmwareVersion: string
  userAgent: string | null
}

export interface PairingSession {
  id: string
  organizationId: string
  deviceId: string | null
  assignedUserId: string | null
  pairingCode: string
  state: PairingState
  expiresAt: string
  verifiedAt: string | null
  steps: {
    codeScanned: boolean
    deviceConnected: boolean
    userAssigned: boolean
    configApplied: boolean
  }
  createdAt: string
}
