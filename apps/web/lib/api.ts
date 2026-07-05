import { auth } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function getToken(): Promise<string | null> {
  const session = await auth();
  return (session as any)?.accessToken ?? null;
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `API error ${res.status}`);
  }

  return res.json();
}

// --- Devices ---
export type Device = {
  id: string;
  deviceId: string;
  organizationId: string;
  assignedUserId: string | null;
  firmwareVersion: string;
  capabilities: string[];
  isOnline: boolean;
  isRevoked: boolean;
  lastSeenAt: string | null;
  enrolledAt: string;
  latestHeartbeat: { battery: number | null; signal: number | null; status: string } | null;
  lat: number | null;
  lng: number | null;
};

export type PairingSession = {
  id: string;
  hardwareId: string;
  firmwareVersion: string;
  capabilities: string[];
  pairingCode: string;
  state: "pending" | "approved" | "expired" | "rejected";
  expiresAt: string;
  createdAt: string;
};

export type Geofence = {
  id: string;
  organizationId: string;
  name: string;
  points: [number, number][]; // [lng, lat] pairs
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
};

export const api = {
  devices: {
    stats: () => apiFetch<{ total: number; online: number; alerts: number }>("/devices/stats"),
    list: () => apiFetch<{ devices: Device[] }>("/devices"),
    get: (id: string) => apiFetch<{ device: Device }>(`/devices/${id}`),
    revoke: (id: string) => apiFetch(`/devices/${id}/revoke`, { method: "POST" }),
  },
  pairing: {
    pending: () => apiFetch<{ sessions: PairingSession[] }>("/device/pairing/pending"),
    approve: (body: { pairingCode: string; organizationId: string; assignedUserId?: string }) =>
      apiFetch<{ deviceId: string; deviceSecret: string }>("/device/approve", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
  geofences: {
    list: () => apiFetch<{ geofences: Geofence[] }>("/geofences"),
    create: (body: { name: string; points: [number, number][] }) =>
      apiFetch<{ geofence: Geofence }>("/geofences", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: { name?: string; isActive?: boolean }) =>
      apiFetch<{ geofence: Geofence }>(`/geofences/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (id: string) => apiFetch<{ ok: true }>(`/geofences/${id}`, { method: "DELETE" }),
  },
  auth: {
    me: () => apiFetch<{ user: { id: string; name: string; email: string; role: string; organizationId: string } }>("/auth/me"),
  },
};
