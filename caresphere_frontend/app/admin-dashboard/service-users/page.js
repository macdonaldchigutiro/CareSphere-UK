"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  HeartHandshake,
  Search,
  UserRoundCheck,
  Users,
} from "lucide-react";

import { authFetch } from "../../../lib/auth";
import { API_URL } from "../../../lib/config";


export default function AdminServiceUsersPage() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadServiceUsers() {
      try {
        setLoading(true);
        setError("");

        const response = await authFetch(
          `${API_URL}/api/users/admin/operations/`
        );

        if (!response.ok) {
          throw new Error(
            `Unable to load service users (${response.status}).`
          );
        }

        const payload = await response.json();

        if (active) {
          setData(payload.service_users || null);
        }
      } catch (err) {
        if (active) {
          setError(
            err.message ||
              "Unable to load service-user operations."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadServiceUsers();

    return () => {
      active = false;
    };
  }, []);

  const summary = data?.summary || {};
  const serviceUsers = data?.items || [];

  const filteredServiceUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return serviceUsers.filter((serviceUser) => {
      const searchable = [
        serviceUser.name,
        serviceUser.first_name,
        serviceUser.last_name,
        serviceUser.relationship_to_manager,
        serviceUser.managed_by,
        serviceUser.managed_by_email,
        serviceUser.linked_account,
        serviceUser.linked_account_email,
        serviceUser.mobility_needs,
        serviceUser.communication_needs,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchable.includes(query);

      let matchesFilter = true;

      if (filter === "active") {
        matchesFilter = serviceUser.is_active;
      }

      if (filter === "inactive") {
        matchesFilter = !serviceUser.is_active;
      }

      if (filter === "managed") {
        matchesFilter = Boolean(
          serviceUser.managed_by_email
        );
      }

      if (filter === "linked") {
        matchesFilter =
          serviceUser.has_linked_account;
      }

      if (filter === "unlinked") {
        matchesFilter =
          !serviceUser.has_linked_account;
      }

      return matchesSearch && matchesFilter;
    });
  }, [serviceUsers, search, filter]);

  return (
    <>
      <PageHeader />

      <section className="
        mt-6 grid gap-4
        sm:grid-cols-2
        xl:grid-cols-4
      ">
        <SummaryCard
          label="Service users"
          value={loading ? "…" : summary.total ?? 0}
          icon={HeartHandshake}
        />

        <SummaryCard
          label="Active profiles"
          value={loading ? "…" : summary.active ?? 0}
          icon={UserRoundCheck}
        />

        <SummaryCard
          label="Managed profiles"
          value={
            loading
              ? "…"
              : summary.managed_profiles ?? 0
          }
          icon={Users}
        />

        <SummaryCard
          label="Linked accounts"
          value={
            loading
              ? "…"
              : summary.linked_accounts ?? 0
          }
          icon={UserRoundCheck}
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
                <Users className="h-5 w-5" />
              </div>

              <div>
                <h2 className="
                  text-xl font-black
                  text-slate-950
                ">
                  Service-user administration
                </h2>

                <p className="
                  mt-1 text-sm
                  text-slate-500
                ">
                  Review care profiles, managing accounts,
                  linked users and profile status.
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
                  placeholder="Search service users..."
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
                  All profiles
                </option>
                <option value="active">
                  Active
                </option>
                <option value="inactive">
                  Inactive
                </option>
                <option value="managed">
                  Managed profiles
                </option>
                <option value="linked">
                  Linked accounts
                </option>
                <option value="unlinked">
                  No linked account
                </option>
              </select>
            </div>
          </div>
        </div>

        {error ? (
          <ErrorState message={error} />
        ) : loading ? (
          <LoadingState />
        ) : filteredServiceUsers.length === 0 ? (
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
                    Service user
                  </TableHeading>
                  <TableHeading>
                    Managed by
                  </TableHeading>
                  <TableHeading>
                    Relationship
                  </TableHeading>
                  <TableHeading>
                    Linked account
                  </TableHeading>
                  <TableHeading>
                    Care information
                  </TableHeading>
                  <TableHeading>
                    Profile status
                  </TableHeading>
                </tr>
              </thead>

              <tbody className="
                divide-y divide-slate-100
                bg-white
              ">
                {filteredServiceUsers.map(
                  (serviceUser) => (
                    <ServiceUserRow
                      key={serviceUser.id}
                      serviceUser={serviceUser}
                    />
                  )
                )}
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
            Showing {filteredServiceUsers.length} of{" "}
            {serviceUsers.length} service-user profile
            {serviceUsers.length === 1 ? "" : "s"}.
          </div>
        )}
      </section>
    </>
  );
}


