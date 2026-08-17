"use client";

import Link from "next/link";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  HeartHandshake,
  Loader2,
  LockKeyhole,
  Play,
  Plus,
  Scale,
  ShieldCheck,
  Trophy,
  User,
  Users,
  Vote,
  X,
} from "lucide-react";

import {
  authFetch,
  createLoginUrl,
  getAuthStorage,
  getStoredUser,
} from "../../lib/auth";

const API_URL =
  "http://127.0.0.1:8000";

const EMPTY_FORM = {
  title: "",
  description: "",
  decision_type: "care_plan",
  voting_deadline: "",
  minimum_votes: "1",
  allow_abstain: true,
  is_anonymous: false,
};

function normaliseList(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (
    data &&
    Array.isArray(data.results)
  ) {
    return data.results;
  }

  return [];
}

function formatRole(value) {
  if (!value) {
    return "";
  }

  return String(value)
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function formatDate(value) {
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
}

function statusClasses(status) {
  if (status === "approved") {
    return (
      "bg-emerald-50 " +
      "text-emerald-700"
    );
  }

  if (status === "rejected") {
    return (
      "bg-red-50 " +
      "text-red-700"
    );
  }

  if (status === "voting") {
    return (
      "bg-blue-50 " +
      "text-blue-700"
    );
  }

  if (status === "expired") {
    return (
      "bg-slate-100 " +
      "text-slate-600"
    );
  }

  return (
    "bg-amber-50 " +
    "text-amber-700"
  );
}

export default function FamilyDecisionsPage() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const serviceUserId =
    searchParams.get(
      "service_user"
    );

  const [
    serviceUser,
    setServiceUser,
  ] = useState(null);

  const [
    circle,
    setCircle,
  ] = useState(null);

  const [
    members,
    setMembers,
  ] = useState([]);

  const [
    decisions,
    setDecisions,
  ] = useState([]);

  const [
    signedInUser,
    setSignedInUser,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    actionLoading,
    setActionLoading,
  ] = useState("");

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    form,
    setForm,
  ] = useState(
    EMPTY_FORM
  );

  const [
    options,
    setOptions,
  ] = useState([
    "",
    "",
  ]);

  const [
    selectedVotes,
    setSelectedVotes,
  ] = useState({});

  const [
    voteComments,
    setVoteComments,
  ] = useState({});

  const [
    votedDecisionIds,
    setVotedDecisionIds,
  ] = useState([]);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  // ======================================================
  // LOGIN
  // ======================================================

  const goToLogin = () => {
    const returnTo =
      serviceUserId
        ? `/family-decisions?service_user=${serviceUserId}`
        : "/family-decisions";

    router.replace(
      createLoginUrl(
        returnTo
      )
    );
  };

  // ======================================================
  // LOAD PAGE DATA
  // ======================================================

  useEffect(() => {
    const loadData =
      async () => {
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

        const storedUser =
          getStoredUser();

        setSignedInUser(
          storedUser
        );

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

          if (
            !recipientResponse
          ) {
            goToLogin();

            return;
          }

          if (
            recipientResponse.status ===
            401
          ) {
            goToLogin();

            return;
          }

          if (
            !recipientResponse.ok
          ) {
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
          // FAMILY CIRCLE
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

          if (
            !circlesResponse
          ) {
            goToLogin();

            return;
          }

          if (
            !circlesResponse.ok
          ) {
            throw new Error(
              "Unable to load the Family Circle."
            );
          }

          const circlesData =
            await circlesResponse.json();

          const circleItems =
            normaliseList(
              circlesData
            );

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

          if (
            !matchingCircle
          ) {
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
          // FAMILY MEMBERS
          // ----------------------------------------------

          const membersResponse =
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

          if (
            membersResponse &&
            membersResponse.ok
          ) {
            const membersData =
              await membersResponse.json();

            const allMembers =
              normaliseList(
                membersData
              );

            setMembers(
              allMembers.filter(
                (member) =>
                  String(
                    member.care_circle
                  ) ===
                  String(
                    matchingCircle.id
                  )
              )
            );
          }

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

          if (
            !decisionsResponse
          ) {
            goToLogin();

            return;
          }

          if (
            !decisionsResponse.ok
          ) {
            throw new Error(
              "Unable to load family decisions."
            );
          }

          const decisionsData =
            await decisionsResponse.json();

          const decisionItems =
            normaliseList(
              decisionsData
            );

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
  // CURRENT FAMILY MEMBERSHIP
  // ======================================================

  const currentMembership =
    useMemo(() => {
      if (
        !signedInUser
      ) {
        return null;
      }

      const signedInEmail =
        signedInUser.email
          ?.trim()
          .toLowerCase();

      return (
        members.find(
          (member) => {
            if (
              member.user &&
              String(
                member.user
              ) ===
                String(
                  signedInUser.id
                )
            ) {
              return true;
            }

            const memberEmail =
              member.email
                ?.trim()
                .toLowerCase();

            return Boolean(
              memberEmail &&
                signedInEmail &&
                memberEmail ===
                  signedInEmail
            );
          }
        ) || null
      );
    }, [
      members,
      signedInUser,
    ]);

  // ======================================================
  // WORKSPACE
  // ======================================================

  const signedInName =
    `${
      signedInUser?.first_name ||
      ""
    } ${
      signedInUser?.last_name ||
      ""
    }`.trim() ||
    signedInUser?.email ||
    "CareSphere user";

  const careRecipientName =
    serviceUser?.full_name ||
    `${
      serviceUser?.first_name ||
      ""
    } ${
      serviceUser?.last_name ||
      ""
    }`.trim() ||
    "Care recipient";

  const isManager =
    String(
      serviceUser?.managed_by
    ) ===
    String(
      signedInUser?.id
    );

  const isAdmin =
    Boolean(
      signedInUser?.is_staff ||
        signedInUser?.is_superuser
    );

  const role =
    currentMembership?.role ||
    "";

  const roleDisplay =
    currentMembership
      ?.role_display ||
    formatRole(role) ||
    (
      isManager
        ? "Care Manager"
        : "Family Circle Member"
    );

  const canManageDecisions =
    Boolean(
      circle &&
        (
          isAdmin ||
          isManager ||
          currentMembership
            ?.can_make_decisions ||
          [
            "primary",
            "admin",
            "decision_maker",
          ].includes(role)
        )
    );

  const canVote =
    Boolean(
      circle &&
        !isAdmin &&
        currentMembership &&
        currentMembership
          .is_active !== false &&
        (
          currentMembership
            .can_make_decisions ||
          [
            "primary",
            "admin",
            "decision_maker",
          ].includes(role)
        )
    );

  const decisionAccessLabel =
    canManageDecisions &&
    canVote
      ? "Can create & vote"
      : canManageDecisions
      ? "Can manage decisions"
      : canVote
      ? "Can vote"
      : "Read only";

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
          type ===
          "checkbox"
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
          (
            option,
            optionIndex
          ) =>
            optionIndex ===
            index
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
    if (
      options.length <= 2
    ) {
      return;
    }

    setOptions(
      (current) =>
        current.filter(
          (
            _,
            optionIndex
          ) =>
            optionIndex !==
            index
        )
    );
  };

  // ======================================================
  // CREATE DECISION
  // ======================================================

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (
        !canManageDecisions
      ) {
        setError(
          "Your Family Circle role does not allow you to create decisions."
        );

        return;
      }

      if (!circle) {
        setError(
          "This care recipient does not have a Family Circle."
        );

        return;
      }

      if (
        !form.title.trim()
      ) {
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
        cleanedOptions.length <
        2
      ) {
        setError(
          "Please provide at least two decision options."
        );

        return;
      }

      if (
        new Set(
          cleanedOptions
        ).size !==
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

              body:
                JSON.stringify(
                  {
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
                  }
                ),
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

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
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

        setOptions([
          "",
          "",
        ]);

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
  // UPDATE LOCAL DECISION
  // ======================================================

  const updateDecision =
    (updatedDecision) => {
      setDecisions(
        (current) =>
          current.map(
            (decision) =>
              decision.id ===
              updatedDecision.id
                ? updatedDecision
                : decision
          )
      );
    };

  // ======================================================
  // START VOTING
  // ======================================================

  const handleStartVoting =
    async (decision) => {
      if (
        !canManageDecisions
      ) {
        setError(
          "You do not have permission to start voting."
        );

        return;
      }

      try {
        setActionLoading(
          `${decision.id}-start`
        );

        setError("");
        setSuccess("");

        const response =
          await authFetch(
            `${API_URL}/api/family/decisions/${decision.id}/start-voting/`,
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

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
              "Unable to start voting."
          );
        }

        updateDecision(
          data.decision
        );

        setSuccess(
          data.message ||
            "Voting started successfully."
        );
      } catch (err) {
        setError(
          err.message ||
            "We couldn't start voting."
        );
      } finally {
        setActionLoading("");
      }
    };

  // ======================================================
  // SELECT VOTE
  // ======================================================

  const selectVote = (
    decisionId,
    option
  ) => {
    setSelectedVotes(
      (current) => ({
        ...current,

        [decisionId]:
          option,
      })
    );

    setError("");
    setSuccess("");
  };

  const handleVoteComment = (
    decisionId,
    value
  ) => {
    setVoteComments(
      (current) => ({
        ...current,

        [decisionId]:
          value,
      })
    );
  };

  // ======================================================
  // CAST VOTE
  // ======================================================

  const handleCastVote =
    async (
      decision,
      {
        abstain = false,
      } = {}
    ) => {
      if (!canVote) {
        setError(
          "Your Family Circle role does not allow voting."
        );

        return;
      }

      const chosenOption =
        selectedVotes[
          decision.id
        ];

      if (
        !abstain &&
        !chosenOption
      ) {
        setError(
          "Please select an option before casting your vote."
        );

        return;
      }

      try {
        setActionLoading(
          `${decision.id}-vote`
        );

        setError("");
        setSuccess("");

        const response =
          await authFetch(
            `${API_URL}/api/family/decisions/${decision.id}/vote/`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  {
                    chosen_option:
                      abstain
                        ? ""
                        : chosenOption,

                    is_abstained:
                      abstain,

                    comments:
                      (
                        voteComments[
                          decision.id
                        ] || ""
                      ).trim(),
                  }
                ),
            }
          );

        if (!response) {
          goToLogin();

          return;
        }

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
              "Unable to record your vote."
          );
        }

        updateDecision(
          data.decision
        );

        setVotedDecisionIds(
          (current) =>
            current.includes(
              decision.id
            )
              ? current
              : [
                  ...current,
                  decision.id,
                ]
        );

        setSuccess(
          data.message ||
            "Your vote has been recorded."
        );
      } catch (err) {
        setError(
          err.message ||
            "We couldn't record your vote."
        );
      } finally {
        setActionLoading("");
      }
    };

  // ======================================================
  // CALCULATE RESULT
  // ======================================================

  const handleCalculateResult =
    async (decision) => {
      if (
        !canManageDecisions
      ) {
        setError(
          "You do not have permission to calculate this decision."
        );

        return;
      }

      try {
        setActionLoading(
          `${decision.id}-calculate`
        );

        setError("");
        setSuccess("");

        const response =
          await authFetch(
            `${API_URL}/api/family/decisions/${decision.id}/calculate-result/`,
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

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
              "Unable to calculate the result."
          );
        }

        updateDecision(
          data.decision
        );

        setSuccess(
          data.message ||
            "Voting result calculated."
        );
      } catch (err) {
        setError(
          err.message ||
            "We couldn't calculate the voting result."
        );
      } finally {
        setActionLoading("");
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
              "expired",
            ].includes(
              decision.status
            )
        ).length,
      [decisions]
    );

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
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >

            <ArrowLeft className="h-4 w-4" />

            Family Circle

          </Link>

        </div>

      </header>

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
                  {careRecipientName}
                </strong>

                , give family members clear options and keep the outcome recorded in one place.

              </p>

            </div>

            {circle &&
              canManageDecisions && (
                <button
                  type="button"
                  onClick={() =>
                    setShowForm(true)
                  }
                  className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#6EE7D8] px-6 py-3 font-bold text-[#071A2B] transition hover:bg-white"
                >

                  <Plus className="h-5 w-5" />

                  Create decision

                </button>
              )}

          </div>

        </section>

        {/* WORKSPACE BANNER */}

        {circle && (
          <section className="mt-6 rounded-[26px] border border-teal-200 bg-teal-50/70 p-5 shadow-sm">

            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

              <div className="flex items-center gap-4">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0F766E] text-white">

                  <User className="h-6 w-6" />

                </div>

                <div>

                  <p className="text-xs font-black uppercase tracking-[0.15em] text-[#0F766E]">
                    Current care workspace
                  </p>

                  <p className="mt-1 text-sm text-slate-600">

                    Signed in as{" "}

                    <strong className="text-slate-950">
                      {signedInName}
                    </strong>

                  </p>

                </div>

              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[720px]">

                <WorkspaceItem
                  label="Viewing care for"
                  value={
                    careRecipientName
                  }
                />

                <WorkspaceItem
                  label="Family Circle role"
                  value={
                    roleDisplay
                  }
                />

                <WorkspaceItem
                  label="Decision access"
                  value={
                    decisionAccessLabel
                  }
                  highlight={
                    canManageDecisions ||
                    canVote
                  }
                />

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

        {circle && (
          <>

            {/* SUMMARY */}

            <section className="mt-8 grid gap-5 md:grid-cols-3">

              <SummaryCard
                title="Draft decisions"
                value={
                  draftCount
                }
                text="Not yet open for voting"
              />

              <SummaryCard
                title="Voting"
                value={
                  votingCount
                }
                text="Decisions currently open"
              />

              <SummaryCard
                title="Resolved"
                value={
                  resolvedCount
                }
                text="Approved, rejected or expired"
              />

            </section>

            {/* DECISION HEADER */}

            <section className="mt-8">

              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

                <div>

                  <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">
                    Decision history
                  </p>

                  <h2 className="mt-2 text-2xl font-black">

                    {decisions.length ===
                    1
                      ? "1 family decision"
                      : `${decisions.length} family decisions`}

                  </h2>

                </div>

                {!canManageDecisions && (
                  <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-500">

                    <LockKeyhole className="h-4 w-4" />

                    Decision history access

                  </div>
                )}

              </div>

            </section>
                        {/* EMPTY */}

            {decisions.length ===
              0 && (
              <section className="mt-6 rounded-[30px] border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">

                <Scale className="mx-auto h-10 w-10 text-slate-300" />

                <h3 className="mt-5 text-2xl font-black">
                  No decisions yet
                </h3>

                <p className="mx-auto mt-3 max-w-lg leading-7 text-slate-500">

                  There are currently no recorded Family Circle decisions for this care recipient.

                </p>

                {canManageDecisions && (
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
                )}

              </section>
            )}

            {/* DECISIONS */}

            {decisions.length >
              0 && (
              <section className="mt-6 space-y-5">

                {decisions.map(
                  (decision) => {
                    const startLoading =
                      actionLoading ===
                      `${decision.id}-start`;

                    const voteLoading =
                      actionLoading ===
                      `${decision.id}-vote`;

                    const calculateLoading =
                      actionLoading ===
                      `${decision.id}-calculate`;

                    const hasVotedThisSession =
                      votedDecisionIds.includes(
                        decision.id
                      );

                    const selectedVote =
                      selectedVotes[
                        decision.id
                      ];

                    const isResolved =
                      [
                        "approved",
                        "rejected",
                        "expired",
                      ].includes(
                        decision.status
                      );

                    return (
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
                                  formatRole(
                                    decision.status
                                  )}

                              </span>

                            </div>

                            <p className="mt-2 text-sm capitalize text-slate-500">

                              {decision.decision_type_display ||
                                formatRole(
                                  decision.decision_type
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
                                ) => {
                                  const selected =
                                    selectedVote ===
                                    option;

                                  const canSelect =
                                    decision.status ===
                                      "voting" &&
                                    canVote &&
                                    !hasVotedThisSession;

                                  return (
                                    <button
                                      key={`${decision.id}-${index}`}
                                      type="button"
                                      disabled={
                                        !canSelect
                                      }
                                      onClick={() =>
                                        selectVote(
                                          decision.id,
                                          option
                                        )
                                      }
                                      className={`rounded-2xl border px-4 py-4 text-left font-semibold transition ${
                                        canSelect
                                          ? selected
                                            ? "border-[#0F766E] bg-teal-50 text-[#0F766E]"
                                            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-teal-300 hover:bg-teal-50/40"
                                          : decision.chosen_option ===
                                              option &&
                                            isResolved
                                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                          : "border-slate-100 bg-slate-50 text-slate-700"
                                      }`}
                                    >

                                      <div className="flex items-center gap-3">

                                        {canSelect ? (
                                          selected ? (
                                            <CircleDot className="h-5 w-5 shrink-0 text-[#0F766E]" />
                                          ) : (
                                            <div className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300" />
                                          )
                                        ) : isResolved &&
                                          decision.chosen_option ===
                                            option ? (
                                          <Trophy className="h-5 w-5 shrink-0 text-emerald-600" />
                                        ) : (
                                          <Scale className="h-5 w-5 shrink-0 text-slate-400" />
                                        )}

                                        <span>
                                          {option}
                                        </span>

                                      </div>

                                    </button>
                                  );
                                }
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
                            {decision.minimum_votes ===
                            1
                              ? ""
                              : "s"}

                          </span>

                          <span className="inline-flex items-center gap-2">

                            <CheckCircle2 className="h-4 w-4 text-[#0F766E]" />

                            {decision.total_votes ||
                              0}{" "}
                            votes received

                          </span>

                          {decision.allow_abstain && (
                            <span className="inline-flex items-center gap-2">

                              <ShieldCheck className="h-4 w-4 text-[#0F766E]" />

                              Abstaining allowed

                            </span>
                          )}

                          {decision.is_anonymous && (
                            <span className="inline-flex items-center gap-2">

                              <LockKeyhole className="h-4 w-4 text-[#0F766E]" />

                              Anonymous vote

                            </span>
                          )}

                        </div>

                        {/* DRAFT */}

                        {decision.status ===
                          "draft" && (
                          <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">

                            <p className="text-sm font-semibold text-amber-700">
                              Draft decision — voting has not started yet.
                            </p>

                            {canManageDecisions && (
                              <button
                                type="button"
                                disabled={
                                  actionLoading !==
                                  ""
                                }
                                onClick={() =>
                                  handleStartVoting(
                                    decision
                                  )
                                }
                                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0F766E] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                              >

                                {startLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}

                                Start voting

                              </button>
                            )}

                          </div>
                        )}

                        {/* VOTING */}

                        {decision.status ===
                          "voting" && (
                          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">

                            <div className="flex items-start gap-3">

                              <Vote className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                              <div>

                                <p className="font-black text-blue-900">
                                  Voting is open
                                </p>

                                <p className="mt-1 text-sm leading-6 text-blue-700">
                                  Eligible Family Circle members can vote until the decision is calculated or the deadline passes.
                                </p>

                              </div>

                            </div>

                            {canVote &&
                              !hasVotedThisSession && (
                              <div className="mt-5">

                                <label className="block text-sm font-bold text-slate-700">
                                  Optional comment
                                </label>

                                <textarea
                                  value={
                                    voteComments[
                                      decision.id
                                    ] || ""
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    handleVoteComment(
                                      decision.id,
                                      event.target.value
                                    )
                                  }
                                  rows={3}
                                  placeholder="Add a comment about your vote..."
                                  className="mt-2 w-full resize-none rounded-2xl border border-blue-100 bg-white p-4 outline-none focus:border-[#0F766E] focus:ring-4 focus:ring-teal-100"
                                />

                                <div className="mt-4 flex flex-wrap gap-3">

                                  <button
                                    type="button"
                                    disabled={
                                      actionLoading !==
                                        "" ||
                                      !selectedVote
                                    }
                                    onClick={() =>
                                      handleCastVote(
                                        decision
                                      )
                                    }
                                    className="inline-flex items-center gap-2 rounded-xl bg-[#0F766E] px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                                  >

                                    {voteLoading ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Vote className="h-4 w-4" />
                                    )}

                                    Cast vote

                                  </button>

                                  {decision.allow_abstain && (
                                    <button
                                      type="button"
                                      disabled={
                                        actionLoading !==
                                        ""
                                      }
                                      onClick={() =>
                                        handleCastVote(
                                          decision,
                                          {
                                            abstain:
                                              true,
                                          }
                                        )
                                      }
                                      className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 disabled:opacity-50"
                                    >
                                      Abstain
                                    </button>
                                  )}

                                </div>

                              </div>
                            )}

                            {hasVotedThisSession && (
                              <div className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">

                                <CheckCircle2 className="h-5 w-5" />

                                Your vote has been recorded.

                              </div>
                            )}

                            {!canVote && (
                              <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500">

                                <LockKeyhole className="h-4 w-4" />

                                Your Family Circle role does not allow voting.

                              </div>
                            )}

                            {canManageDecisions && (
                              <div className="mt-5 border-t border-blue-100 pt-5">

                                <button
                                  type="button"
                                  disabled={
                                    actionLoading !==
                                    ""
                                  }
                                  onClick={() =>
                                    handleCalculateResult(
                                      decision
                                    )
                                  }
                                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-5 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
                                >

                                  {calculateLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Scale className="h-4 w-4" />
                                  )}

                                  Calculate result

                                </button>

                                <p className="mt-2 text-xs text-blue-600">
                                  The backend will only close the vote when the minimum vote requirement has been met.
                                </p>

                              </div>
                            )}

                          </div>
                        )}

                        {/* RESOLVED */}

                        {isResolved && (
                          <div
                            className={`mt-5 rounded-2xl border p-5 ${
                              decision.status ===
                              "approved"
                                ? "border-emerald-200 bg-emerald-50"
                                : decision.status ===
                                  "rejected"
                                ? "border-red-200 bg-red-50"
                                : "border-slate-200 bg-slate-50"
                            }`}
                          >

                            <div className="flex items-start gap-3">

                              {decision.status ===
                              "approved" ? (
                                <Trophy className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
                              ) : (
                                <Scale className="mt-0.5 h-6 w-6 shrink-0 text-slate-500" />
                              )}

                              <div className="w-full">

                                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                                  Decision result
                                </p>

                                <h4 className="mt-1 text-xl font-black capitalize">
                                  {decision.status}
                                </h4>

                                {decision.chosen_option && (
                                  <div className="mt-4 rounded-xl bg-white/80 p-4">

                                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                                      Winning option
                                    </p>

                                    <p className="mt-1 font-black text-slate-900">
                                      {decision.chosen_option}
                                    </p>

                                  </div>
                                )}

                                <div className="mt-4 grid gap-3 sm:grid-cols-2">

                                  <ResultItem
                                    label="Approval rate"
                                    value={`${Number(
                                      decision.approval_rate ||
                                        0
                                    ).toFixed(
                                      1
                                    )}%`}
                                  />

                                  <ResultItem
                                    label="Total votes"
                                    value={
                                      decision.total_votes ||
                                      0
                                    }
                                  />

                                </div>

                              </div>

                            </div>

                          </div>
                        )}

                      </article>
                    );
                  }
                )}

              </section>
            )}

          </>
        )}

      </div>

      {/* CREATE DECISION MODAL */}

      {showForm &&
        circle &&
        canManageDecisions && (
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
                  value={
                    form.title
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. Increase home care visits"
                  required
                />

                <TextArea
                  label="Description"
                  name="description"
                  value={
                    form.description
                  }
                  onChange={
                    handleChange
                  }
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
                          key={
                            index
                          }
                          className="flex gap-3"
                        >

                          <input
                            type="text"
                            value={
                              option
                            }
                            onChange={(
                              event
                            ) =>
                              handleOptionChange(
                                index,
                                event.target.value
                              )
                            }
                            placeholder={`Option ${
                              index +
                              1
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
                    disabled={
                      saving
                    }
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
// WORKSPACE ITEM
// ======================================================

function WorkspaceItem({
  label,
  value,
  highlight = false,
}) {
  return (
    <div className="rounded-2xl border border-white bg-white/90 px-4 py-3">

      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 font-black ${
          highlight
            ? "text-[#0F766E]"
            : "text-slate-900"
        }`}
      >
        {value}
      </p>

    </div>
  );
}

// ======================================================
// RESULT ITEM
// ======================================================

function ResultItem({
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-white/80 p-4">

      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-black text-slate-900">
        {value}
      </p>

    </div>
  );
}

// ======================================================
// SUMMARY CARD
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

// ======================================================
// FIELD
// ======================================================

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
        type={
          type
        }
        name={
          name
        }
        value={
          value
        }
        onChange={
          onChange
        }
        placeholder={
          placeholder
        }
        required={
          required
        }
        min={
          min
        }
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none transition focus:border-[#0F766E] focus:ring-4 focus:ring-teal-100"
      />

    </div>
  );
}

// ======================================================
// TEXT AREA
// ======================================================

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
        name={
          name
        }
        value={
          value
        }
        onChange={
          onChange
        }
        placeholder={
          placeholder
        }
        rows={
          4
        }
        className="w-full resize-none rounded-2xl border border-slate-200 p-4 outline-none transition focus:border-[#0F766E] focus:ring-4 focus:ring-teal-100"
      />

    </div>
  );
}

// ======================================================
// SELECT
// ======================================================

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
        name={
          name
        }
        value={
          value
        }
        onChange={
          onChange
        }
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none focus:border-[#0F766E]"
      >

        {options.map(
          ([
            optionValue,
            labelText,
          ]) => (
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

// ======================================================
// CHECKBOX
// ======================================================

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
        name={
          name
        }
        checked={
          checked
        }
        onChange={
          onChange
        }
        className="h-4 w-4 accent-[#0F766E]"
      />

      {label}

    </label>
  );
}