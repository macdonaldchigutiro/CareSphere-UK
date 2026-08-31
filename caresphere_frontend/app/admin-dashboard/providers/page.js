"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock3,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldX,
  Users,
} from "lucide-react";

import { authFetch } from "../../../lib/auth";


export default function AdminProvidersPage() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [workingId, setWorkingId] = useState(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  async function loadProviders(showLoader = true) {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError("");

      const response = await authFetch(
        "http://127.0.0.1:8000/api/users/admin/operations/"
      );

      if (!response.ok) {
        throw new Error(
          `Unable to load provider operations (${response.status}).`
        );
      }

      const payload = await response.json();

      setData(payload.providers || null);
    } catch (err) {
      setError(
        err.message ||
          "Unable to load provider operations."
      );
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadProviders();
  }, []);


  async function handleProviderAction(provider, action) {
    const providerName =
      provider.display_name ||
      provider.company_name ||
      provider.trading_name ||
      "this provider";

    const labels = {
      verify: "Verify",
      reject: "Reject",
      suspend: "Suspend",
      pending: "Return to pending",
    };

    let reason = "";

    if (action === "reject") {
      reason =
        window.prompt(
          `Enter the reason for rejecting ${providerName}:`
        ) || "";

      if (!reason.trim()) {
        return;
      }
    }

    if (action === "suspend") {
      reason =
        window.prompt(
          `Enter the reason for suspending ${providerName}:`
        ) || "";

      if (!reason.trim()) {
        return;
      }
    }

    const confirmed = window.confirm(
      `${labels[action]} ${providerName}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setWorkingId(provider.id);
      setActionMessage("");
      setActionError("");

      const body = {
        action,
      };

      if (action === "reject") {
        body.rejection_reason = reason.trim();
        body.notes = reason.trim();
      }

      if (action === "suspend") {
        body.notes = reason.trim();
      }

      const response = await authFetch(
        `http://127.0.0.1:8000/api/users/admin/actions/providers/${provider.id}/verification/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
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
            payload.error ||
            `Unable to update provider (${response.status}).`
        );
      }

      setActionMessage(
        `${providerName}: ${
          action === "verify"
            ? "verification approved"
            : action === "reject"
            ? "provider rejected"
            : action === "suspend"
            ? "provider suspended"
            : "returned to pending review"
        }.`
      );

      await loadProviders(false);
    } catch (err) {
      setActionError(
        err.message ||
          "Unable to update provider verification."
      );
    } finally {
      setWorkingId(null);
    }
  }


  const summary = data?.summary || {};
  const providers = data?.items || [];

  const filteredProviders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return providers.filter((provider) => {
      const searchable = [
        provider.display_name,
        provider.company_name,
        provider.trading_name,
        provider.city,
        provider.postcode,
        provider.email,
        provider.account_email,
        provider.verification_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchable.includes(query);

      let matchesFilter = true;

      if (filter === "verified") {
        matchesFilter =
          provider.verification_status === "verified" ||
          provider.is_verified;
      }

      if (filter === "review") {
        matchesFilter =
          provider.verification_status === "pending";
      }

      if (filter === "rejected") {
        matchesFilter =
          provider.verification_status === "rejected";
      }

      if (filter === "suspended") {
        matchesFilter =
          provider.verification_status === "suspended";
      }

      if (filter === "accepting") {
        matchesFilter =
          provider.is_accepting_clients;
      }

      if (filter === "inactive") {
        matchesFilter =
          !provider.account_active;
      }

      return matchesSearch && matchesFilter;
    });
  }, [providers, search, filter]);


  return (
    <>
      <PageHeader />

      <section className="
        mt-6 grid gap-4
        sm:grid-cols-2
        xl:grid-cols-4
      ">
        <SummaryCard
          label="Registered providers"
          value={loading ? "…" : summary.total ?? 0}
          icon={Building2}
        />

        <SummaryCard
          label="Verified"
          value={loading ? "…" : summary.verified ?? 0}
          icon={ShieldCheck}
        />

        <SummaryCard
          label="Awaiting review"
          value={
            loading
              ? "…"
              : summary.awaiting_review ?? 0
          }
          icon={Clock3}
        />

        <SummaryCard
          label="Active providers"
          value={loading ? "…" : summary.active ?? 0}
          icon={Users}
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
            <div className="flex items-center gap-3">
              <div className="
                flex h-11 w-11
                items-center justify-center
                rounded-2xl
                bg-teal-50
                text-[#176B62]
              ">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <h2 className="
                  text-xl font-black
                  text-slate-950
                ">
                  Provider management
                </h2>

                <p className="
                  mt-1 text-sm
                  text-slate-500
                ">
                  Review organisations and control
                  provider verification status.
                </p>
              </div>
            </div>

            <div className="
              flex flex-col gap-3
              sm:flex-row
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
                  placeholder="Search providers..."
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
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value)
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
                  All providers
                </option>

                <option value="verified">
                  Verified
                </option>

                <option value="review">
                  Awaiting review
                </option>

                <option value="rejected">
                  Rejected
                </option>

                <option value="suspended">
                  Suspended
                </option>

                <option value="accepting">
                  Accepting clients
                </option>

                <option value="inactive">
                  Inactive accounts
                </option>
              </select>

              <button
                type="button"
                onClick={() => loadProviders()}
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
        ) : filteredProviders.length === 0 ? (
          <EmptyState
            search={search}
            filter={filter}
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
                    Provider
                  </TableHeading>

                  <TableHeading>
                    Location
                  </TableHeading>

                  <TableHeading>
                    Verification
                  </TableHeading>

                  <TableHeading>
                    Capacity
                  </TableHeading>

                  <TableHeading>
                    CQC
                  </TableHeading>

                  <TableHeading>
                    Operations
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
                {filteredProviders.map((provider) => (
                  <ProviderRow
                    key={provider.id}
                    provider={provider}
                    working={
                      workingId === provider.id
                    }
                    onAction={
                      handleProviderAction
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
            Showing {filteredProviders.length} of{" "}
            {providers.length} provider
            {providers.length === 1 ? "" : "s"}.
          </div>
        )}
      </section>
    </>
  );
}


function ProviderRow({
  provider,
  working,
  onAction,
}) {
  const capacityMaximum =
    Number(provider.max_capacity || 0);

  const currentClients =
    Number(provider.current_clients || 0);

  const capacityPercentage =
    capacityMaximum > 0
      ? Math.min(
          100,
          Math.round(
            (currentClients / capacityMaximum) * 100
          )
        )
      : 0;

  const verificationStatus =
    provider.verification_status || "pending";

  return (
    <tr className="
      transition
      hover:bg-slate-50/80
    ">
      <td className="
        whitespace-nowrap
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
            <Building2 className="h-5 w-5" />
          </div>

          <div>
            <div className="
              font-black
              text-slate-900
            ">
              {provider.display_name ||
                provider.company_name ||
                "Unnamed provider"}
            </div>

            <div className="
              mt-1 text-xs
              text-slate-500
            ">
              {provider.email ||
                provider.account_email ||
                "No email"}
            </div>
          </div>
        </div>
      </td>

      <td className="
        whitespace-nowrap
        px-6 py-5
      ">
        <div className="
          flex items-center gap-2
          text-sm font-semibold
          text-slate-700
        ">
          <MapPin className="
            h-4 w-4
            text-slate-400
          " />

          <span>
            {provider.city || "Not specified"}
          </span>
        </div>

        <div className="
          mt-1 pl-6
          text-xs text-slate-500
        ">
          {provider.postcode || "No postcode"}
        </div>
      </td>

      <td className="
        whitespace-nowrap
        px-6 py-5
      ">
        <VerificationBadge
          status={verificationStatus}
          isVerified={provider.is_verified}
        />
      </td>

      <td className="
        min-w-[180px]
        px-6 py-5
      ">
        <div className="
          flex items-center
          justify-between
          text-xs font-bold
          text-slate-600
        ">
          <span>
            {currentClients} clients
          </span>

          <span>
            {capacityMaximum > 0
              ? `${capacityMaximum} max`
              : "No limit set"}
          </span>
        </div>

        <div className="
          mt-2 h-2
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
              width: `${capacityPercentage}%`,
            }}
          />
        </div>
      </td>

      <td className="
        whitespace-nowrap
        px-6 py-5
      ">
        {provider.cqc_verified ? (
          <div>
            <div className="
              text-sm font-bold
              text-slate-800
            ">
              {provider.cqc_rating ||
                "Verified"}
            </div>

            <div className="
              mt-1 text-xs
              text-slate-500
            ">
              CQC verified
            </div>
          </div>
        ) : (
          <span className="
            text-sm text-slate-400
          ">
            Not verified
          </span>
        )}
      </td>

      <td className="
        whitespace-nowrap
        px-6 py-5
      ">
        <div className="
          flex flex-col
          items-start gap-2
        ">
          {provider.account_active ? (
            <Badge tone="green">
              Active account
            </Badge>
          ) : (
            <Badge tone="red">
              Inactive account
            </Badge>
          )}

          {provider.is_accepting_clients ? (
            <span className="
              text-xs font-bold
              text-teal-700
            ">
              Accepting clients
            </span>
          ) : (
            <span className="
              text-xs font-semibold
              text-slate-400
            ">
              Not accepting clients
            </span>
          )}
        </div>
      </td>

      <td className="
        min-w-[190px]
        px-6 py-5
      ">
        <ProviderActions
          provider={provider}
          working={working}
          onAction={onAction}
        />
      </td>
    </tr>
  );
}


