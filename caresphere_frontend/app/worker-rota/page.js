"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetch, createLoginUrl } from "../../lib/auth";
import { API_URL } from "../../lib/config";
import CareSphereLogo from "../../components/CareSphereLogo";
export default function WorkerRota() {
  const [blocks, setBlocks] = useState([]), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await authFetch(`${API_URL}/api/care-providers/workforce/shift-blocks/my_rota/`);
        if (!response || response.status === 401) { window.location.assign(createLoginUrl("/worker-rota")); return; }
        if (!response.ok) throw new Error("Unable to load your rota. Please try again.");
        const data = await response.json(); if (active) setBlocks(data);
      } catch(e) { if (active) setError(e.message); } finally { if (active) setLoading(false); }
    })(); return () => { active = false; };
  }, []);
  const upcoming = blocks.filter(b => new Date(b.end_time) > new Date());
  const label = v => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(v));
  return <main className="min-h-screen bg-[#F7F9F8] p-5 text-[#0F1E1B]"><div className="mx-auto max-w-xl"><CareSphereLogo /><h1 className="mt-8 font-serif text-3xl">Your upcoming blocks</h1><p className="mt-3 text-sm text-[#5B6B67]">Published schedules assigned to your linked staff account.</p>{error && <p role="alert" className="mt-5 text-red-800">{error}</p>}{loading ? <p className="mt-8">Loading your rota…</p> : <div className="mt-6 space-y-4">{upcoming.length === 0 ? <p className="rounded-2xl bg-white p-6">No upcoming blocks published for you. Contact your coordinator if you are expecting a shift.</p> : upcoming.map(b => <article key={b.id} className="rounded-2xl border border-[#E3E9E7] bg-white p-5"><p className="text-xs font-semibold uppercase text-[#0E7C6B]">{b.area} · {b.kind.replaceAll("_", " ")}</p><h2 className="mt-2 text-xl font-semibold">{b.title}</h2><p className="mt-3 text-sm">{label(b.start_time)} → {label(b.end_time)}</p><p className="mt-3 text-sm text-[#5B6B67]">{b.planned_hours} planned hours</p></article>)}</div>}<Link href="/profile" className="mt-6 inline-flex min-h-11 items-center text-[#0E7C6B]">Your account</Link></div></main>;
}
