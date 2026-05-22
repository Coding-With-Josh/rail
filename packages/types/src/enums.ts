export enum DeviceState {
  Active = "active",
  Idle = "idle",
  Offline = "offline",
  Alert = "alert",
  LowBattery = "low_battery",
  PolFailed = "pol_failed",
  Pairing = "pairing",
  Decommissioned = "decommissioned",
}

export enum BatteryState {
  Charging = "charging",
  Discharging = "discharging",
  Full = "full",
  Critical = "critical",
  Unknown = "unknown",
}

export enum DeviceConnectionType {
  WiFi = "wifi",
  Cellular = "cellular",
  Bluetooth = "bluetooth",
  Offline = "offline",
}

export enum AlertSeverity {
  Low = "low",
  Medium = "medium",
  High = "high",
  Critical = "critical",
}

export enum AlertType {
  SOS = "sos",
  PanicAlert = "panic_alert",
  GeofenceBreach = "geofence_breach",
  ProofOfLifeFailed = "proof_of_life_failed",
  LowBattery = "low_battery",
  DeviceOffline = "device_offline",
  TamperDetection = "tamper_detection",
  AbnormalVitals = "abnormal_vitals",
  ManualAdmin = "manual_admin",
}

export enum AlertStatus {
  Active = "active",
  Acknowledged = "acknowledged",
  Resolved = "resolved",
  Escalated = "escalated",
}

export enum UserRole {
  SuperAdmin = "super_admin",
  Admin = "admin",
  Operator = "operator",
  Viewer = "viewer",
}

export enum UserStatus {
  Active = "active",
  Inactive = "inactive",
  Suspended = "suspended",
  PendingVerification = "pending_verification",
  Invited = "invited",
}

export enum GeofenceEventType {
  Enter = "enter",
  Exit = "exit",
  Dwell = "dwell",
  Breach = "breach",
}

export enum ProofOfLifeStatus {
  Verified = "verified",
  Pending = "pending",
  Missed = "missed",
  Failed = "failed",
  Escalated = "escalated",
  AdminOverride = "admin_override",
}

export enum ProofOfLifeMethod {
  ButtonPress = "button_press",
  MotionDetection = "motion_detection",
  Biometric = "biometric",
  Voice = "voice",
  AdminOverride = "admin_override",
}

export enum PairingState {
  Pending = "pending",
  InProgress = "in_progress",
  Verified = "verified",
  Failed = "failed",
  Expired = "expired",
}

export enum CommandType {
  Ping = "ping",
  Vibrate = "vibrate",
  RecordAudio = "record_audio",
  RecordVideo = "record_video",
  SOS = "sos",
  MarkSafe = "mark_safe",
  Reboot = "reboot",
  UpdateFirmware = "update_firmware",
  SetGeofence = "set_geofence",
}

export enum CommandStatus {
  Pending = "pending",
  Delivered = "delivered",
  Acknowledged = "acknowledged",
  Executed = "executed",
  Failed = "failed",
  Expired = "expired",
}

export enum ConnectionState {
  Connected = "connected",
  Reconnecting = "reconnecting",
  Disconnected = "disconnected",
  Stale = "stale",
  Failed = "failed",
}

export enum SubscriptionTier {
  Free = "free",
  Starter = "starter",
  Pro = "pro",
  Enterprise = "enterprise",
}
