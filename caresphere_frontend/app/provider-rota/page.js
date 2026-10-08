"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { authFetch, createLoginUrl } from "../../lib/auth";
import { API_URL } from "../../lib/config";

const endpoint = `${API_URL}/api/care-providers/workforce/shift-blocks/`;
const initial = { title: "", area: "", kind: "care", start_time: "", end_time: "", pay_mode: "hourly", rate: "", staff: [], notes: "" };
const input = "mt-2 w-full rounded-xl border border-[#DCE6E3] bg-white px-3 py-3 text-[#0F1E1B]";
const types = { care: "Care", training: "Training", supervision: "Supervision", hr: "HR", time_off: "Time off" };
const localDateTime = value => { const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16); };
const today = () => localDateTime(new Date()).slice(0,10);
const dateLabel = value => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
async function request(url, options = {}) {
  const response = await authFetch(url, { ...options, headers: { "Content-Type": "application/json" } });
  if (!response || response.status === 401) { window.location.assign(createLoginUrl("/provider-rota")); throw new Error("Please sign in."); }
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data === "object" ? Object.values(data).flat().join(" ") : "Unable to update rota.");
  return data;
}
export default function ProviderRota() {
  const [blocks, setBlocks] = useState([]), [staff, setStaff] = useState([]);
  const [form, setForm] = useState(initial), [editing, setEditing] = useState(null);
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [area, setArea] = useState(""), [week, setWeek] = useState(today);
  const loadSequence = useRef(0);
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    const start = new Date(`${week}T00:00`), end = new Date(start);
    end.setDate(end.getDate() + 7);
    const b = await request(`${endpoint}?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`);
    const people = []; let url = `${API_URL}/api/care-providers/my-staff/`;
    while (url) { const page = await request(url); people.push(...(page.results || page)); url = page.next || null; }
    if (sequence === loadSequence.current) { setBlocks(b.results || b); setStaff(people.filter(person => person.is_active)); }
  }, [week]);
  useEffect(() => { setLoading(true); load().catch(e => setError(e.message)).finally(() => setLoading(false)); }, [load]);
  function change(event) { setForm({ ...form, [event.target.name]: event.target.value }); }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const payload = { ...form, start_time: new Date(form.start_time).toISOString(), end_time: new Date(form.end_time).toISOString(), rate: form.rate === "" ? null : form.rate };
      await request(editing ? `${endpoint}${editing}/` : endpoint, { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) });
      await load(); setForm(initial); setEditing(null); setNotice("Draft saved. Publish it when the assignments are ready.");
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function publish(block) {
    setBusy(true); setError(""); setNotice("");
    try { await request(`${endpoint}${block.id}/${block.published_at ? "unpublish" : "publish"}/`, { method: "POST" }); await load(); setNotice(block.published_at ? "Block returned to draft." : "Block published to assigned staff rotas."); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const visible = blocks.filter(b => (!area || b.area.toLowerCase().includes(area.toLowerCase())));
  return <main className="min-h-screen bg-[#F7F9F8] p-5 text-[#0F1E1B] sm:p-8">
    <div className="mx-auto max-w-7xl">
      <Link href="/provider-dashboard" className="text-sm font-semibold text-[#0E7C6B]">← Overview</Link>
      <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-[#0E7C6B]">Workforce planning</p>
      <h1 className="mt-2 font-serif text-4xl">Blocks &amp; rotas</h1>
      <p className="mt-3 max-w-2xl text-[#5B6B67]">Plan ahead by area, assign your team and publish their schedules. Planned hours are separate from hours worked.</p>
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
      {notice && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-[#0E7C6B]">{notice}</p>}
      {loading ? <p role="status" className="mt-8">Loading your rota…</p> : <div className="mt-8 grid items-start gap-6 xl:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-[#E3E9E7] bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Search area<input className={input} value={area} onChange={e => setArea(e.target.value)} placeholder="e.g. Watford" /></label><label className="text-sm font-semibold">Seven days starting<input required type="date" className={input} value={week} onChange={e => { if(e.target.value) setWeek(e.target.value); }} /></label></div>
          <p className="mt-5 text-sm text-[#5B6B67]">{visible.length} blocks · {visible.filter(b => b.published_at).length} published</p>
          <div className="mt-4 space-y-4">{visible.length === 0 ? <div className="rounded-xl bg-[#F7F9F8] p-8"><h2 className="font-serif text-2xl">Your next week starts here</h2><p className="mt-2 text-[#5B6B67]">Create a block, choose its area and assign staff before publishing.</p></div> : visible.map(b => <article key={b.id} className="rounded-xl border border-[#E3E9E7] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{b.title}</h2><p className="mt-1 text-sm text-[#5B6B67]">{b.area} · {types[b.kind]} · {b.planned_hours} planned hours</p></div><span className="rounded-full bg-[#EEF5F1] px-3 py-1 text-xs font-semibold">{b.published_at ? "Published" : "Draft"}</span></div>
            <p className="mt-3 text-sm">{dateLabel(b.start_time)} → {dateLabel(b.end_time)}</p>
            <p className="mt-2 text-sm text-[#5B6B67]">{b.staff_names.map(s => s.name).join(", ") || "No staff assigned"}</p>
            <p className="mt-2 text-xs text-[#5B6B67]">{b.pay_mode === "hourly" ? "Hourly" : b.pay_mode === "fixed" ? "Fixed block" : "Incentive block"}{b.rate !== null ? ` · £${b.rate}${b.pay_mode === "hourly" ? "/hour" : "/block"}` : " · Rate not set"}</p>
            <div className="mt-4 flex gap-3"><button disabled={busy} onClick={() => publish(b)} className="min-h-11 rounded-xl bg-[#0E7C6B] px-4 text-sm font-semibold text-white disabled:opacity-50">{b.published_at ? "Unpublish" : "Publish block"}</button>{!b.published_at && <button disabled={busy} className="min-h-11 rounded-xl border px-4 text-sm" onClick={() => { setEditing(b.id); setForm({ ...b, rate: b.rate ?? "", start_time: localDateTime(b.start_time), end_time: localDateTime(b.end_time) }); }}>Edit draft</button>}</div>
          </article>)}</div>
        </section>
        <form onSubmit={save} className="rounded-2xl border border-[#E3E9E7] bg-white p-5">
          <h2 className="font-serif text-2xl">{editing ? "Edit draft" : "Create a block"}</h2>
          <div className="mt-5 space-y-4">
            <label className="block text-sm font-semibold">Block name<input required maxLength={120} name="title" value={form.title} onChange={change} className={input} placeholder="Watford morning care" /></label>
            <label className="block text-sm font-semibold">Area / county<input required maxLength={100} name="area" value={form.area} onChange={change} className={input} placeholder="Watford, Hertfordshire" /></label>
            <label className="block text-sm font-semibold">Block type<select name="kind" value={form.kind} onChange={change} className={input}>{Object.entries(types).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <label className="block text-sm font-semibold">Starts<input required type="datetime-local" name="start_time" value={form.start_time} onChange={change} className={input} /></label>
            <label className="block text-sm font-semibold">Ends<input required type="datetime-local" name="end_time" value={form.end_time} onChange={change} className={input} /></label>
            <label className="block text-sm font-semibold">Pay basis<select name="pay_mode" value={form.pay_mode} onChange={change} className={input}><option value="hourly">Hourly</option><option value="fixed">Fixed block</option><option value="incentive">Incentive block</option></select></label>
            <label className="block text-sm font-semibold">{form.pay_mode === "hourly" ? "Rate per hour (£), optional" : "Amount per block (£), optional"}<input type="number" min="0" step="0.01" name="rate" value={form.rate} onChange={change} className={input} /></label>
            <fieldset><legend className="text-sm font-semibold">Assign staff</legend>{staff.length === 0 ? <Link className="mt-2 block text-sm text-[#0E7C6B]" href="/provider-staff">Add staff first →</Link> : staff.map(s => <label key={s.id} className="mt-2 flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={form.staff.includes(s.id)} onChange={e => setForm({ ...form, staff: e.target.checked ? [...form.staff, s.id] : form.staff.filter(id => id !== s.id) })} />{s.first_name} {s.last_name}</label>)}</fieldset>
            <label className="block text-sm font-semibold">Manager notes<textarea maxLength={2000} name="notes" value={form.notes} onChange={change} className={input} /></label>
            <button disabled={busy} className="min-h-11 w-full rounded-xl bg-[#0E7C6B] px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save draft"}</button>
            {editing && <button type="button" onClick={() => { setEditing(null); setForm(initial); }} className="min-h-11 w-full text-sm">Cancel edit</button>}
          </div>
        </form>
      </div>}
    </div>
  </main>;
}
