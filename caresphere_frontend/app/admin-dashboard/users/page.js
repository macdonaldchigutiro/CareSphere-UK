"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";

import {
  authFetch,
  getStoredUser,
} from "../../../lib/auth";
import { API_URL } from "../../../lib/config";


export default function AdminUsersPage() {
  const [data, setData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  async function loadUsers(showLoader = true) {
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
          `Unable to load users (${response.status}).`
        );
      }

      const payload = await response.json();

      setData(payload.users || null);
    } catch (err) {
      setError(
        err.message ||
          "Unable to load platform users."
      );
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    setCurrentUser(getStoredUser());
    loadUsers();
  }, []);

  async function changeUserStatus(user) {
    const action = user.is_active
      ? "deactivate"
      : "activate";

    const confirmed = window.confirm(
      `${
        action === "activate"
          ? "Activate"
          : "Deactivate"
      } ${user.email || user.username || "this account"}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setWorkingId(user.id);
      setActionMessage("");
      setActionError("");

      const response = await authFetch(
        `${API_URL}/api/users/admin/actions/users/${user.id}/status/`,
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
            `Unable to update account (${response.status}).`
        );
      }

      setActionMessage(
        `${user.email || user.username || "Account"} ${
          action === "activate"
            ? "activated"
            : "deactivated"
        } successfully.`
      );

      await loadUsers(false);
    } catch (err) {
      setActionError(
        err.message ||
          "Unable to update user account."
      );
    } finally {
      setWorkingId(null);
    }
  }

  const summary = data?.summary || {};
  const users = data?.items || [];

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const searchable = [
        user.full_name,
        user.first_name,
        user.last_name,
        user.username,
        user.email,
        user.user_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchable.includes(query);

      const matchesType =
        typeFilter === "all" ||
        user.user_type === typeFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" &&
          user.is_active) ||
        (statusFilter === "inactive" &&
          !user.is_active);

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus
      );
    });
  }, [
    users,
    search,
    typeFilter,
    statusFilter,
  ]);

  return (
    <>
      <PageHeader />

      <section className="
        mt-6 grid gap-4
        sm:grid-cols-2 xl:grid-cols-4
      ">
        <SummaryCard
          label="Registered users"
          value={loading ? "…" : summary.total ?? 0}
        />

        <SummaryCard
          label="Active accounts"
          value={loading ? "…" : summary.active ?? 0}
        />

        <SummaryCard
          label="Family accounts"
          value={
            loading
              ? "…"
              : summary.family ?? 0
          }
        />

        <SummaryCard
          label="Admin staff"
          value={
            loading
              ? "…"
              : summary.staff_accounts ?? 0
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
        mt-6 overflow-hidden
        rounded-3xl
        border border-slate-200
        bg-white shadow-sm
      ">
        <div className="
          flex flex-col gap-5
          border-b border-slate-200
          px-6 py-6
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
              <Users className="h-5 w-5" />
            </div>

            <div>
              <h2 className="
                text-xl font-black
                text-slate-950
              ">
                User administration
              </h2>

              <p className="
                mt-1 text-sm text-slate-500
              ">
                Review CareSphere accounts and
                activate or deactivate access.
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
                h-4 w-4 -translate-y-1/2
                text-slate-400
              " />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search users..."
                className="
                  h-11 w-full rounded-xl
                  border border-slate-200
                  bg-slate-50 pl-10 pr-4
                  text-sm outline-none
                  focus:border-teal-500
                  focus:bg-white lg:w-60
                "
              />
            </div>

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value)
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
                All account types
              </option>
              <option value="family">
                Family
              </option>
              <option value="provider">
                Provider
              </option>
              <option value="admin">
                Administrator
              </option>
            </select>

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
              <option value="active">
                Active
              </option>
              <option value="inactive">
                Inactive
              </option>
            </select>

            <button
              type="button"
              onClick={() => loadUsers()}
              disabled={loading}
              className="
                inline-flex h-11 items-center
                justify-center gap-2
                rounded-xl border
                border-slate-200
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

        {error ? (
          <ErrorState message={error} />
        ) : loading ? (
          <LoadingState />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            filtered={
              search ||
              typeFilter !== "all" ||
              statusFilter !== "all"
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="
              min-w-full divide-y
              divide-slate-200
            ">
              <thead className="bg-slate-50">
                <tr>
                  <Heading>User</Heading>
                  <Heading>Account type</Heading>
                  <Heading>Status</Heading>
                  <Heading>Privileges</Heading>
                  <Heading>Verified</Heading>
                  <Heading>Joined</Heading>
                  <Heading>Admin action</Heading>
                </tr>
              </thead>

              <tbody className="
                divide-y divide-slate-100
              ">
                {filteredUsers.map((user) => {
                  const isCurrentUser =
                    currentUser &&
                    (
                      Number(currentUser.id) ===
                        Number(user.id) ||
                      (
                        currentUser.email &&
                        user.email &&
                        currentUser.email.toLowerCase() ===
                          user.email.toLowerCase()
                      )
                    );

                  return (
                    <tr
                      key={user.id}
                      className="
                        hover:bg-slate-50/80
                      "
                    >
                      <td className="
                        min-w-[240px]
                        px-6 py-5
                      ">
                        <div className="
                          font-black
                          text-slate-900
                        ">
                          {user.full_name ||
                            [
                              user.first_name,
                              user.last_name,
                            ]
                              .filter(Boolean)
                              .join(" ") ||
                            user.username ||
                            "Unnamed user"}
                        </div>

                        <div className="
                          mt-1 text-xs
                          text-slate-500
                        ">
                          {user.email ||
                            "No email"}
                        </div>

                        {isCurrentUser && (
                          <div className="
                            mt-2 text-xs
                            font-black
                            text-teal-700
                          ">
                            YOUR ACCOUNT
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <Badge tone="blue">
                          {formatLabel(
                            user.user_type
                          )}
                        </Badge>
                      </td>

                      <td className="px-6 py-5">
                        <Badge
                          tone={
                            user.is_active
                              ? "green"
                              : "red"
                          }
                        >
                          {user.is_active
                            ? "Active"
                            : "Inactive"}
                        </Badge>
                      </td>

                      <td className="
                        min-w-[170px]
                        px-6 py-5
                      ">
                        <div className="
                          flex flex-wrap gap-2
                        ">
                          {user.is_superuser && (
                            <Badge tone="amber">
                              Superuser
                            </Badge>
                          )}

                          {user.is_staff && (
                            <Badge tone="blue">
                              Staff
                            </Badge>
                          )}

                          {!user.is_staff &&
                            !user.is_superuser && (
                              <span className="
                                text-xs
                                text-slate-400
                              ">
                                Standard account
                              </span>
                            )}
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <Badge
                          tone={
                            user.is_verified
                              ? "green"
                              : "slate"
                          }
                        >
                          {user.is_verified
                            ? "Verified"
                            : "Not verified"}
                        </Badge>
                      </td>

                      <td className="
                        whitespace-nowrap
                        px-6 py-5
                        text-sm text-slate-600
                      ">
                        {formatDate(
                          user.date_joined ||
                            user.created_at
                        )}
                      </td>

                      <td className="
                        whitespace-nowrap
                        px-6 py-5
                      ">
                        {isCurrentUser &&
                        user.is_active ? (
                          <div className="
                            text-xs font-bold
                            text-slate-400
                          ">
                            Current account
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={
                              workingId === user.id
                            }
                            onClick={() =>
                              changeUserStatus(user)
                            }
                            className={`
                              inline-flex
                              items-center gap-2
                              rounded-xl px-4 py-2
                              text-xs font-black
                              disabled:opacity-50
                              ${
                                user.is_active
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-emerald-50 text-emerald-700"
                              }
                            `}
                          >
                            {user.is_active ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}

                            {workingId === user.id
                              ? "Saving..."
                              : user.is_active
                              ? "Deactivate"
                              : "Activate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && (
          <FooterCount
            shown={filteredUsers.length}
            total={users.length}
          />
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
        flex items-center
        justify-between gap-6
      ">
        <div>
          <div className="
            text-xs font-black
            tracking-[0.18em]
            text-teal-200
          ">
            ACCOUNT GOVERNANCE
          </div>

          <h1 className="
            mt-3 text-3xl font-black
          ">
            Users
          </h1>

          <p className="
            mt-3 max-w-2xl
            text-sm leading-6
            text-teal-50/75
          ">
            Administer CareSphere accounts,
            access status and platform privileges.
          </p>
        </div>

        <div className="
          hidden h-16 w-16
          items-center justify-center
          rounded-2xl bg-white/10
          sm:flex
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
}) {
  return (
    <div className="
      rounded-3xl border
      border-slate-200
      bg-white p-5 shadow-sm
    ">
      <div className="
        text-sm font-semibold
        text-slate-500
      ">
        {label}
      </div>

      <div className="
        mt-3 text-3xl font-black
        text-slate-950
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
      "bg-emerald-50 text-emerald-700",
    red:
      "bg-rose-50 text-rose-700",
    amber:
      "bg-amber-50 text-amber-700",
    blue:
      "bg-blue-50 text-blue-700",
    slate:
      "bg-slate-100 text-slate-700",
  };

  return (
    <span className={`
      inline-flex rounded-full
      px-2.5 py-1
      text-xs font-black
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
      mt-6 rounded-2xl border
      px-5 py-4
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
    ">
      <div className="
        h-8 w-8 animate-spin
        rounded-full border-4
        border-slate-200
        border-t-[#176B62]
      " />
    </div>
  );
}


function ErrorState({ message }) {
  return (
    <div className="
      flex min-h-[300px]
      items-center justify-center
      p-8 text-center
    ">
      <div>
        <AlertCircle className="
          mx-auto h-8 w-8
          text-rose-500
        " />

        <h3 className="
          mt-4 font-black
          text-slate-900
        ">
          User data unavailable
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


function EmptyState({ filtered }) {
  return (
    <div className="
      flex min-h-[300px]
      items-center justify-center
      p-8 text-center
    ">
      <div>
        <Users className="
          mx-auto h-8 w-8
          text-slate-400
        " />

        <h3 className="
          mt-4 font-black
          text-slate-900
        ">
          No users found
        </h3>

        <p className="
          mt-2 text-sm text-slate-500
        ">
          {filtered
            ? "Try changing your search or filters."
            : "No CareSphere accounts exist yet."}
        </p>
      </div>
    </div>
  );
}


function FooterCount({
  shown,
  total,
}) {
  return (
    <div className="
      border-t border-slate-200
      bg-slate-50/70
      px-6 py-4
      text-xs font-semibold
      text-slate-500
    ">
      Showing {shown} of {total} users.
    </div>
  );
}


function formatDate(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(new Date(value));
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
