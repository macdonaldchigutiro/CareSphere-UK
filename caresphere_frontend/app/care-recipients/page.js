"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  HeartHandshake,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";

import {
  authFetch,
  createLoginUrl,
  getAuthStorage,
} from "../../lib/auth";

const API_URL = "http://127.0.0.1:8000";

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  relationship_to_manager: "",
  medical_conditions: "",
  allergies: "",
  medications: "",
  mobility_needs: "",
  communication_needs: "",
  emergency_contact: "",
  emergency_phone: "",
  additional_notes: "",
};

export default function CareRecipientsPage() {
  const router = useRouter();

  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ======================================================
  // LOGIN REDIRECT
  // ======================================================

  const goToLogin = () => {
    router.replace(
      createLoginUrl("/care-recipients")
    );
  };

  // ======================================================
  // LOAD CARE RECIPIENTS
  // ======================================================

  useEffect(() => {
    const loadRecipients = async () => {
      if (!getAuthStorage()) {
        goToLogin();
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await authFetch(
          `${API_URL}/api/service-users/profiles/`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response) {
          goToLogin();
          return;
        }

        if (response.status === 401) {
          goToLogin();
          return;
        }

        if (!response.ok) {
          throw new Error(
            "Unable to load the people you care for."
          );
        }

        const data = await response.json();

        const items = Array.isArray(data)
          ? data
          : Array.isArray(data.results)
          ? data.results
          : [];

        setRecipients(items);
      } catch (err) {
        console.error(
          "Care recipients loading error:",
          err
        );

        setError(
          "We couldn't load the people you care for."
        );
      } finally {
        setLoading(false);
      }
    };

    loadRecipients();
  }, [router]);

  // ======================================================
  // FORM
  // ======================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const convertCommaList = (value) => {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  // ======================================================
  // CREATE CARE RECIPIENT
  // ======================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.first_name.trim()) {
      setError(
        "Please enter the first name of the person receiving care."
      );
      return;
    }

    if (!getAuthStorage()) {
      goToLogin();
      return;
    }

    try {
      setSaving(true);

      const response = await authFetch(
        `${API_URL}/api/service-users/profiles/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),

            date_of_birth:
              form.date_of_birth || null,

            relationship_to_manager:
              form.relationship_to_manager.trim(),

            care_requirements: {},

            medical_conditions:
              convertCommaList(
                form.medical_conditions
              ),

            allergies:
              convertCommaList(
                form.allergies
              ),

            medications:
              convertCommaList(
                form.medications
              ),

            mobility_needs:
              form.mobility_needs.trim(),

            communication_needs:
              form.communication_needs.trim(),

            emergency_contact:
              form.emergency_contact.trim(),

            emergency_phone:
              form.emergency_phone.trim(),

            additional_notes:
              form.additional_notes.trim(),

            is_active: true,
          }),
        }
      );

      if (!response) {
        goToLogin();
        return;
      }

      if (response.status === 401) {
        goToLogin();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        if (data.first_name) {
          throw new Error(
            Array.isArray(data.first_name)
              ? data.first_name[0]
              : data.first_name
          );
        }

        throw new Error(
          data.detail ||
            "Unable to add this care recipient."
        );
      }

      setRecipients((current) => [
        ...current,
        data,
      ]);

      setForm(EMPTY_FORM);
      setShowForm(false);

      setSuccess(
        `${data.full_name || data.first_name} has been added successfully.`
      );
    } catch (err) {
      console.error(
        "Create care recipient error:",
        err
      );

      setError(
        err.message ||
          "We couldn't add this care recipient."
      );
    } finally {
      setSaving(false);
    }
  };

  // ======================================================
  // DELETE CARE RECIPIENT
  // ======================================================

  const handleDelete = async (
    recipient
  ) => {
    const confirmed = window.confirm(
      `Remove ${
        recipient.full_name ||
        recipient.first_name
      } from the people you care for?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(recipient.id);
      setError("");
      setSuccess("");

      const response = await authFetch(
        `${API_URL}/api/service-users/profiles/${recipient.id}/`,
        {
          method: "DELETE",
        }
      );

      if (!response) {
        goToLogin();
        return;
      }

      if (response.status === 401) {
        goToLogin();
        return;
      }

      if (!response.ok) {
        throw new Error(
          "Unable to remove this care recipient."
        );
      }

      setRecipients((current) =>
        current.filter(
          (item) =>
            item.id !== recipient.id
        )
      );

      setSuccess(
        "Care recipient removed successfully."
      );
    } catch (err) {
      console.error(
        "Delete care recipient error:",
        err
      );

      setError(
        err.message ||
          "We couldn't remove this care recipient."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ======================================================
  // FORMAT DATE
  // ======================================================

  const formatDate = (value) => {
    if (!value) {
      return "Not provided";
    }

    const date = new Date(
      `${value}T00:00:00`
    );

    return new Intl.DateTimeFormat(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    ).format(date);
  };

  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FAFC]">

        <div className="text-center">

          <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#0F766E]" />

          <p className="mt-4 text-sm font-semibold text-slate-500">
            Loading the people you care for...
          </p>

        </div>

      </main>
    );
  }

  // ======================================================
  // PAGE
  // ======================================================

  return (
    <main className="min-h-screen bg-[#F7FAFC] text-slate-950">

      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white">

        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 lg:px-8">

          <Link
            href="/"
            className="flex items-center gap-3"
          >

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0F766E] text-white">
              <HeartHandshake className="h-6 w-6" />
            </div>

            <div>

              <div className="text-xl font-extrabold tracking-tight">
                CareSphere
                <span className="text-[#0F766E]">
                  {" "}UK
                </span>
              </div>

              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Care with confidence
              </div>

            </div>

          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>

        </div>

      </header>

      {/* CONTENT */}

      <div className="mx-auto max-w-[1400px] px-5 py-10 lg:px-8">

        {/* HERO */}

        <section className="overflow-hidden rounded-[32px] bg-[#071A2B] px-7 py-10 text-white shadow-xl md:px-10 md:py-12">

          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">

            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-[#6EE7D8]">
                <Users className="h-4 w-4" />
                Care recipients
              </div>

              <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
                People I care for
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
                Create care profiles for relatives or
                other people whose care you help manage.
                They do not need their own CareSphere
                login.
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                setShowForm(true)
              }
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#6EE7D8] px-6 py-3 font-bold text-[#071A2B] transition hover:bg-white"
            >
              <Plus className="h-5 w-5" />
              Add person
            </button>

          </div>

        </section>

        {/* MESSAGES */}

        {success && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">

            <CheckCircle2 className="h-5 w-5" />

            {success}

          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* SUMMARY */}

        <section className="mt-8">

          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">
            Care profiles
          </p>

          <h2 className="mt-2 text-2xl font-black">
            {recipients.length === 1
              ? "1 person in your care"
              : `${recipients.length} people in your care`}
          </h2>

        </section>

        {/* EMPTY STATE */}

        {recipients.length === 0 && (
          <section className="mt-8 rounded-[30px] border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-[#0F766E]">
              <User className="h-8 w-8" />
            </div>

            <h2 className="mt-6 text-2xl font-black">
              No care recipients yet
            </h2>

            <p className="mx-auto mt-3 max-w-lg leading-7 text-slate-500">
              Add the first person whose care you help
              manage. You can then create a Family Circle
              for them and coordinate care with relatives.
            </p>

            <button
              type="button"
              onClick={() =>
                setShowForm(true)
              }
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#0F766E] px-6 py-3 font-bold text-white"
            >
              <Plus className="h-5 w-5" />
              Add person
            </button>

          </section>
        )}

        {/* CARE RECIPIENT CARDS */}

        {recipients.length > 0 && (
          <section className="mt-8 grid gap-6 lg:grid-cols-2">

            {recipients.map(
              (recipient) => (
                <article
                  key={recipient.id}
                  className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_10px_35px_rgba(15,23,42,0.05)] md:p-7"
                >

                  <div className="flex items-start justify-between gap-5">

                    <div className="flex items-start gap-4">

                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-[#0F766E]">
                        <User className="h-7 w-7" />
                      </div>

                      <div>

                        <h3 className="text-xl font-black">
                          {recipient.full_name ||
                            `${recipient.first_name || ""} ${recipient.last_name || ""}`.trim() ||
                            "Care recipient"}
                        </h3>

                        <p className="mt-1 text-sm capitalize text-slate-500">
                          {recipient.relationship_to_manager ||
                            "Relationship not specified"}
                        </p>

                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(
                          recipient
                        )
                      }
                      disabled={
                        deletingId ===
                        recipient.id
                      }
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      title="Remove"
                    >
                      {deletingId ===
                      recipient.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>

                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">

                    <InfoBlock
                      icon={CalendarDays}
                      title="Date of birth"
                      value={formatDate(
                        recipient.date_of_birth
                      )}
                    />

                    <InfoBlock
                      icon={ShieldCheck}
                      title="Emergency contact"
                      value={
                        recipient.emergency_contact ||
                        "Not provided"
                      }
                    />

                  </div>

                  {Array.isArray(
                    recipient.medical_conditions
                  ) &&
                    recipient.medical_conditions
                      .length > 0 && (
                      <div className="mt-5">

                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                          Medical conditions
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">

                          {recipient.medical_conditions.map(
                            (condition) => (
                              <span
                                key={
                                  condition
                                }
                                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600"
                              >
                                {condition}
                              </span>
                            )
                          )}

                        </div>

                      </div>
                    )}

                  <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">

                    <Link
                      href={`/care-recipients/${recipient.id}`}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      View care profile
                    </Link>

                    <Link
                      href={`/family-circle?service_user=${recipient.id}`}
                      className="rounded-xl bg-[#0F766E] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#0D655F]"
                    >
                      Family Circle
                    </Link>

                  </div>

                </article>
              )
            )}

          </section>
        )}

      </div>

      {/* ADD PERSON MODAL */}

      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-4 py-8 backdrop-blur-sm">

          <div className="mx-auto w-full max-w-3xl rounded-[30px] bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 md:px-8">

              <div>

                <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">
                  New care profile
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  Add someone you care for
                </h2>

              </div>

              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm(
                    EMPTY_FORM
                  );
                  setError("");
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-6 p-6 md:p-8"
            >

              {/* NAME */}

              <div className="grid gap-5 md:grid-cols-2">

                <Field
                  label="First name"
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  required
                />

                <Field
                  label="Last name"
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                />

              </div>

              {/* DOB + RELATIONSHIP */}

              <div className="grid gap-5 md:grid-cols-2">

                <Field
                  label="Date of birth"
                  name="date_of_birth"
                  type="date"
                  value={
                    form.date_of_birth
                  }
                  onChange={handleChange}
                />

                <Field
                  label="Relationship to you"
                  name="relationship_to_manager"
                  value={
                    form.relationship_to_manager
                  }
                  onChange={handleChange}
                  placeholder="e.g. Mother, Father, Child"
                />

              </div>

              {/* MEDICAL */}

              <Field
                label="Medical conditions"
                name="medical_conditions"
                value={
                  form.medical_conditions
                }
                onChange={handleChange}
                placeholder="Separate multiple conditions with commas"
              />

              <Field
                label="Allergies"
                name="allergies"
                value={form.allergies}
                onChange={handleChange}
                placeholder="Separate multiple allergies with commas"
              />

              <Field
                label="Medications"
                name="medications"
                value={form.medications}
                onChange={handleChange}
                placeholder="Separate multiple medications with commas"
              />

              {/* NEEDS */}

              <TextArea
                label="Mobility needs"
                name="mobility_needs"
                value={
                  form.mobility_needs
                }
                onChange={handleChange}
                placeholder="Describe any mobility support required..."
              />

              <TextArea
                label="Communication needs"
                name="communication_needs"
                value={
                  form.communication_needs
                }
                onChange={handleChange}
                placeholder="Describe communication preferences or support..."
              />

              {/* EMERGENCY */}

              <div className="grid gap-5 md:grid-cols-2">

                <Field
                  label="Emergency contact"
                  name="emergency_contact"
                  value={
                    form.emergency_contact
                  }
                  onChange={handleChange}
                />

                <Field
                  label="Emergency phone"
                  name="emergency_phone"
                  value={
                    form.emergency_phone
                  }
                  onChange={handleChange}
                />

              </div>

              <TextArea
                label="Additional notes"
                name="additional_notes"
                value={
                  form.additional_notes
                }
                onChange={handleChange}
                placeholder="Anything else that may help coordinate their care..."
              />

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={() =>
                    setShowForm(false)
                  }
                  className="rounded-xl border border-slate-200 px-6 py-3 font-bold text-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-6 py-3 font-bold text-white disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      Add person
                    </>
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

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
}) {
  return (
    <div>

      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none transition focus:border-[#0F766E] focus:ring-4 focus:ring-teal-100"
      />

    </div>
  );
}

function TextArea({
  label,
  name,
  value,
  onChange,
  placeholder = "",
}) {
  return (
    <div>

      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>

      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={4}
        className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 outline-none transition focus:border-[#0F766E] focus:ring-4 focus:ring-teal-100"
      />

    </div>
  );
}

function InfoBlock({
  icon: Icon,
  title,
  value,
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">

      <Icon className="h-5 w-5 text-[#0F766E]" />

      <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
        {title}
      </p>

      <p className="mt-2 font-bold text-slate-800">
        {value}
      </p>

    </div>
  );
}