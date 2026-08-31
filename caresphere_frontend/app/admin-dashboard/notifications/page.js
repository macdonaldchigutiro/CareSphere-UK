"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  MailOpen,
  RefreshCw,
  Search,
} from "lucide-react";

import { authFetch } from "../../../lib/auth";


export default function AdminNotificationsPage() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  async function loadNotifications(showLoader = true) {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError("");

      const response = await authFetch(
        "http://127.0.0.1:8000/api/users/admin/governance/"
      );

      if (!response.ok) {
        throw new Error(
          `Unable to load notifications (${response.status}).`
        );
      }

      const payload = await response.json();

      setData(payload.notifications || null);
    } catch (err) {
      setError(
        err.message ||
          "Unable to load platform notifications."
      );
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function changeNotificationStatus(notification) {
    const action = notification.is_read
      ? "unread"
      : "read";

    try {
      setWorkingId(notification.id);
      setActionMessage("");
      setActionError("");

      const response = await authFetch(
        `http://127.0.0.1:8000/api/users/admin/actions/notifications/${notification.id}/`,
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
            `Unable to update notification (${response.status}).`
        );
      }

      setActionMessage(
        `Notification marked ${
          action === "read" ? "read" : "unread"
        }.`
      );

      await loadNotifications(false);
    } catch (err) {
      setActionError(
        err.message ||
          "Unable to update notification."
      );
    } finally {
      setWorkingId(null);
    }
  }

  const summary = data?.summary || {};
  const notifications = data?.items || [];

  const filteredNotifications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notifications.filter((notification) => {
      const searchable = [
        notification.title,
        notification.message,
        notification.notification_type,
        notification.recipient_name,
        notification.recipient_email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchable.includes(query);

      const matchesFilter =
        filter === "all" ||
        (filter === "read" && notification.is_read) ||
        (filter === "unread" && !notification.is_read);

      return matchesSearch && matchesFilter;
    });
  }, [notifications, search, filter]);

  return (
    <>
      <PageHeader />

      <section className="
        mt-6 grid gap-4
        sm:grid-cols-2 xl:grid-cols-4
      ">
        <SummaryCard
          label="Notifications"
          value={loading ? "…" : summary.total ?? 0}
        />

        <SummaryCard
          label="Unread"
          value={loading ? "…" : summary.unread ?? 0}
          warning={Number(summary.unread || 0) > 0}
        />

        <SummaryCard
          label="Read"
          value={loading ? "…" : summary.read ?? 0}
        />

        <SummaryCard
          label="Notification types"
          value={
            loading
              ? "…"
              : summary.notification_types ?? 0
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
              <Bell className="h-5 w-5" />
            </div>

            <div>
              <h2 className="
                text-xl font-black
                text-slate-950
              ">
                Platform notifications
              </h2>

              <p className="
                mt-1 text-sm text-slate-500
              ">
                Review notification delivery and
                manage read or unread state.
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
                placeholder="Search notifications..."
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
                outline-none
                focus:border-teal-500
              "
            >
              <option value="all">
                All notifications
              </option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>

            <button
              type="button"
              onClick={() => loadNotifications()}
              disabled={loading}
              className="
                inline-flex h-11 items-center
                justify-center gap-2 rounded-xl
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

        {error ? (
          <ErrorState message={error} />
        ) : loading ? (
          <LoadingState text="Loading notifications..." />
        ) : filteredNotifications.length === 0 ? (
          <EmptyState
            filtered={
              search || filter !== "all"
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
                  <Heading>Notification</Heading>
                  <Heading>Recipient</Heading>
                  <Heading>Type</Heading>
                  <Heading>Status</Heading>
                  <Heading>Created</Heading>
                  <Heading>Admin action</Heading>
                </tr>
              </thead>

              <tbody className="
                divide-y divide-slate-100
              ">
                {filteredNotifications.map(
                  (notification) => (
                    <tr
                      key={notification.id}
                      className="
                        hover:bg-slate-50/80
                      "
                    >
                      <td className="
                        min-w-[320px]
                        px-6 py-5
                      ">
                        <div className="
                          font-black
                          text-slate-900
                        ">
                          {notification.title ||
                            "Notification"}
                        </div>

                        <p className="
                          mt-1 max-w-[420px]
                          text-xs leading-5
                          text-slate-500
                        ">
                          {notification.message ||
                            "No message"}
                        </p>
                      </td>

                      <td className="
                        min-w-[200px]
                        px-6 py-5
                      ">
                        <div className="
                          text-sm font-bold
                          text-slate-800
                        ">
                          {notification.recipient_name ||
                            "Unknown user"}
                        </div>

                        <div className="
                          mt-1 text-xs
                          text-slate-500
                        ">
                          {notification.recipient_email ||
                            "No email"}
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <Badge tone="blue">
                          {formatLabel(
                            notification.notification_type
                          )}
                        </Badge>
                      </td>

                      <td className="px-6 py-5">
                        <Badge
                          tone={
                            notification.is_read
                              ? "slate"
                              : "amber"
                          }
                        >
                          {notification.is_read
                            ? "Read"
                            : "Unread"}
                        </Badge>
                      </td>

                      <td className="
                        whitespace-nowrap
                        px-6 py-5
                        text-sm text-slate-600
                      ">
                        {formatDate(
                          notification.created_at
                        )}
                      </td>

                      <td className="
                        whitespace-nowrap
                        px-6 py-5
                      ">
                        <button
                          type="button"
                          disabled={
                            workingId === notification.id
                          }
                          onClick={() =>
                            changeNotificationStatus(
                              notification
                            )
                          }
                          className={`
                            inline-flex items-center
                            gap-2 rounded-xl
                            px-4 py-2
                            text-xs font-black
                            disabled:opacity-50
                            ${
                              notification.is_read
                                ? "bg-amber-50 text-amber-700"
                                : "bg-emerald-50 text-emerald-700"
                            }
                          `}
                        >
                          {notification.is_read ? (
                            <Bell className="h-4 w-4" />
                          ) : (
                            <MailOpen className="h-4 w-4" />
                          )}

                          {workingId === notification.id
                            ? "Saving..."
                            : notification.is_read
                            ? "Mark unread"
                            : "Mark read"}
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && (
          <FooterCount
            shown={filteredNotifications.length}
            total={notifications.length}
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
            PLATFORM ACTIVITY
          </div>

          <h1 className="
            mt-3 text-3xl font-black
          ">
            Notifications
          </h1>

          <p className="
            mt-3 max-w-2xl
            text-sm leading-6
            text-teal-50/75
          ">
            Monitor CareSphere alerts and
            manage platform notification state.
          </p>
        </div>

        <div className="
          hidden h-16 w-16
          items-center justify-center
          rounded-2xl bg-white/10
          sm:flex
        ">
          <Bell className="h-8 w-8" />
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
    <div className={`
      rounded-3xl border
      bg-white p-5 shadow-sm
      ${
        warning
          ? "border-amber-200"
          : "border-slate-200"
      }
    `}>
      <div className="
        text-sm font-semibold
        text-slate-500
      ">
        {label}
      </div>

      <div className={`
        mt-3 text-3xl font-black
        ${
          warning
            ? "text-amber-600"
            : "text-slate-950"
        }
      `}>
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


function LoadingState({ text }) {
  return (
    <div className="
      flex min-h-[300px]
      items-center justify-center
    ">
      <div className="text-center">
        <div className="
          mx-auto h-8 w-8
          animate-spin rounded-full
          border-4 border-slate-200
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
      text-center
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
          Notification data unavailable
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
      items-center justify-center p-8
      text-center
    ">
      <div>
        <CheckCircle2 className="
          mx-auto h-8 w-8
          text-slate-400
        " />

        <h3 className="
          mt-4 font-black
          text-slate-900
        ">
          No notifications found
        </h3>

        <p className="
          mt-2 text-sm text-slate-500
        ">
          {filtered
            ? "Try changing your search or filter."
            : "No platform notifications exist yet."}
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
      bg-slate-50/70 px-6 py-4
      text-xs font-semibold
      text-slate-500
    ">
      Showing {shown} of {total} notifications.
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
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(new Date(value));
}


function formatLabel(value) {
  if (!value) {
    return "General";
  }

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}