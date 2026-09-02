"use client";

import {
  AlertCircle,
  Archive,
  Lock,
  MessagesSquare,
  RefreshCw,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { authFetch } from "../../../lib/auth";
import { API_URL } from "../../../lib/config";


export default function AdminCommunicationsPage() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  async function loadCommunications(showLoader = true) {
    try {
      if (showLoader) setLoading(true);

      setError("");

      const response = await authFetch(
        `${API_URL}/api/users/admin/governance/`
      );

      if (!response.ok) {
        throw new Error(
          `Unable to load communications (${response.status}).`
        );
      }

      const payload = await response.json();
      setData(payload.communications || null);
    } catch (err) {
      setError(
        err.message ||
          "Unable to load communication operations."
      );
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  useEffect(() => {
    loadCommunications();
  }, []);

  async function handleThreadAction(thread, action) {
    const confirmed = window.confirm(
      `Apply "${formatLabel(action)}" to "${
        thread.subject
      }"?`
    );

    if (!confirmed) return;

    try {
      setWorkingId(thread.id);
      setActionMessage("");
      setActionError("");

      const response = await authFetch(
        `${API_URL}/api/users/admin/actions/communications/${thread.id}/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        }
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.detail ||
            "Unable to update communication thread."
        );
      }

      setActionMessage(
        `"${thread.subject}" updated successfully.`
      );

      await loadCommunications(false);
    } catch (err) {
      setActionError(
        err.message ||
          "Unable to update communication thread."
      );
    } finally {
      setWorkingId(null);
    }
  }

  const summary = data?.summary || {};
  const threads = data?.items || [];

  const filteredThreads = useMemo(() => {
    const query = search.trim().toLowerCase();

    return threads.filter((thread) => {
      const searchable = [
        thread.subject,
        thread.care_circle_name,
        thread.service_user_name,
        thread.started_by,
        thread.started_by_email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchable.includes(query);

      const matchesFilter =
        filter === "all" ||
        (filter === "active" && !thread.is_archived) ||
        (filter === "archived" && thread.is_archived) ||
        (filter === "locked" && thread.is_locked);

      return matchesSearch && matchesFilter;
    });
  }, [threads, search, filter]);

  return (
    <>
      <PageHeader />

      <section className="
        mt-6 grid gap-4
        sm:grid-cols-2 xl:grid-cols-4
      ">
        <SummaryCard
          label="Discussion threads"
          value={
            loading
              ? "…"
              : summary.total_threads ?? 0
          }
        />
        <SummaryCard
          label="Active threads"
          value={
            loading
              ? "…"
              : summary.active_threads ?? 0
          }
        />
        <SummaryCard
          label="Messages"
          value={
            loading
              ? "…"
              : summary.total_messages ?? 0
          }
        />
        <SummaryCard
          label="Locked threads"
          value={
            loading
              ? "…"
              : summary.locked_threads ?? 0
          }
        />
      </section>

      {(actionMessage || actionError) && (
        <FeedbackBanner
          error={actionError}
          message={actionMessage}
        />
      )}

      <section className="
        mt-6 overflow-hidden rounded-3xl
        border border-slate-200
        bg-white shadow-sm
      ">
        <div className="
          flex flex-col gap-5
          border-b border-slate-200
          px-6 py-6
          xl:flex-row xl:items-end
          xl:justify-between
        ">
          <div>
            <h2 className="
              text-xl font-black text-slate-950
            ">
              Communication activity
            </h2>
            <p className="
              mt-1 text-sm text-slate-500
            ">
              Lock, unlock, archive or restore
              family communication threads.
            </p>
          </div>

          <div className="
            flex flex-col gap-3 sm:flex-row
          ">
            <div className="relative">
              <Search className="
                absolute left-3 top-1/2
                h-4 w-4 -translate-y-1/2
                text-slate-400
              " />
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search discussions..."
                className="
                  h-11 rounded-xl border
                  border-slate-200 bg-slate-50
                  pl-10 pr-4 text-sm
                  sm:w-64
                "
              />
            </div>

            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value)
              }
              className="
                h-11 rounded-xl
                border border-slate-200
                bg-white px-4 text-sm font-semibold
              "
            >
              <option value="all">All threads</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="locked">Locked</option>
            </select>

            <button
              type="button"
              onClick={() => loadCommunications()}
              className="
                inline-flex h-11 items-center
                gap-2 rounded-xl border
                border-slate-200 bg-white
                px-4 text-sm font-black
              "
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <ErrorState message={error} />
        ) : loading ? (
          <LoadingState />
        ) : filteredThreads.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <Heading>Discussion</Heading>
                  <Heading>Care circle</Heading>
                  <Heading>Service user</Heading>
                  <Heading>Messages</Heading>
                  <Heading>Status</Heading>
                  <Heading>Admin controls</Heading>
                </tr>
              </thead>

              <tbody className="
                divide-y divide-slate-100
              ">
                {filteredThreads.map((thread) => (
                  <tr
                    key={thread.id}
                    className="hover:bg-slate-50/80"
                  >
                    <td className="px-6 py-5">
                      <div className="
                        font-black text-slate-900
                      ">
                        {thread.subject}
                      </div>
                      <div className="
                        mt-1 text-xs text-slate-500
                      ">
                        Started by {thread.started_by}
                      </div>
                    </td>

                    <td className="
                      px-6 py-5 font-semibold
                    ">
                      {thread.care_circle_name}
                    </td>

                    <td className="px-6 py-5">
                      {thread.service_user_name}
                    </td>

                    <td className="px-6 py-5">
                      <Badge tone="blue">
                        {thread.message_count || 0} messages
                      </Badge>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex gap-2">
                        <Badge
                          tone={
                            thread.is_archived
                              ? "slate"
                              : "green"
                          }
                        >
                          {thread.is_archived
                            ? "Archived"
                            : "Active"}
                        </Badge>

                        {thread.is_locked && (
                          <Badge tone="amber">
                            Locked
                          </Badge>
                        )}
                      </div>
                    </td>

                    <td className="
                      min-w-[280px] px-6 py-5
                    ">
                      <div className="
                        flex flex-wrap gap-2
                      ">
                        <button
                          disabled={workingId === thread.id}
                          onClick={() =>
                            handleThreadAction(
                              thread,
                              thread.is_locked
                                ? "unlock"
                                : "lock"
                            )
                          }
                          className="
                            inline-flex items-center
                            gap-1.5 rounded-xl
                            bg-amber-50 px-3 py-2
                            text-xs font-black
                            text-amber-700
                            disabled:opacity-50
                          "
                        >
                          <Lock className="h-3.5 w-3.5" />
                          {thread.is_locked
                            ? "Unlock"
                            : "Lock"}
                        </button>

                        <button
                          disabled={workingId === thread.id}
                          onClick={() =>
                            handleThreadAction(
                              thread,
                              thread.is_archived
                                ? "unarchive"
                                : "archive"
                            )
                          }
                          className="
                            inline-flex items-center
                            gap-1.5 rounded-xl
                            bg-slate-100 px-3 py-2
                            text-xs font-black
                            text-slate-700
                            disabled:opacity-50
                          "
                        >
                          <Archive className="h-3.5 w-3.5" />
                          {thread.is_archived
                            ? "Restore"
                            : "Archive"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}


function PageHeader() {
  return (
    <section className="
      rounded-3xl bg-[#0D3F3A]
      px-7 py-8 text-white shadow-xl
    ">
      <div className="
        flex items-center justify-between
      ">
        <div>
          <div className="
            text-xs font-black tracking-[0.18em]
            text-teal-200
          ">
            FAMILY COMMUNICATION
          </div>
          <h1 className="
            mt-3 text-3xl font-black
          ">
            Communications
          </h1>
          <p className="
            mt-3 text-sm text-teal-50/75
          ">
            Monitor and manage CareSphere discussion threads.
          </p>
        </div>

        <MessagesSquare className="
          hidden h-8 w-8 sm:block
        " />
      </div>
    </section>
  );
}


function SummaryCard({ label, value }) {
  return (
    <div className="
      rounded-3xl border border-slate-200
      bg-white p-5 shadow-sm
    ">
      <div className="
        text-sm font-semibold text-slate-500
      ">
        {label}
      </div>
      <div className="
        mt-3 text-3xl font-black
      ">
        {value}
      </div>
    </div>
  );
}


function Heading({ children }) {
  return (
    <th className="
      whitespace-nowrap px-6 py-4
      text-left text-xs font-black
      uppercase text-slate-500
    ">
      {children}
    </th>
  );
}


function Badge({ children, tone = "slate" }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <span className={`
      rounded-full px-2.5 py-1
      text-xs font-black
      ${tones[tone]}
    `}>
      {children}
    </span>
  );
}


function FeedbackBanner({ error, message }) {
  return (
    <div className={`
      mt-6 rounded-2xl border px-5 py-4
      text-sm font-semibold
      ${
        error
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }
    `}>
      {error || message}
    </div>
  );
}


function LoadingState() {
  return (
    <div className="
      min-h-[300px] p-10 text-center
      text-slate-500
    ">
      Loading communications...
    </div>
  );
}


function ErrorState({ message }) {
  return (
    <div className="
      min-h-[300px] p-10 text-center
    ">
      <AlertCircle className="
        mx-auto h-8 w-8 text-rose-500
      " />
      <p className="mt-4 text-slate-500">
        {message}
      </p>
    </div>
  );
}


function EmptyState() {
  return (
    <div className="
      min-h-[300px] p-10 text-center
      text-slate-500
    ">
      No communication threads found.
    </div>
  );
}


function formatLabel(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}
