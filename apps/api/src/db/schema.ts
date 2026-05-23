import { pgTable, text, timestamp, boolean, pgEnum, integer, jsonb } from "drizzle-orm/pg-core"

export const userRoleEnum = pgEnum("user_role", ["admin", "operator", "viewer"])
export const userStatusEnum = pgEnum("user_status", ["active", "suspended", "invited"])
export const pairingStateEnum = pgEnum("pairing_state", ["pending", "approved", "expired", "rejected"])

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("viewer"),
  status: userStatusEnum("status").notNull().default("active"),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").notNull(),
  refreshTokenHash: text("refresh_token_hash").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  revokedAt: timestamp("revoked_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const devices = pgTable("devices", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  deviceId: text("device_id").notNull().unique(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  assignedUserId: text("assigned_user_id").references(() => users.id),
  secretHash: text("secret_hash").notNull(),
  firmwareVersion: text("firmware_version").notNull(),
  capabilities: text("capabilities").array().notNull().default([]),
  deviceType: text("device_type", { enum: ["esp32", "mobile"] }).notNull().default("esp32"),
  isOnline: boolean("is_online").notNull().default(false),
  isRevoked: boolean("is_revoked").notNull().default(false),
  lastSeenAt: timestamp("last_seen_at"),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const deviceSessions = pgTable("device_sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  deviceId: text("device_id").notNull().references(() => devices.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").notNull(),
  refreshTokenHash: text("refresh_token_hash").notNull(),
  revokedAt: timestamp("revoked_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const pairingSessions = pgTable("pairing_sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  hardwareId: text("hardware_id").notNull(),
  firmwareVersion: text("firmware_version").notNull(),
  capabilities: text("capabilities").array().notNull().default([]),
  pairingCode: text("pairing_code").notNull().unique(),
  state: pairingStateEnum("state").notNull().default("pending"),
  organizationId: text("organization_id").references(() => organizations.id),
  assignedUserId: text("assigned_user_id").references(() => users.id),
  approvedBy: text("approved_by").references(() => users.id),
  // Set at approval time so the device can retrieve its credentials via /device/pairing/status
  provisionedDeviceId: text("provisioned_device_id").references(() => devices.id),
  provisionedSecret: text("provisioned_secret"), // plaintext, cleared after device retrieves it
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const commandStatusEnum = pgEnum("command_status", ["pending", "delivered", "acknowledged", "failed"])

export const heartbeatLogs = pgTable("heartbeat_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  deviceId: text("device_id").notNull().references(() => devices.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  battery: integer("battery"),
  signal: integer("signal"),
  uptime: integer("uptime"),
  status: text("status").notNull().default("online"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const telemetryLogs = pgTable("telemetry_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  deviceId: text("device_id").notNull().references(() => devices.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const commandLogs = pgTable("command_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  deviceId: text("device_id").notNull().references(() => devices.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  issuedBy: text("issued_by").notNull().references(() => users.id),
  type: text("type").notNull(),
  payload: jsonb("payload"),
  nonce: text("nonce").notNull().unique(),
  status: commandStatusEnum("status").notNull().default("pending"),
  acknowledgedAt: timestamp("acknowledged_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const revokedTokens = pgTable("revoked_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  jti: text("jti").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const alertSeverityEnum = pgEnum("alert_severity", ["low", "medium", "high", "critical"])
export const alertStatusEnum = pgEnum("alert_status", ["active", "acknowledged", "resolved"])

export const alerts = pgTable("alerts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  deviceId: text("device_id").notNull().references(() => devices.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  type: text("type").notNull(), // "sos" | "low_battery" | "geofence" etc.
  severity: alertSeverityEnum("severity").notNull().default("critical"),
  status: alertStatusEnum("status").notNull().default("active"),
  lat: text("lat"),
  lng: text("lng"),
  triggerSource: text("trigger_source"), // "watch_button" | "phone_button" | "auto"
  acknowledgedBy: text("acknowledged_by").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
