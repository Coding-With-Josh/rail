import type { UserRole } from "./enums"

export type Permission =
  | "devices:read" | "devices:write" | "devices:command"
  | "alerts:read" | "alerts:acknowledge" | "alerts:resolve"
  | "users:read" | "users:write"
  | "org:settings" | "org:billing"
  | "map:view" | "telemetry:read"

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  organizationId: string
  permissions: Permission[]
}

export interface AuthSession {
  id: string
  userId: string
  organizationId: string
  expiresAt: string
  createdAt: string
  lastActiveAt: string
  provider: "credentials" | "oauth"
  ipAddress: string | null
  userAgent: string | null
  isRevoked: boolean
}

export interface JWTPayload {
  jti: string
  iss: string
  aud: string
  iat: number
  exp: number
  type: "user" | "device" | "refresh"
}

export interface UserTokenPayload extends JWTPayload {
  type: "user"
  sub: string
  email: string
  role: UserRole
  organizationId: string
  permissions: Permission[]
}

export interface DeviceTokenPayload extends JWTPayload {
  type: "device"
  sub: string
  deviceId: string
  organizationId: string
  capabilities: string[]
}
