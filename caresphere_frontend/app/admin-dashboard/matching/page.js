"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Building2,
  CheckCircle2,
  RefreshCw,
  Search,
  UserSearch,
  XCircle,
} from "lucide-react";

import { authFetch } from "../../../lib/auth";
import { API_URL } from "../../../lib/config";


export default function AdminMatchingPage() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [workingId, setWorkingId] = useState(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");


  async function loadMatching(showLoader = true) {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError("");

      const response = await authFetch(
        `${API_URL}/api/users/admin/operations/`
      );

      if (!response.ok) {
        throw new Error(
          `Unable to load matching operations (${response.status}).`
        );
      }

      const payload = await response.json();

      setData(payload.matching || null);
    } catch (err) {
      setError(
        err.message ||
          "Unable to load matching operations."
      );
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }


  useEffect(() => {
    loadMatching();
  }, []);


  async function handleMatchAction(match, action) {
    const labels = {
      accept: "Accept",
      reject: "Reject",
      pending: "Return to pending",
      complete: "Complete",
    };

    const providerName =
      match.provider_name || "this provider";

    const familyName =
      match.user_name ||
      match.user_email ||
      "this user";

    const confirmed = window.confirm(
      `${labels[action]} the match between ${familyName} and ${providerName}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setWorkingId(match.id);
      setActionMessage("");
      setActionError("");

      const response = await authFetch(
        `${API_URL}/api/users/admin/actions/matching/${match.id}/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
          }),
        }
      );

      let payload = {};

      try {
        payload = await response.json();
      } catch {
        payload = {};
      }

      if (!response.ok) {
        throw new Error(
          payload.detail ||
            `Unable to update match (${response.status}).`
        );
      }

      setActionMessage(
        `Match ${
          action === "accept"
            ? "accepted"
            : action === "reject"
            ? "rejected"
            : action === "pending"
            ? "returned to pending"
            : "completed"
        } successfully.`
      );

      await loadMatching(false);
    } catch (err) {
      setActionError(
        err.message ||
          "Unable to update match status."
      );
    } finally {
      setWorkingId(null);
    }
  }


  const summary = data?.summary || {};
  const matches = data?.items || [];


  const filteredMatches = useMemo(() => {
    const query = search.trim().toLowerCase();

    return matches.filter((match) => {
      const searchable = [
        match.user_name,
        match.user_email,
        match.provider_name,
        match.status,
        match.status_display,
        match.match_score,
      ]
        .filter(
          (value) =>
            value !== null &&
            value !== undefined
        )
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchable.includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        match.status === statusFilter;

      const score =
        Number(match.match_score || 0);

      let matchesScore = true;

      if (scoreFilter === "excellent") {
        matchesScore = score >= 80;
      }

      if (scoreFilter === "strong") {
        matchesScore =
          score >= 60 && score < 80;
      }

      if (scoreFilter === "moderate") {
        matchesScore =
          score >= 40 && score < 60;
      }

      if (scoreFilter === "low") {
        matchesScore = score < 40;
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesScore
      );
    });
  }, [
    matches,
    search,
    statusFilter,
    scoreFilter,
  ]);


  return (
    <>
      <PageHeader />

      <section className="
        mt-6 grid gap-4
        sm:grid-cols-2
        xl:grid-cols-4
      ">
        <SummaryCard
          label="Total matches"
          value={loading ? "…" : summary.total ?? 0}
          icon={UserSearch}
        />

        <SummaryCard
          label="Pending"
          value={loading ? "…" : summary.pending ?? 0}
          icon={Activity}
        />

        <SummaryCard
          label="Accepted"
          value={loading ? "…" : summary.accepted ?? 0}
          icon={Building2}
        />

        <SummaryCard
          label="Completed"
          value={loading ? "…" : summary.completed ?? 0}
          icon={CheckCircle2}
        />
      </section>

      {(actionMessage || actionError) && (
        <FeedbackBanner
          error={actionError}
          message={actionMessage}
        />
      )}

      <section className="
        mt-6 overflow-hidden
        rounded-3xl
        border border-slate-200
        bg-white
        shadow-sm
      ">
        <div className="
          border-b border-slate-200
          px-6 py-6
        ">
          <div className="
            flex flex-col gap-5
            xl:flex-row
            xl:items-end
            xl:justify-between
          ">
            <div className="
              flex items-center gap-3
            ">
              <div className="
                flex h-11 w-11
                items-center justify-center
                rounded-2xl
                bg-teal-50
                text-[#176B62]
              ">
                <Activity className="h-5 w-5" />
              </div>

              <div>
                <h2 className="
                  text-xl font-black
                  text-slate-950
                ">
                  Matching operations
                </h2>

                <p className="
                  mt-1 text-sm
                  text-slate-500
                ">
                  Review matches and manage
                  administrative match status.
                </p>
              </div>
            </div>

            <div className="
              flex flex-col gap-3
              lg:flex-row
            ">
              <div className="relative">
                <Search className="
                  absolute left-3 top-1/2
                  h-4 w-4
                  -translate-y-1/2
                  text-slate-400
                " />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search matches..."
                  className="
                    h-11 w-full
                    rounded-xl
                    border border-slate-200
                    bg-slate-50
                    pl-10 pr-4
                    text-sm
                    outline-none
                    focus:border-teal-500
                    focus:bg-white
                    sm:w-64
                  "
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="
                  h-11 rounded-xl
                  border border-slate-200
                  bg-white px-4
                  text-sm font-semibold
                  text-slate-700
                "
              >
                <option value="all">
                  All statuses
                </option>

                <option value="pending">
                  Pending
                </option>

                <option value="accepted">
                  Accepted
                </option>

                <option value="rejected">
                  Rejected
                </option>

                <option value="completed">
                  Completed
                </option>
              </select>

              <select
                value={scoreFilter}
                onChange={(event) =>
                  setScoreFilter(event.target.value)
                }
                className="
                  h-11 rounded-xl
                  border border-slate-200
                  bg-white px-4
                  text-sm font-semibold
                  text-slate-700
                "
              >
                <option value="all">
                  All scores
                </option>

                <option value="excellent">
                  80–100%
                </option>

                <option value="strong">
                  60–79%
                </option>

                <option value="moderate">
                  40–59%
                </option>

                <option value="low">
                  Below 40%
                </option>
              </select>

              <button
                type="button"
                onClick={() => loadMatching()}
                disabled={loading}
                className="
                  inline-flex h-11
                  items-center justify-center
                  gap-2 rounded-xl
                  border border-slate-200
                  bg-white px-4
                  text-sm font-black
                  text-slate-700
                  hover:bg-slate-50
                  disabled:opacity-50
                "
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    loading ? "animate-spin" : ""
                  }`}
                />

                Refresh
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <ErrorState message={error} />
        ) : loading ? (
          <LoadingState />
        ) : filteredMatches.length === 0 ? (
          <EmptyState
            search={search}
            statusFilter={statusFilter}
            scoreFilter={scoreFilter}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="
              min-w-full
              divide-y divide-slate-200
            ">
              <thead className="bg-slate-50">
                <tr>
                  <TableHeading>
                    Family / User
                  </TableHeading>

                  <TableHeading>
                    Provider
                  </TableHeading>

                  <TableHeading>
                    Match score
                  </TableHeading>

                  <TableHeading>
                    Quality
                  </TableHeading>

                  <TableHeading>
                    Status
                  </TableHeading>

                  <TableHeading>
                    Created
                  </TableHeading>

                  <TableHeading>
                    Admin controls
                  </TableHeading>
                </tr>
              </thead>

              <tbody className="
                divide-y divide-slate-100
                bg-white
              ">
                {filteredMatches.map((match) => (
                  <MatchRow
                    key={match.id}
                    match={match}
                    working={
                      workingId === match.id
                    }
                    onAction={
                      handleMatchAction
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && (
          <div className="
            border-t border-slate-200
            bg-slate-50/70
            px-6 py-4
            text-xs font-semibold
            text-slate-500
          ">
            Showing {filteredMatches.length} of{" "}
            {matches.length} match
            {matches.length === 1 ? "" : "es"}.
          </div>
        )}
      </section>
    </>
  );
}


function MatchRow({
  match,
  working,
  onAction,
}) {
  const score =
    Number(match.match_score || 0);

  const quality = getMatchQuality(score);

  return (
    <tr className="
      transition
      hover:bg-slate-50/80
    ">
      <td className="
        min-w-[220px]
        px-6 py-5
      ">
        <div className="
          flex items-center gap-3
        ">
          <div className="
            flex h-11 w-11
            items-center justify-center
            rounded-2xl
            bg-teal-50
            text-[#176B62]
          ">
            <UserSearch className="h-5 w-5" />
          </div>

          <div>
            <div className="
              font-black
              text-slate-900
            ">
              {match.user_name ||
                match.user_email ||
                "Unknown user"}
            </div>

            <div className="
              mt-1 text-xs
              text-slate-500
            ">
              {match.user_email || "No email"}
            </div>
          </div>
        </div>
      </td>

      <td className="
        min-w-[200px]
        px-6 py-5
      ">
        <div className="
          flex items-center gap-2
        ">
          <Building2 className="
            h-4 w-4
            text-slate-400
          " />

          <span className="
            text-sm font-bold
            text-slate-800
          ">
            {match.provider_name ||
              "Unknown provider"}
          </span>
        </div>
      </td>

      <td className="
        min-w-[190px]
        px-6 py-5
      ">
        <div className="
          flex items-center gap-3
        ">
          <div className="
            text-lg font-black
            text-slate-950
          ">
            {score}%
          </div>

          <div className="
            h-2 w-24
            overflow-hidden
            rounded-full
            bg-slate-100
          ">
            <div
              className="
                h-full rounded-full
                bg-[#176B62]
              "
              style={{
                width: `${Math.min(
                  100,
                  Math.max(0, score)
                )}%`,
              }}
            />
          </div>
        </div>
      </td>

      <td className="
        whitespace-nowrap
        px-6 py-5
      ">
        <Badge tone={quality.tone}>
          {quality.label}
        </Badge>
      </td>

      <td className="
        whitespace-nowrap
        px-6 py-5
      ">
        <StatusBadge
          status={match.status}
          label={
            match.status_display ||
            match.status
          }
        />
      </td>

      <td className="
        whitespace-nowrap
        px-6 py-5
      ">
        <div className="
          text-sm font-semibold
          text-slate-700
        ">
          {formatDate(match.created_at)}
        </div>
      </td>

      <td className="
        min-w-[200px]
        px-6 py-5
      ">
        <MatchActions
          match={match}
          working={working}
          onAction={onAction}
        />
      </td>
    </tr>
  );
}


function MatchActions({
  match,
  working,
  onAction,
}) {
  if (working) {
    return (
      <div className="
        inline-flex items-center
        gap-2 text-xs font-bold
        text-slate-500
      ">
        <RefreshCw className="
          h-4 w-4 animate-spin
        " />

        Saving...
      </div>
    );
  }

  if (match.status === "pending") {
    return (
      <div className="flex flex-wrap gap-2">
        <ActionButton
          tone="green"
          onClick={() =>
            onAction(match, "accept")
          }
        >
          Accept
        </ActionButton>

        <ActionButton
          tone="red"
          onClick={() =>
            onAction(match, "reject")
          }
        >
          Reject
        </ActionButton>
      </div>
    );
  }

  if (match.status === "accepted") {
    return (
      <div className="flex flex-wrap gap-2">
        <ActionButton
          tone="green"
          onClick={() =>
            onAction(match, "complete")
          }
        >
          Complete
        </ActionButton>

        <ActionButton
          tone="amber"
          onClick={() =>
            onAction(match, "pending")
          }
        >
          Pending
        </ActionButton>
      </div>
    );
  }

  if (match.status === "rejected") {
    return (
      <ActionButton
        tone="amber"
        onClick={() =>
          onAction(match, "pending")
        }
      >
        Reopen
      </ActionButton>
    );
  }

  if (match.status === "completed") {
    return (
      <div className="
        inline-flex items-center gap-2
        text-xs font-black
        text-emerald-700
      ">
        <CheckCircle2 className="h-4 w-4" />
        Completed
      </div>
    );
  }

  return (
    <span className="
      text-xs text-slate-400
    ">
      No actions
    </span>
  );
}


function ActionButton({
  children,
  onClick,
  tone = "slate",
}) {
  const tones = {
    green:
      "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    red:
      "bg-rose-50 text-rose-700 hover:bg-rose-100",
    amber:
      "bg-amber-50 text-amber-700 hover:bg-amber-100",
    slate:
      "bg-slate-100 text-slate-700 hover:bg-slate-200",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        rounded-xl px-3 py-2
        text-xs font-black
        transition
        ${tones[tone] || tones.slate}
      `}
    >
      {children}
    </button>
  );
}


