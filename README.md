# Rail

Real-time safety monitoring platform for schools and organisations. A wearable device worn by students or field workers streams live telemetry to a web dashboard — enabling operators to track location, battery, proof-of-life, and respond to SOS alerts instantly.

---

## Architecture

```
ESP32 Wearable (firmware)
        ↕  HTTP / WebSocket
Fastify API (apps/api)
        ↕  REST + WebSocket
Next.js Dashboard (apps/web)
```

| Layer | Stack |
|---|---|
| Firmware | C++ · Arduino · PlatformIO · ESP32 |
| API | Fastify 5 · Drizzle ORM · PostgreSQL · JWT |
| Web | Next.js 16 · React 19 · Tailwind CSS v4 · Mapbox GL |
| Monorepo | Turborepo · pnpm |

---

## Monorepo Structure

```
rail/
├── apps/
│   ├── api/          Fastify REST API + WebSocket server
│   └── web/          Next.js dashboard
├── packages/
│   ├── types/        Shared TypeScript types and enums
│   ├── ui/           Shared component library
│   ├── eslint-config/
│   └── typescript-config/
└── firmware/         ESP32 PlatformIO firmware
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- pnpm 9
- PostgreSQL database
- PlatformIO CLI (firmware only)

### Install

```bash
pnpm install
```

### Environment

**`apps/api/.env`**
```env
DATABASE_URL=postgresql://...
JWT_SECRET=<min 32 chars>
JWT_DEVICE_SECRET=<min 32 chars>
PORT=4000
```

**`apps/web/.env`**
```env
NEXTAUTH_SECRET=<random string>
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000/ws
NEXT_PUBLIC_MAPBOX_TOKEN=pk...
```

### Database

```bash
pnpm db:generate   # generate migrations
pnpm db:migrate    # apply migrations
```

### Dev

```bash
pnpm dev           # all apps
pnpm api:dev       # API only
pnpm web:dev       # web only
```

---

## Device Pairing Flow

1. Flash firmware to ESP32 — device boots and connects to WiFi
2. Device calls `POST /device/bootstrap` → receives a 6-character pairing code
3. Code is displayed on the OLED screen
4. Admin opens **Pair Device** in the dashboard and clicks **Approve**
5. Device polls `GET /device/pairing/status?code=XXX` until approved
6. Device receives credentials, exchanges them for a JWT via `POST /device/token`
7. Device enters active mode and begins sending heartbeats every 10 seconds

### Firmware Setup

```bash
cp firmware/credentials.ini.example firmware/credentials.ini
# fill in wifi_ssid, wifi_password, api_url
cd firmware && pio run --target upload --target monitor
```

---

## API Overview

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Create org + admin user |
| POST | `/auth/login` | — | Login, returns access token |
| POST | `/auth/refresh` | cookie | Rotate refresh token |
| POST | `/auth/logout` | bearer | Revoke session |
| GET | `/auth/me` | bearer | Current user |
| POST | `/device/bootstrap` | — | Device announces itself |
| GET | `/device/pairing/status` | — | Poll approval status |
| POST | `/device/approve` | bearer | Admin approves device |
| POST | `/device/token` | — | Exchange secret for JWT |
| GET | `/devices` | bearer | List org devices |
| GET | `/devices/stats` | bearer | Online/total counts |
| POST | `/device/heartbeat` | device | Send heartbeat |
| POST | `/device/telemetry` | device | Send telemetry |
| GET | `/ws` | query token | WebSocket connection |

---

## WebSocket Events

All events are scoped to the authenticated organisation.

| Event | Trigger |
|---|---|
| `device.heartbeat` | Device sends heartbeat |
| `device.telemetry` | Device sends telemetry |
| `device.revoked` | Admin revokes a device |

---

## License

Private. All rights reserved.
