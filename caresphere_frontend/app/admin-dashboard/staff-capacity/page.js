"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Search,
  Stethoscope,
  UserRoundCheck,
} from "lucide-react";

import { authFetch } from "../../../lib/auth";
import { API_URL } from "../../../lib/config";


export default function AdminStaffCapacityPage() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadStaffCapacity() {
      try {
        setLoading(true);
        setError("");

        const response = await authFetch(
          `${API_URL}/api/users/admin/operations/`
        );

        if (!response.ok) {
          throw new Error(
            `Unable to load staff capacity (${response.status}).`
          );
        }

        const payload = await response.json();

        if (active) {
          setData(payload.staff_capacity || null);
        }
      } catch (err) {
        if (active) {
          setError(
            err.message || "Unable to load staff capacity."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadStaffCapacity();

    return () => {
      active = false;
    };
  }, []);

  const summary = data?.summary || {};
  const staff = data?.items || [];

  const capacityRisks = staff.filter((member) => {
    return (
      member.is_active &&
      (
        !member.is_available ||
        Number(member.open_availability_slots || 0) === 0
      )
    );
  }).length;

  const filteredStaff = useMemo(() => {
    const query = search.trim().toLowerCase();

    return staff.filter((member) => {
      const searchable = [
        member.name,
        member.provider_name,
        member.role,
        member.employment_type,
        member.email,
        member.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchable.includes(query);

      let matchesFilter = true;

      if (filter === "available") {
        matchesFilter =
          member.is_active &&
          member.is_available;
      }

      if (filter === "unavailable") {
        matchesFilter =
          member.is_active &&
          !member.is_available;
      }

      if (filter === "inactive") {
        matchesFilter =
          !member.is_active;
      }

      if (filter === "commitments") {
        matchesFilter =
          Number(
            member.active_booking_commitments || 0
          ) > 0;
      }

      if (filter === "no-coverage") {
        matchesFilter =
          member.is_active &&
          Number(
            member.open_availability_slots || 0
          ) === 0;
      }

      return matchesSearch && matchesFilter;
    });
  }, [staff, search, filter]);

  return (
    <>
      <PageHeader
        eyebrow="WORKFORCE OPERATIONS"
        title="Staff & Capacity"
        description="See workforce availability, coverage pressure, booking commitments and CareSphere staffing capacity."
        icon={Stethoscope}
      />

      <section className="
        mt-6 grid gap-4
        sm:grid-cols-2
        xl:grid-cols-4
      ">
        <SummaryCard
          label="Care staff"
          value={
            loading
              ? "…"
              : summary.total_staff ?? 0
          }
          icon={Stethoscope}
        />

        <SummaryCard
          label="Available staff"
          value={
            loading
              ? "…"
              : summary.available_staff ?? 0
          }
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

        <SummaryCard
          label="Capacity risks"
          value={
            loading
              ? "…"
              : capacityRisks
          }
          icon={Activity}
          warning={capacityRisks > 0}
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
                  <Activity className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="
                    text-xl font-black
                    text-slate-950
                  ">
                    Capacity intelligence
                  </h2>

                  <p className="
                    mt-1 text-sm
                    text-slate-500
                  ">
                    Review staff availability, saved schedules,
                    commitments and potential workforce gaps.
                  </p>
                </div>
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
                  placeholder="Search staff..."
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
                  All staff
                </option>
                <option value="available">
                  Available
                </option>
                <option value="unavailable">
                  Unavailable
                </option>
                <option value="commitments">
                  With commitments
                </option>
                <option value="no-coverage">
                  No open coverage
                </option>
                <option value="inactive">
                  Inactive
                </option>
              </select>
            </div>
          </div>
        </div>

        {error ? (
          <ErrorState message={error} />
        ) : loading ? (
          <LoadingState />
        ) : filteredStaff.length === 0 ? (
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
                    Staff member
                  </TableHeading>
                  <TableHeading>
                    Provider
                  </TableHeading>
                  <TableHeading>
                    Role
                  </TableHeading>
                  <TableHeading>
                    Availability
                  </TableHeading>
                  <TableHeading>
                    Coverage
                  </TableHeading>
                  <TableHeading>
                    Commitments
                  </TableHeading>
                  <TableHeading>
                    Compliance
                  </TableHeading>
                </tr>
              </thead>

              <tbody className="
                divide-y divide-slate-100
                bg-white
              ">
                {filteredStaff.map((member) => (
                  <StaffRow
                    key={member.id}
                    member={member}
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
            Showing {filteredStaff.length} of{" "}
            {staff.length} staff member
            {staff.length === 1 ? "" : "s"}.
          </div>
        )}
      </section>
    </>
  );
}


function StaffRow({ member }) {
  const openSlots =
    Number(member.open_availability_slots || 0);

  const commitments =
    Number(member.active_booking_commitments || 0);

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
          flex items-center gap-3
        ">
          <div className="
            flex h-11 w-11
            items-center justify-center
            rounded-2xl
            bg-teal-50
            text-[#176B62]
          ">
            <UserRoundCheck className="h-5 w-5" />
          </div>

          <div>
            <div className="
              font-black
              text-slate-900
            ">
              {member.name ||
                "Unnamed staff member"}
            </div>

            <div className="
              mt-1 text-xs
              text-slate-500
            ">
              {member.email || "No email"}
            </div>
          </div>
        </div>
      </td>

      <td className="
        min-w-[180px]
        px-6 py-5
      ">
        <div className="
          text-sm font-bold
          text-slate-800
        ">
          {member.provider_name ||
            "Unknown provider"}
        </div>
      </td>

      <td className="
        min-w-[170px]
        px-6 py-5
      ">
        <div className="
          text-sm font-bold
          text-slate-800
        ">
          {member.role || "Not specified"}
        </div>

        <div className="
          mt-1 text-xs
          text-slate-500
        ">
          {formatLabel(
            member.employment_type
          )}
        </div>
      </td>

      <td className="
        whitespace-nowrap
        px-6 py-5
      ">
        {!member.is_active ? (
          <Badge tone="slate">
            Inactive
          </Badge>
        ) : member.is_available ? (
          <Badge tone="green">
            Available
          </Badge>
        ) : (
          <Badge tone="red">
            Unavailable
          </Badge>
        )}
      </td>

      <td className="
        whitespace-nowrap
        px-6 py-5
      ">
        <div className="
          text-sm font-black
          text-slate-900
        ">
          {openSlots} open slot
          {openSlots === 1 ? "" : "s"}
        </div>

        <div className="
          mt-1 text-xs
          text-slate-500
        ">
          {member.availability_slots || 0} saved
          {" "}schedule
          {Number(member.availability_slots || 0) === 1
            ? ""
            : "s"}
        </div>
      </td>

      <td className="
        whitespace-nowrap
        px-6 py-5
      ">
        {commitments > 0 ? (
          <Badge tone="blue">
            {commitments} active
          </Badge>
        ) : (
          <Badge tone="slate">
            No active bookings
          </Badge>
        )}
      </td>

      <td className="
        min-w-[190px]
        px-6 py-5
      ">
        <div className="
          flex flex-col
          items-start gap-2
        ">
          {member.dbs_verified ? (
            <Badge tone="green">
              DBS verified
            </Badge>
          ) : (
            <Badge tone="amber">
              DBS pending
            </Badge>
          )}

          {member.right_to_work_verified ? (
            <span className="
              text-xs font-bold
              text-emerald-700
            ">
              Right to work verified
            </span>
          ) : (
            <span className="
              text-xs font-bold
              text-amber-700
            ">
              Right to work pending
            </span>
          )}
        </div>
      </td>
    </tr>
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
          Loading staff capacity...
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
          Staff data unavailable
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
          No staff found
        </h3>

        <p className="
          mt-2 text-sm
          text-slate-500
        ">
          {search || filter !== "all"
            ? "Try changing your search or filter."
            : "No care staff are registered yet."}
        </p>
      </div>
    </div>
  );
}


function formatLabel(value) {
  if (!value) {
    return "Not specified";
  }

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}
