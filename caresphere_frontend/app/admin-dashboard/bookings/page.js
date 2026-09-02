"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  Clock3,
  Search,
  UserRoundCheck,
} from "lucide-react";

import { authFetch } from "../../../lib/auth";
import { API_URL } from "../../../lib/config";


export default function AdminBookingsPage() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadBookings() {
      try {
        setLoading(true);
        setError("");

        const response = await authFetch(
          `${API_URL}/api/users/admin/operations/`
        );

        if (!response.ok) {
          throw new Error(
            `Unable to load booking operations (${response.status}).`
          );
        }

        const payload = await response.json();

        if (active) {
          setData(payload.bookings || null);
        }
      } catch (err) {
        if (active) {
          setError(
            err.message || "Unable to load booking operations."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadBookings();

    return () => {
      active = false;
    };
  }, []);

  const summary = data?.summary || {};
  const bookings = data?.items || [];

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const searchable = [
        booking.recipient_name,
        booking.family_user,
        booking.family_email,
        booking.provider_name,
        booking.assigned_staff_name,
        booking.care_type,
        booking.status,
        booking.status_display,
        booking.frequency_display,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchable.includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        booking.status === statusFilter;

      const matchesRisk =
        riskFilter === "all" ||
        (riskFilter === "risk" && booking.staffing_risk) ||
        (riskFilter === "staffed" && !booking.staffing_risk);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesRisk
      );
    });
  }, [
    bookings,
    search,
    statusFilter,
    riskFilter,
  ]);

  return (
    <>
      <PageHeader
        eyebrow="CARE DELIVERY"
        title="Bookings"
        description="Platform-wide booking oversight, lifecycle management, care delivery status and staffing risk."
        icon={CalendarDays}
      />

      <section className="
        mt-6 grid gap-4
        sm:grid-cols-2
        xl:grid-cols-4
      ">
        <SummaryCard
          label="Total bookings"
          value={loading ? "…" : summary.total ?? 0}
          icon={CalendarDays}
        />

        <SummaryCard
          label="Pending requests"
          value={loading ? "…" : summary.pending ?? 0}
          icon={Clock3}
        />

        <SummaryCard
          label="In progress"
          value={loading ? "…" : summary.in_progress ?? 0}
          icon={UserRoundCheck}
        />

        <SummaryCard
          label="Unassigned shifts"
          value={
            loading
              ? "…"
              : summary.unassigned_shifts ?? 0
          }
          icon={AlertCircle}
          warning={
            Number(summary.unassigned_shifts || 0) > 0
          }
        />
      </section>

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
            <div>
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
                  <Clock3 className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="
                    text-xl font-black
                    text-slate-950
                  ">
                    Booking operations
                  </h2>

                  <p className="
                    mt-1 text-sm
                    text-slate-500
                  ">
                    Review booking status, care recipients,
                    providers, assigned staff and staffing risk.
                  </p>
                </div>
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
                  placeholder="Search bookings..."
                  className="
                    h-11 w-full
                    rounded-xl
                    border border-slate-200
                    bg-slate-50
                    pl-10 pr-4
                    text-sm
                    outline-none
                    transition
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
                  outline-none
                  focus:border-teal-500
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
                <option value="confirmed">
                  Confirmed
                </option>
                <option value="in_progress">
                  In progress
                </option>
                <option value="completed">
                  Completed
                </option>
                <option value="cancelled">
                  Cancelled
                </option>
                <option value="declined">
                  Declined
                </option>
              </select>

              <select
                value={riskFilter}
                onChange={(event) =>
                  setRiskFilter(event.target.value)
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
                  All staffing
                </option>
                <option value="risk">
                  Staffing risk
                </option>
                <option value="staffed">
                  No staffing risk
                </option>
              </select>
            </div>
          </div>
        </div>

        {error ? (
          <ErrorState message={error} />
        ) : loading ? (
          <LoadingState />
        ) : filteredBookings.length === 0 ? (
          <EmptyState
            search={search}
            statusFilter={statusFilter}
            riskFilter={riskFilter}
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
                    Care recipient
                  </TableHeading>
                  <TableHeading>
                    Provider
                  </TableHeading>
                  <TableHeading>
                    Assigned staff
                  </TableHeading>
                  <TableHeading>
                    Care
                  </TableHeading>
                  <TableHeading>
                    Schedule
                  </TableHeading>
                  <TableHeading>
                    Status
                  </TableHeading>
                  <TableHeading>
                    Staffing
                  </TableHeading>
                </tr>
              </thead>

              <tbody className="
                divide-y divide-slate-100
                bg-white
              ">
                {filteredBookings.map((booking) => (
                  <BookingRow
                    key={booking.id}
                    booking={booking}
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
            Showing {filteredBookings.length} of{" "}
            {bookings.length} booking
            {bookings.length === 1 ? "" : "s"}.
          </div>
        )}
      </section>
    </>
  );
}


function BookingRow({ booking }) {
  return (
    <tr className="
      transition
      hover:bg-slate-50/80
    ">
      <td className="
        min-w-[210px]
        px-6 py-5
      ">
        <div className="
          font-black
          text-slate-900
        ">
          {booking.recipient_name ||
            "Not specified"}
        </div>

        <div className="
          mt-1 text-xs
          text-slate-500
        ">
          Requested by{" "}
          {booking.family_user ||
            booking.family_email ||
            "Unknown user"}
        </div>
      </td>

      <td className="
        min-w-[190px]
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
            {booking.provider_name ||
              "Not assigned"}
          </span>
        </div>
      </td>

      <td className="
        min-w-[180px]
        px-6 py-5
      ">
        {booking.assigned_staff_id ? (
          <div className="
            flex items-center gap-2
          ">
            <UserRoundCheck className="
              h-4 w-4
              text-teal-600
            " />

            <span className="
              text-sm font-bold
              text-slate-800
            ">
              {booking.assigned_staff_name}
            </span>
          </div>
        ) : (
          <span className="
            text-sm font-bold
            text-rose-600
          ">
            Unassigned
          </span>
        )}
      </td>

      <td className="
        min-w-[160px]
        px-6 py-5
      ">
        <div className="
          text-sm font-bold
          text-slate-800
        ">
          {booking.care_type ||
            "Care not specified"}
        </div>

        <div className="
          mt-1 text-xs
          text-slate-500
        ">
          {booking.frequency_display ||
            booking.frequency ||
            "No frequency"}
        </div>
      </td>

      <td className="
        min-w-[200px]
        px-6 py-5
      ">
        <div className="
          text-sm font-bold
          text-slate-800
        ">
          {formatDateTime(
            booking.start_time
          )}
        </div>

        <div className="
          mt-1 text-xs
          text-slate-500
        ">
          {booking.end_time
            ? `Ends ${formatDateTime(
                booking.end_time
              )}`
            : "No end time"}
        </div>
      </td>

      <td className="
        whitespace-nowrap
        px-6 py-5
      ">
        <StatusBadge
          status={booking.status}
          label={
            booking.status_display ||
            booking.status
          }
        />
      </td>

      <td className="
        whitespace-nowrap
        px-6 py-5
      ">
        {booking.staffing_risk ? (
          <Badge tone="red">
            <AlertCircle className="h-3.5 w-3.5" />
            Staffing risk
          </Badge>
        ) : booking.assigned_staff_id ? (
          <Badge tone="green">
            Staff assigned
          </Badge>
        ) : (
          <Badge tone="slate">
            Not required yet
          </Badge>
        )}
      </td>
    </tr>
  );
}


function StatusBadge({
  status,
  label,
}) {
  const toneMap = {
    pending: "amber",
    accepted: "blue",
    confirmed: "blue",
    in_progress: "green",
    completed: "green",
    cancelled: "slate",
    declined: "red",
  };

  return (
    <Badge
      tone={toneMap[status] || "slate"}
    >
      {formatStatusLabel(label)}
    </Badge>
  );
}


function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
}) {
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
            {eyebrow}
          </div>

          <h1 className="
            mt-3 text-3xl
            font-black
          ">
            {title}
          </h1>

          <p className="
            mt-3 max-w-2xl
            text-sm leading-6
            text-teal-50/75
          ">
            {description}
          </p>
        </div>

        <div className="
          hidden h-16 w-16
          items-center justify-center
          rounded-2xl
          bg-white/10
          sm:flex
        ">
          <Icon className="h-8 w-8" />
        </div>
      </div>
    </section>
  );
}


