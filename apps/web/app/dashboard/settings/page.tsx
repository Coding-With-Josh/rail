"use client";

import { useState } from "react";
import SmoothTab, { type TabItem } from "@/components/ui/smooth-tab";
import { FilterDropdown } from "@/components/filter-dropdown";
import { Settings, Cpu, Bell, Users, Plug } from "lucide-react";

// ── primitives ────────────────────────────────────────────────────────────────

function Toggle({ label, description, value, onChange }: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-black/6 dark:border-white/6 last:border-0">
      <div>
        <p className="text-sm text-black/80 dark:text-white/80">{label}</p>
        <p className="text-xs text-black/40 dark:text-white/40 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-9 h-5 rounded-full transition-colors shrink-0 relative ${value ? "bg-green-500" : "bg-black/15 dark:bg-white/15"}`}
        role="switch" aria-checked={value} type="button"
      >
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

function Input({ label, description, value, onChange, placeholder }: {
  label: string; description?: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 py-3.5 border-b border-black/6 dark:border-white/6 last:border-0">
      <p className="text-sm text-black/80 dark:text-white/80">{label}</p>
      {description && <p className="text-xs text-black/40 dark:text-white/40">{description}</p>}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="px-3 py-2 rounded-lg bg-black/4 dark:bg-white/4 border border-black/8 dark:border-white/8 text-sm text-black/80 dark:text-white/80 placeholder:text-black/30 dark:placeholder:text-white/30 outline-none focus:border-black/20 dark:focus:border-white/20 transition-colors"
      />
    </div>
  );
}

function Select({ label, description, options, value, onChange }: {
  label: string; description?: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3.5 border-b border-black/6 dark:border-white/6 last:border-0">
      <div>
        <p className="text-sm text-black/80 dark:text-white/80">{label}</p>
        {description && <p className="text-xs text-black/40 dark:text-white/40 mt-0.5">{description}</p>}
      </div>
      <FilterDropdown label={label} options={options} value={value} onChange={onChange} alwaysInactive />
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:grid sm:grid-cols-[200px_1fr] gap-3 sm:gap-8 py-5 border-b border-black/6 dark:border-white/6 last:border-0">
      <div className="pt-1">
        <p className="text-sm font-medium text-black/80 dark:text-white/80">{title}</p>
        <p className="text-xs text-black/40 dark:text-white/40 mt-1 leading-relaxed">{description}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

// ── settings page ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  // General
  const [orgName, setOrgName] = useState("University Preparatory Secondary School");
  const [orgUrl, setOrgUrl] = useState("upsshub.com");
  const [contactEmail, setContactEmail] = useState("info@upsshub.com");
  const [timezone, setTimezone] = useState("UTC+01:00 - Lagos");
  const [language, setLanguage] = useState("English (UK)");

  // Devices
  const [heartbeat, setHeartbeat] = useState("30 seconds");
  const [offlineThreshold, setOfflineThreshold] = useState("5 minutes");
  const [batteryThreshold, setBatteryThreshold] = useState("15%");
  const [polTimeout, setPolTimeout] = useState("5 minutes");
  const [autoEnrol, setAutoEnrol] = useState(true);
  const [requirePol, setRequirePol] = useState(true);
  const [lowBatteryAlert, setLowBatteryAlert] = useState(true);

  // Alerts
  const [inApp, setInApp] = useState(true);
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(false);
  const [severityThreshold, setSeverityThreshold] = useState("Medium+");
  const [notifDelay, setNotifDelay] = useState("Instant");

  // Users
  const [allowInvite, setAllowInvite] = useState(false);
  const [requireApproval, setRequireApproval] = useState(true);
  const [enforce2fa, setEnforce2fa] = useState(true);
  const [defaultRole, setDefaultRole] = useState("Viewer");

  // Integrations
  const [slack, setSlack] = useState(true);
  const [pagerduty, setPagerduty] = useState(false);
  const [webhook, setWebhook] = useState(false);
  const [webhookRetry, setWebhookRetry] = useState("Retry 3x");
  const [apiKey, setApiKey] = useState("gx_live_••••••••••••••••3f9a");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [slackChannel, setSlackChannel] = useState("upss-alerts");

  const TABS: TabItem[] = [
    {
      id: "general", title: "General", icon: Settings, color: "bg-blue-500 hover:bg-blue-600",
      content: (
        <div>
          <Section title="Organisation" description="Basic organisation details">
            <Input label="Organisation Name" value={orgName} onChange={setOrgName} placeholder="My Organisation" />
            <Input label="Organisation URL" value={orgUrl} onChange={setOrgUrl} placeholder="my-org.app" />
            <Input label="Contact Email" value={contactEmail} onChange={setContactEmail} placeholder="admin@example.com" />
          </Section>
          <Section title="Locale" description="Timezone and language preferences">
            <Select label="Timezone" options={["UTC+00:00 — London", "UTC+01:00 — Lagos", "UTC+02:00 — Cairo", "UTC+03:00 — Nairobi", "UTC-05:00 — New York", "UTC-08:00 — Los Angeles"]} value={timezone} onChange={setTimezone} />
            <Select label="Language" options={["English (UK)", "English (US)", "French", "Spanish", "Arabic"]} value={language} onChange={setLanguage} />
          </Section>
        </div>
      ),
    },
    {
      id: "devices", title: "Devices", icon: Cpu, color: "bg-emerald-500 hover:bg-emerald-600",
      content: (
        <div>
          <Section title="Heartbeat" description="How often devices check in">
            <Select label="Heartbeat Interval" options={["15 seconds", "30 seconds", "1 minute", "5 minutes"]} value={heartbeat} onChange={setHeartbeat} />
            <Select label="Offline Threshold" description="Mark device offline after" options={["1 minute", "5 minutes", "10 minutes", "30 minutes"]} value={offlineThreshold} onChange={setOfflineThreshold} />
            <Select label="Proof-of-Life Timeout" options={["2 minutes", "5 minutes", "10 minutes", "30 minutes"]} value={polTimeout} onChange={setPolTimeout} />
            <Select label="Battery Alert Threshold" options={["10%", "15%", "20%", "30%"]} value={batteryThreshold} onChange={setBatteryThreshold} />
          </Section>
          <Section title="Policies" description="Default rules for all enrolled devices">
            <Toggle label="Auto-enrol new devices" description="Devices enrolled automatically on first ping" value={autoEnrol} onChange={setAutoEnrol} />
            <Toggle label="Require proof of life" description="Devices must confirm user presence periodically" value={requirePol} onChange={setRequirePol} />
            <Toggle label="Low battery alerts" description="Trigger alert when battery drops below threshold" value={lowBatteryAlert} onChange={setLowBatteryAlert} />
          </Section>
        </div>
      ),
    },
    {
      id: "alerts", title: "Alerts", icon: Bell, color: "bg-orange-500 hover:bg-orange-600",
      content: (
        <div>
          <Section title="Channels" description="Where alerts are delivered">
            <Toggle label="In-app notifications" description="Show alerts inside the dashboard" value={inApp} onChange={setInApp} />
            <Toggle label="Email notifications" description="Send alert emails to assigned users" value={email} onChange={setEmail} />
            <Toggle label="SMS notifications" description="Send SMS for critical alerts" value={sms} onChange={setSms} />
          </Section>
          <Section title="Thresholds" description="Alert delivery behaviour">
            <Select label="Alert Severity Threshold" description="Minimum severity to trigger a notification" options={["Low+", "Medium+", "High+", "Critical only"]} value={severityThreshold} onChange={setSeverityThreshold} />
            <Select label="Notification Delay" description="Wait before sending notification" options={["Instant", "30 seconds", "1 minute", "5 minutes"]} value={notifDelay} onChange={setNotifDelay} />
          </Section>
        </div>
      ),
    },
    {
      id: "users", title: "Users", icon: Users, color: "bg-purple-500 hover:bg-purple-600",
      content: (
        <div>
          <Section title="Access Control" description="Permissions and onboarding rules">
            <Toggle label="Allow members to invite users" description="Non-admin users can send invitations" value={allowInvite} onChange={setAllowInvite} />
            <Toggle label="Require admin approval" description="New accounts need admin sign-off" value={requireApproval} onChange={setRequireApproval} />
            <Toggle label="Enforce two-factor authentication" description="Require 2FA for all users" value={enforce2fa} onChange={setEnforce2fa} />
            <Select label="Default Role" description="Role assigned to new members" options={["Viewer", "Operator", "Admin"]} value={defaultRole} onChange={setDefaultRole} />
          </Section>
        </div>
      ),
    },
    {
      id: "integrations", title: "Integrations", icon: Plug, color: "bg-rose-500 hover:bg-rose-600",
      content: (
        <div>
          <Section title="Connected Services" description="Third-party integrations">
            <Toggle label="Slack" description="Send alert notifications to a Slack channel" value={slack} onChange={setSlack} />
            {slack && <Input label="Slack Channel ID" value={slackChannel} onChange={setSlackChannel} placeholder="#channel-name" />}
            <Toggle label="PagerDuty" description="Escalate critical alerts to on-call teams" value={pagerduty} onChange={setPagerduty} />
            <Toggle label="Webhook" description="POST alert payloads to a custom endpoint" value={webhook} onChange={setWebhook} />
            {webhook && (
              <>
                <Input label="Webhook URL" value={webhookUrl} onChange={setWebhookUrl} placeholder="https://example.com/webhook" />
                <Select label="Webhook Retry Policy" options={["Retry once", "Retry 3x", "Retry indefinitely", "No retry"]} value={webhookRetry} onChange={setWebhookRetry} />
              </>
            )}
          </Section>
          <Section title="API" description="Programmatic access">
            <Input label="API Key" description="Rotate if compromised" value={apiKey} onChange={setApiKey} />
          </Section>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8 w-full max-w-4xl">
      <div>
        <p className="text-black/80 dark:text-white/90 text-2xl font-medium tracking-tight">Settings</p>
        <p className="text-black/50 dark:text-white/50 text-sm">Manage your organisation, devices and integrations.</p>
      </div>
      <SmoothTab items={TABS} defaultTabId="general" />
    </div>
  );
}
