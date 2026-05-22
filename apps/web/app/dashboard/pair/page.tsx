"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, CheckCircle, Clock, Cpu, Wifi, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PairingSession } from "@/lib/api";

type ApproveResult = { deviceId: string; deviceSecret: string } | null;

function timeLeft(expiresAt: string) {
  const secs = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function PairingCard({
  session,
  onApprove,
  approving,
}: {
  session: PairingSession;
  onApprove: (code: string) => void;
  approving: string | null;
}) {
  const [remaining, setRemaining] = useState(timeLeft(session.expiresAt));

  useEffect(() => {
    const t = setInterval(() => setRemaining(timeLeft(session.expiresAt)), 1000);
    return () => clearInterval(t);
  }, [session.expiresAt]);

  const isApproving = approving === session.pairingCode;

  return (
    <div className="bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 rounded-2xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-black/8 dark:bg-white/8 flex items-center justify-center">
            <Cpu className="size-5 text-black/60 dark:text-white/60" />
          </div>
          <div>
            <p className="text-sm font-medium text-black dark:text-white font-mono">{session.hardwareId}</p>
            <p className="text-xs text-black/40 dark:text-white/40">fw {session.firmwareVersion}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-orange-500">
          <Clock className="size-3" />
          {remaining}
        </div>
      </div>

      {/* Pairing code */}
      <div className="bg-black/5 dark:bg-white/5 rounded-xl p-4 text-center">
        <p className="text-xs text-black/40 dark:text-white/40 mb-1">Pairing Code</p>
        <p className="text-3xl font-bold tracking-[0.3em] text-black dark:text-white font-mono">
          {session.pairingCode}
        </p>
      </div>

      {/* Capabilities */}
      <div className="flex flex-wrap gap-1.5">
        {session.capabilities.map((c) => (
          <span key={c} className="px-2 py-0.5 rounded-full bg-black/8 dark:bg-white/8 text-xs text-black/60 dark:text-white/60">
            {c}
          </span>
        ))}
      </div>

      {/* Approve */}
      <Button
        onClick={() => onApprove(session.pairingCode)}
        disabled={!!approving}
        className="w-full"
      >
        {isApproving ? (
          <><Loader2 className="size-4 animate-spin mr-2" />Approving…</>
        ) : (
          <><CheckCircle className="size-4 mr-2" />Approve Device</>
        )}
      </Button>
    </div>
  );
}

function ApprovedCard({ result }: { result: ApproveResult }) {
  if (!result) return null;
  return (
    <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
        <CheckCircle className="size-5" />
        <p className="font-medium">Device Approved</p>
      </div>
      <div className="space-y-2">
        <div>
          <p className="text-xs text-black/40 dark:text-white/40">Device ID</p>
          <p className="text-sm font-mono text-black dark:text-white">{result.deviceId}</p>
        </div>
        <div>
          <p className="text-xs text-black/40 dark:text-white/40">Device Secret</p>
          <p className="text-xs font-mono text-black/60 dark:text-white/60 break-all bg-black/5 dark:bg-white/5 rounded-lg p-2">
            {result.deviceSecret}
          </p>
          <p className="text-xs text-orange-500 mt-1">⚠ Store this secret — it won't be shown again.</p>
        </div>
      </div>
      <p className="text-xs text-black/40 dark:text-white/40">
        The device will automatically receive its token once it polls <span className="font-mono">/device/token</span>.
      </p>
    </div>
  );
}

export default function PairPage() {
  const [sessions, setSessions] = useState<PairingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [approved, setApproved] = useState<ApproveResult>(null);
  const [error, setError] = useState("");

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/pairing");
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    const t = setInterval(fetchSessions, 5000); // poll every 5s
    return () => clearInterval(t);
  }, [fetchSessions]);

  async function handleApprove(pairingCode: string) {
    setApproving(pairingCode);
    setError("");
    try {
      const res = await fetch("/api/pairing/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairingCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Approval failed");
      setApproved(data);
      setSessions((s) => s.filter((x) => x.pairingCode !== pairingCode));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setApproving(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-medium text-black/80 dark:text-white/90 tracking-tight">Pair Device</p>
          <p className="text-sm text-black/50 dark:text-white/50">
            Approve devices requesting to join your organisation.
          </p>
        </div>
        <button
          onClick={fetchSessions}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-xs text-black/60 dark:text-white/60 hover:bg-black/8 dark:hover:bg-white/8 transition-colors"
        >
          <RefreshCw className="size-3" /> Refresh
        </button>
      </div>

      {/* How it works */}
      <div className="bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5 rounded-xl p-4">
        <p className="text-xs font-semibold text-black/40 dark:text-white/40 uppercase tracking-wide mb-3">How it works</p>
        <div className="flex items-center gap-2 text-xs text-black/60 dark:text-white/60">
          {["Device boots", "Connects to WiFi", "Requests pairing", "You approve here", "Device goes live"].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-2">
              <span className="whitespace-nowrap">{step}</span>
              {i < arr.length - 1 && <ChevronRight className="size-3 shrink-0 text-black/20 dark:text-white/20" />}
            </span>
          ))}
        </div>
      </div>

      {/* Approved result */}
      {approved && <ApprovedCard result={approved} />}

      {/* Error */}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Pending sessions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-black/60 dark:text-white/60">
            Pending Requests
          </p>
          {sessions.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 text-xs font-medium">
              {sessions.length} waiting
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-black/30 dark:text-white/30">
            <Loader2 className="size-5 animate-spin mr-2" /> Checking for devices…
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-black/30 dark:text-white/30">
            <Wifi className="size-8" />
            <p className="text-sm">No devices waiting to pair</p>
            <p className="text-xs">Boot a device and it will appear here automatically</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sessions.map((s) => (
              <PairingCard
                key={s.id}
                session={s}
                onApprove={handleApprove}
                approving={approving}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
