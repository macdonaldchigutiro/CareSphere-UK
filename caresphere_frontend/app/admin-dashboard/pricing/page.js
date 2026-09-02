"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BadgePoundSterling,
  Building2,
  RefreshCw,
  Search,
  Tags,
} from "lucide-react";

import { authFetch } from "../../../lib/auth";
import { API_URL } from "../../../lib/config";


export default function AdminPricingPage() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  async function loadPricing(showLoader = true) {
    try {
      if (showLoader) setLoading(true);

      setError("");

      const response = await authFetch(
        `${API_URL}/api/users/admin/governance/`
      );

      if (!response.ok) {
        throw new Error(
          `Unable to load pricing (${response.status}).`
        );
      }

      const payload = await response.json();
      setData(payload.pricing || null);
    } catch (err) {
      setError(
        err.message || "Unable to load pricing operations."
      );
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  useEffect(() => {
    loadPricing();
  }, []);

  async function changeTierStatus(tier) {
    const action = tier.is_active
      ? "deactivate"
      : "activate";

    const confirmed = window.confirm(
      `${action === "activate" ? "Activate" : "Deactivate"} ${
        tier.name
      } for ${tier.provider_name}?`
    );

    if (!confirmed) return;

    try {
      setWorkingId(tier.id);
      setActionMessage("");
      setActionError("");

      const response = await authFetch(
        `${API_URL}/api/users/admin/actions/pricing/${tier.id}/`,
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
          payload.detail || "Unable to update pricing tier."
        );
      }

      setActionMessage(
        `${tier.name} ${
          action === "activate"
            ? "activated"
            : "deactivated"
        } successfully.`
      );

      await loadPricing(false);
    } catch (err) {
      setActionError(
        err.message || "Unable to update pricing tier."
      );
    } finally {
      setWorkingId(null);
    }
  }

  const summary = data?.summary || {};
  const tiers = data?.items || [];

  const filteredTiers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tiers.filter((tier) => {
      const searchable = [
        tier.provider_name,
        tier.name,
        tier.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchable.includes(query);

      const matchesFilter =
        filter === "all" ||
        (filter === "active" && tier.is_active) ||
        (filter === "inactive" && !tier.is_active);

      return matchesSearch && matchesFilter;
    });
  }, [tiers, search, filter]);

  return (
    <>
      <PageHeader />

      <section className="
        mt-6 grid gap-4
        sm:grid-cols-2 xl:grid-cols-4
      ">
        <SummaryCard
          label="Pricing tiers"
          value={loading ? "…" : summary.total ?? 0}
        />
        <SummaryCard
          label="Active tiers"
          value={loading ? "…" : summary.active ?? 0}
        />
        <SummaryCard
          label="Inactive tiers"
          value={loading ? "…" : summary.inactive ?? 0}
        />
        <SummaryCard
          label="Average hourly"
          value={
            loading
              ? "…"
              : formatCurrency(summary.average_hourly_rate)
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
          <div className="flex items-center gap-3">
            <div className="
              flex h-11 w-11 items-center
              justify-center rounded-2xl
              bg-teal-50 text-[#176B62]
            ">
              <Tags className="h-5 w-5" />
            </div>

            <div>
              <h2 className="
                text-xl font-black text-slate-950
              ">
                Pricing management
              </h2>
              <p className="
                mt-1 text-sm text-slate-500
              ">
                Review and activate or deactivate
                provider pricing tiers.
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
                placeholder="Search pricing..."
                className="
                  h-11 rounded-xl border
                  border-slate-200 bg-slate-50
                  pl-10 pr-4 text-sm outline-none
                  focus:border-teal-500
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
                h-11 rounded-xl border
                border-slate-200 bg-white
                px-4 text-sm font-semibold
              "
            >
              <option value="all">All tiers</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <button
              onClick={() => loadPricing()}
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
        ) : filteredTiers.length === 0 ? (
          <EmptyState filtered={search || filter !== "all"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <Heading>Tier</Heading>
                  <Heading>Provider</Heading>
                  <Heading>Hourly</Heading>
                  <Heading>Daily</Heading>
                  <Heading>Weekly</Heading>
                  <Heading>Status</Heading>
                  <Heading>Admin action</Heading>
                </tr>
              </thead>

              <tbody className="
                divide-y divide-slate-100
              ">
                {filteredTiers.map((tier) => (
                  <tr
                    key={tier.id}
                    className="hover:bg-slate-50/80"
                  >
                    <td className="px-6 py-5">
                      <div className="
                        font-black text-slate-900
                      ">
                        {tier.name}
                      </div>
                      <div className="
                        mt-1 text-xs text-slate-500
                      ">
                        {tier.description ||
                          "No description"}
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="
                        flex items-center gap-2
                        font-bold text-slate-800
                      ">
                        <Building2 className="
                          h-4 w-4 text-slate-400
                        " />
                        {tier.provider_name}
                      </div>
                    </td>

                    <td className="
                      px-6 py-5 font-black
                    ">
                      {formatCurrency(tier.hourly_rate)}
                    </td>

                    <td className="px-6 py-5">
                      {tier.daily_rate
                        ? formatCurrency(tier.daily_rate)
                        : "—"}
                    </td>

                    <td className="px-6 py-5">
                      {tier.weekly_rate
                        ? formatCurrency(tier.weekly_rate)
                        : "—"}
                    </td>

                    <td className="px-6 py-5">
                      <Badge
                        tone={
                          tier.is_active
                            ? "green"
                            : "slate"
                        }
                      >
                        {tier.is_active
                          ? "Active"
                          : "Inactive"}
                      </Badge>
                    </td>

                    <td className="px-6 py-5">
                      <button
                        type="button"
                        disabled={workingId === tier.id}
                        onClick={() =>
                          changeTierStatus(tier)
                        }
                        className={`
                          rounded-xl px-4 py-2
                          text-xs font-black
                          disabled:opacity-50
                          ${
                            tier.is_active
                              ? "bg-rose-50 text-rose-700"
                              : "bg-emerald-50 text-emerald-700"
                          }
                        `}
                      >
                        {workingId === tier.id
                          ? "Saving..."
                          : tier.is_active
                          ? "Deactivate"
                          : "Activate"}
                      </button>
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
            COMMERCIAL GOVERNANCE
          </div>
          <h1 className="
            mt-3 text-3xl font-black
          ">
            Pricing
          </h1>
          <p className="
            mt-3 text-sm text-teal-50/75
          ">
            Review and control provider pricing visibility.
          </p>
        </div>

        <BadgePoundSterling className="
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


function Badge({ children, tone }) {
  return (
    <span className={`
      rounded-full px-2.5 py-1
      text-xs font-black
      ${
        tone === "green"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-700"
      }
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
      Loading pricing tiers...
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


function EmptyState({ filtered }) {
  return (
    <div className="
      min-h-[300px] p-10 text-center
      text-slate-500
    ">
      {filtered
        ? "No pricing tiers match your filters."
        : "No provider pricing tiers exist yet."}
    </div>
  );
}


function formatCurrency(value) {
  return new Intl.NumberFormat(
    "en-GB",
    {
      style: "currency",
      currency: "GBP",
    }
  ).format(Number(value || 0));
}