function PageHeader() {
  return (
    <section className="
      rounded-3xl
      bg-[#0D3F3A]
      px-7 py-8
      text-white
      shadow-xl
    ">
      <div className="
        flex items-center
        justify-between gap-6
      ">
        <div>
          <div className="
            text-xs font-black
            tracking-[0.18em]
            text-teal-200
          ">
            MATCHING ENGINE
          </div>

          <h1 className="
            mt-3 text-3xl
            font-black
          ">
            Provider Matching
          </h1>

          <p className="
            mt-3 max-w-2xl
            text-sm leading-6
            text-teal-50/75
          ">
            Monitor CareSphere matches, match scores,
            pending decisions and provider-selection outcomes.
          </p>
        </div>

        <div className="
          hidden h-16 w-16
          items-center justify-center
          rounded-2xl
          bg-white/10
          sm:flex
        ">
          <UserSearch className="h-8 w-8" />
        </div>
      </div>
    </section>
  );
}


function SummaryCard({
  label,
  value,
  icon: Icon,
}) {
  return (
    <div className="
      rounded-3xl
      border border-slate-200
      bg-white p-5
      shadow-sm
    ">
      <div className="
        flex items-start
        justify-between gap-4
      ">
        <div>
          <div className="
            text-sm font-semibold
            text-slate-500
          ">
            {label}
          </div>

          <div className="
            mt-3 text-3xl
            font-black
            text-slate-950
          ">
            {value}
          </div>
        </div>

        <div className="
          flex h-10 w-10
          items-center justify-center
          rounded-xl
          bg-slate-50
          text-[#176B62]
        ">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}


function TableHeading({ children }) {
  return (
    <th className="
      whitespace-nowrap
      px-6 py-4
      text-left text-xs
      font-black uppercase
      tracking-wider
      text-slate-500
    ">
      {children}
    </th>
  );
}


function StatusBadge({
  status,
  label,
}) {
  const tones = {
    pending: "amber",
    accepted: "blue",
    rejected: "red",
    completed: "green",
  };

  return (
    <Badge tone={tones[status] || "slate"}>
      {formatLabel(label)}
    </Badge>
  );
}


function Badge({
  children,
  tone = "slate",
}) {
  const tones = {
    green:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    amber:
      "bg-amber-50 text-amber-700 ring-amber-600/20",
    red:
      "bg-rose-50 text-rose-700 ring-rose-600/20",
    blue:
      "bg-blue-50 text-blue-700 ring-blue-600/20",
    slate:
      "bg-slate-100 text-slate-700 ring-slate-600/10",
  };

  return (
    <span className={`
      inline-flex items-center gap-1.5
      rounded-full px-2.5 py-1
      text-xs font-black
      ring-1 ring-inset
      ${tones[tone] || tones.slate}
    `}>
      {children}
    </span>
  );
}


function FeedbackBanner({
  error,
  message,
}) {
  return (
    <section className={`
      mt-6 rounded-2xl
      border px-5 py-4
      text-sm font-semibold
      ${
        error
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }
    `}>
      {error || message}
    </section>
  );
}


function LoadingState() {
  return (
    <div className="
      flex min-h-[300px]
      items-center justify-center
      px-6 py-12
    ">
      <div className="text-center">
        <div className="
          mx-auto h-8 w-8
          animate-spin
          rounded-full
          border-4 border-slate-200
          border-t-[#176B62]
        " />

        <p className="
          mt-4 text-sm font-semibold
          text-slate-500
        ">
          Loading matching operations...
        </p>
      </div>
    </div>
  );
}


function ErrorState({ message }) {
  return (
    <div className="
      flex min-h-[300px]
      items-center justify-center
      px-6 py-12
    ">
      <div className="
        max-w-md text-center
      ">
        <AlertCircle className="
          mx-auto h-8 w-8
          text-rose-500
        " />

        <h3 className="
          mt-4 font-black
          text-slate-900
        ">
          Matching data unavailable
        </h3>

        <p className="
          mt-2 text-sm leading-6
          text-slate-500
        ">
          {message}
        </p>
      </div>
    </div>
  );
}


function EmptyState({
  search,
  statusFilter,
  scoreFilter,
}) {
  const filtered =
    search ||
    statusFilter !== "all" ||
    scoreFilter !== "all";

  return (
    <div className="
      flex min-h-[300px]
      items-center justify-center
      px-6 py-12
    ">
      <div className="text-center">
        <UserSearch className="
          mx-auto h-8 w-8
          text-slate-400
        " />

        <h3 className="
          mt-4 font-black
          text-slate-900
        ">
          No matches found
        </h3>

        <p className="
          mt-2 text-sm
          text-slate-500
        ">
          {filtered
            ? "Try changing your search or filters."
            : "No provider matches have been created yet."}
        </p>
      </div>
    </div>
  );
}


function getMatchQuality(score) {
  if (score >= 80) {
    return {
      label: "Excellent match",
      tone: "green",
    };
  }

  if (score >= 60) {
    return {
      label: "Strong match",
      tone: "blue",
    };
  }

  if (score >= 40) {
    return {
      label: "Moderate match",
      tone: "amber",
    };
  }

  return {
    label: "Low match",
    tone: "red",
  };
}


function formatLabel(value) {
  if (!value) {
    return "Unknown";
  }

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}


function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
}
