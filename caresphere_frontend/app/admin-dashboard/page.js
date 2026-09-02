"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  Bell,
  Building2,
  CalendarDays,
  Clock3,
  HeartHandshake,
  Sparkles,
  Stethoscope,
  UserRoundCheck,
  Users,
  UserSearch,
} from "lucide-react";

import { authFetch } from "../../lib/auth";
import { API_URL } from "../../lib/config";


const STATUS_LABELS = {
  pending: "Pending",
  accepted: "Accepted",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  declined: "Declined",
};


function formatNumber(value) {
  return new Intl.NumberFormat(
    "en-GB"
  ).format(Number(value) || 0);
}


function formatDateTime(value) {
  if (!value) {
    return "Not scheduled";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}


function statusClasses(status) {
  const styles = {
    pending:
      "bg-amber-50 text-amber-700 ring-amber-600/20",
    accepted:
      "bg-blue-50 text-blue-700 ring-blue-600/20",
    confirmed:
      "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
    in_progress:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    completed:
      "bg-slate-100 text-slate-700 ring-slate-600/20",
    cancelled:
      "bg-rose-50 text-rose-700 ring-rose-600/20",
    declined:
      "bg-rose-50 text-rose-700 ring-rose-600/20",
  };

  return (
    styles[status] ||
    "bg-slate-100 text-slate-700 ring-slate-600/20"
  );
}


function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "teal",
}) {
  const tones = {
    teal: {
      border: "border-l-[#176B62]",
      icon: "bg-teal-50 text-[#176B62]",
    },
    blue: {
      border: "border-l-blue-600",
      icon: "bg-blue-50 text-blue-600",
    },
    indigo: {
      border: "border-l-indigo-600",
      icon: "bg-indigo-50 text-indigo-600",
    },
    emerald: {
      border: "border-l-emerald-600",
      icon: "bg-emerald-50 text-emerald-600",
    },
    rose: {
      border: "border-l-rose-600",
      icon: "bg-rose-50 text-rose-600",
    },
  };

  const selected =
    tones[tone] || tones.teal;

  return (
    <div
      className={`
        rounded-3xl
        border
        border-slate-200
        border-l-4
        bg-white
        p-5
        shadow-sm
        ${selected.border}
      `}
    >
      <div className="
        flex items-start
        justify-between gap-3
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
            {formatNumber(value)}
          </div>
        </div>

        <div
          className={`
            flex h-12 w-12
            items-center
            justify-center
            rounded-2xl
            ${selected.icon}
          `}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>

      <p className="
        mt-5 text-xs
        leading-5
        text-slate-500
      ">
        {description}
      </p>
    </div>
  );
}


function AttentionItem({
  icon: Icon,
  title,
  description,
  value,
  tone = "teal",
}) {
  const tones = {
    amber:
      "bg-amber-50 text-amber-700",
    rose:
      "bg-rose-50 text-rose-700",
    blue:
      "bg-blue-50 text-blue-700",
    teal:
      "bg-teal-50 text-[#176B62]",
  };

  return (
    <div className="
      flex items-center
      gap-4
      border-b
      border-slate-100
      py-4
      last:border-b-0
    ">
      <div
        className={`
          flex h-11 w-11
          shrink-0
          items-center
          justify-center
          rounded-xl
          ${tones[tone]}
        `}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="
          text-sm font-bold
          text-slate-900
        ">
          {title}
        </div>

        <div className="
          mt-1 text-xs
          leading-5
          text-slate-500
        ">
          {description}
        </div>
      </div>

      <div className="
        text-xl font-black
        text-slate-950
      ">
        {formatNumber(value)}
      </div>
    </div>
  );
}


