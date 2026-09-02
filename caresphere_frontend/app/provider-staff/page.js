"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Edit3,
  HeartHandshake,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";

import {
  authFetch,
  createLoginUrl,
  getDashboardPath,
  getAuthStorage,
} from "../../lib/auth";
import { API_URL } from "../../lib/config";


const ROLE_OPTIONS = [
  ["caregiver", "Caregiver"],
  ["nurse", "Nurse"],
  ["senior_caregiver", "Senior Caregiver"],
  ["manager", "Manager"],
  ["admin", "Administrator"],
  ["supervisor", "Supervisor"],
  ["trainer", "Trainer"],
  ["other", "Other"],
];


const EMPLOYMENT_OPTIONS = [
  ["full_time", "Full Time"],
  ["part_time", "Part Time"],
  ["contract", "Contract"],
  ["agency", "Agency Staff"],
  ["volunteer", "Volunteer"],
];


const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  role: "caregiver",
  employment_type: "full_time",
  qualifications: "",
  experience_years: "0",
  is_available: true,
  max_hours_per_week: "40",
  training_certifications: "",
  professional_body_registration: "",
  phone: "",
  email: "",
  emergency_contact: "",
  bio: "",
  languages_spoken: "",
  start_date: "",
  end_date: "",
  is_active: true,
};


function arrayToText(value) {
  if (!Array.isArray(value)) {
    return "";
  }

  return value.join(", ");
}


function textToArray(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}


function formatRole(value) {
  const option = ROLE_OPTIONS.find(
    ([key]) => key === value
  );

  return option
    ? option[1]
    : value || "Not specified";
}


function formatEmployment(value) {
  const option = EMPLOYMENT_OPTIONS.find(
    ([key]) => key === value
  );

  return option
    ? option[1]
    : value || "Not specified";
}


function getInitials(staff) {
  const first =
    staff?.first_name?.charAt(0) || "";

  const last =
    staff?.last_name?.charAt(0) || "";

  return `${first}${last}`.toUpperCase() || "CS";
}


