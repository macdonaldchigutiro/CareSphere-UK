"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Heart,
  HeartHandshake,
  Loader2,
  Mail,
  MapPin,
  Phone,
  PoundSterling,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";

import {
  authFetch,
  createLoginUrl,
  getAuthStorage,
} from "../../../lib/auth";

const API_URL = "http://127.0.0.1:8000";

export default function ProviderDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const providerId = params?.id;

  const [provider, setProvider] = useState(null);
  const [savedProviderId, setSavedProviderId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // ======================================================
  // LOAD PROVIDER
  // ======================================================

  useEffect(() => {
    const loadProvider = async () => {
      if (!providerId) {
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/care-providers/providers/${providerId}/`
        );

        if (!response.ok) {
          throw new Error(
            "Unable to load this care provider."
          );
        }

        const data = await response.json();

        setProvider(data);
      } catch (err) {
        console.error(
          "Provider detail error:",
          err
        );

        setError(
          "We couldn't load this care provider."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProvider();
  }, [providerId]);

  // ======================================================
  // CHECK WHETHER PROVIDER IS SAVED
  // ======================================================

  useEffect(() => {
    const checkSavedStatus = async () => {
      if (!providerId) {
        return;
      }

      if (!getAuthStorage()) {
        return;
      }

      try {
        const response = await authFetch(
          `${API_URL}/api/family/saved-providers/`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response || !response.ok) {
          return;
        }

        const data = await response.json();

        const items = Array.isArray(data)
          ? data
          : Array.isArray(data.results)
          ? data.results
          : [];

        const match = items.find(
          (item) =>
            item?.provider?.id === providerId
        );

        if (match) {
          setSavedProviderId(match.id);
        }
      } catch (err) {
        console.error(
          "Saved status error:",
          err
        );
      }
    };

    checkSavedStatus();
  }, [providerId]);

  // ======================================================
  // SAVE PROVIDER
  // ======================================================

  const handleSaveProvider = async () => {
    setError("");
    setMessage("");

    if (!getAuthStorage()) {
      router.push(
        createLoginUrl(
          `/providers/${providerId}`
        )
      );

      return;
    }

    try {
      setSaving(true);

      const response = await authFetch(
        `${API_URL}/api/family/saved-providers/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            provider_id: providerId,
            notes: "",
          }),
        }
      );

      if (!response) {
        router.push(
          createLoginUrl(
            `/providers/${providerId}`
          )
        );

        return;
      }

      if (response.status === 401) {
        router.push(
          createLoginUrl(
            `/providers/${providerId}`
          )
        );

        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Unable to save this provider."
        );
      }

      setSavedProviderId(data.id);

      setMessage(
        "Provider added to your shortlist."
      );
    } catch (err) {
      console.error(
        "Save provider error:",
        err
      );

      setError(
        err.message ||
          "We couldn't save this provider."
      );
    } finally {
      setSaving(false);
    }
  };

  // ======================================================
  // REMOVE SAVED PROVIDER
  // ======================================================

  const handleRemoveProvider = async () => {
    if (!savedProviderId) {
      return;
    }

    setError("");
    setMessage("");

    try {
      setSaving(true);

      const response = await authFetch(
        `${API_URL}/api/family/saved-providers/${savedProviderId}/`,
        {
          method: "DELETE",
        }
      );

      if (!response) {
        return;
      }

      if (!response.ok) {
        throw new Error(
          "Unable to remove this provider."
        );
      }

      setSavedProviderId(null);

      setMessage(
        "Provider removed from your shortlist."
      );
    } catch (err) {
      console.error(
        "Remove provider error:",
        err
      );

      setError(
        err.message ||
          "We couldn't remove this provider."
      );
    } finally {
      setSaving(false);
    }
  };

  // ======================================================
  // PRICE
  // ======================================================

  const formatPrice = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
      return value;
    }

    return new Intl.NumberFormat(
      "en-GB",
      {
        style: "currency",
        currency: "GBP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    ).format(number);
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
            Loading care provider...
          </p>
        </div>
      </main>
    );
  }

  if (!provider) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FAFC]">
        <div className="text-center">
          <h1 className="text-2xl font-black">
            Provider not found
          </h1>

          <Link
            href="/find-care"
            className="mt-5 inline-flex rounded-xl bg-[#0F766E] px-5 py-3 font-bold text-white"
          >
            Back to Find Care
          </Link>
        </div>
      </main>
    );
  }

  const minRate =
    formatPrice(
      provider.hourly_rate_min
    );

  const maxRate =
    formatPrice(
      provider.hourly_rate_max
    );

  const liveInMin =
    formatPrice(
      provider.live_in_rate_min
    );

  const liveInMax =
    formatPrice(
      provider.live_in_rate_max
    );

  const isSaved =
    Boolean(savedProviderId);

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
            href="/find-care"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Find Care
          </Link>

        </div>

      </header>

      {/* PAGE */}

      <div className="mx-auto max-w-[1400px] px-5 py-10 lg:px-8">

        {/* MESSAGES */}

        {message && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* HERO */}

        <section className="overflow-hidden rounded-[32px] bg-[#071A2B] p-7 text-white shadow-xl md:p-10">

          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-start">

            <div className="flex flex-col gap-5 sm:flex-row">

              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] bg-gradient-to-br from-[#0F766E] to-[#2563EB]">
                <Building2 className="h-9 w-9" />
              </div>

              <div>

                <div className="flex flex-wrap gap-2">

                  {provider.is_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Verified provider
                    </span>
                  )}

                  {provider.cqc_rating && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-[#6EE7D8]">
                      <Star className="h-3.5 w-3.5" />
                      CQC {provider.cqc_rating}
                    </span>
                  )}

                </div>

                <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
                  {provider.company_name}
                </h1>

                {provider.trading_name && (
                  <p className="mt-2 text-lg text-slate-300">
                    Trading as {provider.trading_name}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-300">

                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#6EE7D8]" />

                    {[
                      provider.city,
                      provider.county,
                      provider.postcode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </span>

                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-[#6EE7D8]" />
                    {provider.years_operating || 0} years operating
                  </span>

                </div>

              </div>

            </div>

            <button
              type="button"
              onClick={
                isSaved
                  ? handleRemoveProvider
                  : handleSaveProvider
              }
              disabled={saving}
              className={`inline-flex w-fit items-center gap-2 rounded-xl px-6 py-3 font-bold transition ${
                isSaved
                  ? "bg-rose-50 text-rose-600"
                  : "bg-[#6EE7D8] text-[#071A2B] hover:bg-white"
              }`}
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Heart
                  className={`h-5 w-5 ${
                    isSaved
                      ? "fill-current"
                      : ""
                  }`}
                />
              )}

              {isSaved
                ? "Saved"
                : "Save provider"}
            </button>

          </div>

        </section>

        {/* CONTENT */}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">

          <div className="space-y-8">

            {/* OVERVIEW */}

            <section className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">

              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">
                Provider overview
              </p>

              <h2 className="mt-2 text-2xl font-black">
                About this provider
              </h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                <InfoCard
                  icon={Building2}
                  title="Business type"
                  value={
                    provider.business_type
                      ? String(
                          provider.business_type
                        ).replaceAll(
                          "_",
                          " "
                        )
                      : "Not provided"
                  }
                />

                <InfoCard
                  icon={Users}
                  title="Staff"
                  value={`${provider.staff_count || 0}`}
                />

                <InfoCard
                  icon={ShieldCheck}
                  title="Availability"
                  value={
                    provider.availability_status === "available"
                      ? "Accepting clients"
                      : provider.availability_status === "limited"
                      ? "Limited availability"
                      : provider.availability_status === "full"
                      ? "Currently full"
                      : "Not accepting clients"
                  }
                />

              </div>

            </section>

            {/* CARE SERVICES */}

            <section className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">

              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">
                Care services
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Types of care offered
              </h2>

              <div className="mt-5 flex flex-wrap gap-3">

                {Array.isArray(provider.care_types) &&
                provider.care_types.length > 0 ? (
                  provider.care_types.map(
                    (careType) => (
                      <span
                        key={careType}
                        className="rounded-full bg-teal-50 px-4 py-2 text-sm font-bold capitalize text-[#0F766E]"
                      >
                        {String(
                          careType
                        ).replaceAll(
                          "_",
                          " "
                        )}
                      </span>
                    )
                  )
                ) : (
                  <p className="text-sm text-slate-500">
                    No care types listed.
                  </p>
                )}

              </div>

              {Array.isArray(provider.specializations) &&
                provider.specializations.length > 0 && (
                  <div className="mt-7">

                    <h3 className="font-black">
                      Specialisations
                    </h3>

                    <div className="mt-3 flex flex-wrap gap-2">

                      {provider.specializations.map(
                        (item) => (
                          <span
                            key={item}
                            className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold capitalize text-slate-600"
                          >
                            {String(
                              item
                            ).replaceAll(
                              "_",
                              " "
                            )}
                          </span>
                        )
                      )}

                    </div>

                  </div>
                )}

            </section>

            {/* PRICING */}

            <section className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">

              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">
                Pricing
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Care costs
              </h2>

              <div className="mt-6 grid gap-4 md:grid-cols-2">

                <div className="rounded-2xl bg-slate-50 p-5">

                  <PoundSterling className="h-5 w-5 text-[#0F766E]" />

                  <p className="mt-3 text-sm font-bold text-slate-700">
                    Hourly care
                  </p>

                  <p className="mt-2 text-xl font-black">
                    {minRate && maxRate
                      ? `${minRate} – ${maxRate}`
                      : minRate
                      ? `From ${minRate}`
                      : "Contact provider"}
                  </p>

                </div>

                <div className="rounded-2xl bg-slate-50 p-5">

                  <CalendarDays className="h-5 w-5 text-[#0F766E]" />

                  <p className="mt-3 text-sm font-bold text-slate-700">
                    Live-in care
                  </p>

                  <p className="mt-2 text-xl font-black">
                    {liveInMin && liveInMax
                      ? `${liveInMin} – ${liveInMax}`
                      : liveInMin
                      ? `From ${liveInMin}`
                      : "Contact provider"}
                  </p>

                </div>

              </div>

            </section>

            {/* FUNDING */}

            <section className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">

              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">
                Funding
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Payment options accepted
              </h2>

              <div className="mt-5 flex flex-wrap gap-3">

                {provider.accepts_nhs_funding && (
                  <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
                    NHS funding
                  </span>
                )}

                {provider.accepts_local_authority_funding && (
                  <span className="rounded-full bg-purple-50 px-4 py-2 text-sm font-bold text-purple-700">
                    Local authority funding
                  </span>
                )}

                {provider.accepts_private_pay && (
                  <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
                    Private pay
                  </span>
                )}

              </div>

            </section>

          </div>

          {/* SIDEBAR */}

          <aside className="space-y-6">

            {/* CONTACT */}

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">

              <h2 className="text-xl font-black">
                Contact provider
              </h2>

              <div className="mt-5 space-y-3">

                {provider.phone && (
                  <a
                    href={`tel:${provider.phone}`}
                    className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700"
                  >
                    <Phone className="h-4 w-4 text-[#0F766E]" />
                    {provider.phone}
                  </a>
                )}

                {provider.email && (
                  <a
                    href={`mailto:${provider.email}`}
                    className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700"
                  >
                    <Mail className="h-4 w-4 text-[#0F766E]" />
                    {provider.email}
                  </a>
                )}

                {provider.website && (
                  <a
                    href={provider.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700"
                  >
                    <ExternalLink className="h-4 w-4 text-[#0F766E]" />
                    Visit website
                  </a>
                )}

              </div>

            </section>

            {/* QUALITY */}

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">

              <h2 className="text-xl font-black">
                Quality & compliance
              </h2>

              <div className="mt-5 space-y-4">

                <QualityRow
                  label="CareSphere verification"
                  value={
                    provider.is_verified
                      ? "Verified"
                      : "Pending"
                  }
                />

                <QualityRow
                  label="CQC status"
                  value={
                    provider.cqc_status ||
                    "Not available"
                  }
                />

                <QualityRow
                  label="Safeguarding training"
                  value={
                    provider.safeguarding_training
                      ? "Confirmed"
                      : "Not confirmed"
                  }
                />

                <QualityRow
                  label="Liability insurance"
                  value={
                    provider.liability_insurance
                      ? "Confirmed"
                      : "Not confirmed"
                  }
                />

              </div>

            </section>

            {/* BOOK */}

            <section className="rounded-[28px] bg-gradient-to-br from-[#0F766E] to-[#0A5B69] p-6 text-white shadow-xl">

              <HeartHandshake className="h-7 w-7 text-[#6EE7D8]" />

              <h2 className="mt-5 text-xl font-black">
                Interested in this provider?
              </h2>

              <p className="mt-3 text-sm leading-6 text-teal-50/90">
                Request care or start a booking with this provider.
              </p>

              <button
                type="button"
                className="mt-5 w-full rounded-xl bg-white px-5 py-3 font-bold text-[#0F766E]"
              >
                Request care
              </button>

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
    <div className="rounded-2xl bg-slate-50 p-5">

      <Icon className="h-5 w-5 text-[#0F766E]" />

      <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
        {title}
      </p>

      <p className="mt-2 font-black capitalize text-slate-800">
        {value}
      </p>

    </div>
  );
}

function QualityRow({
  label,
  value,
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">

      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="max-w-[170px] text-right text-sm font-bold text-slate-800">
        {value}
      </span>

    </div>
  );
}