"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignUpPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name"),
      organizationName: fd.get("organizationName"),
      email: fd.get("email"),
      password: fd.get("password"),
    };

    const res = await fetch("/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
      setLoading(false);
      return;
    }

    await signIn("credentials", {
      email: body.email,
      password: body.password,
      redirectTo: "/dashboard",
    });
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f0f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-[#161616] border border-gray-100 dark:border-white/10 rounded-3xl shadow-sm p-8 flex flex-col items-center gap-6">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/10 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            {Array.from({ length: 16 }).map((_, i) => {
              const angle = (i / 16) * Math.PI * 2;
              const cos = parseFloat(Math.cos(angle).toFixed(6));
              const sin = parseFloat(Math.sin(angle).toFixed(6));
              return (
                <line key={i}
                  x1={16 + 6 * cos} y1={16 + 6 * sin}
                  x2={16 + 13 * cos} y2={16 + 13 * sin}
                  stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round"
                />
              );
            })}
          </svg>
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Create your account</h1>
          <p className="text-sm text-gray-400">
            Already have one?{" "}
            <a href="/sign-in" className="font-semibold text-gray-900 dark:text-white hover:underline">Sign in</a>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          {[
            { name: "name", type: "text", placeholder: "Full name" },
            { name: "organizationName", type: "text", placeholder: "Organization name" },
            { name: "email", type: "email", placeholder: "Email" },
            { name: "password", type: "password", placeholder: "Password", minLength: 8 },
          ].map((f) => (
            <input key={f.name} {...f} required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 dark:placeholder:text-white/30 outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-white/20" />
          ))}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center leading-relaxed">
          By creating an account you agree to our{" "}
          <a href="#" className="text-blue-500 hover:underline">Terms of Service</a>{" "}
          and{" "}
          <a href="#" className="text-blue-500 hover:underline">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