export default function ProviderStaffPage() {
  const router = useRouter();

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [filter, setFilter] =
    useState("all");

  const [showForm, setShowForm] =
    useState(false);

  const [editingStaff, setEditingStaff] =
    useState(null);

  const [form, setForm] =
    useState(EMPTY_FORM);


  // ==================================================
  // AUTH
  // ==================================================


  const goToLogin = () => {
    router.replace(
      createLoginUrl("/provider-staff")
    );
  };


  // ==================================================
  // LOAD STAFF
  // ==================================================


  const loadStaff = async () => {
    if (!getAuthStorage()) {
      goToLogin();
      return;
    }

    try {
      setLoading(true);
      setError("");

      const profileResponse =
        await authFetch(
          `${API_URL}/api/users/profile/`,
          {
            method: "GET",
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );

      if (
        !profileResponse ||
        profileResponse.status === 401
      ) {
        goToLogin();
        return;
      }

      if (!profileResponse.ok) {
        throw new Error(
          "Unable to verify your provider account."
        );
      }

      const profile =
        await profileResponse.json();

      if (profile.user_type !== "provider") {
        router.replace(getDashboardPath(profile));
        return;
      }

      const response =
        await authFetch(
          `${API_URL}/api/care-providers/my-staff/`,
          {
            method: "GET",
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );

      if (
        !response ||
        response.status === 401
      ) {
        goToLogin();
        return;
      }

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Unable to load staff members."
        );
      }

      const items =
        Array.isArray(data)
          ? data
          : Array.isArray(data.results)
          ? data.results
          : [];

      setStaff(items);
    } catch (err) {
      console.error(
        "Provider staff error:",
        err
      );

      setError(
        err.message ||
          "We couldn't load your staff."
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadStaff();
  }, []);


  // ==================================================
  // COUNTS
  // ==================================================


  const activeCount = useMemo(
    () =>
      staff.filter(
        (member) => member.is_active
      ).length,
    [staff]
  );


  const availableCount = useMemo(
    () =>
      staff.filter(
        (member) =>
          member.is_active &&
          member.is_available
      ).length,
    [staff]
  );


  const verifiedCount = useMemo(
    () =>
      staff.filter(
        (member) =>
          member.dbs_verified &&
          member.right_to_work_verified
      ).length,
    [staff]
  );


  // ==================================================
  // FILTER
  // ==================================================


  const filteredStaff = useMemo(() => {
    let items = [...staff];

    if (filter === "active") {
      items = items.filter(
        (member) => member.is_active
      );
    }

    if (filter === "inactive") {
      items = items.filter(
        (member) => !member.is_active
      );
    }

    if (filter === "available") {
      items = items.filter(
        (member) =>
          member.is_active &&
          member.is_available
      );
    }

    const query =
      searchTerm
        .trim()
        .toLowerCase();

    if (query) {
      items = items.filter(
        (member) => {
          const searchable = [
            member.first_name,
            member.last_name,
            member.full_name,
            member.email,
            member.phone,
            formatRole(member.role),
            formatEmployment(
              member.employment_type
            ),
            ...(member.qualifications || []),
            ...(member.languages_spoken || []),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchable.includes(
            query
          );
        }
      );
    }

    return items;
  }, [
    staff,
    filter,
    searchTerm,
  ]);


  // ==================================================
  // FORM
  // ==================================================


  const openAddForm = () => {
    setEditingStaff(null);
    setForm({
      ...EMPTY_FORM,
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  };


  const openEditForm = (member) => {
    setEditingStaff(member);

    setForm({
      first_name:
        member.first_name || "",

      last_name:
        member.last_name || "",

      role:
        member.role || "caregiver",

      employment_type:
        member.employment_type ||
        "full_time",

      qualifications:
        arrayToText(
          member.qualifications
        ),

      experience_years:
        String(
          member.experience_years ?? 0
        ),

      is_available:
        Boolean(
          member.is_available
        ),

      max_hours_per_week:
        member.max_hours_per_week ===
        null
          ? ""
          : String(
              member.max_hours_per_week ??
                40
            ),

      training_certifications:
        arrayToText(
          member.training_certifications
        ),

      professional_body_registration:
        member.professional_body_registration ||
        "",

      phone:
        member.phone || "",

      email:
        member.email || "",

      emergency_contact:
        member.emergency_contact ||
        "",

      bio:
        member.bio || "",

      languages_spoken:
        arrayToText(
          member.languages_spoken
        ),

      start_date:
        member.start_date || "",

      end_date:
        member.end_date || "",

      is_active:
        Boolean(member.is_active),
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  };


  const closeForm = () => {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingStaff(null);
    setForm({
      ...EMPTY_FORM,
    });
  };


  const updateForm = (
    field,
    value
  ) => {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  };


  // ==================================================
  // SAVE
  // ==================================================


  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (
        !form.first_name.trim() ||
        !form.last_name.trim()
      ) {
        setError(
          "First name and last name are required."
        );

        return;
      }

      try {
        setSaving(true);
        setError("");
        setSuccess("");

        const payload = {
          first_name:
            form.first_name.trim(),

          last_name:
            form.last_name.trim(),

          role:
            form.role,

          employment_type:
            form.employment_type,

          qualifications:
            textToArray(
              form.qualifications
            ),

          experience_years:
            Number(
              form.experience_years || 0
            ),

          is_available:
            form.is_available,

          max_hours_per_week:
            form.max_hours_per_week === ""
              ? null
              : Number(
                  form.max_hours_per_week
                ),

          training_certifications:
            textToArray(
              form.training_certifications
            ),

          professional_body_registration:
            form
              .professional_body_registration
              .trim(),

          phone:
            form.phone.trim(),

          email:
            form.email.trim(),

          emergency_contact:
            form.emergency_contact.trim(),

          bio:
            form.bio.trim(),

          languages_spoken:
            textToArray(
              form.languages_spoken
            ),

          start_date:
            form.start_date || null,

          end_date:
            form.end_date || null,

          is_active:
            form.is_active,
        };

        const url =
          editingStaff
            ? `${API_URL}/api/care-providers/my-staff/${editingStaff.id}/`
            : `${API_URL}/api/care-providers/my-staff/`;

        const response =
          await authFetch(
            url,
            {
              method:
                editingStaff
                  ? "PATCH"
                  : "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  payload
                ),
            }
          );

        if (
          !response ||
          response.status === 401
        ) {
          goToLogin();
          return;
        }

        const data =
          await response.json();

        if (!response.ok) {
          const firstError =
            Object.values(data)
              .flat()
              .find(Boolean);

          throw new Error(
            typeof firstError ===
              "string"
              ? firstError
              : data.detail ||
                  "Unable to save this staff member."
          );
        }

        if (editingStaff) {
          setStaff(
            (current) =>
              current.map(
                (member) =>
                  member.id === data.id
                    ? data
                    : member
              )
          );

          setSuccess(
            `${data.full_name} was updated successfully.`
          );
        } else {
          setStaff(
            (current) => [
              ...current,
              data,
            ]
          );

          setSuccess(
            `${data.full_name} was added successfully.`
          );
        }

        setShowForm(false);
        setEditingStaff(null);
        setForm({
          ...EMPTY_FORM,
        });

      } catch (err) {
        console.error(
          "Save staff error:",
          err
        );

        setError(
          err.message ||
            "We couldn't save this staff member."
        );
      } finally {
        setSaving(false);
      }
    };


  // ==================================================
  // ACTIVATE / DEACTIVATE
  // ==================================================


  const toggleActive =
    async (member) => {
      try {
        setActionId(member.id);
        setError("");
        setSuccess("");

        const response =
          await authFetch(
            `${API_URL}/api/care-providers/my-staff/${member.id}/`,
            {
              method: "PATCH",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  is_active:
                    !member.is_active,
                }),
            }
          );

        if (
          !response ||
          response.status === 401
        ) {
          goToLogin();
          return;
        }

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
              "Unable to update this staff member."
          );
        }

        setStaff(
          (current) =>
            current.map(
              (item) =>
                item.id === data.id
                  ? data
                  : item
            )
        );

        setSuccess(
          data.is_active
            ? `${data.full_name} is now active.`
            : `${data.full_name} has been deactivated.`
        );

      } catch (err) {
        setError(
          err.message ||
            "We couldn't update this staff member."
        );
      } finally {
        setActionId(null);
      }
    };


  // ==================================================
  // LOADING
  // ==================================================


  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FAFC]">
        <div className="text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-[#176B62]" />

          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading staff management...
          </p>
        </div>
      </main>
    );
  }


  // ==================================================
  // PAGE
  // ==================================================


  return (
    <main className="min-h-screen bg-[#F7FAFC] text-slate-900">

      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">

          <Link
            href="/provider-dashboard"
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#176B62] text-white">
              <HeartHandshake className="h-5 w-5" />
            </div>

            <div>
              <p className="font-bold">
                CareSphere
              </p>

              <p className="text-xs text-slate-500">
                Provider Workspace
              </p>
            </div>
          </Link>

          <Link
            href="/provider-dashboard"
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>

        </div>
      </header>


      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">

        {/* TITLE */}

        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">

          <div>
            <p className="text-sm font-semibold text-[#176B62]">
              WORKFORCE
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Staff Management
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Manage carers, nurses and other staff working for your care organisation.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#176B62] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#12564F]"
          >
            <Plus className="h-4 w-4" />
            Add Staff Member
          </button>

        </div>


        {/* MESSAGES */}

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </div>
        )}


        {/* STATISTICS */}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <StatCard
            icon={Users}
            title="Total Staff"
            value={staff.length}
          />

          <StatCard
            icon={CheckCircle2}
            title="Active"
            value={activeCount}
          />

          <StatCard
            icon={Briefcase}
            title="Available"
            value={availableCount}
          />

          <StatCard
            icon={ShieldCheck}
            title="Fully Verified"
            value={verifiedCount}
          />

        </div>


        {/* SEARCH */}

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="flex flex-col gap-4 lg:flex-row">

            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />

              <input
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                placeholder="Search staff by name, role, qualification or language..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#176B62]"
              />
            </div>

            <div className="flex flex-wrap gap-2">

              {[
                ["all", "All"],
                ["active", "Active"],
                ["available", "Available"],
                ["inactive", "Inactive"],
              ].map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setFilter(value)
                    }
                    className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                      filter === value
                        ? "bg-[#176B62] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                )
              )}

            </div>
          </div>
        </div>


        {/* STAFF LIST */}

        <div className="mt-6">

          {filteredStaff.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">

              <Users className="mx-auto h-10 w-10 text-slate-300" />

              <h2 className="mt-4 text-lg font-bold">
                No staff members found
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {staff.length === 0
                  ? "Add your first staff member to begin building your CareSphere workforce."
                  : "No staff members match your current search or filter."}
              </p>

              {staff.length === 0 && (
                <button
                  type="button"
                  onClick={openAddForm}
                  className="mt-5 rounded-xl bg-[#176B62] px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Add First Staff Member
                </button>
              )}

            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">

              {filteredStaff.map(
                (member) => (
                  <StaffCard
                    key={member.id}
                    member={member}
                    actionId={actionId}
                    onEdit={() =>
                      openEditForm(member)
                    }
                    onToggle={() =>
                      toggleActive(member)
                    }
                  />
                )
              )}

            </div>
          )}

        </div>

      </div>


      {/* FORM MODAL */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-4 py-8">

          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

              <div>
                <h2 className="text-xl font-bold">
                  {editingStaff
                    ? "Edit Staff Member"
                    : "Add Staff Member"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Enter the staff member&apos;s employment and care information.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>

            </div>


            <form
              onSubmit={handleSubmit}
              className="p-6"
            >

              <FormSection title="Personal details">

                <div className="grid gap-4 md:grid-cols-2">

                  <Input
                    label="First name"
                    required
                    value={form.first_name}
                    onChange={(value) =>
                      updateForm(
                        "first_name",
                        value
                      )
                    }
                  />

                  <Input
                    label="Last name"
                    required
                    value={form.last_name}
                    onChange={(value) =>
                      updateForm(
                        "last_name",
                        value
                      )
                    }
                  />

                  <Select
                    label="Role"
                    value={form.role}
                    options={ROLE_OPTIONS}
                    onChange={(value) =>
                      updateForm(
                        "role",
                        value
                      )
                    }
                  />

                  <Select
                    label="Employment type"
                    value={
                      form.employment_type
                    }
                    options={
                      EMPLOYMENT_OPTIONS
                    }
                    onChange={(value) =>
                      updateForm(
                        "employment_type",
                        value
                      )
                    }
                  />

                  <Input
                    label="Experience (years)"
                    type="number"
                    min="0"
                    value={
                      form.experience_years
                    }
                    onChange={(value) =>
                      updateForm(
                        "experience_years",
                        value
                      )
                    }
                  />

                  <Input
                    label="Maximum hours per week"
                    type="number"
                    min="0"
                    max="168"
                    value={
                      form.max_hours_per_week
                    }
                    onChange={(value) =>
                      updateForm(
                        "max_hours_per_week",
                        value
                      )
                    }
                  />

                </div>

              </FormSection>


              <FormSection title="Contact details">

                <div className="grid gap-4 md:grid-cols-2">

                  <Input
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(value) =>
                      updateForm(
                        "email",
                        value
                      )
                    }
                  />

                  <Input
                    label="Phone"
                    value={form.phone}
                    onChange={(value) =>
                      updateForm(
                        "phone",
                        value
                      )
                    }
                  />

                </div>

                <div className="mt-4">
                  <Input
                    label="Emergency contact"
                    value={
                      form.emergency_contact
                    }
                    onChange={(value) =>
                      updateForm(
                        "emergency_contact",
                        value
                      )
                    }
                  />
                </div>

              </FormSection>


              <FormSection title="Skills & qualifications">

                <Input
                  label="Qualifications"
                  helper="Separate multiple qualifications with commas."
                  value={
                    form.qualifications
                  }
                  onChange={(value) =>
                    updateForm(
                      "qualifications",
                      value
                    )
                  }
                />

                <div className="mt-4">
                  <Input
                    label="Training certifications"
                    helper="Separate multiple certificates with commas."
                    value={
                      form.training_certifications
                    }
                    onChange={(value) =>
                      updateForm(
                        "training_certifications",
                        value
                      )
                    }
                  />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">

                  <Input
                    label="Languages spoken"
                    helper="Example: English, Shona, Ndebele"
                    value={
                      form.languages_spoken
                    }
                    onChange={(value) =>
                      updateForm(
                        "languages_spoken",
                        value
                      )
                    }
                  />

                  <Input
                    label="Professional registration"
                    helper="Example: NMC registration number"
                    value={
                      form.professional_body_registration
                    }
                    onChange={(value) =>
                      updateForm(
                        "professional_body_registration",
                        value
                      )
                    }
                  />

                </div>

              </FormSection>


              <FormSection title="Employment">

                <div className="grid gap-4 md:grid-cols-2">

                  <Input
                    label="Start date"
                    type="date"
                    value={
                      form.start_date
                    }
                    onChange={(value) =>
                      updateForm(
                        "start_date",
                        value
                      )
                    }
                  />

                  <Input
                    label="End date"
                    type="date"
                    value={
                      form.end_date
                    }
                    onChange={(value) =>
                      updateForm(
                        "end_date",
                        value
                      )
                    }
                  />

                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">

                  <Toggle
                    label="Available for care"
                    checked={
                      form.is_available
                    }
                    onChange={(value) =>
                      updateForm(
                        "is_available",
                        value
                      )
                    }
                  />

                  <Toggle
                    label="Active staff member"
                    checked={
                      form.is_active
                    }
                    onChange={(value) =>
                      updateForm(
                        "is_active",
                        value
                      )
                    }
                  />

                </div>

              </FormSection>


              <FormSection title="Staff biography">

                <label className="block text-sm font-semibold text-slate-700">
                  Bio
                </label>

                <textarea
                  rows={4}
                  value={form.bio}
                  onChange={(event) =>
                    updateForm(
                      "bio",
                      event.target.value
                    )
                  }
                  placeholder="Brief professional biography, care experience and strengths..."
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#176B62]"
                />

              </FormSection>


              {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}


              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#176B62] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingStaff ? (
                    "Save Changes"
                  ) : (
                    "Add Staff Member"
                  )}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

    </main>
  );
}


