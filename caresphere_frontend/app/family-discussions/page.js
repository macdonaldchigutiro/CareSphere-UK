"use client";

import Link from "next/link";
import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  HeartHandshake,
  Loader2,
  Lock,
  MessageCircle,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Unlock,
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
import { API_URL } from "../../lib/config";


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


function formatDate(value) {
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
}


function getInitials(name) {
  if (!name) {
    return "?";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part.charAt(0).toUpperCase()
    )
    .join("");
}


function FamilyDiscussionsContent() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const serviceUserId =
    searchParams.get(
      "service_user"
    );


  // ======================================================
  // STATE
  // ======================================================

  const [
    signedInUser,
    setSignedInUser,
  ] = useState(null);

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
    discussions,
    setDiscussions,
  ] = useState([]);

  const [
    selectedThread,
    setSelectedThread,
  ] = useState(null);

  const [
    messages,
    setMessages,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    messagesLoading,
    setMessagesLoading,
  ] = useState(false);

  const [
    actionLoading,
    setActionLoading,
  ] = useState("");

  const [
    showCreateForm,
    setShowCreateForm,
  ] = useState(false);

  const [
    newSubject,
    setNewSubject,
  ] = useState("");

  const [
    newMessage,
    setNewMessage,
  ] = useState("");

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
        ? `/family-discussions?service_user=${serviceUserId}`
        : "/family-discussions";

    router.replace(
      createLoginUrl(
        returnTo
      )
    );
  };


  // ======================================================
  // LOAD PAGE
  // ======================================================

  useEffect(() => {
    const loadPage =
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
          // SERVICE USER
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
            serviceUserResponse.status ===
            401
          ) {
            goToLogin();
            return;
          }

          if (
            !serviceUserResponse.ok
          ) {
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

          if (!circlesResponse) {
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

          if (!matchingCircle) {
            setCircle(null);

            setError(
              "This care recipient does not have a Family Circle."
            );

            return;
          }

          setCircle(
            matchingCircle
          );


          // ----------------------------------------------
          // MEMBERS
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

            const memberItems =
              normaliseList(
                membersData
              );

            setMembers(
              memberItems.filter(
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
          // DISCUSSIONS
          // ----------------------------------------------

          const discussionsResponse =
            await authFetch(
              `${API_URL}/api/family/discussions/`,
              {
                method: "GET",
                headers: {
                  "Content-Type":
                    "application/json",
                },
              }
            );

          if (!discussionsResponse) {
            goToLogin();
            return;
          }

          if (
            !discussionsResponse.ok
          ) {
            const data =
              await discussionsResponse.json();

            throw new Error(
              data.detail ||
                "Unable to load family discussions."
            );
          }

          const discussionsData =
            await discussionsResponse.json();

          const discussionItems =
            normaliseList(
              discussionsData
            );

          setDiscussions(
            discussionItems.filter(
              (thread) =>
                String(
                  thread.care_circle
                ) ===
                String(
                  matchingCircle.id
                )
            )
          );

        } catch (err) {
          console.error(
            "Family discussions loading error:",
            err
          );

          setError(
            err.message ||
              "We couldn't load Family Discussions."
          );

        } finally {
          setLoading(false);
        }
      };

    loadPage();

  }, [
    router,
    serviceUserId,
  ]);


  // ======================================================
  // DERIVED VALUES
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


  const currentMembership =
    useMemo(() => {
      if (!signedInUser) {
        return null;
      }

      return (
        members.find(
          (member) =>
            String(
              member.user
            ) ===
            String(
              signedInUser.id
            )
        ) || null
      );

    }, [
      members,
      signedInUser,
    ]);


  const activeDiscussions =
    discussions.filter(
      (thread) =>
        !thread.is_archived
    );


  const archivedDiscussions =
    discussions.filter(
      (thread) =>
        thread.is_archived
    );


  const unreadTotal =
    discussions.reduce(
      (
        total,
        thread
      ) =>
        total +
        Number(
          thread.unread_count ||
          0
        ),
      0
    );


  // ======================================================
  // REFRESH DISCUSSIONS
  // ======================================================

  const refreshDiscussions =
    async () => {
      if (!circle) {
        return;
      }

      try {
        setActionLoading(
          "refresh"
        );

        setError("");

        const response =
          await authFetch(
            `${API_URL}/api/family/discussions/`,
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

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
              "Unable to refresh discussions."
          );
        }

        setDiscussions(
          normaliseList(
            data
          ).filter(
            (thread) =>
              String(
                thread.care_circle
              ) ===
              String(
                circle.id
              )
          )
        );

      } catch (err) {
        setError(
          err.message ||
            "We couldn't refresh discussions."
        );

      } finally {
        setActionLoading("");
      }
    };


  // ======================================================
  // CREATE DISCUSSION
  // ======================================================

  const handleCreateDiscussion =
    async (event) => {
      event.preventDefault();

      if (!circle) {
        setError(
          "No Family Circle is available."
        );

        return;
      }

      if (
        !newSubject.trim()
      ) {
        setError(
          "Please enter a discussion subject."
        );

        return;
      }

      try {
        setActionLoading(
          "create"
        );

        setError("");
        setSuccess("");

        const response =
          await authFetch(
            `${API_URL}/api/family/discussions/`,
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

                    subject:
                      newSubject.trim(),
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
              data.subject?.[0] ||
              "Unable to create this discussion."
          );
        }

        setDiscussions(
          (current) => [
            data,
            ...current,
          ]
        );

        setNewSubject("");
        setShowCreateForm(false);

        setSuccess(
          "Family discussion created successfully."
        );

      } catch (err) {
        setError(
          err.message ||
            "We couldn't create this discussion."
        );

      } finally {
        setActionLoading("");
      }
    };


  // ======================================================
  // OPEN THREAD
  // ======================================================

  const openDiscussion =
    async (thread) => {
      try {
        setSelectedThread(
          thread
        );

        setMessages([]);
        setMessagesLoading(true);

        setError("");
        setSuccess("");

        const response =
          await authFetch(
            `${API_URL}/api/family/discussions/${thread.id}/messages/`,
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

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
              "Unable to load discussion messages."
          );
        }

        setMessages(
          normaliseList(
            data
          )
        );

        setDiscussions(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                thread.id
                  ? {
                      ...item,
                      unread_count:
                        0,
                    }
                  : item
            )
        );

      } catch (err) {
        setError(
          err.message ||
            "We couldn't open this discussion."
        );

      } finally {
        setMessagesLoading(false);
      }
    };


  // ======================================================
  // SEND MESSAGE
  // ======================================================

  const handleSendMessage =
    async (event) => {
      event.preventDefault();

      if (!selectedThread) {
        return;
      }

      if (
        selectedThread.is_locked
      ) {
        setError(
          "This discussion is locked."
        );

        return;
      }

      if (
        !newMessage.trim()
      ) {
        return;
      }

      try {
        setActionLoading(
          "message"
        );

        setError("");
        setSuccess("");

        const response =
          await authFetch(
            `${API_URL}/api/family/discussions/${selectedThread.id}/messages/`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  {
                    content:
                      newMessage.trim(),

                    attachments:
                      [],
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
              "Unable to send your message."
          );
        }

        setMessages(
          (current) => [
            ...current,
            data,
          ]
        );

        setNewMessage("");

        setDiscussions(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                selectedThread.id
                  ? {
                      ...item,

                      message_count:
                        Number(
                          item.message_count ||
                          0
                        ) + 1,

                      last_message_at:
                        data.created_at,

                      latest_message:
                        data,
                    }
                  : item
            )
        );

      } catch (err) {
        setError(
          err.message ||
            "We couldn't send your message."
        );

      } finally {
        setActionLoading("");
      }
    };


  // ======================================================
  // LOCK / UNLOCK
  // ======================================================

  const handleToggleLock =
    async () => {
      if (!selectedThread) {
        return;
      }

      try {
        setActionLoading(
          "lock"
        );

        setError("");
        setSuccess("");

        const response =
          await authFetch(
            `${API_URL}/api/family/discussions/${selectedThread.id}/toggle-lock/`,
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
              "Unable to update this discussion."
          );
        }

        setSelectedThread(
          data.thread
        );

        setDiscussions(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                data.thread.id
                  ? data.thread
                  : item
            )
        );

        setSuccess(
          data.message
        );

      } catch (err) {
        setError(
          err.message ||
            "We couldn't update this discussion."
        );

      } finally {
        setActionLoading("");
      }
    };


  // ======================================================
  // ARCHIVE / RESTORE
  // ======================================================

  const handleToggleArchive =
    async () => {
      if (!selectedThread) {
        return;
      }

      try {
        setActionLoading(
          "archive"
        );

        setError("");
        setSuccess("");

        const response =
          await authFetch(
            `${API_URL}/api/family/discussions/${selectedThread.id}/toggle-archive/`,
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
              "Unable to update this discussion."
          );
        }

        setSelectedThread(
          data.thread
        );

        setDiscussions(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                data.thread.id
                  ? data.thread
                  : item
            )
        );

        setSuccess(
          data.message
        );

      } catch (err) {
        setError(
          err.message ||
            "We couldn't update this discussion."
        );

      } finally {
        setActionLoading("");
      }
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
            Loading Family Discussions...
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

                <MessageCircle className="h-4 w-4" />

                Family discussions

              </div>

              <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
                Keep the family conversation together.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">

                Discuss important care updates for{" "}

                <strong className="text-white">
                  {careRecipientName}
                </strong>

                , share messages with your Family Circle and keep important conversations organised.

              </p>

            </div>


            {circle && (

              <button
                type="button"
                onClick={() =>
                  setShowCreateForm(
                    true
                  )
                }
                className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#6EE7D8] px-6 py-3 font-bold text-[#071A2B] transition hover:bg-white"
              >

                <Plus className="h-5 w-5" />

                New discussion

              </button>
            )}

          </div>

        </section>


        {/* WORKSPACE */}

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
                    currentMembership
                      ?.role_display ||
                    "Family Circle Member"
                  }
                />

                <WorkspaceItem
                  label="Circle members"
                  value={
                    `${members.length} member${
                      members.length ===
                      1
                        ? ""
                        : "s"
                    }`
                  }
                  highlight
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


        {/* SUMMARY */}

        <section className="mt-8 grid gap-5 md:grid-cols-3">

          <SummaryCard
            title="Active discussions"
            value={
              activeDiscussions.length
            }
            text="Current Family Circle conversations"
          />

          <SummaryCard
            title="Unread messages"
            value={
              unreadTotal
            }
            text="Messages waiting for you"
          />

          <SummaryCard
            title="Archived"
            value={
              archivedDiscussions.length
            }
            text="Closed or stored discussions"
          />

        </section>


        {/* MAIN DISCUSSION AREA */}

        <section className="mt-8 grid gap-6 lg:grid-cols-[390px_1fr]">


          {/* THREAD LIST */}

          <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">

            <div className="flex items-center justify-between border-b border-slate-100 p-5">

              <div>

                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0F766E]">
                  Discussions
                </p>

                <h2 className="mt-1 text-xl font-black">
                  Family conversations
                </h2>

              </div>


              <button
                type="button"
                onClick={
                  refreshDiscussions
                }
                disabled={
                  actionLoading ===
                  "refresh"
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
              >

                <RefreshCw
                  className={`h-4 w-4 ${
                    actionLoading ===
                    "refresh"
                      ? "animate-spin"
                      : ""
                  }`}
                />

              </button>

            </div>


            <div className="max-h-[720px] overflow-y-auto p-3">

              {discussions.length ===
                0 && (

                <div className="px-5 py-14 text-center">

                  <MessageSquare className="mx-auto h-9 w-9 text-slate-300" />

                  <h3 className="mt-4 font-black text-slate-800">
                    No discussions yet
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Start the first Family Circle discussion for this care recipient.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setShowCreateForm(
                        true
                      )
                    }
                    className="mt-5 rounded-xl bg-[#0F766E] px-5 py-2.5 text-sm font-bold text-white"
                  >
                    Start discussion
                  </button>

                </div>
              )}


              {discussions.map(
                (thread) => {

                  const selected =
                    selectedThread
                      ?.id ===
                    thread.id;

                  return (

                    <button
                      key={
                        thread.id
                      }
                      type="button"
                      onClick={() =>
                        openDiscussion(
                          thread
                        )
                      }
                      className={`mb-2 w-full rounded-2xl border p-4 text-left transition ${
                        selected
                          ? "border-[#0F766E] bg-teal-50"
                          : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                      }`}
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0">

                          <p className="truncate font-black text-slate-900">
                            {thread.subject}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {thread.last_message_at
                              ? formatDate(
                                  thread.last_message_at
                                )
                              : formatDate(
                                  thread.created_at
                                )}
                          </p>

                        </div>


                        {Number(
                          thread.unread_count ||
                          0
                        ) >
                          0 && (

                          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#0F766E] px-2 text-xs font-black text-white">

                            {
                              thread.unread_count
                            }

                          </span>
                        )}

                      </div>


                      {thread.latest_message && (

                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">

                          {
                            thread
                              .latest_message
                              .content
                          }

                        </p>
                      )}


                      <div className="mt-3 flex flex-wrap items-center gap-2">

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">

                          {
                            thread.message_count ||
                            0
                          }{" "}
                          messages

                        </span>


                        {thread.is_locked && (

                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">

                            <Lock className="h-3 w-3" />

                            Locked

                          </span>
                        )}


                        {thread.is_archived && (

                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">

                            <Archive className="h-3 w-3" />

                            Archived

                          </span>
                        )}

                      </div>

                    </button>
                  );
                }
              )}

            </div>

          </div>


          {/* MESSAGE PANEL */}

          <div className="min-h-[650px] rounded-[28px] border border-slate-200 bg-white shadow-sm">

            {!selectedThread ? (

              <div className="flex min-h-[650px] items-center justify-center p-8 text-center">

                <div>

                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-[#0F766E]">

                    <MessageCircle className="h-8 w-8" />

                  </div>

                  <h2 className="mt-5 text-2xl font-black">
                    Select a discussion
                  </h2>

                  <p className="mx-auto mt-2 max-w-md leading-7 text-slate-500">
                    Choose a conversation from the left, or start a new discussion with your Family Circle.
                  </p>

                </div>

              </div>

            ) : (

              <div className="flex min-h-[650px] flex-col">


                {/* THREAD HEADER */}

                <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">

                  <div>

                    <div className="flex flex-wrap items-center gap-2">

                      <h2 className="text-xl font-black">
                        {selectedThread.subject}
                      </h2>


                      {selectedThread.is_locked && (

                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                          Locked
                        </span>
                      )}


                      {selectedThread.is_archived && (

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          Archived
                        </span>
                      )}

                    </div>


                    <p className="mt-1 text-sm text-slate-500">

                      Started by{" "}

                      <strong>
                        {
                          selectedThread
                            .started_by_name ||
                          "Family member"
                        }
                      </strong>

                      {" "}•{" "}

                      {
                        selectedThread
                          .participant_count ||
                        1
                      }{" "}
                      participant(s)

                    </p>

                  </div>


                  <div className="flex flex-wrap gap-2">

                    <button
                      type="button"
                      onClick={
                        handleToggleLock
                      }
                      disabled={
                        actionLoading !==
                        ""
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >

                      {selectedThread.is_locked ? (

                        <Unlock className="h-4 w-4" />

                      ) : (

                        <Lock className="h-4 w-4" />

                      )}

                      {selectedThread.is_locked
                        ? "Unlock"
                        : "Lock"}

                    </button>


                    <button
                      type="button"
                      onClick={
                        handleToggleArchive
                      }
                      disabled={
                        actionLoading !==
                        ""
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >

                      <Archive className="h-4 w-4" />

                      {selectedThread.is_archived
                        ? "Restore"
                        : "Archive"}

                    </button>

                  </div>

                </div>


                {/* PARTICIPANTS */}

                {Array.isArray(
                  selectedThread
                    .participant_details
                ) &&
                  selectedThread
                    .participant_details
                    .length >
                    0 && (

                  <div className="border-b border-slate-100 px-6 py-4">

                    <div className="flex flex-wrap items-center gap-2">

                      <Users className="mr-1 h-4 w-4 text-[#0F766E]" />

                      {selectedThread.participant_details.map(
                        (
                          participant
                        ) => (

                          <span
                            key={
                              participant.id
                            }
                            className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600"
                          >

                            {
                              participant.name
                            }

                          </span>
                        )
                      )}

                    </div>

                  </div>
                )}


                {/* MESSAGES */}

                <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 p-6">

                  {messagesLoading ? (

                    <div className="py-16 text-center">

                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#0F766E]" />

                      <p className="mt-3 text-sm text-slate-500">
                        Loading messages...
                      </p>

                    </div>

                  ) : messages.length ===
                    0 ? (

                    <div className="py-16 text-center">

                      <MessageSquare className="mx-auto h-8 w-8 text-slate-300" />

                      <p className="mt-4 font-bold text-slate-700">
                        No messages yet.
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Start the conversation below.
                      </p>

                    </div>

                  ) : (

                    messages.map(
                      (message) => {

                        const mine =
                          String(
                            message
                              .sender_user_id
                          ) ===
                          String(
                            signedInUser
                              ?.id
                          );

                        return (

                          <div
                            key={
                              message.id
                            }
                            className={`flex ${
                              mine
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >

                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                                mine
                                  ? "bg-[#0F766E] text-white"
                                  : "border border-slate-200 bg-white text-slate-800"
                              }`}
                            >

                              {!mine && (

                                <p className="mb-1 text-xs font-black text-[#0F766E]">

                                  {
                                    message.sender_name
                                  }

                                </p>
                              )}


                              <p className="whitespace-pre-wrap text-sm leading-6">

                                {
                                  message.content
                                }

                              </p>


                              <div
                                className={`mt-2 flex items-center gap-2 text-[11px] ${
                                  mine
                                    ? "text-teal-100"
                                    : "text-slate-400"
                                }`}
                              >

                                <span>
                                  {formatDate(
                                    message.created_at
                                  )}
                                </span>


                                {message.is_edited && (

                                  <span>
                                    Edited
                                  </span>
                                )}

                              </div>

                            </div>

                          </div>
                        );
                      }
                    )
                  )}

                </div>


                {/* MESSAGE FORM */}

                <div className="border-t border-slate-100 p-5">

                  {selectedThread.is_locked ? (

                    <div className="flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">

                      <Lock className="h-4 w-4" />

                      This discussion is locked. New messages cannot be added.

                    </div>

                  ) : (

                    <form
                      onSubmit={
                        handleSendMessage
                      }
                      className="flex gap-3"
                    >

                      <textarea
                        value={
                          newMessage
                        }
                        onChange={(
                          event
                        ) =>
                          setNewMessage(
                            event.target.value
                          )
                        }
                        rows={2}
                        placeholder="Write a message to your Family Circle..."
                        className="min-h-[56px] flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#0F766E] focus:ring-4 focus:ring-teal-100"
                      />


                      <button
                        type="submit"
                        disabled={
                          actionLoading !==
                            "" ||
                          !newMessage.trim()
                        }
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0F766E] text-white transition hover:bg-[#0b625b] disabled:cursor-not-allowed disabled:opacity-50"
                      >

                        {actionLoading ===
                        "message" ? (

                          <Loader2 className="h-5 w-5 animate-spin" />

                        ) : (

                          <Send className="h-5 w-5" />

                        )}

                      </button>

                    </form>
                  )}

                </div>

              </div>
            )}

          </div>

        </section>


        {/* SAFETY */}

        <section className="mt-8 rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex items-start gap-4">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-[#0F766E]">

              <ShieldCheck className="h-5 w-5" />

            </div>

            <div>

              <h3 className="font-black">
                Family Circle privacy
              </h3>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                Family Discussions are tied to this care recipient&apos;s Family Circle. Only authorised discussion participants can access the conversation and messages.
              </p>

            </div>

          </div>

        </section>

      </div>


      {/* CREATE DISCUSSION MODAL */}

      {showCreateForm &&
        circle && (

        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-4 py-8 backdrop-blur-sm">

          <div className="mx-auto mt-16 w-full max-w-xl rounded-[28px] bg-white shadow-2xl">


            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">

              <div>

                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0F766E]">
                  Family discussions
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  Start a discussion
                </h2>

              </div>


              <button
                type="button"
                onClick={() =>
                  setShowCreateForm(
                    false
                  )
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500"
              >

                <X className="h-5 w-5" />

              </button>

            </div>


            <form
              onSubmit={
                handleCreateDiscussion
              }
              className="p-6"
            >

              <label className="text-sm font-bold text-slate-700">
                Discussion subject
              </label>

              <input
                type="text"
                value={
                  newSubject
                }
                onChange={(
                  event
                ) =>
                  setNewSubject(
                    event.target.value
                  )
                }
                placeholder="e.g. Weekend care arrangements"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3.5 outline-none focus:border-[#0F766E] focus:ring-4 focus:ring-teal-100"
                autoFocus
              />


              <div className="mt-5 rounded-2xl bg-slate-50 p-4">

                <div className="flex items-center gap-3">

                  <Users className="h-5 w-5 text-[#0F766E]" />

                  <div>

                    <p className="text-sm font-bold text-slate-700">
                      Family Circle discussion
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      The discussion will be created inside {careRecipientName}&apos;s Family Circle.
                    </p>

                  </div>

                </div>

              </div>


              <div className="mt-6 flex justify-end gap-3">

                <button
                  type="button"
                  onClick={() =>
                    setShowCreateForm(
                      false
                    )
                  }
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600"
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  disabled={
                    actionLoading ===
                      "create" ||
                    !newSubject.trim()
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0F766E] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                >

                  {actionLoading ===
                  "create" ? (

                    <Loader2 className="h-4 w-4 animate-spin" />

                  ) : (

                    <Plus className="h-4 w-4" />

                  )}

                  Create discussion

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

function WorkspaceItem({
  label,
  value,
  highlight = false,
}) {
  return (

    <div
      className={`rounded-2xl border px-4 py-3 ${
        highlight
          ? "border-teal-200 bg-white"
          : "border-teal-100 bg-white/70"
      }`}
    >

      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 truncate text-sm font-black ${
          highlight
            ? "text-[#0F766E]"
            : "text-slate-800"
        }`}
      >
        {value}
      </p>

    </div>
  );
}


function SummaryCard({
  title,
  value,
  text,
}) {
  return (

    <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">

      <p className="text-sm font-bold text-slate-500">
        {title}
      </p>

      <p className="mt-3 text-4xl font-black tracking-tight">
        {value}
      </p>

      <p className="mt-2 text-sm leading-6 text-slate-400">
        {text}
      </p>

    </div>
  );
}

export default function FamilyDiscussionsPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F7FAFC]" />}>
      <FamilyDiscussionsContent />
    </Suspense>
  );
}
