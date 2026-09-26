"use client";

import { useState } from "react";
import Link from "next/link";
import { API_URL } from "../../lib/config";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/users/password-reset/request/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail);
      setMessage(data.message);
    } catch (requestError) {
      setError(requestError.message || "Unable to request a password reset. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7FAFC] px-5">
      <section className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">Account recovery</p>
        <h1 className="mt-3 text-3xl font-black text-slate-950">Reset your password</h1>
        <p className="mt-3 text-slate-600">Enter the email used for your CareSphere account.</p>
        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label htmlFor="reset-email" className="mb-2 block text-sm font-bold text-slate-700">Email address</label>
            <input id="reset-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-4 outline-none focus:border-[#0F766E] focus:ring-4 focus:ring-teal-100" />
          </div>
          {message && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
          {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
          <button disabled={submitting} className="w-full rounded-2xl bg-[#0F766E] px-5 py-4 font-bold text-white disabled:opacity-60">{submitting ? "Sending..." : "Send reset link"}</button>
        </form>
        <Link href="/login" className="mt-6 inline-block font-semibold text-[#0F766E]">Back to sign in</Link>
      </section>
    </main>
  );
}