function SummaryCard({
  label,
  value,
  icon: Icon,
  warning = false,
}) {
  return (
    <div
      className={`
        rounded-3xl
        border bg-white p-5
        shadow-sm
        ${
          warning
            ? "border-rose-200"
            : "border-slate-200"
        }
      `}
    >
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

          <div
            className={`
              mt-3 text-3xl font-black
              ${
                warning
                  ? "text-rose-600"
                  : "text-slate-950"
              }
            `}
          >
            {value}
          </div>
        </div>

        <div
          className={`
            flex h-10 w-10
            items-center justify-center
            rounded-xl
            ${
              warning
                ? "bg-rose-50 text-rose-600"
                : "bg-slate-50 text-[#176B62]"
            }
          `}
        >
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
        inline-flex items-center gap-1.5
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
          Loading booking operations...
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
          Booking data unavailable
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
  riskFilter,
}) {
  const filtered =
    search ||
    statusFilter !== "all" ||
    riskFilter !== "all";

  return (
    <div className="
      flex min-h-[300px]
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
          No bookings found
        </h3>

        <p className="
          mt-2 text-sm
          text-slate-500
        ">
          {filtered
            ? "Try changing your search or filters."
            : "No bookings have been created yet."}
        </p>
      </div>
    </div>
  );
}


function formatDateTime(value) {
  if (!value) {
    return "Not scheduled";
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
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}


function formatStatusLabel(value) {
  if (!value) {
    return "Unknown";
  }

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}