function ProviderActions({
  provider,
  working,
  onAction,
}) {
  const status =
    provider.verification_status || "pending";

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

  if (
    status === "verified" ||
    provider.is_verified
  ) {
    return (
      <div className="
        flex flex-wrap gap-2
      ">
        <ActionButton
          tone="amber"
          onClick={() =>
            onAction(provider, "pending")
          }
        >
          Pending
        </ActionButton>

        <ActionButton
          tone="red"
          onClick={() =>
            onAction(provider, "suspend")
          }
        >
          Suspend
        </ActionButton>
      </div>
    );
  }

  if (status === "suspended") {
    return (
      <div className="
        flex flex-wrap gap-2
      ">
        <ActionButton
          tone="green"
          onClick={() =>
            onAction(provider, "verify")
          }
        >
          Verify
        </ActionButton>

        <ActionButton
          tone="slate"
          onClick={() =>
            onAction(provider, "pending")
          }
        >
          Pending
        </ActionButton>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="
        flex flex-wrap gap-2
      ">
        <ActionButton
          tone="green"
          onClick={() =>
            onAction(provider, "verify")
          }
        >
          Verify
        </ActionButton>

        <ActionButton
          tone="slate"
          onClick={() =>
            onAction(provider, "pending")
          }
        >
          Reopen
        </ActionButton>
      </div>
    );
  }

  return (
    <div className="
      flex flex-wrap gap-2
    ">
      <ActionButton
        tone="green"
        onClick={() =>
          onAction(provider, "verify")
        }
      >
        Verify
      </ActionButton>

      <ActionButton
        tone="red"
        onClick={() =>
          onAction(provider, "reject")
        }
      >
        Reject
      </ActionButton>

      <ActionButton
        tone="amber"
        onClick={() =>
          onAction(provider, "suspend")
        }
      >
        Suspend
      </ActionButton>
    </div>
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


function VerificationBadge({
  status,
  isVerified,
}) {
  if (
    status === "verified" ||
    isVerified
  ) {
    return (
      <Badge tone="green">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Verified
      </Badge>
    );
  }

  if (status === "rejected") {
    return (
      <Badge tone="red">
        <ShieldX className="h-3.5 w-3.5" />
        Rejected
      </Badge>
    );
  }

  if (status === "suspended") {
    return (
      <Badge tone="red">
        <AlertCircle className="h-3.5 w-3.5" />
        Suspended
      </Badge>
    );
  }

  return (
    <Badge tone="amber">
      <Clock3 className="h-3.5 w-3.5" />
      {formatVerificationStatus(status)}
    </Badge>
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
            PROVIDER OPERATIONS
          </div>

          <h1 className="
            mt-3 text-3xl
            font-black
          ">
            Care Providers
          </h1>

          <p className="
            mt-3 max-w-2xl
            text-sm leading-6
            text-teal-50/75
          ">
            Manage provider organisations,
            verification, capacity and operational
            participation across CareSphere.
          </p>
        </div>

        <div className="
          hidden h-16 w-16
          items-center justify-center
          rounded-2xl
          bg-white/10
          sm:flex
        ">
          <Building2 className="h-8 w-8" />
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

        {Icon && (
          <div className="
            flex h-10 w-10
            items-center justify-center
            rounded-xl
            bg-slate-50
            text-[#176B62]
          ">
            <Icon className="h-5 w-5" />
          </div>
        )}
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
      flex min-h-[280px]
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
          Loading provider operations...
        </p>
      </div>
    </div>
  );
}


function ErrorState({ message }) {
  return (
    <div className="
      flex min-h-[280px]
      items-center justify-center
      px-6 py-12
    ">
      <div className="
        max-w-md text-center
      ">
        <div className="
          mx-auto flex h-12 w-12
          items-center justify-center
          rounded-2xl
          bg-rose-50
          text-rose-600
        ">
          <AlertCircle className="h-6 w-6" />
        </div>

        <h3 className="
          mt-4 font-black
          text-slate-900
        ">
          Provider data unavailable
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
  filter,
}) {
  return (
    <div className="
      flex min-h-[280px]
      items-center justify-center
      px-6 py-12
    ">
      <div className="text-center">
        <div className="
          mx-auto flex h-12 w-12
          items-center justify-center
          rounded-2xl
          bg-slate-100
          text-slate-500
        ">
          <Search className="h-6 w-6" />
        </div>

        <h3 className="
          mt-4 font-black
          text-slate-900
        ">
          No providers found
        </h3>

        <p className="
          mt-2 text-sm
          text-slate-500
        ">
          {search || filter !== "all"
            ? "Try changing your search or filter."
            : "No provider organisations are registered yet."}
        </p>
      </div>
    </div>
  );
}


function formatVerificationStatus(value) {
  if (!value) {
    return "Awaiting review";
  }

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}