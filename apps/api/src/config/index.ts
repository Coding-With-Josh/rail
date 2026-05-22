const required = (key: string): string => {
  const val = process.env[key]
  if (!val || val.length < 32) {
    throw new Error(`Environment variable ${key} is missing or too short (min 32 chars)`)
  }
  return val
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtDeviceSecret: required("JWT_DEVICE_SECRET"),
} as const