export default function AdminOverviewPage() {
  const [dashboard, setDashboard] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const response = await authFetch(
          `${API_URL}/api/users/admin/dashboard/`
        );

        if (!response.ok) {
          throw new Error(
            "We couldn't load the CareSphere administration overview."
          );
        }

        const data =
          await response.json();

        if (!cancelled) {
          setDashboard(data);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);


  const overview =
    dashboard?.summary || {};


  const statusEntries =
    useMemo(() => {
      return Object.entries(
        dashboard?.booking_status || {}
      );
    }, [dashboard]);


  const maximumStatusCount =
    Math.max(
      1,
      ...statusEntries.map(
        ([, count]) =>
          Number(count) || 0
      )
    );


  if (loading) {
    return (
      <div className="
        flex min-h-[60vh]
        items-center
        justify-center
      ">
        <div className="text-center">
          <Activity
            className="
              mx-auto h-8 w-8
              animate-pulse
              text-[#176B62]
            "
          />

          <div className="
            mt-4 text-sm
            font-bold
            text-slate-600
          ">
            Loading platform operations...
          </div>
        </div>
      </div>
    );
  }


  if (error) {
    return (
      <div className="
        rounded-3xl
        border border-rose-100
        bg-white
        p-8
        shadow-sm
      ">
        <h1 className="
          text-2xl font-black
          text-slate-950
        ">
          Dashboard unavailable
        </h1>

        <p className="
          mt-3 text-sm
          text-rose-600
        ">
          {error}
        </p>
      </div>
    );
  }


  return (
    <>
      <section className="
        relative
        overflow-hidden
        rounded-3xl
        bg-[#0D3F3A]
        px-6 py-7
        text-white
        shadow-xl
        sm:px-8 sm:py-8
      ">
        <div className="
          absolute
          -right-20 -top-20
          h-64 w-64
          rounded-full
          bg-teal-300/10
        " />

        <div className="
          absolute
          bottom-[-120px]
          right-32
          h-60 w-60
          rounded-full
          bg-white/5
        " />

        <div className="
          relative
          flex flex-col gap-6
          xl:flex-row
          xl:items-end
          xl:justify-between
        ">
          <div>
            <div className="
              mb-3 inline-flex
              items-center gap-2
              rounded-full
              bg-white/10
              px-3 py-1.5
              text-xs font-bold
              text-teal-100
            ">
              <Sparkles className="h-4 w-4" />
              PLATFORM OPERATIONS
            </div>

            <h1 className="
              text-3xl
              font-black
              tracking-tight
              sm:text-4xl
            ">
              CareSphere Administration
            </h1>

            <p className="
              mt-3 max-w-2xl
              text-sm leading-6
              text-teal-50/75
              sm:text-base
            ">
              Your operational picture across
              providers, care delivery, staffing,
              matching and platform activity.
            </p>
          </div>

          <div className="
            flex items-center
            gap-3
            rounded-2xl
            bg-white/10
            px-4 py-3
            backdrop-blur
          ">
            <Activity className="
              h-5 w-5
              text-teal-200
            " />

            <div>
              <div className="
                text-xs font-bold
                uppercase
                tracking-wider
                text-teal-200
              ">
                Platform status
              </div>

              <div className="
                mt-0.5 text-sm
                font-bold
              ">
                Operations online
              </div>
            </div>
          </div>
        </div>
      </section>


      <section className="
        mt-6 grid gap-4
        sm:grid-cols-2
        xl:grid-cols-4
      ">
        <MetricCard
          label="Care providers"
          value={
            overview.total_providers
          }
          description="Provider organisations registered on CareSphere."
          icon={Building2}
          tone="teal"
        />

        <MetricCard
          label="Service users"
          value={
            overview.total_service_users
          }
          description="People currently represented across care profiles."
          icon={HeartHandshake}
          tone="blue"
        />

        <MetricCard
          label="Active bookings"
          value={
            overview.active_bookings
          }
          description="Bookings moving through the active care lifecycle."
          icon={CalendarDays}
          tone="indigo"
        />

        <MetricCard
          label="Unassigned shifts"
          value={
            overview.unassigned_shifts
          }
          description="Accepted or confirmed care that still needs staff."
          icon={UserRoundCheck}
          tone={
            Number(
              overview.unassigned_shifts
            ) > 0
              ? "rose"
              : "emerald"
          }
        />
      </section>


      <section className="
        mt-6 grid gap-6
        xl:grid-cols-[1.35fr_0.65fr]
      ">
        <div className="
          rounded-3xl
          border border-slate-200
          bg-white
          p-5 shadow-sm
          sm:p-6
        ">
          <div className="
            flex items-start
            justify-between gap-4
          ">
            <div>
              <h2 className="
                text-xl font-black
                text-slate-950
              ">
                Operational attention
              </h2>

              <p className="
                mt-1 text-sm
                text-slate-500
              ">
                Areas that may need
                administrator review.
              </p>
            </div>

            <div className="
              rounded-xl
              bg-amber-50
              px-3 py-2
              text-xs font-bold
              text-amber-700
            ">
              LIVE OVERVIEW
            </div>
          </div>

          <div className="mt-4">
            <AttentionItem
              icon={CalendarDays}
              title="New booking requests"
              description="Care requests awaiting provider action."
              value={
                overview.pending_bookings
              }
              tone="amber"
            />

            <AttentionItem
              icon={UserRoundCheck}
              title="Unassigned care shifts"
              description="Accepted or confirmed bookings without assigned staff."
              value={
                overview.unassigned_shifts
              }
              tone="rose"
            />

            <AttentionItem
              icon={UserSearch}
              title="Pending matches"
              description="Provider matches still awaiting resolution."
              value={
                overview.pending_matches
              }
              tone="blue"
            />

            <AttentionItem
              icon={Bell}
              title="Unread platform notifications"
              description="Notifications that remain unread across CareSphere."
              value={
                overview.unread_notifications
              }
              tone="teal"
            />
          </div>
        </div>


        <div className="
          rounded-3xl
          border border-slate-200
          bg-white
          p-5 shadow-sm
          sm:p-6
        ">
          <h2 className="
            text-xl font-black
            text-slate-950
          ">
            Platform footprint
          </h2>

          <p className="
            mt-1 text-sm
            text-slate-500
          ">
            Current CareSphere network.
          </p>

          <div className="
            mt-6 space-y-5
          ">
            {[
              [
                "Registered users",
                overview.total_users,
                Users,
              ],
              [
                "Family accounts",
                overview.family_users,
                HeartHandshake,
              ],
              [
                "Provider accounts",
                overview.provider_users,
                Building2,
              ],
              [
                "Care staff",
                overview.total_staff,
                Stethoscope,
              ],
              [
                "Provider matches",
                overview.total_matches,
                UserSearch,
              ],
            ].map(
              ([label, value, Icon]) => (
                <div
                  key={label}
                  className="
                    flex items-center
                    gap-3
                  "
                >
                  <div className="
                    flex h-10 w-10
                    items-center
                    justify-center
                    rounded-xl
                    bg-slate-100
                    text-slate-600
                  ">
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="
                    flex-1
                    text-sm
                    font-semibold
                    text-slate-600
                  ">
                    {label}
                  </div>

                  <div className="
                    text-lg
                    font-black
                    text-slate-950
                  ">
                    {formatNumber(value)}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </section>


      <section className="
        mt-6 grid gap-6
        xl:grid-cols-[0.75fr_1.25fr]
      ">
        <div className="
          rounded-3xl
          border border-slate-200
          bg-white
          p-5 shadow-sm
          sm:p-6
        ">
          <h2 className="
            text-xl font-black
            text-slate-950
          ">
            Booking lifecycle
          </h2>

          <p className="
            mt-1 text-sm
            text-slate-500
          ">
            Distribution of bookings across
            operational stages.
          </p>

          <div className="
            mt-6 space-y-5
          ">
            {statusEntries.length === 0 ? (
              <div className="
                rounded-2xl
                bg-slate-50
                p-5 text-sm
                text-slate-500
              ">
                No booking activity
                available yet.
              </div>
            ) : (
              statusEntries.map(
                ([bookingStatus, count]) => {
                  const percentage =
                    Math.max(
                      4,
                      (
                        (Number(count) /
                          maximumStatusCount) *
                        100
                      )
                    );

                  return (
                    <div key={bookingStatus}>
                      <div className="
                        mb-2 flex
                        items-center
                        justify-between
                        text-sm
                      ">
                        <span className="
                          font-semibold
                          text-slate-600
                        ">
                          {STATUS_LABELS[
                            bookingStatus
                          ] || bookingStatus}
                        </span>

                        <span className="
                          font-black
                          text-slate-950
                        ">
                          {formatNumber(
                            count
                          )}
                        </span>
                      </div>

                      <div className="
                        h-2.5
                        overflow-hidden
                        rounded-full
                        bg-slate-100
                      ">
                        <div
                          className="
                            h-full
                            rounded-full
                            bg-[#176B62]
                          "
                          style={{
                            width:
                              `${percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>
        </div>


        <div className="
          overflow-hidden
          rounded-3xl
          border border-slate-200
          bg-white
          shadow-sm
        ">
          <div className="
            flex items-center
            justify-between gap-4
            border-b
            border-slate-100
            px-5 py-5
            sm:px-6
          ">
            <div>
              <h2 className="
                text-xl font-black
                text-slate-950
              ">
                Recent bookings
              </h2>

              <p className="
                mt-1 text-sm
                text-slate-500
              ">
                Latest care activity across
                the platform.
              </p>
            </div>

            <CalendarDays className="
              h-5 w-5
              text-[#176B62]
            " />
          </div>

          <div className="
            divide-y
            divide-slate-100
          ">
            {dashboard
              ?.recent_bookings
              ?.length ? (
              dashboard.recent_bookings.map(
                (booking) => (
                  <div
                    key={booking.id}
                    className="
                      flex flex-col
                      gap-4
                      px-5 py-4
                      transition
                      hover:bg-slate-50
                      sm:flex-row
                      sm:items-center
                      sm:px-6
                    "
                  >
                    <div className="
                      flex min-w-0
                      flex-1
                      items-center
                      gap-3
                    ">
                      <div className="
                        flex h-10 w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-teal-50
                        text-[#176B62]
                      ">
                        <HeartHandshake
                          className="h-5 w-5"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="
                          truncate text-sm
                          font-bold
                          text-slate-900
                        ">
                          {
                            booking.recipient_name
                          }
                        </div>

                        <div className="
                          mt-1 truncate
                          text-xs
                          text-slate-500
                        ">
                          {
                            booking.provider_name
                          }
                        </div>
                      </div>
                    </div>

                    <div className="
                      flex items-center
                      gap-3
                      sm:justify-end
                    ">
                      <div className="
                        hidden text-right
                        md:block
                      ">
                        <div className="
                          flex items-center
                          justify-end gap-1.5
                          text-xs
                          font-semibold
                          text-slate-600
                        ">
                          <Clock3
                            className="h-3.5 w-3.5"
                          />

                          {formatDateTime(
                            booking.start_time
                          )}
                        </div>
                      </div>

                      <span
                        className={`
                          inline-flex
                          rounded-full
                          px-2.5 py-1
                          text-[11px]
                          font-bold
                          ring-1
                          ring-inset
                          ${statusClasses(
                            booking.status
                          )}
                        `}
                      >
                        {STATUS_LABELS[
                          booking.status
                        ] ||
                          booking.status}
                      </span>
                    </div>
                  </div>
                )
              )
            ) : (
              <div className="
                px-6 py-10
                text-center
                text-sm
                text-slate-500
              ">
                No bookings have been
                recorded yet.
              </div>
            )}
          </div>
        </div>
      </section>


      <section className="
        mt-6 overflow-hidden
        rounded-3xl
        border border-slate-200
        bg-white
        shadow-sm
      ">
        <div className="
          border-b
          border-slate-100
          px-5 py-5
          sm:px-6
        ">
          <h2 className="
            text-xl font-black
            text-slate-950
          ">
            Recent platform users
          </h2>

          <p className="
            mt-1 text-sm
            text-slate-500
          ">
            Latest accounts joining the
            CareSphere ecosystem.
          </p>
        </div>

        <div className="
          grid gap-px
          bg-slate-100
          md:grid-cols-2
          xl:grid-cols-3
        ">
          {dashboard
            ?.recent_users
            ?.map(
              (recentUser) => (
                <div
                  key={recentUser.id}
                  className="
                    flex items-center
                    gap-3
                    bg-white p-5
                  "
                >
                  <div className="
                    flex h-11 w-11
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-slate-100
                    font-black
                    text-slate-700
                  ">
                    {recentUser.name
                      ?.charAt(0)
                      ?.toUpperCase() ||
                      "U"}
                  </div>

                  <div className="
                    min-w-0 flex-1
                  ">
                    <div className="
                      truncate text-sm
                      font-bold
                      text-slate-900
                    ">
                      {recentUser.name}
                    </div>

                    <div className="
                      mt-1 truncate
                      text-xs
                      text-slate-500
                    ">
                      {recentUser.email}
                    </div>
                  </div>

                  <span className="
                    rounded-full
                    bg-teal-50
                    px-2.5 py-1
                    text-[10px]
                    font-black
                    uppercase
                    tracking-wide
                    text-[#176B62]
                  ">
                    {
                      recentUser.user_type
                    }
                  </span>
                </div>
              )
            )}
        </div>
      </section>
    </>
  );
}
