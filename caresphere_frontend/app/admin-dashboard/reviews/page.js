"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  MessageSquareText,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
} from "lucide-react";

import { authFetch } from "../../../lib/auth";


export default function AdminReviewsPage() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [workingId, setWorkingId] = useState(null);

  async function loadReviews(showLoader = true) {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError("");

      const response = await authFetch(
        "http://127.0.0.1:8000/api/users/admin/governance/"
      );

      if (!response.ok) {
        throw new Error(
          `Unable to load reviews (${response.status}).`
        );
      }

      const payload = await response.json();
      setData(payload.reviews || null);
    } catch (err) {
      setError(
        err.message ||
          "Unable to load review operations."
      );
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadReviews();
  }, []);

  async function handleReviewAction(review, action) {
    const labels = {
      approve: "approve",
      reject: "reject",
      flag: "flag",
      pending: "return to pending",
    };

    const confirmed = window.confirm(
      `Are you sure you want to ${
        labels[action] || action
      } "${review.title || "this review"}"?`
    );

    if (!confirmed) {
      return;
    }

    let notes = "";

    if (action === "reject" || action === "flag") {
      const entered = window.prompt(
        "Add a moderation note:",
        review.moderation_notes || ""
      );

      if (entered === null) {
        return;
      }

      notes = entered.trim();
    }

    try {
      setWorkingId(review.id);
      setActionError("");
      setActionMessage("");

      const response = await authFetch(
        `http://127.0.0.1:8000/api/users/admin/actions/reviews/${review.id}/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            notes,
          }),
        }
      );

      let payload = {};

      try {
        payload = await response.json();
      } catch {
        payload = {};
      }

      if (!response.ok) {
        throw new Error(
          payload.detail ||
            `Unable to moderate review (${response.status}).`
        );
      }

      setActionMessage(
        `Review "${review.title || "Review"}" updated successfully.`
      );

      await loadReviews(false);
    } catch (err) {
      setActionError(
        err.message || "Unable to update review."
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function handleReviewFlagToggle(
    review,
    field,
    value
  ) {
    try {
      setWorkingId(review.id);
      setActionError("");
      setActionMessage("");

      const response = await authFetch(
        `http://127.0.0.1:8000/api/users/admin/actions/reviews/${review.id}/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action:
              review.moderation_status === "approved"
                ? "approve"
                : review.moderation_status === "rejected"
                ? "reject"
                : review.moderation_status === "flagged"
                ? "flag"
                : "pending",
            [field]: value,
          }),
        }
      );

      let payload = {};

      try {
        payload = await response.json();
      } catch {
        payload = {};
      }

      if (!response.ok) {
        throw new Error(
          payload.detail ||
            `Unable to update review (${response.status}).`
        );
      }

      setActionMessage("Review settings updated.");
      await loadReviews(false);
    } catch (err) {
      setActionError(
        err.message || "Unable to update review settings."
      );
    } finally {
      setWorkingId(null);
    }
  }

  const summary = data?.summary || {};
  const reviews = data?.items || [];

  const filteredReviews = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reviews.filter((review) => {
      const searchable = [
        review.provider_name,
        review.author_name,
        review.author_email,
        review.title,
        review.content,
        review.service_type,
        review.moderation_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchable.includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        review.moderation_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [reviews, search, statusFilter]);

  return (
    <>
      <PageHeader />

      <section className="
        mt-6 grid gap-4
        sm:grid-cols-2 xl:grid-cols-4
      ">
        <SummaryCard
          label="Total reviews"
          value={loading ? "…" : summary.total ?? 0}
        />

        <SummaryCard
          label="Average rating"
          value={
            loading
              ? "…"
              : `${Number(
                  summary.average_rating || 0
                ).toFixed(1)} / 5`
          }
        />

        <SummaryCard
          label="Pending moderation"
          value={loading ? "…" : summary.pending ?? 0}
          warning={Number(summary.pending || 0) > 0}
        />

        <SummaryCard
          label="Flagged"
          value={loading ? "…" : summary.flagged ?? 0}
          danger={Number(summary.flagged || 0) > 0}
        />
      </section>

      {(actionMessage || actionError) && (
        <FeedbackBanner
          error={actionError}
          message={actionMessage}
        />
      )}

      <section className="
        mt-6 overflow-hidden
        rounded-3xl border
        border-slate-200
        bg-white shadow-sm
      ">
        <div className="
          border-b border-slate-200
          px-6 py-6
        ">
          <div className="
            flex flex-col gap-5
            xl:flex-row xl:items-end
            xl:justify-between
          ">
            <div className="flex items-center gap-3">
              <div className="
                flex h-11 w-11
                items-center justify-center
                rounded-2xl bg-teal-50
                text-[#176B62]
              ">
                <MessageSquareText className="h-5 w-5" />
              </div>

              <div>
                <h2 className="
                  text-xl font-black text-slate-950
                ">
                  Review moderation
                </h2>

                <p className="
                  mt-1 text-sm text-slate-500
                ">
                  Approve, reject and flag CareSphere feedback.
                </p>
              </div>
            </div>

            <div className="
              flex flex-col gap-3 sm:flex-row
            ">
              <div className="relative">
                <Search className="
                  absolute left-3 top-1/2
                  h-4 w-4 -translate-y-1/2
                  text-slate-400
                " />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search reviews..."
                  className="
                    h-11 w-full rounded-xl
                    border border-slate-200
                    bg-slate-50 pl-10 pr-4
                    text-sm outline-none
                    focus:border-teal-500
                    focus:bg-white sm:w-64
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
                  text-slate-700 outline-none
                  focus:border-teal-500
                "
              >
                <option value="all">All reviews</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="flagged">Flagged</option>
                <option value="rejected">Rejected</option>
              </select>

              <button
                type="button"
                onClick={() => loadReviews()}
                disabled={loading}
                className="
                  inline-flex h-11 items-center
                  justify-center gap-2 rounded-xl
                  border border-slate-200
                  bg-white px-4 text-sm
                  font-black text-slate-700
                  hover:bg-slate-50
                  disabled:opacity-50
                "
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    loading ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <ErrorState message={error} />
        ) : loading ? (
          <LoadingState />
        ) : filteredReviews.length === 0 ? (
          <EmptyState
            filtered={
              search || statusFilter !== "all"
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="
              min-w-full divide-y divide-slate-200
            ">
              <thead className="bg-slate-50">
                <tr>
                  <Heading>Review</Heading>
                  <Heading>Provider</Heading>
                  <Heading>Rating</Heading>
                  <Heading>Recommendation</Heading>
                  <Heading>Verification</Heading>
                  <Heading>Moderation</Heading>
                  <Heading>Admin action</Heading>
                </tr>
              </thead>

              <tbody className="
                divide-y divide-slate-100
              ">
                {filteredReviews.map((review) => (
                  <ReviewRow
                    key={review.id}
                    review={review}
                    working={workingId === review.id}
                    onAction={handleReviewAction}
                    onToggle={handleReviewFlagToggle}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}


function ReviewRow({
  review,
  working,
  onAction,
  onToggle,
}) {
  const [selectedAction, setSelectedAction] =
    useState("");

  return (
    <tr className="hover:bg-slate-50/80">
      <td className="min-w-[290px] px-6 py-5">
        <div className="
          font-black text-slate-900
        ">
          {review.title || "Untitled review"}
        </div>

        <p className="
          mt-1 max-w-[340px]
          truncate text-xs text-slate-500
        ">
          {review.content || "No written feedback"}
        </p>

        <div className="
          mt-2 text-xs font-semibold
          text-slate-500
        ">
          By {review.author_name || "Anonymous"}
        </div>
      </td>

      <td className="min-w-[180px] px-6 py-5">
        <span className="
          text-sm font-bold text-slate-800
        ">
          {review.provider_name || "Unknown provider"}
        </span>
      </td>

      <td className="px-6 py-5">
        <div className="
          flex items-center gap-1
          font-black text-slate-900
        ">
          <Star className="
            h-4 w-4 fill-current
            text-amber-500
          " />
          {review.overall_rating}/5
        </div>
      </td>

      <td className="px-6 py-5">
        <Badge
          tone={
            review.would_recommend
              ? "green"
              : "red"
          }
        >
          {review.would_recommend
            ? "Recommended"
            : "Not recommended"}
        </Badge>
      </td>

      <td className="min-w-[160px] px-6 py-5">
        <button
          type="button"
          disabled={working}
          onClick={() =>
            onToggle(
              review,
              "is_verified",
              !review.is_verified
            )
          }
          className="
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          <Badge
            tone={
              review.is_verified
                ? "green"
                : "slate"
            }
          >
            {review.is_verified
              ? "Verified"
              : "Unverified"}
          </Badge>
        </button>

        <button
          type="button"
          disabled={working}
          onClick={() =>
            onToggle(
              review,
              "is_featured",
              !review.is_featured
            )
          }
          className="
            mt-2 block text-xs
            font-bold text-teal-700
            disabled:opacity-50
          "
        >
          {review.is_featured
            ? "Remove featured"
            : "Make featured"}
        </button>
      </td>

      <td className="px-6 py-5">
        <ModerationBadge
          status={review.moderation_status}
          label={review.moderation_status_display}
        />
      </td>

      <td className="min-w-[250px] px-6 py-5">
        <div className="flex items-center gap-2">
          <select
            value={selectedAction}
            disabled={working}
            onChange={(event) =>
              setSelectedAction(event.target.value)
            }
            className="
              h-10 rounded-xl
              border border-slate-200
              bg-white px-3
              text-xs font-bold
              text-slate-700 outline-none
              focus:border-teal-500
            "
          >
            <option value="">Choose action</option>

            {review.moderation_status !== "approved" && (
              <option value="approve">Approve</option>
            )}

            {review.moderation_status !== "pending" && (
              <option value="pending">
                Return to pending
              </option>
            )}

            {review.moderation_status !== "flagged" && (
              <option value="flag">Flag review</option>
            )}

            {review.moderation_status !== "rejected" && (
              <option value="reject">Reject</option>
            )}
          </select>

          <button
            type="button"
            disabled={!selectedAction || working}
            onClick={() =>
              onAction(review, selectedAction)
            }
            className="
              h-10 rounded-xl
              bg-[#176B62] px-4
              text-xs font-black text-white
              hover:bg-[#0D574F]
              disabled:bg-slate-200
              disabled:text-slate-400
            "
          >
            {working ? "Saving..." : "Apply"}
          </button>
        </div>
      </td>
    </tr>
  );
}


function PageHeader() {
  return (
    <section className="
      rounded-3xl bg-[#0D3F3A]
      px-7 py-8 text-white shadow-xl
    ">
      <div className="
        flex items-center justify-between gap-6
      ">
        <div>
          <div className="
            text-xs font-black
            tracking-[0.18em]
            text-teal-200
          ">
            QUALITY & FEEDBACK
          </div>

          <h1 className="mt-3 text-3xl font-black">
            Reviews
          </h1>

          <p className="
            mt-3 max-w-2xl
            text-sm leading-6
            text-teal-50/75
          ">
            Moderate feedback, ratings and recommendations
            across CareSphere.
          </p>
        </div>

        <div className="
          hidden h-16 w-16
          items-center justify-center
          rounded-2xl bg-white/10 sm:flex
        ">
          <Star className="h-8 w-8" />
        </div>
      </div>
    </section>
  );
}


function SummaryCard({
  label,
  value,
  warning = false,
  danger = false,
}) {
  return (
    <div className={`
      rounded-3xl border bg-white p-5 shadow-sm
      ${
        danger
          ? "border-rose-200"
          : warning
          ? "border-amber-200"
          : "border-slate-200"
      }
    `}>
      <div className="
        text-sm font-semibold text-slate-500
      ">
        {label}
      </div>

      <div className={`
        mt-3 text-3xl font-black
        ${
          danger
            ? "text-rose-600"
            : warning
            ? "text-amber-600"
            : "text-slate-950"
        }
      `}>
        {value}
      </div>
    </div>
  );
}


function ModerationBadge({ status, label }) {
  const tones = {
    approved: "green",
    pending: "amber",
    flagged: "red",
    rejected: "red",
  };

  return (
    <Badge tone={tones[status] || "slate"}>
      {label || status}
    </Badge>
  );
}


function Badge({ children, tone = "slate" }) {
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
    <span className={`
      inline-flex items-center rounded-full
      px-2.5 py-1 text-xs font-black
      ring-1 ring-inset
      ${tones[tone] || tones.slate}
    `}>
      {children}
    </span>
  );
}


function Heading({ children }) {
  return (
    <th className="
      whitespace-nowrap px-6 py-4
      text-left text-xs font-black
      uppercase tracking-wider
      text-slate-500
    ">
      {children}
    </th>
  );
}


function FeedbackBanner({ error, message }) {
  return (
    <section className={`
      mt-6 rounded-2xl border
      px-5 py-4 text-sm font-semibold
      ${
        error
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }
    `}>
      {error || message}
    </section>
  );
}


function LoadingState() {
  return (
    <div className="
      flex min-h-[300px]
      items-center justify-center
    ">
      <div className="
        h-8 w-8 animate-spin
        rounded-full border-4
        border-slate-200 border-t-[#176B62]
      " />
    </div>
  );
}


function ErrorState({ message }) {
  return (
    <div className="
      flex min-h-[300px]
      items-center justify-center p-8
      text-center
    ">
      <div>
        <AlertCircle className="
          mx-auto h-8 w-8 text-rose-500
        " />
        <h3 className="
          mt-4 font-black text-slate-900
        ">
          Review data unavailable
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          {message}
        </p>
      </div>
    </div>
  );
}


function EmptyState({ filtered }) {
  return (
    <div className="
      flex min-h-[300px]
      items-center justify-center p-8
      text-center
    ">
      <div>
        <ShieldCheck className="
          mx-auto h-8 w-8 text-slate-400
        " />
        <h3 className="
          mt-4 font-black text-slate-900
        ">
          No reviews found
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          {filtered
            ? "Try changing your search or moderation filter."
            : "No CareSphere reviews have been submitted yet."}
        </p>
      </div>
    </div>
  );
}