# Mocked / Stubbed / Incomplete Features

Audit of the Rail backend (Fastify API + Postgres), pairing flow, firmware, and web frontend.

**Bottom line:** the backend is genuinely implemented end-to-end — almost nothing is mocked there. The mocking lives almost entirely on the **web frontend**, where the headline screens (Map, Alerts, Dashboard home) still render hardcoded demo data instead of the real API that already exists.

---

## ⚠️ Mocked / stubbed / fake

| # | Location | Issue |
|---|---|---|
| 1 | `apps/web/components/map.tsx` | **The Live Map renders `mockDevices`** — 5 hardcoded students at University of Benin. Markers/positions are **not** from the API. This is the product's headline feature and it's fully fake. |
| 2 | `apps/web/lib/mock-devices.ts` | The entire mock dataset; imported by `map.tsx`, `hover-card.tsx`, `device-marker.tsx`, `device-side-sheet.tsx`. |
| 3 | `apps/web/app/dashboard/alerts/page.tsx` | Entire alerts table + summary cards (`"7 Active"`, `"3 Critical"`) are **hardcoded arrays**. Ignores the real `GET /alerts` endpoint, which exists. |
| 4 | `apps/web/app/dashboard/page.tsx` | Home dashboard `recentAlerts`, `hourlyBars` chart, `"214 Devices Online"`, `"7 Alerts Today"` are all **hardcoded literals**. |
| 5 | `apps/api/src/modules/device/device.routes.ts:48` | `GET /device/stats` returns **`alerts: 0` hardcoded** — never counts the real `alerts` table. So `StatCards` always shows 0 active alerts even though it fetches live. |
| 6 | `firmware/src/main.cpp:404` | `doHeartbeat()` sends **`battery = 85` hardcoded** (commented "battery placeholder") — no real ADC reading. There's **no GPS/telemetry send at all** in firmware, so the map could never get real coordinates even if wired. |
| 7 | `apps/api/src/modules/device-auth/device-auth.routes.ts:89` | `// TODO: broadcast device.pairing_requested via WebSocket` — admin dashboard isn't notified live when a device requests pairing; relies on polling `/pairing/pending`. |
| 8 | `apps/web/components/stat-cards.tsx:23` | Heartbeat handler is a **no-op** (`{ ...s, online: s.online }`) — comment admits "full recount on revoke," but no recount happens. |

---

## ✅ Real (fully wired to Postgres) — verified not mocked

- **Pairing flow** (`device-auth.routes.ts`) — bootstrap → approve → one-time secret delivery → token/refresh, all real DB writes. Secret hashed (bcrypt), one-time `provisionedSecret` cleared after device reads it, refresh rotation with reuse-revocation.
- **Auth** (`auth.routes.ts`) — bcrypt rounds=12, constant-time login (dummy-hash verify when user missing), refresh-token rotation, JTI blocklist on logout, session revocation checks in middleware.
- **Heartbeat / telemetry / alerts** — real DB writes + live WebSocket broadcasts (`broadcastToOrg`). SOS, acknowledge, revoke all persist.
- **DB** — real Drizzle + `postgres-js`, 3 committed migrations, 13 tables. (Schema is ahead of the app: `command_logs`/command system is scaffolded but has no routes yet.)
- `StatCards`, `devices/page.tsx` — real `fetch("/api/devices…")` → Next proxy → Fastify → Postgres.
- All `app/api/*/route.ts` proxy routes — genuine pass-throughs to the Fastify API (`lib/api.ts`), not stubs.

---

## Core gap

The **data layer is real but disconnected from the two most visible screens**. To make this demo-true, in priority order:

1. **Wire `map.tsx` to live data** — replace `mockDevices` with `/api/devices` + WebSocket `device.telemetry`. *(But first: firmware must actually send GPS — currently it sends nothing.)*
2. **Fix `GET /device/stats`** to `count()` active alerts instead of `alerts: 0`.
3. **Wire `alerts/page.tsx`** to the existing `GET /alerts`.
4. **Firmware:** real battery ADC + a GPS/telemetry `POST /device/telemetry`.
