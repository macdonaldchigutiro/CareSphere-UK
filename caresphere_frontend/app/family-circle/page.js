"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import {
  ArrowLeft,
  CheckCircle2,
  HeartHandshake,
  Loader2,
  Plus,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";

import {
  authFetch,
  createLoginUrl,
  getAuthStorage,
  getStoredUser,
} from "../../lib/auth";

const API_URL = "http://127.0.0.1:8000";

const EMPTY_MEMBER_FORM = {
  user_email: "",
  role: "contributor",
  relationship: "other",
  nickname: "",
};

export default function FamilyCirclePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const serviceUserId =
    searchParams.get("service_user");

  const [serviceUser, setServiceUser] =
    useState(null);

  const [signedInUser, setSignedInUser] =
    useState(null);

  const [circle, setCircle] =
    useState(null);

  const [members, setMembers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [creatingCircle, setCreatingCircle] =
    useState(false);

  const [addingMember, setAddingMember] =
    useState(false);

  const [showMemberForm, setShowMemberForm] =
    useState(false);

  const [memberForm, setMemberForm] =
    useState(EMPTY_MEMBER_FORM);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  // ======================================================
  // LOGIN REDIRECT
  // ======================================================

  const goToLogin = () => {
    const returnTo = serviceUserId
      ? `/family-circle?service_user=${serviceUserId}`
      : "/family-circle";

    router.replace(
      createLoginUrl(returnTo)
    );
  };

  // ======================================================
  // LOAD SERVICE USER + CIRCLE
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

      setSignedInUser(getStoredUser());

      try {
        setLoading(true);
        setError("");

        // ----------------------------------------------
        // Load selected care recipient
        // ----------------------------------------------

        const serviceUserResponse =
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

        if (!serviceUserResponse) {
          goToLogin();
          return;
        }

        if (
          serviceUserResponse.status === 401
        ) {
          goToLogin();
          return;
        }

        if (!serviceUserResponse.ok) {
          throw new Error(
            "Unable to load this care recipient."
          );
        }

        const serviceUserData =
          await serviceUserResponse.json();

        setServiceUser(
          serviceUserData
        );

        // ----------------------------------------------
        // Load circles accessible to current user
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

        if (
          circlesResponse.status === 401
        ) {
          goToLogin();
          return;
        }

        if (!circlesResponse.ok) {
          throw new Error(
            "Unable to load Family Circle information."
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
          ) || null;

        setCircle(
          matchingCircle
        );

        if (matchingCircle) {
          await loadMembers(
            matchingCircle.id
          );
        }
      } catch (err) {
        console.error(
          "Family Circle loading error:",
          err
        );

        setError(
          err.message ||
            "We couldn't load the Family Circle."
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
  // LOAD MEMBERS
  // ======================================================

  const loadMembers = async (
    circleId
  ) => {
    try {
      const response =
        await authFetch(
          `${API_URL}/api/family/members/`,
          {
            method: "GET",
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );

      if (!response) {
        return;
      }

      if (!response.ok) {
        return;
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

      const circleMembers =
        items.filter(
          (member) =>
            String(
              member.care_circle
            ) ===
            String(circleId)
        );

      setMembers(
        circleMembers
      );
    } catch (err) {
      console.error(
        "Family Circle members error:",
        err
      );
    }
  };

  // ======================================================
  // CREATE CIRCLE
  // ======================================================

  const handleCreateCircle =
    async () => {
      if (!serviceUserId) {
        return;
      }

      if (!getAuthStorage()) {
        goToLogin();
        return;
      }

      setSignedInUser(getStoredUser());

      try {
        setCreatingCircle(true);
        setError("");
        setSuccess("");

        const response =
          await authFetch(
            `${API_URL}/api/family/circles/`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                service_user:
                  serviceUserId,

                name: `${
                  serviceUser?.first_name ||
                  "Family"
                }'s Care Circle`,

                description:
                  "A shared space for family members to coordinate care.",

                is_active: true,

                requires_consensus:
                  true,

                consensus_threshold:
                  75,

                allow_external_invites:
                  true,

                auto_share_updates:
                  true,
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
          if (
            data.service_user
          ) {
            throw new Error(
              Array.isArray(
                data.service_user
              )
                ? data.service_user[0]
                : data.service_user
            );
          }

          throw new Error(
            data.detail ||
              "Unable to create the Family Circle."
          );
        }

        setCircle(data);

        await loadMembers(
          data.id
        );

        setSuccess(
          "Family Circle created successfully."
        );
      } catch (err) {
        console.error(
          "Create Family Circle error:",
          err
        );

        setError(
          err.message ||
            "We couldn't create the Family Circle."
        );
      } finally {
        setCreatingCircle(false);
      }
    };

  // ======================================================
  // MEMBER FORM
  // ======================================================

  const handleMemberChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setMemberForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );

    setError("");
    setSuccess("");
  };

  // ======================================================
  // ADD MEMBER
  // ======================================================

  const handleAddMember =
    async (event) => {
      event.preventDefault();

      if (!circle) {
        return;
      }

      if (
        !memberForm.user_email.trim()
      ) {
        setError(
          "Please enter the family member's CareSphere email address."
        );
        return;
      }

      try {
        setAddingMember(true);
        setError("");
        setSuccess("");

        const response =
          await authFetch(
            `${API_URL}/api/family/members/`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                care_circle:
                  circle.id,

                user_email:
                  memberForm.user_email
                    .trim()
                    .toLowerCase(),

                role:
                  memberForm.role,

                relationship:
                  memberForm.relationship,

                nickname:
                  memberForm.nickname
                    .trim(),

                can_invite_members:
                  memberForm.role ===
                    "admin" ||
                  memberForm.role ===
                    "primary",

                can_manage_bookings:
                  memberForm.role ===
                    "admin" ||
                  memberForm.role ===
                    "primary" ||
                  memberForm.role ===
                    "decision_maker",

                can_view_financials:
                  memberForm.role ===
                    "admin" ||
                  memberForm.role ===
                    "primary",

                can_make_decisions:
                  memberForm.role ===
                    "admin" ||
                  memberForm.role ===
                    "primary" ||
                  memberForm.role ===
                    "decision_maker",

                can_edit_profiles:
                  memberForm.role ===
                    "admin" ||
                  memberForm.role ===
                    "primary",

                is_active: true,

                notification_preferences:
                  {},
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
          if (
            data.user_email
          ) {
            throw new Error(
              Array.isArray(
                data.user_email
              )
                ? data.user_email[0]
                : data.user_email
            );
          }

          throw new Error(
            data.detail ||
              "Unable to add this family member."
          );
        }

        setMembers(
          (current) => [
            ...current,
            data,
          ]
        );

        setMemberForm(
          EMPTY_MEMBER_FORM
        );

        setShowMemberForm(
          false
        );

        setSuccess(
          "Family member added successfully."
        );
      } catch (err) {
        console.error(
          "Add Family Circle member error:",
          err
        );

        setError(
          err.message ||
            "We couldn't add this family member."
        );
      } finally {
        setAddingMember(false);
      }
    };

  // ======================================================
  // PRIMARY CONTACT
  // ======================================================

  const primaryContact =
    useMemo(
      () =>
        members.find(
          (member) =>
            member.role ===
              "primary" &&
            member.is_active
        ),
      [members]
    );

  const currentMembership =
    useMemo(() => {
      if (!signedInUser) {
        return null;
      }

      const signedInEmail =
        signedInUser.email
          ?.trim()
          .toLowerCase();

      return (
        members.find((member) => {
          const memberEmail =
            member.email
              ?.trim()
              .toLowerCase();

          return (
            memberEmail &&
            signedInEmail &&
            memberEmail === signedInEmail
          );
        }) || null
      );
    }, [members, signedInUser]);

  const signedInName =
    `${signedInUser?.first_name || ""} ${
      signedInUser?.last_name || ""
    }`.trim() ||
    signedInUser?.email ||
    "CareSphere user";

  const careRecipientName =
    serviceUser?.full_name ||
    `${serviceUser?.first_name || ""} ${
      serviceUser?.last_name || ""
    }`.trim() ||
    "Care recipient";

  const currentRole =
    currentMembership?.role_display ||
    currentMembership?.role
      ?.replaceAll("_", " ")
      ?.replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      ) ||
    (serviceUser?.managed_by ===
    signedInUser?.id
      ? "Care Manager"
      : "Family Circle Member");

  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FAFC]">

        <div className="text-center">

          <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#0F766E]" />

          <p className="mt-4 text-sm font-semibold text-slate-500">
            Loading Family Circle...
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
                ? `/care-recipients/${serviceUserId}`
                : "/care-recipients"
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Care profile
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

                Family collaboration

              </div>

              <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">

                {circle
                  ? circle.name
                  : `${
                      serviceUser?.first_name ||
                      "Family"
                    }'s Family Circle`}

              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">

                {circle
                  ? "Coordinate family involvement, shared care decisions and communication from one place."
                  : `Create a Family Circle for ${
                      serviceUser?.first_name ||
                      "this care recipient"
                    } and bring the people involved in their care together.`}

              </p>

            </div>

            {circle && (
              <button
                type="button"
                onClick={() =>
                  setShowMemberForm(
                    true
                  )
                }
                className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#6EE7D8] px-6 py-3 font-bold text-[#071A2B] transition hover:bg-white"
              >
                <Plus className="h-5 w-5" />
                Add family member
              </button>
            )}

          </div>

        </section>

        {/* VIEWING CONTEXT */}

        {circle && (
          <section className="mt-6 rounded-[24px] border border-teal-200 bg-teal-50/70 px-5 py-4 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0F766E] text-white">
                  <User className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0F766E]">
                    Current care workspace
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    You are signed in as{" "}
                    <span className="font-black text-slate-900">
                      {signedInName}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 md:min-w-[440px]">
                <div className="rounded-2xl border border-white bg-white/80 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Viewing care for
                  </p>
                  <p className="mt-1 font-black text-slate-900">
                    {careRecipientName}
                  </p>
                </div>

                <div className="rounded-2xl border border-white bg-white/80 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Your role
                  </p>
                  <p className="mt-1 font-black capitalize text-slate-900">
                    {currentRole}
                  </p>
                </div>
              </div>

            </div>
          </section>
        )}

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

        {/* NO CIRCLE */}

        {!circle && (
          <section className="mt-8 rounded-[30px] border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-[#0F766E]">

              <Users className="h-8 w-8" />

            </div>

            <h2 className="mt-6 text-2xl font-black">
              Create a Family Circle
            </h2>

            <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-500">

              A Family Circle gives relatives and trusted
              people a shared place to coordinate care for{" "}
              {serviceUser?.first_name ||
                "this person"}.

            </p>

            <button
              type="button"
              onClick={
                handleCreateCircle
              }
              disabled={
                creatingCircle
              }
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#0F766E] px-6 py-3 font-bold text-white disabled:opacity-60"
            >

              {creatingCircle ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  Create Family Circle
                </>
              )}

            </button>

          </section>
        )}

        {/* EXISTING CIRCLE */}

        {circle && (
          <>
            {/* SUMMARY */}

            <section className="mt-8 grid gap-5 md:grid-cols-3">

              <SummaryCard
                icon={Users}
                title="Members"
                value={members.length}
                text="People currently involved"
              />

              <SummaryCard
                icon={ShieldCheck}
                title="Primary contact"
                value={
                  primaryContact?.user_name ||
                  circle.primary_contact_name ||
                  "Not set"
                }
                text="Main care coordinator"
              />

              <SummaryCard
                icon={CheckCircle2}
                title="Consensus"
                value={`${circle.consensus_threshold}%`}
                text={
                  circle.requires_consensus
                    ? "Consensus required"
                    : "Consensus optional"
                }
              />

            </section>

            {/* MAIN GRID */}

            <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">

              <div className="space-y-8">

                {/* MEMBERS */}

                <section className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">

                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

                    <div>

                      <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">
                        Circle members
                      </p>

                      <h2 className="mt-2 text-2xl font-black">
                        People involved in care
                      </h2>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setShowMemberForm(
                          true
                        )
                      }
                      className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Plus className="h-4 w-4" />
                      Add member
                    </button>

                  </div>

                  {members.length === 0 ? (
                    <div className="mt-7 rounded-2xl bg-slate-50 px-5 py-10 text-center">

                      <Users className="mx-auto h-8 w-8 text-slate-300" />

                      <p className="mt-4 font-bold text-slate-800">
                        No members yet
                      </p>

                    </div>
                  ) : (
                    <div className="mt-7 space-y-4">

                      {members.map(
                        (member) => (
                          <article
                            key={
                              member.id
                            }
                            className="rounded-2xl border border-slate-200 p-5"
                          >

                            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">

                              <div className="flex items-start gap-4">

                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-[#0F766E]">

                                  <User className="h-6 w-6" />

                                </div>

                                <div>

                                  <div className="flex flex-wrap items-center gap-2">

                                    <h3 className="font-black text-slate-900">

                                      {member.user_name ||
                                        member.email ||
                                        "Family member"}

                                    </h3>

                                    {member.role ===
                                      "primary" && (
                                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                                        Primary contact
                                      </span>
                                    )}

                                  </div>

                                  <p className="mt-1 text-sm text-slate-500">
                                    {member.email}
                                  </p>

                                  <div className="mt-3 flex flex-wrap gap-2">

                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                      {member.role_display ||
                                        member.role}
                                    </span>

                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                      {member.relationship_display ||
                                        member.relationship}
                                    </span>

                                  </div>

                                </div>

                              </div>

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${
                                  member.is_active
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {member.is_active
                                  ? "Active"
                                  : "Inactive"}
                              </span>

                            </div>

                          </article>
                        )
                      )}

                    </div>
                  )}

                </section>

                {/* FAMILY COLLABORATION */}

<section className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">

  <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">
    Collaboration
  </p>

  <h2 className="mt-2 text-2xl font-black">
    Family coordination
  </h2>

  <div className="mt-6 grid gap-4 md:grid-cols-2">

    <FeatureBlock
      title="Shared notes"
      text="Keep care updates visible to the right family members."
      badge="Next"
    />

    <FeatureBlock
      title="Family decisions"
      text="Create care decisions, vote together and record agreed outcomes."
      href={
        serviceUserId
          ? `/family-decisions?service_user=${serviceUserId}`
          : "/family-decisions"
      }
      badge="Open"
    />

    <FeatureBlock
      title="Bookings"
      text="Review and coordinate care arrangements with trusted members."
      href="/bookings"
      badge="Open"
    />

    <FeatureBlock
      title="Family discussions"
      text="Keep important conversations around care together."
      badge="Planned"
    />

  </div>

</section>

              </div>

              {/* SIDEBAR */}

              <aside className="space-y-6">

                <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">

                  <Users className="h-7 w-7 text-[#0F766E]" />

                  <h2 className="mt-5 text-xl font-black">
                    About this circle
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {circle.description ||
                      "Family care coordination space."}
                  </p>

                  <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">

                    <CircleSetting
                      label="External invites"
                      value={
                        circle.allow_external_invites
                          ? "Allowed"
                          : "Disabled"
                      }
                    />

                    <CircleSetting
                      label="Auto-share updates"
                      value={
                        circle.auto_share_updates
                          ? "Enabled"
                          : "Disabled"
                      }
                    />

                    <CircleSetting
                      label="Status"
                      value={
                        circle.is_active
                          ? "Active"
                          : "Inactive"
                      }
                    />

                  </div>

                </section>

                <section className="rounded-[28px] bg-gradient-to-br from-[#0F766E] to-[#0A5B69] p-6 text-white shadow-xl">

                  <HeartHandshake className="h-7 w-7 text-[#6EE7D8]" />

                  <h2 className="mt-5 text-xl font-black">
                    Care together
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-teal-50/90">
                    Family Circle keeps care coordination centred around{" "}
                    {serviceUser?.first_name ||
                      "the person receiving care"}.
                  </p>

                </section>

              </aside>

            </section>
          </>
        )}

      </div>

      {/* ADD MEMBER MODAL */}

      {showMemberForm &&
        circle && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-4 py-8 backdrop-blur-sm">

            <div className="mx-auto w-full max-w-2xl rounded-[30px] bg-white shadow-2xl">

              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 md:px-8">

                <div>

                  <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">
                    Family Circle
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    Add family member
                  </h2>

                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowMemberForm(
                      false
                    );

                    setMemberForm(
                      EMPTY_MEMBER_FORM
                    );

                    setError("");
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500"
                >
                  <X className="h-5 w-5" />
                </button>

              </div>

              <form
                onSubmit={
                  handleAddMember
                }
                className="space-y-6 p-6 md:p-8"
              >

                <Field
                  label="CareSphere email"
                  name="user_email"
                  type="email"
                  value={
                    memberForm.user_email
                  }
                  onChange={
                    handleMemberChange
                  }
                  placeholder="familymember@example.com"
                  required
                />

                <div className="grid gap-5 md:grid-cols-2">

                  <SelectField
                    label="Role"
                    name="role"
                    value={
                      memberForm.role
                    }
                    onChange={
                      handleMemberChange
                    }
                    options={[
                      [
                        "decision_maker",
                        "Decision Maker",
                      ],
                      [
                        "contributor",
                        "Contributor",
                      ],
                      [
                        "viewer",
                        "Viewer",
                      ],
                      [
                        "admin",
                        "Administrator",
                      ],
                    ]}
                  />

                  <SelectField
                    label="Relationship"
                    name="relationship"
                    value={
                      memberForm.relationship
                    }
                    onChange={
                      handleMemberChange
                    }
                    options={[
                      [
                        "spouse",
                        "Spouse / Partner",
                      ],
                      [
                        "child",
                        "Child",
                      ],
                      [
                        "parent",
                        "Parent",
                      ],
                      [
                        "sibling",
                        "Sibling",
                      ],
                      [
                        "grandchild",
                        "Grandchild",
                      ],
                      [
                        "friend",
                        "Friend",
                      ],
                      [
                        "neighbor",
                        "Neighbour",
                      ],
                      [
                        "professional",
                        "Professional",
                      ],
                      [
                        "other",
                        "Other",
                      ],
                    ]}
                  />

                </div>

                <Field
                  label="Nickname"
                  name="nickname"
                  value={
                    memberForm.nickname
                  }
                  onChange={
                    handleMemberChange
                  }
                  placeholder="Optional"
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
                      setShowMemberForm(
                        false
                      )
                    }
                    className="rounded-xl border border-slate-200 px-6 py-3 font-bold text-slate-600"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      addingMember
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-6 py-3 font-bold text-white disabled:opacity-60"
                  >

                    {addingMember ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-5 w-5" />
                        Add member
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
  icon: Icon,
  title,
  value,
  text,
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">

      <Icon className="h-5 w-5 text-[#0F766E]" />

      <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-2xl font-black text-slate-900">
        {value}
      </p>

      <p className="mt-2 text-sm text-slate-500">
        {text}
      </p>

    </div>
  );
}

function FeatureBlock({
  title,
  text,
  href,
  badge,
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">

        <h3 className="font-black text-slate-800">
          {title}
        </h3>

        {badge && (
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              href
                ? "bg-teal-50 text-[#0F766E]"
                : "bg-slate-200 text-slate-500"
            }`}
          >
            {badge}
          </span>
        )}

      </div>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {text}
      </p>

      {href && (
        <p className="mt-4 text-sm font-bold text-[#0F766E]">
          Open feature →
        </p>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-2xl border border-transparent bg-slate-50 p-5 transition hover:border-teal-200 hover:bg-teal-50/50"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      {content}
    </div>
  );
}
function CircleSetting({
  label,
  value,
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">

      <span className="text-slate-500">
        {label}
      </span>

      <span className="font-bold text-slate-800">
        {value}
      </span>

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
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none transition focus:border-[#0F766E]"
      >
        {options.map(
          ([optionValue, labelText]) => (
            <option
              key={
                optionValue
              }
              value={
                optionValue
              }
            >
              {labelText}
            </option>
          )
        )}
      </select>

    </div>
  );
}