function ServiceUserRow({ serviceUser }) {
  const conditionCount = Array.isArray(
    serviceUser.medical_conditions
  )
    ? serviceUser.medical_conditions.length
    : 0;

  const careRequirementCount =
    serviceUser.care_requirements &&
    typeof serviceUser.care_requirements === "object"
      ? Object.keys(
          serviceUser.care_requirements
        ).length
      : 0;

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
            <HeartHandshake className="h-5 w-5" />
          </div>

          <div>
            <div className="
              font-black
              text-slate-900
            ">
              {serviceUser.name ||
                "Unnamed service user"}
            </div>

            <div className="
              mt-1 text-xs
              text-slate-500
            ">
              Care profile #{serviceUser.id}
            </div>
          </div>
        </div>
      </td>

      <td className="
        min-w-[210px]
        px-6 py-5
      ">
        {serviceUser.managed_by_email ? (
          <>
            <div className="
              text-sm font-bold
              text-slate-800
            ">
              {serviceUser.managed_by ||
                serviceUser.managed_by_email}
            </div>

            <div className="
              mt-1 text-xs
              text-slate-500
            ">
              {serviceUser.managed_by_email}
            </div>
          </>
        ) : (
          <span className="
            text-sm text-slate-400
          ">
            No managing account
          </span>
        )}
      </td>

      <td className="
        min-w-[160px]
        px-6 py-5
      ">
        <span className="
          text-sm font-semibold
          text-slate-700
        ">
          {serviceUser.relationship_to_manager ||
            "Not specified"}
        </span>
      </td>

      <td className="
        min-w-[200px]
        px-6 py-5
      ">
        {serviceUser.has_linked_account ? (
          <>
            <Badge tone="green">
              Linked
            </Badge>

            <div className="
              mt-2 text-xs
              text-slate-500
            ">
              {serviceUser.linked_account_email ||
                serviceUser.linked_account}
            </div>
          </>
        ) : (
          <Badge tone="slate">
            Not linked
          </Badge>
        )}
      </td>

      <td className="
        min-w-[220px]
        px-6 py-5
      ">
        <div className="
          flex flex-wrap gap-2
        ">
          <Badge tone="blue">
            {conditionCount} condition
            {conditionCount === 1 ? "" : "s"}
          </Badge>

          <Badge tone="slate">
            {careRequirementCount} care item
            {careRequirementCount === 1 ? "" : "s"}
          </Badge>
        </div>

        {(serviceUser.mobility_needs ||
          serviceUser.communication_needs) && (
          <div className="
            mt-2 max-w-[260px]
            truncate text-xs
            text-slate-500
          ">
            {serviceUser.mobility_needs ||
              serviceUser.communication_needs}
          </div>
        )}
      </td>

      <td className="
        whitespace-nowrap
        px-6 py-5
      ">
        {serviceUser.is_active ? (
          <Badge tone="green">
            Active
          </Badge>
        ) : (
          <Badge tone="red">
            Inactive
          </Badge>
        )}
      </td>
    </tr>
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
            CARE PROFILES
          </div>

          <h1 className="
            mt-3 text-3xl
            font-black
          ">
            Service Users
          </h1>

          <p className="
            mt-3 max-w-2xl
            text-sm leading-6
            text-teal-50/75
          ">
            Review care profiles, account relationships
            and the people represented across CareSphere.
          </p>
        </div>

        <div className="
          hidden h-16 w-16
          items-center justify-center
          rounded-2xl
          bg-white/10
          sm:flex
        ">
          <HeartHandshake className="h-8 w-8" />
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


function Badge({
  children,
  tone = "slate",
}) {
  const tones = {
    green:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    red:
      "bg-rose-50 text-rose-700 ring-rose-600/20",
    blue:
      "bg-blue-50 text-blue-700 ring-blue-600/20",
    amber:
      "bg-amber-50 text-amber-700 ring-amber-600/20",
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
          Loading service-user profiles...
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
          Service-user data unavailable
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
          No service users found
        </h3>

        <p className="
          mt-2 text-sm
          text-slate-500
        ">
          {search || filter !== "all"
            ? "Try changing your search or filter."
            : "No service-user profiles exist yet."}
        </p>
      </div>
    </div>
  );
}
