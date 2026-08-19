"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  Bell,
  BellOff,
  CheckCheck,
  CheckCircle2,
  Circle,
  Info,
  Loader2,
  AlertTriangle,
  XCircle,
} from "lucide-react";

import {
  authFetch,
  createLoginUrl,
  getAuthStorage,
} from "../../lib/auth";


const API_URL =
  "http://127.0.0.1:8000";


export default function NotificationsPage() {
  const router =
    useRouter();

  const [
    notifications,
    setNotifications,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    actionLoading,
    setActionLoading,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");


  const goToLogin = () => {
    router.replace(
      createLoginUrl(
        "/notifications"
      )
    );
  };


  const loadNotifications =
    async () => {
      if (
        !getAuthStorage()
      ) {
        goToLogin();
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response =
          await authFetch(
            `${API_URL}/api/notifications/notifications/`,
            {
              method: "GET",
              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );

        if (!response) {
          goToLogin();
          return;
        }

        if (
          response.status ===
          401
        ) {
          goToLogin();
          return;
        }

        if (!response.ok) {
          throw new Error(
            "Unable to load notifications."
          );
        }

        const data =
          await response.json();

        const items =
          Array.isArray(data)
            ? data
            : Array.isArray(
                data.results
              )
            ? data.results
            : [];

        setNotifications(
          items
        );
      } catch (err) {
        console.error(
          "Notifications loading error:",
          err
        );

        setError(
          err.message ||
            "We couldn't load your notifications."
        );
      } finally {
        setLoading(false);
      }
    };


  useEffect(() => {
    loadNotifications();
  }, []);


  const unreadCount =
    useMemo(
      () =>
        notifications.filter(
          (item) =>
            !item.is_read
        ).length,
      [notifications]
    );


  const performAction =
    async (
      notificationId,
      action
    ) => {
      try {
        setActionLoading(
          `${notificationId}-${action}`
        );

        setError("");

        const response =
          await authFetch(
            `${API_URL}/api/notifications/notifications/${notificationId}/${action}/`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );

        if (!response) {
          goToLogin();
          return;
        }

        if (
          response.status ===
          401
        ) {
          goToLogin();
          return;
        }

        if (!response.ok) {
          throw new Error(
            "Unable to update this notification."
          );
        }

        const updated =
          await response.json();

        setNotifications(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                updated.id
                  ? updated
                  : item
            )
        );
      } catch (err) {
        console.error(
          "Notification update error:",
          err
        );

        setError(
          err.message ||
            "We couldn't update this notification."
        );
      } finally {
        setActionLoading("");
      }
    };


  const markAllRead =
    async () => {
      try {
        setActionLoading(
          "mark-all-read"
        );

        setError("");

        const response =
          await authFetch(
            `${API_URL}/api/notifications/notifications/mark-all-read/`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );

        if (!response) {
          goToLogin();
          return;
        }

        if (
          response.status ===
          401
        ) {
          goToLogin();
          return;
        }

        if (!response.ok) {
          throw new Error(
            "Unable to mark all notifications as read."
          );
        }

        setNotifications(
          (current) =>
            current.map(
              (item) => ({
                ...item,
                is_read: true,
              })
            )
        );
      } catch (err) {
        console.error(
          "Mark all read error:",
          err
        );

        setError(
          err.message ||
            "We couldn't update your notifications."
        );
      } finally {
        setActionLoading("");
      }
    };


  const handleOpenNotification =
    async (
      notification
    ) => {
      if (
        !notification.is_read
      ) {
        await performAction(
          notification.id,
          "mark-read"
        );
      }

      if (
        notification.link
      ) {
        router.push(
          notification.link
        );
      }
    };


  const formatDate = (
    value
  ) => {
    if (!value) {
      return "";
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
    ).format(
      new Date(value)
    );
  };


  const getNotificationIcon = (
    type
  ) => {
    if (
      type === "success"
    ) {
      return CheckCircle2;
    }

    if (
      type === "warning"
    ) {
      return AlertTriangle;
    }

    if (
      type === "error"
    ) {
      return XCircle;
    }

    return Info;
  };


  const getIconClasses = (
    type
  ) => {
    if (
      type === "success"
    ) {
      return (
        "bg-emerald-50 " +
        "text-emerald-700"
      );
    }

    if (
      type === "warning"
    ) {
      return (
        "bg-amber-50 " +
        "text-amber-700"
      );
    }

    if (
      type === "error"
    ) {
      return (
        "bg-red-50 " +
        "text-red-700"
      );
    }

    return (
      "bg-blue-50 " +
      "text-blue-700"
    );
  };


  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FAFC]">

        <div className="text-center">

          <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#0F766E]" />

          <p className="mt-4 text-sm font-semibold text-slate-500">
            Loading notifications...
          </p>

        </div>

      </main>
    );
  }


  return (
    <main className="min-h-screen bg-[#F7FAFC] text-slate-950">

      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white">

        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-4 lg:px-8">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0F766E] text-white">
              <Bell className="h-6 w-6" />
            </div>

            <div>

              <h1 className="text-xl font-black">
                Notifications
              </h1>

              <p className="text-xs text-slate-500">
                CareSphere updates and activity
              </p>

            </div>

          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >

            <ArrowLeft className="h-4 w-4" />

            Dashboard

          </Link>

        </div>

      </header>


      <div className="mx-auto max-w-[1200px] px-5 py-10 lg:px-8">

        {/* HERO */}

        <section className="rounded-[30px] bg-[#071A2B] px-7 py-9 text-white shadow-xl md:px-10">

          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">

            <div>

              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#6EE7D8]">
                Notification centre
              </p>

              <h2 className="mt-3 text-4xl font-black tracking-tight">
                Stay on top of your care activity.
              </h2>

              <p className="mt-3 max-w-2xl text-slate-300">
                Booking updates, family activity, reminders and important CareSphere messages appear here.
              </p>

            </div>

            <div className="rounded-2xl bg-white/10 px-5 py-4">

              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-300">
                Unread
              </p>

              <p className="mt-1 text-3xl font-black">
                {unreadCount}
              </p>

            </div>

          </div>

        </section>


        {/* ERROR */}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}


        {/* TOOLBAR */}

        <section className="mt-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

          <div>

            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">
              Your notifications
            </p>

            <h3 className="mt-2 text-2xl font-black">
              {notifications.length ===
              1
                ? "1 notification"
                : `${notifications.length} notifications`}
            </h3>

          </div>

          {unreadCount >
            0 && (
            <button
              type="button"
              onClick={
                markAllRead
              }
              disabled={
                actionLoading ===
                "mark-all-read"
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
            >

              {actionLoading ===
              "mark-all-read" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}

              Mark all as read

            </button>
          )}

        </section>


        {/* EMPTY STATE */}

        {notifications.length ===
          0 && (
          <section className="mt-8 rounded-[28px] border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <BellOff className="h-8 w-8" />
            </div>

            <h3 className="mt-6 text-2xl font-black">
              No notifications yet
            </h3>

            <p className="mx-auto mt-3 max-w-lg leading-7 text-slate-500">
              Booking updates, Family Circle activity and other CareSphere alerts will appear here.
            </p>

          </section>
        )}


        {/* NOTIFICATION LIST */}

        {notifications.length >
          0 && (
          <section className="mt-8 space-y-4">

            {notifications.map(
              (notification) => {
                const Icon =
                  getNotificationIcon(
                    notification.notification_type
                  );

                const isBusy =
                  actionLoading.startsWith(
                    notification.id
                  );

                return (
                  <article
                    key={
                      notification.id
                    }
                    className={`rounded-[24px] border p-5 shadow-sm transition ${
                      notification.is_read
                        ? "border-slate-200 bg-white"
                        : "border-teal-200 bg-teal-50/40"
                    }`}
                  >

                    <div className="flex gap-4">

                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${getIconClasses(
                          notification.notification_type
                        )}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">

                          <div>

                            <div className="flex items-center gap-2">

                              <h4 className="font-black text-slate-900">
                                {notification.title}
                              </h4>

                              {!notification.is_read && (
                                <span className="h-2.5 w-2.5 rounded-full bg-[#0F766E]" />
                              )}

                            </div>

                            <p className="mt-2 leading-6 text-slate-600">
                              {notification.message}
                            </p>

                          </div>

                          <p className="shrink-0 text-xs text-slate-400">
                            {formatDate(
                              notification.created_at
                            )}
                          </p>

                        </div>


                        <div className="mt-5 flex flex-wrap gap-3">

                          {notification.link && (
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenNotification(
                                  notification
                                )
                              }
                              disabled={
                                isBusy
                              }
                              className="rounded-xl bg-[#0F766E] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                            >
                              Open
                            </button>
                          )}

                          {!notification.is_read ? (
                            <button
                              type="button"
                              onClick={() =>
                                performAction(
                                  notification.id,
                                  "mark-read"
                                )
                              }
                              disabled={
                                isBusy
                              }
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700"
                            >

                              <CheckCircle2 className="h-4 w-4" />

                              Mark read

                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                performAction(
                                  notification.id,
                                  "mark-unread"
                                )
                              }
                              disabled={
                                isBusy
                              }
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700"
                            >

                              <Circle className="h-4 w-4" />

                              Mark unread

                            </button>
                          )}

                        </div>

                      </div>

                    </div>

                  </article>
                );
              }
            )}

          </section>
        )}

      </div>

    </main>
  );
}