// ======================================================
// COMPONENTS
// ======================================================


function StatCard({
  icon: Icon,
  title,
  value,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-[#176B62]">
          <Icon className="h-5 w-5" />
        </div>

      </div>
    </div>
  );
}


function StaffCard({
  member,
  actionId,
  onEdit,
  onToggle,
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-start gap-4">

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#176B62] text-sm font-bold text-white">
          {getInitials(member)}
        </div>

        <div className="min-w-0 flex-1">

          <div className="flex flex-wrap items-start justify-between gap-3">

            <div>
              <h2 className="text-lg font-bold">
                {member.full_name ||
                  `${member.first_name} ${member.last_name}`}
              </h2>

              <p className="mt-1 text-sm font-medium text-[#176B62]">
                {formatRole(
                  member.role
                )}
              </p>
            </div>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                member.is_active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-100 text-slate-500"
              }`}
            >
              {member.is_active
                ? "Active"
                : "Inactive"}
            </span>

          </div>


          <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">

            <Info
              icon={Briefcase}
              text={formatEmployment(
                member.employment_type
              )}
            />

            <Info
              icon={User}
              text={`${member.experience_years || 0} years experience`}
            />

            {member.email && (
              <Info
                icon={Mail}
                text={member.email}
              />
            )}

            {member.phone && (
              <Info
                icon={Phone}
                text={member.phone}
              />
            )}

          </div>


          <div className="mt-4 flex flex-wrap gap-2">

            <StatusPill
              active={
                member.is_available
              }
              activeText="Available"
              inactiveText="Unavailable"
            />

            <StatusPill
              active={
                member.dbs_verified
              }
              activeText="DBS Verified"
              inactiveText="DBS Pending"
            />

            <StatusPill
              active={
                member.right_to_work_verified
              }
              activeText="Right to Work Verified"
              inactiveText="Right to Work Pending"
            />

          </div>


          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">

            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Edit3 className="h-4 w-4" />
              Edit
            </button>

            <button
              type="button"
              disabled={
                actionId === member.id
              }
              onClick={onToggle}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                member.is_active
                  ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              {actionId ===
              member.id
                ? "Updating..."
                : member.is_active
                ? "Deactivate"
                : "Activate"}
            </button>

          </div>

        </div>
      </div>
    </article>
  );
}


function Info({
  icon: Icon,
  text,
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />

      <span className="truncate">
        {text}
      </span>
    </div>
  );
}


function StatusPill({
  active,
  activeText,
  inactiveText,
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      {active
        ? activeText
        : inactiveText}
    </span>
  );
}


function FormSection({
  title,
  children,
}) {
  return (
    <section className="mb-7">

      <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
        {title}
      </h3>

      {children}

    </section>
  );
}


function Input({
  label,
  helper,
  required,
  type = "text",
  min,
  max,
  value,
  onChange,
}) {
  return (
    <div>

      <label className="block text-sm font-semibold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      <input
        type={type}
        min={min}
        max={max}
        required={required}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#176B62]"
      />

      {helper && (
        <p className="mt-1.5 text-xs text-slate-400">
          {helper}
        </p>
      )}

    </div>
  );
}


function Select({
  label,
  value,
  options,
  onChange,
}) {
  return (
    <div>

      <label className="block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#176B62]"
      >
        {options.map(
          ([key, name]) => (
            <option
              key={key}
              value={key}
            >
              {name}
            </option>
          )
        )}
      </select>

    </div>
  );
}


function Toggle({
  label,
  checked,
  onChange,
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-4">

      <span className="text-sm font-semibold text-slate-700">
        {label}
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(
            event.target.checked
          )
        }
        className="h-4 w-4 accent-[#176B62]"
      />

    </label>
  );
}
