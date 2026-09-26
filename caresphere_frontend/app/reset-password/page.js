"use client";

import { useState } from "react";
import Link from "next/link";
import { API_URL } from "../../lib/config";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setError("This password reset link is incomplete.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/users/password-reset/confirm/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        const passwordError = Array.isArray(data.password) ? data.password[0] : data.password;
        throw new Error(passwordError || data.detail);
      }
      setMessage(data.message);
      setPassword("");
      setConfirmation("");
    } catch (requestError) {
      setError(requestError.message || "Unable to reset the password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7FAFC] px-5">
      <section className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">Account recovery</p>
        <h1 className="mt-3 text-3xl font-black text-slate-950">Choose a new password</h1>
        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label htmlFor="new-password" className="mb-2 block text-sm font-bold text-slate-700">New password</label>
            <input id="new-password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-4 outline-none focus:border-[#0F766E] focus:ring-4 focus:ring-teal-100" />
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-sm font-bold text-slate-700">Confirm new password</label>
            <input id="confirm-password" type="password" required minLength={8} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-4 outline-none focus:border-[#0F766E] focus:ring-4 focus:ring-teal-100" />
          </div>
          {message && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
          {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
          <button disabled={submitting || Boolean(message)} className="w-full rounded-2xl bg-[#0F766E] px-5 py-4 font-bold text-white disabled:opacity-60">{submitting ? "Saving..." : "Reset password"}</button>
        </form>
        <Link href="/login" className="mt-6 inline-block font-semibold text-[#0F766E]">Back to sign in</Link>
      </section>
    </main>
  );
}
