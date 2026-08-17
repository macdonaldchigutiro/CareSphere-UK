"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  HeartHandshake,
  Loader2,
  Phone,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";

import {
  authFetch,
  createLoginUrl,
  getAuthStorage,
} from "../../../lib/auth";

const API_URL = "http://127.0.0.1:8000";

export default function CareRecipientDetailPage() {
  const params = useParams();
  const router = useRouter();

  const recipientId = params?.id;

  const [recipient, setRecipient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ======================================================
  // LOGIN
  // ======================================================

  const goToLogin = () => {
    router.replace(
      createLoginUrl(
        `/care-recipients/${recipientId}`
      )
    );
  };

  // ======================================================
  // LOAD CARE RECIPIENT
  // ======================================================

  useEffect(() => {
    const loadRecipient = async () => {
      if (!recipientId) {
        return;
      }

      if (!getAuthStorage()) {
        goToLogin();
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await authFetch(
          `${API_URL}/api/service-users/profiles/${recipientId}/`,
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

        if (response.status === 404) {
          setRecipient(null);
          return;
        }

        if (!response.ok) {
          throw new Error(
            "Unable to load this care profile."
          );
        }

        const data = await response.json();

        setRecipient(data);
      } catch (err) {
        console.error(
          "Care recipient detail error:",
          err
        );

        setError(
          "We couldn't load this care profile."
        );
      } finally {
        setLoading(false);
      }
    };

    loadRecipient();
  }, [recipientId, router]);

  // ======================================================
  // DATE FORMAT
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
        month: "long",
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
            Loading care profile...
          </p>
        </div>
      </main>
    );
  }

  // ======================================================
  // NOT FOUND
  // ======================================================

  if (!recipient) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FAFC] px-5">
        <div className="text-center">

          <h1 className="text-3xl font-black">
            Care profile not found
          </h1>

          <p className="mt-3 text-slate-500">
            This person may have been removed or may not
            belong to your account.
          </p>

          <Link
            href="/care-recipients"
            className="mt-6 inline-flex rounded-xl bg-[#0F766E] px-6 py-3 font-bold text-white"
          >
            Back to People I Care For
          </Link>

        </div>
      </main>
    );
  }

  const fullName =
    recipient.full_name ||
    `${recipient.first_name || ""} ${
      recipient.last_name || ""
    }`.trim() ||
    "Care recipient";

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
            href="/care-recipients"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            People I Care For
          </Link>

        </div>

      </header>

      {/* CONTENT */}

      <div className="mx-auto max-w-[1400px] px-5 py-10 lg:px-8">

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* HERO */}

        <section className="overflow-hidden rounded-[32px] bg-[#071A2B] px-7 py-10 text-white shadow-xl md:px-10 md:py-12">

          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">

            <div className="flex items-start gap-5">

              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] bg-white/10 text-[#6EE7D8]">
                <User className="h-9 w-9" />
              </div>

              <div>

                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#6EE7D8]">
                  Care profile
                </p>

                <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
                  {fullName}
                </h1>

                <p className="mt-3 text-lg capitalize text-slate-300">
                  {recipient.relationship_to_manager ||
                    "Relationship not specified"}
                </p>

              </div>

            </div>

            <Link
              href={`/family-circle?service_user=${recipient.id}`}
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#6EE7D8] px-6 py-3 font-bold text-[#071A2B] transition hover:bg-white"
            >
              <Users className="h-5 w-5" />
              Open Family Circle
            </Link>

          </div>

        </section>

        {/* OVERVIEW */}

        <section className="mt-8 grid gap-5 md:grid-cols-3">

          <InfoCard
            icon={CalendarDays}
            title="Date of birth"
            value={formatDate(
              recipient.date_of_birth
            )}
          />

          <InfoCard
            icon={ShieldCheck}
            title="Profile status"
            value={
              recipient.is_active
                ? "Active"
                : "Inactive"
            }
          />

          <InfoCard
            icon={Phone}
            title="Emergency phone"
            value={
              recipient.emergency_phone ||
              "Not provided"
            }
          />

        </section>

        {/* MAIN */}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">

          <div className="space-y-8">

            {/* MEDICAL CONDITIONS */}

            <DetailSection
              title="Medical conditions"
              items={
                recipient.medical_conditions
              }
              emptyText="No medical conditions recorded."
            />

            {/* ALLERGIES */}

            <DetailSection
              title="Allergies"
              items={
                recipient.allergies
              }
              emptyText="No allergies recorded."
            />

            {/* MEDICATIONS */}

            <DetailSection
              title="Medications"
              items={
                recipient.medications
              }
              emptyText="No medications recorded."
            />

            {/* SUPPORT NEEDS */}

            <section className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">

              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">
                Support needs
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Day-to-day care needs
              </h2>

              <div className="mt-6 space-y-5">

                <TextBlock
                  title="Mobility needs"
                  value={
                    recipient.mobility_needs
                  }
                />

                <TextBlock
                  title="Communication needs"
                  value={
                    recipient.communication_needs
                  }
                />

              </div>

            </section>

            {/* NOTES */}

            <section className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">

              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">
                Additional information
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Care notes
              </h2>

              <p className="mt-5 leading-7 text-slate-500">
                {recipient.additional_notes ||
                  "No additional notes recorded."}
              </p>

            </section>

          </div>

          {/* SIDEBAR */}

          <aside className="space-y-6">

            {/* EMERGENCY CONTACT */}

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">

              <ShieldCheck className="h-7 w-7 text-[#0F766E]" />

              <h2 className="mt-5 text-xl font-black">
                Emergency contact
              </h2>

              <p className="mt-4 font-bold text-slate-800">
                {recipient.emergency_contact ||
                  "Not provided"}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {recipient.emergency_phone ||
                  "No phone number provided"}
              </p>

            </section>

            {/* FAMILY CIRCLE */}

            <section className="rounded-[28px] bg-gradient-to-br from-[#0F766E] to-[#0A5B69] p-6 text-white shadow-xl">

              <Users className="h-7 w-7 text-[#6EE7D8]" />

              <h2 className="mt-5 text-xl font-black">
                Family Circle
              </h2>

              <p className="mt-3 text-sm leading-6 text-teal-50/90">
                Coordinate care decisions, notes and family
                involvement around {recipient.first_name}.
              </p>

              <Link
                href={`/family-circle?service_user=${recipient.id}`}
                className="mt-5 flex w-full items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#0F766E]"
              >
                Open Family Circle
              </Link>

            </section>

            {/* PROFILE COMPLETE */}

            <section className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-6">

              <CheckCircle2 className="h-6 w-6 text-emerald-600" />

              <h3 className="mt-4 font-black text-emerald-900">
                Care profile active
              </h3>

              <p className="mt-2 text-sm leading-6 text-emerald-700">
                This profile is ready to be used with
                Family Circle and future care planning
                features.
              </p>

            </section>

          </aside>

        </div>

      </div>

    </main>
  );
}

// ======================================================
// SMALL COMPONENTS
// ======================================================

function InfoCard({
  icon: Icon,
  title,
  value,
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">

      <Icon className="h-5 w-5 text-[#0F766E]" />

      <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
        {title}
      </p>

      <p className="mt-2 font-black text-slate-800">
        {value}
      </p>

    </div>
  );
}

function DetailSection({
  title,
  items,
  emptyText,
}) {
  const safeItems =
    Array.isArray(items)
      ? items
      : [];

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">

      <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">
        Care information
      </p>

      <h2 className="mt-2 text-2xl font-black">
        {title}
      </h2>

      {safeItems.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-3">

          {safeItems.map((item) => (
            <span
              key={item}
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              {item}
            </span>
          ))}

        </div>
      ) : (
        <p className="mt-5 text-slate-500">
          {emptyText}
        </p>
      )}

    </section>
  );
}

function TextBlock({
  title,
  value,
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">

      <p className="text-sm font-black text-slate-800">
        {title}
      </p>

      <p className="mt-2 leading-7 text-slate-500">
        {value || "Not provided"}
      </p>

    </div>
  );
}