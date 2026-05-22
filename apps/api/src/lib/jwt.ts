import jwt from "jsonwebtoken"
import { config } from "../config/index.js"

export type UserTokenPayload = {
  sub: string
  organizationId: string
  role: "admin" | "operator" | "viewer"
  sessionId: string
  jti: string
  type: "access"
}

export type DeviceTokenPayload = {
  sub: string
  deviceId: string
  organizationId: string
  capabilities: string[]
  type: "device"
}

export type RefreshTokenPayload = {
  sub: string
  sessionId: string
  type: "refresh" | "device_refresh"
}

export const ACCESS_TTL = "15m"
export const REFRESH_TTL = "7d"
export const DEVICE_TTL = "30d"

export function signUserAccess(payload: Omit<UserTokenPayload, "type" | "jti">): string {
  const jti = crypto.randomUUID()
  return jwt.sign({ ...payload, jti, type: "access" }, config.jwtSecret, { expiresIn: ACCESS_TTL })
}

export function signRefresh(payload: Omit<RefreshTokenPayload, "type">): string {
  return jwt.sign({ ...payload, type: "refresh" }, config.jwtSecret, { expiresIn: REFRESH_TTL })
}

export function signDeviceAccess(payload: Omit<DeviceTokenPayload, "type">): string {
  return jwt.sign({ ...payload, type: "device" }, config.jwtDeviceSecret, { expiresIn: DEVICE_TTL })
}

export function signDeviceRefresh(payload: Omit<RefreshTokenPayload, "type">): string {
  return jwt.sign({ ...payload, type: "device_refresh" }, config.jwtDeviceSecret, { expiresIn: REFRESH_TTL })
}

export function verifyUserToken(token: string): UserTokenPayload {
  return jwt.verify(token, config.jwtSecret) as UserTokenPayload
}

export function verifyDeviceToken(token: string): DeviceTokenPayload {
  return jwt.verify(token, config.jwtDeviceSecret) as DeviceTokenPayload
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, config.jwtSecret) as RefreshTokenPayload
}

export function verifyDeviceRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, config.jwtDeviceSecret) as RefreshTokenPayload
}
