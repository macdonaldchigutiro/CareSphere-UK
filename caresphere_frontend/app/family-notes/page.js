"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileText,
  HeartHandshake,
  Loader2,
  LockKeyhole,
  MessageSquareText,
  Pencil,
  Pin,
  PinOff,
  Plus,
  ShieldCheck,
  StickyNote,
  Trash2,
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

const EMPTY_FORM = {
  title: "",
  content: "",
  note_type: "general",
  privacy_level: "public",
  tags: "",
  is_pinned: false,
  visible_to: [],
};

function normaliseList(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && Array.isArray(data.results)) {
    return data.results;
  }

  return [];
}

function formatRole(role) {
  if (!role) {
    return "";
  }

  return String(role)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
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
  ).format(new Date(value));
}

function noteTypeClasses(type) {
  switch (type) {
    case "medical":
      return "bg-red-50 text-red-700";

    case "financial":
      return "bg-amber-50 text-amber-700";

    case "care_plan":
      return "bg-blue-50 text-blue-700";

    case "appointment":
      return "bg-purple-50 text-purple-700";

    case "emergency":
      return "bg-rose-50 text-rose-700";

    default:
      return "bg-teal-50 text-[#0F766E]";
  }
}

function privacyIcon(privacy) {
  if (privacy === "private") {
    return LockKeyhole;
  }

  if (privacy === "restricted") {
    return ShieldCheck;
  }

  return Users;
}

function FamilyNotesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const serviceUserId =
    searchParams.get("service_user");

  const [serviceUser, setServiceUser] =
    useState(null);

  const [circle, setCircle] =
    useState(null);

  const [members, setMembers] =
    useState([]);

  const [notes, setNotes] =
    useState([]);

  const [signedInUser, setSignedInUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [editingNote, setEditingNote] =
    useState(null);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  // ======================================================
  // LOGIN
  // ======================================================

  const goToLogin = () => {
    const returnTo =
      serviceUserId
        ? `/family-notes?service_user=${serviceUserId}`
        : "/family-notes";

    router.replace(
      createLoginUrl(returnTo)
    );
  };

  // ======================================================
  // LOAD PAGE
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
        // FAMILY CIRCLES
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

        const circles =
          normaliseList(
            circlesData
          );

        const matchingCircle =
          circles.find(
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
            "You do not currently have access to a Family Circle for this care recipient."
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

          const allMembers =
            normaliseList(
              membersData
            );

          const circleMembers =
            allMembers.filter(
              (member) =>
                String(
                  member.care_circle
                ) ===
                String(
                  matchingCircle.id
                )
            );

          setMembers(
            circleMembers
          );
        }

        // ----------------------------------------------
        // NOTES
        // ----------------------------------------------

        const notesResponse =
          await authFetch(
            `${API_URL}/api/family/notes/`,
            {
              method: "GET",
              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );

        if (!notesResponse) {
          goToLogin();
          return;
        }

        if (!notesResponse.ok) {
          throw new Error(
            "Unable to load family notes."
          );
        }

        const notesData =
          await notesResponse.json();

        const allNotes =
          normaliseList(
            notesData
          );

        setNotes(
          allNotes.filter(
            (note) =>
              String(
                note.care_circle
              ) ===
              String(
                matchingCircle.id
              )
          )
        );
      } catch (err) {
        console.error(
          "Family notes loading error:",
          err
        );

        setError(
          err.message ||
            "We couldn't load shared notes."
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
  // CURRENT USER MEMBERSHIP
  // ======================================================

  const currentMembership =
    useMemo(() => {
      if (!signedInUser) {
        return null;
      }

      const userId =
        signedInUser.id;

      const userEmail =
        signedInUser.email
          ?.trim()
          .toLowerCase();

      return (
        members.find(
          (member) => {
            if (
              member.user &&
              String(member.user) ===
                String(userId)
            ) {
              return true;
            }

            const memberEmail =
              member.email
                ?.trim()
                .toLowerCase();

            if (
              memberEmail &&
              userEmail &&
              memberEmail ===
                userEmail
            ) {
              return true;
            }

            return false;
          }
        ) || null
      );
    }, [
      members,
      signedInUser,
    ]);

  // ======================================================
  // CARE WORKSPACE DETAILS
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
    currentMembership?.role_display ||
    formatRole(role) ||
    (
      isManager
        ? "Care Manager"
        : "Family Circle Member"
    );

  const isViewer =
    role === "viewer";

  const membershipActive =
    currentMembership
      ? currentMembership.is_active !==
        false
      : false;

  const canCreateNotes =
    Boolean(
      circle &&
      (
        isManager ||
        isAdmin ||
        (
          currentMembership &&
          membershipActive &&
          !isViewer
        )
      )
    );

  const accessLabel =
    canCreateNotes
      ? "Can contribute"
      : "Read only";

  // ======================================================
  // COUNTS
  // ======================================================

  const pinnedCount =
    useMemo(
      () =>
        notes.filter(
          (note) =>
            note.is_pinned
        ).length,
      [notes]
    );

  const medicalCount =
    useMemo(
      () =>
        notes.filter(
          (note) =>
            note.note_type ===
            "medical"
        ).length,
      [notes]
    );

  const generalCount =
    useMemo(
      () =>
        notes.filter(
          (note) =>
            note.note_type ===
            "general"
        ).length,
      [notes]
    );

  const sortedNotes =
    useMemo(() => {
      return [...notes].sort(
        (a, b) => {
          if (
            a.is_pinned &&
            !b.is_pinned
          ) {
            return -1;
          }

          if (
            !a.is_pinned &&
            b.is_pinned
          ) {
            return 1;
          }

          return (
            new Date(
              b.created_at
            ) -
            new Date(
              a.created_at
            )
          );
        }
      );
    }, [notes]);

  // ======================================================
  // OWN NOTE
  // ======================================================

  const isMyNote = (
    note
  ) => {
    if (!signedInUser?.id) {
      return false;
    }

    return (
      String(
        note.author_user_id
      ) ===
      String(
        signedInUser.id
      )
    );
  };

  // ======================================================
  // FORM
  // ======================================================

  const resetForm = () => {
    setForm(
      EMPTY_FORM
    );

    setEditingNote(
      null
    );

    setShowForm(
      false
    );

    setError("");
  };

  const openCreateForm = () => {
    if (!canCreateNotes) {
      setError(
        "Your Family Circle role has read-only access to shared notes."
      );

      return;
    }

    setEditingNote(
      null
    );

    setForm(
      EMPTY_FORM
    );

    setError("");
    setSuccess("");

    setShowForm(
      true
    );
  };

  const openEditForm = (
    note
  ) => {
    if (!canCreateNotes) {
      return;
    }

    setEditingNote(
      note
    );

    setForm({
      title:
        note.title || "",

      content:
        note.content || "",

      note_type:
        note.note_type ||
        "general",

      privacy_level:
        note.privacy_level ||
        "public",

      tags:
        Array.isArray(
          note.tags
        )
          ? note.tags.join(", ")
          : "",

      is_pinned:
        Boolean(
          note.is_pinned
        ),

      visible_to:
        Array.isArray(
          note.visible_to
        )
          ? note.visible_to
          : [],
    });

    setError("");
    setSuccess("");

    setShowForm(
      true
    );
  };

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

  const toggleVisibleMember = (
    memberId
  ) => {
    setForm(
      (current) => {
        const selected =
          current.visible_to.includes(
            memberId
          );

        return {
          ...current,

          visible_to:
            selected
              ? current.visible_to.filter(
                  (id) =>
                    id !== memberId
                )
              : [
                  ...current.visible_to,
                  memberId,
                ],
        };
      }
    );
  };

  const buildTags = (
    value
  ) => {
    return value
      .split(",")
      .map(
        (tag) =>
          tag.trim()
      )
      .filter(Boolean);
  };

  // ======================================================
  // CREATE / UPDATE NOTE
  // ======================================================

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (!canCreateNotes) {
      setError(
        "Your Family Circle role has read-only access."
      );

      return;
    }

    if (!circle) {
      setError(
        "This care recipient does not have a Family Circle."
      );

      return;
    }

    if (!form.title.trim()) {
      setError(
        "Please enter a note title."
      );

      return;
    }

    if (
      !form.content.trim()
    ) {
      setError(
        "Please enter the note content."
      );

      return;
    }

    if (
      form.privacy_level ===
        "restricted" &&
      form.visible_to.length === 0
    ) {
      setError(
        "Select at least one Family Circle member."
      );

      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const isEditing =
        Boolean(
          editingNote
        );

      const endpoint =
        isEditing
          ? `${API_URL}/api/family/notes/${editingNote.id}/`
          : `${API_URL}/api/family/notes/`;

      const method =
        isEditing
          ? "PATCH"
          : "POST";

      const response =
        await authFetch(
          endpoint,
          {
            method,

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                ...(isEditing
                  ? {}
                  : {
                      care_circle:
                        circle.id,
                    }),

                title:
                  form.title.trim(),

                content:
                  form.content.trim(),

                note_type:
                  form.note_type,

                privacy_level:
                  form.privacy_level,

                tags:
                  buildTags(
                    form.tags
                  ),

                attachments: [],

                visible_to:
                  form.privacy_level ===
                  "restricted"
                    ? form.visible_to
                    : [],

                is_pinned:
                  form.is_pinned,
              }),
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
        const detail =
          data.detail ||
          data.error ||
          (
            Array.isArray(
              data.visible_to
            )
              ? data.visible_to[0]
              : data.visible_to
          ) ||
          (
            isEditing
              ? "Unable to update this family note."
              : "Unable to create this family note."
          );

        throw new Error(
          detail
        );
      }

      if (isEditing) {
        setNotes(
          (current) =>
            current.map(
              (note) =>
                note.id ===
                data.id
                  ? data
                  : note
            )
        );

        setSuccess(
          "Shared note updated successfully."
        );
      } else {
        setNotes(
          (current) => [
            data,
            ...current,
          ]
        );

        setSuccess(
          "Shared note created successfully."
        );
      }

      setForm(
        EMPTY_FORM
      );

      setEditingNote(
        null
      );

      setShowForm(
        false
      );
    } catch (err) {
      console.error(
        "Save family note error:",
        err
      );

      setError(
        err.message ||
          "We couldn't save this shared note."
      );
    } finally {
      setSaving(false);
    }
  };

  // ======================================================
  // DELETE
  // ======================================================

  const handleDelete = async (
    note
  ) => {
    if (
      !canCreateNotes ||
      !isMyNote(note)
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete "${note.title}"?\n\nThis action cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(
        `${note.id}-delete`
      );

      setError("");
      setSuccess("");

      const response =
        await authFetch(
          `${API_URL}/api/family/notes/${note.id}/`,
          {
            method: "DELETE",
          }
        );

      if (!response) {
        goToLogin();
        return;
      }

      if (!response.ok) {
        let detail =
          "Unable to delete this note.";

        try {
          const data =
            await response.json();

          detail =
            data.detail ||
            detail;
        } catch {
          // DELETE may return no JSON.
        }

        throw new Error(
          detail
        );
      }

      setNotes(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              note.id
          )
      );

      setSuccess(
        "Shared note deleted successfully."
      );
    } catch (err) {
      setError(
        err.message ||
          "We couldn't delete this shared note."
      );
    } finally {
      setActionLoading("");
    }
  };

  // ======================================================
  // PIN
  // ======================================================

  const handleTogglePin =
    async (note) => {
      if (
        !canCreateNotes ||
        !isMyNote(note)
      ) {
        return;
      }

      try {
        setActionLoading(
          `${note.id}-pin`
        );

        setError("");
        setSuccess("");

        const response =
          await authFetch(
            `${API_URL}/api/family/notes/${note.id}/toggle-pin/`,
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
              "Unable to change pinned status."
          );
        }

        const updatedNote =
          data.note || data;

        setNotes(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                updatedNote.id
                  ? updatedNote
                  : item
            )
        );

        setSuccess(
          data.message ||
            "Pinned status updated."
        );
      } catch (err) {
        setError(
          err.message ||
            "We couldn't update the pinned status."
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
            Loading shared notes...
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

      {/* CONTENT */}

      <div className="mx-auto max-w-[1400px] px-5 py-10 lg:px-8">

        {/* HERO */}

        <section className="overflow-hidden rounded-[32px] bg-[#071A2B] px-7 py-10 text-white shadow-xl md:px-10 md:py-12">

          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">

            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-[#6EE7D8]">

                <StickyNote className="h-4 w-4" />

                Shared family notes

              </div>

              <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
                Keep everyone informed.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">

                Record important care updates about{" "}

                <strong className="text-white">
                  {careRecipientName}
                </strong>

                , control who can see them and keep the
                Family Circle working from the same information.

              </p>

            </div>

            {circle &&
              canCreateNotes && (
                <button
                  type="button"
                  onClick={
                    openCreateForm
                  }
                  className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#6EE7D8] px-6 py-3 font-bold text-[#071A2B] transition hover:bg-white"
                >

                  <Plus className="h-5 w-5" />

                  Add shared note

                </button>
              )}

          </div>

        </section>

        {/* CURRENT CARE WORKSPACE */}

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

              <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[680px]">

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
                  label="Shared notes access"
                  value={
                    accessLabel
                  }
                  highlight={
                    canCreateNotes
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

            <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

              <SummaryCard
                icon={StickyNote}
                title="Total notes"
                value={
                  notes.length
                }
                text="Notes you are allowed to see"
              />

              <SummaryCard
                icon={Pin}
                title="Pinned"
                value={
                  pinnedCount
                }
                text="Important notes"
              />

              <SummaryCard
                icon={FileText}
                title="General"
                value={
                  generalCount
                }
                text="General family updates"
              />

              <SummaryCard
                icon={ShieldCheck}
                title="Medical"
                value={
                  medicalCount
                }
                text="Health-related notes"
              />

            </section>

            {/* NOTES HEADER */}

            <section className="mt-8">

              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

                <div>

                  <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">
                    Family record
                  </p>

                  <h2 className="mt-2 text-2xl font-black">

                    {notes.length === 1
                      ? "1 shared note"
                      : `${notes.length} shared notes`}

                  </h2>

                </div>

                {canCreateNotes ? (
                  <button
                    type="button"
                    onClick={
                      openCreateForm
                    }
                    className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >

                    <Plus className="h-4 w-4" />

                    New note

                  </button>
                ) : (
                  <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-500">

                    <LockKeyhole className="h-4 w-4" />

                    Read-only access

                  </div>
                )}

              </div>

            </section>

            {/* EMPTY */}

            {notes.length === 0 && (
              <section className="mt-6 rounded-[30px] border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">

                <MessageSquareText className="mx-auto h-10 w-10 text-slate-300" />

                <h3 className="mt-5 text-2xl font-black">
                  No shared notes available
                </h3>

                <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-500">

                  There are currently no notes available to your Family Circle account.

                </p>

                {canCreateNotes && (
                  <button
                    type="button"
                    onClick={
                      openCreateForm
                    }
                    className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#0F766E] px-6 py-3 font-bold text-white"
                  >

                    <Plus className="h-5 w-5" />

                    Create first note

                  </button>
                )}

              </section>
            )}

            {/* NOTES */}

            {sortedNotes.length >
              0 && (
              <section className="mt-6 grid gap-5 lg:grid-cols-2">

                {sortedNotes.map(
                  (note) => {
                    const PrivacyIcon =
                      privacyIcon(
                        note.privacy_level
                      );

                    const ownNote =
                      isMyNote(
                        note
                      );

                    const pinLoading =
                      actionLoading ===
                      `${note.id}-pin`;

                    const deleteLoading =
                      actionLoading ===
                      `${note.id}-delete`;

                    return (
                      <article
                        key={
                          note.id
                        }
                        className={`relative rounded-[28px] border bg-white p-6 shadow-sm md:p-7 ${
                          note.is_pinned
                            ? "border-amber-200"
                            : "border-slate-200"
                        }`}
                      >

                        {note.is_pinned && (
                          <div className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">

                            <Pin className="h-4 w-4" />

                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2 pr-12">

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${noteTypeClasses(
                              note.note_type
                            )}`}
                          >

                            {note.note_type_display ||
                              formatRole(
                                note.note_type
                              )}

                          </span>

                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">

                            <PrivacyIcon className="h-3.5 w-3.5" />

                            {note.privacy_level_display ||
                              (
                                note.privacy_level ===
                                "private"
                                  ? "Creator Only"
                                  : note.privacy_level ===
                                    "restricted"
                                  ? "Selected Members Only"
                                  : "All Circle Members"
                              )}

                          </span>

                        </div>

                        <h3 className="mt-5 text-xl font-black text-slate-900">
                          {note.title}
                        </h3>

                        <p className="mt-3 whitespace-pre-line leading-7 text-slate-600">
                          {note.content}
                        </p>

                        {Array.isArray(
                          note.tags
                        ) &&
                          note.tags.length >
                            0 && (
                            <div className="mt-5 flex flex-wrap gap-2">

                              {note.tags.map(
                                (
                                  tag,
                                  index
                                ) => (
                                  <span
                                    key={`${note.id}-${tag}-${index}`}
                                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500"
                                  >
                                    #{tag}
                                  </span>
                                )
                              )}

                            </div>
                          )}

                        <div className="mt-6 flex flex-col justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">

                          <div className="flex items-center gap-3">

                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-[#0F766E]">
                              <User className="h-4 w-4" />
                            </div>

                            <div>

                              <p className="text-sm font-bold text-slate-800">

                                {note.author_name ||
                                  "Family member"}

                              </p>

                              <p className="text-xs text-slate-400">
                                Author
                              </p>

                            </div>

                          </div>

                          <div className="inline-flex items-center gap-2 text-xs text-slate-400">

                            <CalendarDays className="h-4 w-4" />

                            {formatDate(
                              note.created_at
                            )}

                          </div>

                        </div>

                        {ownNote &&
                          canCreateNotes && (
                          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5">

                            <button
                              type="button"
                              onClick={() =>
                                openEditForm(
                                  note
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                            >

                              <Pencil className="h-4 w-4" />

                              Edit

                            </button>

                            <button
                              type="button"
                              disabled={
                                actionLoading !==
                                ""
                              }
                              onClick={() =>
                                handleTogglePin(
                                  note
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-xl border border-amber-200 px-4 py-2.5 text-sm font-bold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
                            >

                              {pinLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : note.is_pinned ? (
                                <PinOff className="h-4 w-4" />
                              ) : (
                                <Pin className="h-4 w-4" />
                              )}

                              {note.is_pinned
                                ? "Unpin"
                                : "Pin"}

                            </button>

                            <button
                              type="button"
                              disabled={
                                actionLoading !==
                                ""
                              }
                              onClick={() =>
                                handleDelete(
                                  note
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >

                              {deleteLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}

                              Delete

                            </button>

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

      {/* CREATE / EDIT MODAL */}

      {showForm &&
        circle &&
        canCreateNotes && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-4 py-8 backdrop-blur-sm">

            <div className="mx-auto w-full max-w-3xl rounded-[30px] bg-white shadow-2xl">

              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 md:px-8">

                <div>

                  <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">
                    Shared notes
                  </p>

                  <h2 className="mt-1 text-2xl font-black">

                    {editingNote
                      ? "Edit family note"
                      : "Add a family note"}

                  </h2>

                </div>

                <button
                  type="button"
                  onClick={
                    resetForm
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
                  label="Note title"
                  name="title"
                  value={
                    form.title
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. GP appointment update"
                  required
                />

                <TextArea
                  label="Note"
                  name="content"
                  value={
                    form.content
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Write the important care update here..."
                  rows={6}
                />

                <div className="grid gap-5 md:grid-cols-2">

                  <SelectField
                    label="Note type"
                    name="note_type"
                    value={
                      form.note_type
                    }
                    onChange={
                      handleChange
                    }
                    options={[
                      [
                        "general",
                        "General Note",
                      ],
                      [
                        "medical",
                        "Medical Note",
                      ],
                      [
                        "financial",
                        "Financial Note",
                      ],
                      [
                        "care_plan",
                        "Care Plan Note",
                      ],
                      [
                        "appointment",
                        "Appointment Note",
                      ],
                      [
                        "emergency",
                        "Emergency Note",
                      ],
                    ]}
                  />

                  <SelectField
                    label="Privacy"
                    name="privacy_level"
                    value={
                      form.privacy_level
                    }
                    onChange={
                      handleChange
                    }
                    options={[
                      [
                        "public",
                        "All Circle Members",
                      ],
                      [
                        "restricted",
                        "Selected Members Only",
                      ],
                      [
                        "private",
                        "Creator Only",
                      ],
                    ]}
                  />

                </div>

                {form.privacy_level ===
                  "restricted" && (
                  <div>

                    <label className="mb-3 block text-sm font-bold text-slate-700">
                      Who can see this note?
                    </label>

                    {members.length ===
                    0 ? (
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">

                        No Family Circle members available.

                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">

                        {members.map(
                          (member) => {
                            const selected =
                              form.visible_to.includes(
                                member.id
                              );

                            return (
                              <button
                                key={
                                  member.id
                                }
                                type="button"
                                onClick={() =>
                                  toggleVisibleMember(
                                    member.id
                                  )
                                }
                                className={`rounded-2xl border p-4 text-left transition ${
                                  selected
                                    ? "border-[#0F766E] bg-teal-50"
                                    : "border-slate-200 bg-white"
                                }`}
                              >

                                <div className="flex items-center justify-between gap-3">

                                  <div>

                                    <p className="font-bold text-slate-800">

                                      {member.user_name ||
                                        member.email ||
                                        "Family member"}

                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">

                                      {member.role_display ||
                                        formatRole(
                                          member.role
                                        )}

                                    </p>

                                  </div>

                                  {selected && (
                                    <CheckCircle2 className="h-5 w-5 text-[#0F766E]" />
                                  )}

                                </div>

                              </button>
                            );
                          }
                        )}

                      </div>
                    )}

                  </div>
                )}

                <Field
                  label="Tags"
                  name="tags"
                  value={
                    form.tags
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. GP, medication, mobility"
                />

                <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">

                  <input
                    type="checkbox"
                    name="is_pinned"
                    checked={
                      form.is_pinned
                    }
                    onChange={
                      handleChange
                    }
                    className="h-4 w-4 accent-[#0F766E]"
                  />

                  <Pin className="h-4 w-4 text-[#0F766E]" />

                  Pin this as an important note

                </label>

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">

                  <button
                    type="button"
                    onClick={
                      resetForm
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

                        {editingNote
                          ? "Updating note..."
                          : "Saving note..."}
                      </>
                    ) : (
                      <>
                        {editingNote ? (
                          <Pencil className="h-5 w-5" />
                        ) : (
                          <StickyNote className="h-5 w-5" />
                        )}

                        {editingNote
                          ? "Save changes"
                          : "Save shared note"}
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
// SUMMARY CARD
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

      <p className="mt-2 text-3xl font-black text-slate-950">
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
        placeholder={
          placeholder
        }
        required={required}
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
  rows = 4,
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
        placeholder={
          placeholder
        }
        rows={rows}
        className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 outline-none transition focus:border-[#0F766E] focus:ring-4 focus:ring-teal-100"
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
        name={name}
        value={value}
        onChange={
          onChange
        }
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none transition focus:border-[#0F766E]"
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

export default function FamilyNotesPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F7FAFC]" />}>
      <FamilyNotesContent />
    </Suspense>
  );
}
