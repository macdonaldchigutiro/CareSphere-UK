"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

import { authFetch } from "../../../lib/auth";
import { API_URL } from "../../../lib/config";


export default function AdminTrustPage() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [workingId, setWorkingId] = useState(null);

  async function loadTrust(showLoader = true) {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError("");

      const response = await authFetch(
        `${API_URL}/api/users/admin/governance/`
      );

      if (!response.ok) {
        throw new Error(
          `Unable to load trust operations (${response.status}).`
        );
      }

      const payload = await response.json();
      setData(payload.trust || null);
    } catch (err) {
      setError(
        err.message ||
          "Unable to load trust and verification data."
      );
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadTrust();
  }, []);

  async function handleTrustAction(item, action) {
    const labels = {
      verify: "verify",
      pending: "return to pending review",
      expire: "mark as expired",
      revoke: "revoke",
      fail: "mark as failed",
    };

    const actionLabel = labels[action] || action;

    const confirmed = window.confirm(
      `Are you sure you want to ${actionLabel} the verification for ${
        item.provider_name || "this provider"
      }?`
    );

    if (!confirmed) {
      return;
    }

    let notes = "";

    if (
      action === "revoke" ||
      action === "fail" ||
      action === "expire"
    ) {
      const enteredNotes = window.prompt(
        "Add an administrative note for this decision:",
        ""
      );

      if (enteredNotes === null) {
        return;
      }

      notes = enteredNotes.trim();
    }

    try {
      setWorkingId(item.id);
      setActionError("");
      setActionMessage("");

      const response = await authFetch(
        `${API_URL}/api/users/admin/actions/trust/${item.id}/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            notes,
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
            `Unable to update verification (${response.status}).`
        );
      }

      setActionMessage(
        `${item.provider_name || "Provider"} verification updated successfully.`
      );

      await loadTrust(false);
    } catch (err) {
      setActionError(
        err.message ||
          "Unable to update the verification record."
      );
    } finally {
      setWorkingId(null);
    }
  }

  const summary = data?.summary || {};
  const items = data?.items || [];

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const searchable = [
        item.provider_name,
        item.provider_email,
        item.verification_status,
        item.verification_status_display,
        item.cqc_rating,
        item.insurance_provider,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchable.includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        item.verification_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

  return (
    <>
      <PageHeader />

      <section className="
        mt-6 grid gap-4
        sm:grid-cols-2 xl:grid-cols-4
      ">
        <SummaryCard
          label="Verification records"
          value={loading ? "…" : summary.total ?? 0}
        />

        <SummaryCard
          label="Verified"
          value={loading ? "…" : summary.verified ?? 0}
        />

        <SummaryCard
          label="Pending review"
          value={loading ? "…" : summary.pending ?? 0}
          warning={Number(summary.pending || 0) > 0}
        />

        <SummaryCard
          label="DBS verified"
          value={loading ? "…" : summary.dbs_verified ?? 0}
        />
      </section>

      {(actionMessage || actionError) && (
        <section
          className={`
            mt-6 rounded-2xl border px-5 py-4
            text-sm font-semibold
            ${
              actionError
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }
          `}
        >
          {actionError || actionMessage}
        </section>
      )}

      <section className="
        mt-6 overflow-hidden
        rounded-3xl
        border border-slate-200
        bg-white shadow-sm
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
            <div className="flex items-center gap-3">
              <div className="
                flex h-11 w-11
                items-center justify-center
                rounded-2xl bg-teal-50
                text-[#176B62]
              ">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <h2 className="
                  text-xl font-black
                  text-slate-950
                ">
                  Verification register
                </h2>

                <p className="
                  mt-1 text-sm text-slate-500
                ">
                  Monitor and manage provider trust,
                  CQC, DBS, insurance and compliance evidence.
                </p>
              </div>
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
                  placeholder="Search providers..."
                  className="
                    h-11 w-full rounded-xl
                    border border-slate-200
                    bg-slate-50 pl-10 pr-4
                    text-sm outline-none
                    focus:border-teal-500
                    focus:bg-white sm:w-64
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
                  text-slate-700 outline-none
                  focus:border-teal-500
                "
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="expired">Expired</option>
                <option value="revoked">Revoked</option>
                <option value="failed">Failed</option>
              </select>

              <button
                type="button"
                onClick={() => loadTrust()}
                disabled={loading}
                className="
                  inline-flex h-11 items-center
                  justify-center gap-2 rounded-xl
                  border border-slate-200
                  bg-white px-4 text-sm
                  font-black text-slate-700
                  transition hover:bg-slate-50
                  disabled:cursor-not-allowed
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
          <LoadingState text="Loading verification records..." />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title="No verification records found"
            filtered={search || statusFilter !== "all"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="
              min-w-full divide-y
              divide-slate-200
            ">
              <thead className="bg-slate-50">
                <tr>
                  <Heading>Provider</Heading>
                  <Heading>Trust score</Heading>
                  <Heading>Status</Heading>
                  <Heading>CQC</Heading>
                  <Heading>DBS</Heading>
                  <Heading>Insurance</Heading>
                  <Heading>Compliance</Heading>
                  <Heading>Admin action</Heading>
                </tr>
              </thead>

              <tbody className="
                divide-y divide-slate-100
              ">
                {filteredItems.map((item) => (
                  <TrustRow
                    key={item.id}
                    item={item}
                    working={workingId === item.id}
                    onAction={handleTrustAction}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && (
          <FooterCount
            shown={filteredItems.length}
            total={items.length}
            noun="verification record"
          />
        )}
      </section>
    </>
  );
}


function TrustRow({
  item,
  working,
  onAction,
}) {
  const score = Number(item.overall_trust_score || 0);
  const [selectedAction, setSelectedAction] =
    useState("");

  function submitAction() {
    if (!selectedAction) {
      return;
    }

    onAction(item, selectedAction);
  }

  return (
    <tr className="hover:bg-slate-50/80">
      <td className="min-w-[220px] px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="
            flex h-10 w-10
            items-center justify-center
            rounded-xl bg-teal-50
            text-[#176B62]
          ">
            <Building2 className="h-5 w-5" />
          </div>

          <div>
            <div className="
              font-black text-slate-900
            ">
              {item.provider_name || "Unnamed provider"}
            </div>

            <div className="
              mt-1 text-xs text-slate-500
            ">
              {item.provider_email || "No email"}
            </div>
          </div>
        </div>
      </td>

      <td className="min-w-[170px] px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="
            text-lg font-black text-slate-950
          ">
            {score}
          </span>

          <div className="
            h-2 w-20 overflow-hidden
            rounded-full bg-slate-100
          ">
            <div
              className="h-full rounded-full bg-[#176B62]"
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

      <td className="px-6 py-5">
        <StatusBadge
          status={item.verification_status}
          label={item.verification_status_display}
        />
      </td>

      <td className="px-6 py-5">
        <Badge
          tone={
            item.cqc_rating &&
            item.cqc_rating !== "Not Rated"
              ? "green"
              : "slate"
          }
        >
          {item.cqc_rating || "Not rated"}
        </Badge>
      </td>

      <td className="px-6 py-5">
        <BooleanBadge
          value={item.dbs_verified}
          yes="Verified"
          no="Pending"
        />
      </td>

      <td className="px-6 py-5">
        <BooleanBadge
          value={item.insurance_verified}
          yes="Verified"
          no="Pending"
        />
      </td>

      <td className="min-w-[180px] px-6 py-5">
        <div className="flex flex-wrap gap-2">
          {item.gdpr_compliant && (
            <Badge tone="green">GDPR</Badge>
          )}

          {item.health_safety_certified && (
            <Badge tone="blue">
              Health & Safety
            </Badge>
          )}

          {item.iso_certified && (
            <Badge tone="blue">ISO</Badge>
          )}

          {!item.gdpr_compliant &&
            !item.health_safety_certified &&
            !item.iso_certified && (
              <span className="
                text-xs text-slate-400
              ">
                No certifications recorded
              </span>
            )}
        </div>
      </td>

      <td className="min-w-[260px] px-6 py-5">
        <div className="flex items-center gap-2">
          <select
            value={selectedAction}
            onChange={(event) =>
              setSelectedAction(event.target.value)
            }
            disabled={working}
            className="
              h-10 min-w-[145px]
              rounded-xl border
              border-slate-200
              bg-white px-3
              text-xs font-bold
              text-slate-700
              outline-none
              focus:border-teal-500
              disabled:opacity-50
            "
          >
            <option value="">Choose action</option>

            {item.verification_status !== "verified" && (
              <option value="verify">
                Verify
              </option>
            )}

            {item.verification_status !== "pending" && (
              <option value="pending">
                Return to pending
              </option>
            )}

            {item.verification_status !== "expired" && (
              <option value="expire">
                Mark expired
              </option>
            )}

            {item.verification_status !== "revoked" && (
              <option value="revoke">
                Revoke
              </option>
            )}

            {item.verification_status !== "failed" && (
              <option value="fail">
                Mark failed
              </option>
            )}
          </select>

          <button
            type="button"
            onClick={submitAction}
            disabled={!selectedAction || working}
            className="
              inline-flex h-10 items-center
              justify-center rounded-xl
              bg-[#176B62] px-4
              text-xs font-black
              text-white transition
              hover:bg-[#0D574F]
              disabled:cursor-not-allowed
              disabled:bg-slate-200
              disabled:text-slate-400
            "
          >
            {working ? "Saving..." : "Apply"}
          </button>
        </div>
      </td>
    </tr>
  );
}


function PageHeader() {
  return (
    <section className="
      rounded-3xl bg-[#0D3F3A]
      px-7 py-8 text-white shadow-xl
    ">
      <div className="
        flex items-center justify-between gap-6
      ">
        <div>
          <div className="
            text-xs font-black
            tracking-[0.18em]
            text-teal-200
          ">
            GOVERNANCE & TRUST
          </div>

          <h1 className="
            mt-3 text-3xl font-black
          ">
            Trust & Verification
          </h1>

          <p className="
            mt-3 max-w-2xl
            text-sm leading-6
            text-teal-50/75
          ">
            Monitor provider verification, regulatory
            evidence and CareSphere trust standards.
          </p>
        </div>

        <div className="
          hidden h-16 w-16
          items-center justify-center
          rounded-2xl bg-white/10 sm:flex
        ">
          <ShieldCheck className="h-8 w-8" />
        </div>
      </div>
    </section>
  );
}


function SummaryCard({
  label,
  value,
  warning = false,
}) {
  return (
    <div
      className={`
        rounded-3xl border bg-white p-5 shadow-sm
        ${
          warning
            ? "border-amber-200"
            : "border-slate-200"
        }
      `}
    >
      <div className="
        text-sm font-semibold text-slate-500
      ">
        {label}
      </div>

      <div
        className={`
          mt-3 text-3xl font-black
          ${
            warning
              ? "text-amber-600"
              : "text-slate-950"
          }
        `}
      >
        {value}
      </div>
    </div>
  );
}


function StatusBadge({ status, label }) {
  const tones = {
    verified: "green",
    pending: "amber",
    expired: "red",
    revoked: "red",
    failed: "red",
  };

  return (
    <Badge tone={tones[status] || "slate"}>
      {label || formatLabel(status)}
    </Badge>
  );
}


function BooleanBadge({
  value,
  yes,
  no,
}) {
  return (
    <Badge tone={value ? "green" : "amber"}>
      {value ? yes : no}
    </Badge>
  );
}


function Heading({ children }) {
  return (
    <th className="
      whitespace-nowrap px-6 py-4
      text-left text-xs font-black
      uppercase tracking-wider
      text-slate-500
    ">
      {children}
    </th>
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
    <span
      className={`
        inline-flex items-center
        rounded-full px-2.5 py-1
        text-xs font-black
        ring-1 ring-inset
        ${tones[tone] || tones.slate}
      `}
    >
      {children}
    </span>
  );
}


function LoadingState({ text }) {
  return (
    <div className="
      flex min-h-[300px]
      items-center justify-center
    ">
      <div className="text-center">
        <div className="
          mx-auto h-8 w-8 animate-spin
          rounded-full border-4
          border-slate-200
          border-t-[#176B62]
        " />

        <p className="
          mt-4 text-sm font-semibold
          text-slate-500
        ">
          {text}
        </p>
      </div>
    </div>
  );
}


function ErrorState({ message }) {
  return (
    <div className="
      flex min-h-[300px]
      items-center justify-center p-8
    ">
      <div className="text-center">
        <AlertCircle className="
          mx-auto h-8 w-8 text-rose-500
        " />

        <h3 className="
          mt-4 font-black text-slate-900
        ">
          Trust data unavailable
        </h3>

        <p className="
          mt-2 text-sm text-slate-500
        ">
          {message}
        </p>
      </div>
    </div>
  );
}


function EmptyState({
  title,
  filtered,
}) {
  return (
    <div className="
      flex min-h-[300px]
      items-center justify-center p-8
    ">
      <div className="text-center">
        <CheckCircle2 className="
          mx-auto h-8 w-8 text-slate-400
        " />

        <h3 className="
          mt-4 font-black text-slate-900
        ">
          {title}
        </h3>

        <p className="
          mt-2 text-sm text-slate-500
        ">
          {filtered
            ? "Try changing your search or filter."
            : "No provider verification records exist yet."}
        </p>
      </div>
    </div>
  );
}


function FooterCount({
  shown,
  total,
  noun,
}) {
  return (
    <div className="
      border-t border-slate-200
      bg-slate-50/70 px-6 py-4
      text-xs font-semibold
      text-slate-500
    ">
      Showing {shown} of {total} {noun}
      {total === 1 ? "" : "s"}.
    </div>
  );
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
