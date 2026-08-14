"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  HeartHandshake,
  Loader2,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Star,
  Trash2,
} from "lucide-react";

import {
  authFetch,
  createLoginUrl,
  getAuthStorage,
} from "../../lib/auth";

const API_URL = "http://127.0.0.1:8000";

export default function SavedProvidersPage() {
  const router = useRouter();

  const [savedProviders, setSavedProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState(null);

  // ======================================================
  // LOGIN REDIRECT
  // ======================================================

  const goToLogin = () => {
    router.replace(
      createLoginUrl("/saved-providers")
    );
  };

  // ======================================================
  // LOAD SAVED PROVIDERS
  // ======================================================

  useEffect(() => {
    const loadSavedProviders = async () => {
      // No refresh token means there is no usable session.
      if (!getAuthStorage()) {
        goToLogin();
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await authFetch(
          `${API_URL}/api/family/saved-providers/`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        // authFetch returns null when there is no usable
        // authentication session.
        if (!response) {
          goToLogin();
          return;
        }

        // authFetch already attempted a token refresh.
        // If we still have 401, the user genuinely needs
        // to sign in again.
        if (response.status === 401) {
          goToLogin();
          return;
        }

        if (!response.ok) {
          throw new Error(
            "We couldn't load your saved providers."
          );
        }

        const data = await response.json();

        if (Array.isArray(data)) {
          setSavedProviders(data);
        } else if (Array.isArray(data.results)) {
          setSavedProviders(data.results);
        } else {
          setSavedProviders([]);
        }
      } catch (err) {
        console.error(
          "Saved providers error:",
          err
        );

        setError(
          "We couldn't load your saved providers. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    loadSavedProviders();
  }, [router]);

  // ======================================================
  // REMOVE SAVED PROVIDER
  // ======================================================

  const handleRemoveProvider = async (
    savedProviderId
  ) => {
    if (!getAuthStorage()) {
      goToLogin();
      return;
    }

    try {
      setRemovingId(savedProviderId);
      setError("");

      const response = await authFetch(
        `${API_URL}/api/family/saved-providers/${savedProviderId}/`,
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
          "Unable to remove saved provider."
        );
      }

      setSavedProviders(
        (currentProviders) =>
          currentProviders.filter(
            (item) =>
              item.id !== savedProviderId
          )
      );
    } catch (err) {
      console.error(
        "Remove provider error:",
        err
      );

      setError(
        "We couldn't remove this provider. Please try again."
      );
    } finally {
      setRemovingId(null);
    }
  };

  // ======================================================
  // FORMAT PRICE
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

    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(number);
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
            Loading your saved providers...
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
                  {" "}
                  UK
                </span>
              </div>

              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Care with confidence
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-[#0F766E]/40 hover:bg-teal-50"
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
                <Star className="h-4 w-4" />
                Your shortlist
              </div>

              <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
                Saved care providers
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
                Keep your preferred care providers
                together so you can compare them and
                make confident care decisions.
              </p>

            </div>

            <Link
              href="/find-care"
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#6EE7D8] px-6 py-3 font-bold text-[#071A2B] transition hover:bg-white"
            >
              <Search className="h-5 w-5" />
              Find more care
            </Link>

          </div>

        </section>

        {/* ERROR */}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* SUMMARY */}

        <section className="mt-8">

          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">

            <div>

              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">
                Your shortlist
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-tight">
                {savedProviders.length === 1
                  ? "1 saved provider"
                  : `${savedProviders.length} saved providers`}
              </h2>

            </div>

            {savedProviders.length > 0 && (
              <p className="text-sm text-slate-500">
                Compare your preferred care options
                before making a decision.
              </p>
            )}

          </div>

        </section>

        {/* EMPTY STATE */}

        {savedProviders.length === 0 && (
          <section className="mt-8 rounded-[30px] border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-[#0F766E]">
              <Star className="h-8 w-8" />
            </div>

            <h2 className="mt-6 text-2xl font-black text-slate-950">
              Your shortlist is empty
            </h2>

            <p className="mx-auto mt-3 max-w-lg leading-7 text-slate-500">
              When you find a care provider that looks
              right for you or your family, save it here
              so you can easily compare your options
              later.
            </p>

            <Link
              href="/find-care"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#0F766E] px-6 py-3 font-bold text-white transition hover:bg-[#0D655F]"
            >
              <Search className="h-5 w-5" />
              Find care providers
            </Link>

          </section>
        )}

        {/* SAVED PROVIDERS */}

        {savedProviders.length > 0 && (
          <section className="mt-8 grid gap-6 xl:grid-cols-2">

            {savedProviders.map(
              (savedItem) => {
                const provider =
                  savedItem.provider || {};

                const minRate =
                  formatPrice(
                    provider.hourly_rate_min
                  );

                const maxRate =
                  formatPrice(
                    provider.hourly_rate_max
                  );

                return (
                  <article
                    key={savedItem.id}
                    className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.05)]"
                  >

                    <div className="p-6 md:p-7">

                      {/* PROVIDER HEADER */}

                      <div className="flex items-start justify-between gap-5">

                        <div className="flex min-w-0 items-start gap-4">

                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-[#0F766E]">
                            <Building2 className="h-7 w-7" />
                          </div>

                          <div className="min-w-0">

                            <h3 className="truncate text-xl font-black text-slate-950">
                              {provider.company_name ||
                                "Care provider"}
                            </h3>

                            {provider.trading_name && (
                              <p className="mt-1 text-sm text-slate-500">
                                {provider.trading_name}
                              </p>
                            )}

                            <div className="mt-3 flex flex-wrap gap-2">

                              {provider.is_verified && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                  Verified
                                </span>
                              )}

                              {provider.cqc_verified && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                  <CheckCircle2 className="h-3.5 w-3.5" />

                                  CQC
                                  {provider.cqc_rating
                                    ? ` · ${provider.cqc_rating}`
                                    : ""}
                                </span>
                              )}

                              {provider.is_accepting_clients && (
                                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-[#0F766E]">
                                  Accepting clients
                                </span>
                              )}

                            </div>

                          </div>

                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveProvider(
                              savedItem.id
                            )
                          }
                          disabled={
                            removingId ===
                            savedItem.id
                          }
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Remove saved provider"
                          title="Remove from saved providers"
                        >

                          {removingId ===
                          savedItem.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}

                        </button>

                      </div>

                      {/* DETAILS */}

                      <div className="mt-6 grid gap-4 sm:grid-cols-2">

                        <div className="rounded-2xl bg-slate-50 p-4">

                          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <MapPin className="h-4 w-4 text-[#0F766E]" />
                            Location
                          </div>

                          <p className="mt-2 text-sm leading-6 text-slate-500">
                            {[
                              provider.city,
                              provider.county,
                              provider.postcode,
                            ]
                              .filter(Boolean)
                              .join(", ") ||
                              "Not provided"}
                          </p>

                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">

                          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <CalendarDays className="h-4 w-4 text-[#0F766E]" />
                            Hourly rate
                          </div>

                          <p className="mt-2 text-sm leading-6 text-slate-500">
                            {minRate && maxRate
                              ? `${minRate} – ${maxRate}`
                              : minRate ||
                                maxRate ||
                                "Contact provider"}
                          </p>

                        </div>

                      </div>

                      {/* CARE TYPES */}

                      {Array.isArray(
                        provider.care_types
                      ) &&
                        provider.care_types
                          .length > 0 && (
                          <div className="mt-5">

                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                              Care services
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">

                              {provider.care_types
                                .slice(0, 5)
                                .map(
                                  (careType) => (
                                    <span
                                      key={
                                        careType
                                      }
                                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold capitalize text-slate-600"
                                    >
                                      {String(
                                        careType
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

                      {/* CONTACT */}

                      <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">

                        {provider.phone && (
                          <a
                            href={`tel:${provider.phone}`}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-[#0F766E]/40 hover:bg-teal-50"
                          >
                            <Phone className="h-4 w-4" />
                            Call
                          </a>
                        )}

                        {provider.website && (
                          <a
                            href={
                              provider.website
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-[#0F766E]/40 hover:bg-teal-50"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Website
                          </a>
                        )}

                        {provider.id && (
                          <Link
                            href={`/providers/${provider.id}`}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#0F766E] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#0D655F]"
                          >
                            View provider
                          </Link>
                        )}

                      </div>

                      {/* NOTES */}

                      {savedItem.notes && (
                        <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/60 p-4">

                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-700">
                            Your note
                          </p>

                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {savedItem.notes}
                          </p>

                        </div>
                      )}

                    </div>

                  </article>
                );
              }
            )}

          </section>
        )}

      </div>

    </main>
  );
}