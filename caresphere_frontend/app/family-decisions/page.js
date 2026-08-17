"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  HeartHandshake,
  Loader2,
  Plus,
  Scale,
  Users,
  X
} from "lucide-react";

import {
  authFetch,
  createLoginUrl,
  getAuthStorage,
} from "../../lib/auth";

const API_URL = "http://127.0.0.1:8000";

const EMPTY_FORM = {
  title: "",
  description: "",
  decision_type: "care_plan",
  voting_deadline: "",
  minimum_votes: "1",
  allow_abstain: true,
  is_anonymous: false,
};

export default function FamilyDecisionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const serviceUserId =
    searchParams.get("service_user");

  const [serviceUser, setServiceUser] =
    useState(null);

  const [circle, setCircle] =
    useState(null);

  const [decisions, setDecisions] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [showForm, setShowForm] =
    useState(false);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [options, setOptions] =
    useState(["", ""]);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  // ======================================================
  // LOGIN
  // ======================================================

  const goToLogin = () => {
    const returnTo = serviceUserId
      ? `/family-decisions?service_user=${serviceUserId}`
      : "/family-decisions";

    router.replace(
      createLoginUrl(returnTo)
    );
  };

  // ======================================================
  // LOAD PAGE DATA
  // ======================================================

  useEffect(() => {
    const loadData = async () => {
      if (!serviceUserId) {
        setError(
          "No care recipient was selected."
        );
        setLoading(false);
        return;
      }

      if (!getAuthStorage()) {
        goToLogin();
        return;
      }

      try {
        setLoading(true);
        setError("");

        // ----------------------------------------------
        // CARE RECIPIENT
        // ----------------------------------------------

        const recipientResponse =
          await authFetch(
            `${API_URL}/api/service-users/profiles/${serviceUserId}/`,
            {
              method: "GET",
              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );

        if (!recipientResponse) {
          goToLogin();
          return;
        }

        if (
          recipientResponse.status === 401
        ) {
          goToLogin();
          return;
        }

        if (!recipientResponse.ok) {
          throw new Error(
            "Unable to load this care recipient."
          );
        }

        const recipientData =
          await recipientResponse.json();

        setServiceUser(
          recipientData
        );

        // ----------------------------------------------
        // FIND FAMILY CIRCLE
        // ----------------------------------------------

        const circlesResponse =
          await authFetch(
            `${API_URL}/api/family/circles/`,
            {
              method: "GET",
              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );

        if (!circlesResponse) {
          goToLogin();
          return;
        }

        if (!circlesResponse.ok) {
          throw new Error(
            "Unable to load the Family Circle."
          );
        }

        const circlesData =
          await circlesResponse.json();

        const circleItems =
          Array.isArray(circlesData)
            ? circlesData
            : Array.isArray(
                circlesData.results
              )
            ? circlesData.results
            : [];

        const matchingCircle =
          circleItems.find(
            (item) =>
              String(
                item.service_user
              ) ===
              String(
                serviceUserId
              )
          );

        if (!matchingCircle) {
          setCircle(null);

          setError(
            "Create a Family Circle before creating family decisions."
          );

          return;
        }

        setCircle(
          matchingCircle
        );

        // ----------------------------------------------
        // DECISIONS
        // ----------------------------------------------

        const decisionsResponse =
          await authFetch(
            `${API_URL}/api/family/decisions/`,
            {
              method: "GET",
              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );

        if (!decisionsResponse) {
          goToLogin();
          return;
        }

        if (!decisionsResponse.ok) {
          throw new Error(
            "Unable to load family decisions."
          );
        }

        const decisionsData =
          await decisionsResponse.json();

        const decisionItems =
          Array.isArray(decisionsData)
            ? decisionsData
            : Array.isArray(
                decisionsData.results
              )
            ? decisionsData.results
            : [];

        setDecisions(
          decisionItems.filter(
            (decision) =>
              String(
                decision.care_circle
              ) ===
              String(
                matchingCircle.id
              )
          )
        );
      } catch (err) {
        console.error(
          "Family decisions loading error:",
          err
        );

        setError(
          err.message ||
            "We couldn't load family decisions."
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [
    router,
    serviceUserId,
  ]);

  // ======================================================
  // FORM
  // ======================================================

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setForm(
      (current) => ({
        ...current,
        [name]:
          type === "checkbox"
            ? checked
            : value,
      })
    );

    setError("");
    setSuccess("");
  };

  // ======================================================
  // OPTIONS
  // ======================================================

  const handleOptionChange = (
    index,
    value
  ) => {
    setOptions(
      (current) =>
        current.map(
          (option, optionIndex) =>
            optionIndex === index
              ? value
              : option
        )
    );
  };

  const addOption = () => {
    setOptions(
      (current) => [
        ...current,
        "",
      ]
    );
  };

  const removeOption = (
    index
  ) => {
    if (options.length <= 2) {
      return;
    }

    setOptions(
      (current) =>
        current.filter(
          (_, optionIndex) =>
            optionIndex !== index
        )
    );
  };

  // ======================================================
  // CREATE DECISION
  // ======================================================

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (!circle) {
      setError(
        "This care recipient does not have a Family Circle."
      );
      return;
    }

    if (!form.title.trim()) {
      setError(
        "Please enter a decision title."
      );
      return;
    }

    if (
      !form.description.trim()
    ) {
      setError(
        "Please describe the decision."
      );
      return;
    }

    const cleanedOptions =
      options
        .map(
          (option) =>
            option.trim()
        )
        .filter(Boolean);

    if (
      cleanedOptions.length < 2
    ) {
      setError(
        "Please provide at least two decision options."
      );
      return;
    }

    if (
      new Set(cleanedOptions)
        .size !==
      cleanedOptions.length
    ) {
      setError(
        "Decision options must be different."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response =
        await authFetch(
          `${API_URL}/api/family/decisions/`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              care_circle:
                circle.id,

              title:
                form.title.trim(),

              description:
                form.description.trim(),

              decision_type:
                form.decision_type,

              options:
                cleanedOptions,

              voting_deadline:
                form.voting_deadline
                  ? new Date(
                      form.voting_deadline
                    ).toISOString()
                  : null,

              minimum_votes:
                Number(
                  form.minimum_votes
                ) || 1,

              allow_abstain:
                form.allow_abstain,

              is_anonymous:
                form.is_anonymous,
            }),
          }
        );

      if (!response) {
        goToLogin();
        return;
      }

      if (
        response.status === 401
      ) {
        goToLogin();
        return;
      }

      const data =
        await response.json();

      if (!response.ok) {
        if (data.detail) {
          throw new Error(
            data.detail
          );
        }

        throw new Error(
          "Unable to create this family decision."
        );
      }

      setDecisions(
        (current) => [
          data,
          ...current,
        ]
      );

      setForm(
        EMPTY_FORM
      );

      setOptions(
        ["", ""]
      );

      setShowForm(false);

      setSuccess(
        "Family decision created successfully."
      );
    } catch (err) {
      console.error(
        "Create family decision error:",
        err
      );

      setError(
        err.message ||
          "We couldn't create this family decision."
      );
    } finally {
      setSaving(false);
    }
  };

  // ======================================================
  // COUNTS
  // ======================================================

  const draftCount =
    useMemo(
      () =>
        decisions.filter(
          (decision) =>
            decision.status ===
            "draft"
        ).length,
      [decisions]
    );

  const votingCount =
    useMemo(
      () =>
        decisions.filter(
          (decision) =>
            decision.status ===
            "voting"
        ).length,
      [decisions]
    );

  const resolvedCount =
    useMemo(
      () =>
        decisions.filter(
          (decision) =>
            [
              "approved",
              "rejected",
            ].includes(
              decision.status
            )
        ).length,
      [decisions]
    );

  // ======================================================
  // FORMATTING
  // ======================================================

  const formatDate = (
    value
  ) => {
    if (!value) {
      return "No deadline";
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

  const statusClasses = (
    status
  ) => {
    if (
      status === "approved"
    ) {
      return "bg-emerald-50 text-emerald-700";
    }

    if (
      status === "rejected"
    ) {
      return "bg-red-50 text-red-700";
    }

    if (
      status === "voting"
    ) {
      return "bg-blue-50 text-blue-700";
    }

    if (
      status === "expired"
    ) {
      return "bg-slate-100 text-slate-600";
    }

    return "bg-amber-50 text-amber-700";
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
            Loading family decisions...
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
            href={
              serviceUserId
                ? `/family-circle?service_user=${serviceUserId}`
                : "/care-recipients"
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Family Circle
          </Link>

        </div>

      </header>

      {/* CONTENT */}

      <div className="mx-auto max-w-[1400px] px-5 py-10 lg:px-8">

        {/* HERO */}

        <section className="rounded-[32px] bg-[#071A2B] px-7 py-10 text-white shadow-xl md:px-10 md:py-12">

          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">

            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-[#6EE7D8]">

                <Scale className="h-4 w-4" />

                Family decisions

              </div>

              <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">

                Make care decisions together.

              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">

                Create important decisions around{" "}
                <strong className="text-white">
                  {serviceUser?.first_name ||
                    "care"}
                </strong>
                , give family members clear options and
                keep the outcome recorded in one place.

              </p>

            </div>

            {circle && (
              <button
                type="button"
                onClick={() =>
                  setShowForm(true)
                }
                className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#6EE7D8] px-6 py-3 font-bold text-[#071A2B]"
              >
                <Plus className="h-5 w-5" />
                Create decision
              </button>
            )}

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

        {circle && (
          <>
            {/* SUMMARY */}

            <section className="mt-8 grid gap-5 md:grid-cols-3">

              <SummaryCard
                title="Draft decisions"
                value={draftCount}
                text="Not yet open for voting"
              />

              <SummaryCard
                title="Voting"
                value={votingCount}
                text="Decisions currently open"
              />

              <SummaryCard
                title="Resolved"
                value={resolvedCount}
                text="Approved or rejected"
              />

            </section>

            {/* DECISIONS */}

            <section className="mt-8">

              <div>

                <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">
                  Decision history
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  {decisions.length === 1
                    ? "1 family decision"
                    : `${decisions.length} family decisions`}
                </h2>

              </div>

              {decisions.length === 0 ? (
                <div className="mt-6 rounded-[30px] border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">

                  <Scale className="mx-auto h-10 w-10 text-slate-300" />

                  <h3 className="mt-5 text-2xl font-black">
                    No decisions yet
                  </h3>

                  <p className="mx-auto mt-3 max-w-lg leading-7 text-slate-500">
                    Create the first decision that your
                    Family Circle needs to discuss.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setShowForm(true)
                    }
                    className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#0F766E] px-6 py-3 font-bold text-white"
                  >
                    <Plus className="h-5 w-5" />
                    Create decision
                  </button>

                </div>
              ) : (
                <div className="mt-6 space-y-5">

                  {decisions.map(
                    (decision) => (
                      <article
                        key={
                          decision.id
                        }
                        className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm md:p-7"
                      >

                        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">

                          <div>

                            <div className="flex flex-wrap items-center gap-3">

                              <h3 className="text-xl font-black">
                                {decision.title}
                              </h3>

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses(
                                  decision.status
                                )}`}
                              >
                                {decision.status_display ||
                                  decision.status}
                              </span>

                            </div>

                            <p className="mt-2 text-sm text-slate-500">

                              {decision.decision_type_display ||
                                String(
                                  decision.decision_type
                                ).replaceAll(
                                  "_",
                                  " "
                                )}

                            </p>

                          </div>

                          <div className="inline-flex items-center gap-2 text-sm text-slate-500">

                            <CalendarDays className="h-4 w-4 text-[#0F766E]" />

                            {formatDate(
                              decision.voting_deadline
                            )}

                          </div>

                        </div>

                        <p className="mt-5 leading-7 text-slate-600">
                          {decision.description}
                        </p>

                        {/* OPTIONS */}

                        <div className="mt-6">

                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                            Decision options
                          </p>

                          <div className="mt-3 grid gap-3 md:grid-cols-2">

                            {Array.isArray(
                              decision.options
                            ) &&
                              decision.options.map(
                                (
                                  option,
                                  index
                                ) => (
                                  <div
                                    key={`${decision.id}-${index}`}
                                    className="rounded-2xl bg-slate-50 px-4 py-3 font-semibold text-slate-700"
                                  >
                                    {option}
                                  </div>
                                )
                              )}

                          </div>

                        </div>

                        {/* META */}

                        <div className="mt-6 flex flex-wrap gap-4 border-t border-slate-100 pt-5 text-sm text-slate-500">

                          <span className="inline-flex items-center gap-2">
                            <Users className="h-4 w-4 text-[#0F766E]" />

                            Minimum{" "}
                            {decision.minimum_votes}{" "}
                            vote
                            {decision.minimum_votes === 1
                              ? ""
                              : "s"}
                          </span>

                          <span className="inline-flex items-center gap-2">

                            <CheckCircle2 className="h-4 w-4 text-[#0F766E]" />

                            {decision.total_votes || 0}{" "}
                            votes received

                          </span>

                        </div>

                        {decision.status ===
                          "draft" && (
                          <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">

                            Draft decision — voting has not started yet.

                          </div>
                        )}

                      </article>
                    )
                  )}

                </div>
              )}

            </section>
          </>
        )}

      </div>

      {/* CREATE DECISION MODAL */}

      {showForm &&
        circle && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-4 py-8 backdrop-blur-sm">

            <div className="mx-auto w-full max-w-3xl rounded-[30px] bg-white shadow-2xl">

              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 md:px-8">

                <div>

                  <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">
                    Family decision
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    Create a new decision
                  </h2>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowForm(false)
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500"
                >
                  <X className="h-5 w-5" />
                </button>

              </div>

              <form
                onSubmit={
                  handleSubmit
                }
                className="space-y-6 p-6 md:p-8"
              >

                <Field
                  label="Decision title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Increase home care visits"
                  required
                />

                <TextArea
                  label="Description"
                  name="description"
                  value={
                    form.description
                  }
                  onChange={handleChange}
                  placeholder="Explain what the family needs to decide..."
                />

                <SelectField
                  label="Decision type"
                  name="decision_type"
                  value={
                    form.decision_type
                  }
                  onChange={
                    handleChange
                  }
                  options={[
                    [
                      "provider_selection",
                      "Provider Selection",
                    ],
                    [
                      "care_plan",
                      "Care Plan Approval",
                    ],
                    [
                      "financial",
                      "Financial Decision",
                    ],
                    [
                      "medical",
                      "Medical Decision",
                    ],
                    [
                      "emergency",
                      "Emergency Decision",
                    ],
                    [
                      "other",
                      "Other",
                    ],
                  ]}
                />

                {/* OPTIONS */}

                <div>

                  <div className="flex items-center justify-between gap-4">

                    <label className="text-sm font-bold text-slate-700">
                      Decision options
                    </label>

                    <button
                      type="button"
                      onClick={
                        addOption
                      }
                      className="inline-flex items-center gap-2 text-sm font-bold text-[#0F766E]"
                    >
                      <Plus className="h-4 w-4" />
                      Add option
                    </button>

                  </div>

                  <div className="mt-3 space-y-3">

                    {options.map(
                      (
                        option,
                        index
                      ) => (
                        <div
                          key={index}
                          className="flex gap-3"
                        >

                          <input
                            type="text"
                            value={option}
                            onChange={(
                              event
                            ) =>
                              handleOptionChange(
                                index,
                                event.target.value
                              )
                            }
                            placeholder={`Option ${
                              index + 1
                            }`}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 outline-none focus:border-[#0F766E] focus:ring-4 focus:ring-teal-100"
                          />

                          {options.length >
                            2 && (
                            <button
                              type="button"
                              onClick={() =>
                                removeOption(
                                  index
                                )
                              }
                              className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-2xl border border-red-200 text-red-600"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          )}

                        </div>
                      )
                    )}

                  </div>

                </div>

                <div className="grid gap-5 md:grid-cols-2">

                  <Field
                    label="Voting deadline"
                    name="voting_deadline"
                    type="datetime-local"
                    value={
                      form.voting_deadline
                    }
                    onChange={
                      handleChange
                    }
                  />

                  <Field
                    label="Minimum votes"
                    name="minimum_votes"
                    type="number"
                    value={
                      form.minimum_votes
                    }
                    onChange={
                      handleChange
                    }
                    min="1"
                  />

                </div>

                <div className="space-y-3 rounded-2xl bg-slate-50 p-5">

                  <Checkbox
                    name="allow_abstain"
                    checked={
                      form.allow_abstain
                    }
                    onChange={
                      handleChange
                    }
                    label="Allow members to abstain"
                  />

                  <Checkbox
                    name="is_anonymous"
                    checked={
                      form.is_anonymous
                    }
                    onChange={
                      handleChange
                    }
                    label="Anonymous voting"
                  />

                </div>

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
                        Creating...
                      </>
                    ) : (
                      <>
                        <Scale className="h-5 w-5" />
                        Create decision
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
// SMALL COMPONENTS
// ======================================================

function SummaryCard({
  title,
  value,
  text,
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">

      <Scale className="h-5 w-5 text-[#0F766E]" />

      <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-3xl font-black">
        {value}
      </p>

      <p className="mt-2 text-sm text-slate-500">
        {text}
      </p>

    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  min,
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
        min={min}
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
  placeholder,
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
        className="w-full resize-none rounded-2xl border border-slate-200 p-4 outline-none transition focus:border-[#0F766E] focus:ring-4 focus:ring-teal-100"
      />

    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
}) {
  return (
    <div>

      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>

      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none focus:border-[#0F766E]"
      >

        {options.map(
          ([optionValue, labelText]) => (
            <option
              key={optionValue}
              value={optionValue}
            >
              {labelText}
            </option>
          )
        )}

      </select>

    </div>
  );
}

function Checkbox({
  name,
  checked,
  onChange,
  label,
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700">

      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-[#0F766E]"
      />

      {label}

    </label>
  );
}