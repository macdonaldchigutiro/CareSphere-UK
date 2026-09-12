"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { API_URL } from "../../lib/config";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState("Verifying your email address...");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setStatus("This verification link is incomplete.");
      return;
    }

    fetch(`${API_URL}/api/users/verify-email/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail);
        setVerified(true);
        setStatus(data.message);
      })
      .catch((error) => {
        setStatus(error.message || "We could not verify this email address.");
      });
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7FAFC] px-5">
      <section className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">
          Email verification
        </p>
        <h1 className="mt-3 text-3xl font-black text-slate-950">
          {verified ? "Email verified" : "Check verification"}
        </h1>
        <p className="mt-4 text-slate-600">{status}</p>
        <Link
          href={verified ? "/dashboard" : "/profile"}
          className="mt-7 inline-flex rounded-xl bg-[#0F766E] px-5 py-3 font-bold text-white"
        >
          Continue to CareSphere
        </Link>
      </section>
    </main>
  );
}
