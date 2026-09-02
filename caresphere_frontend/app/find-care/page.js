"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ExternalLink,
  Heart,
  HeartHandshake,
  Loader2,
  MapPin,
  Phone,
  PoundSterling,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
} from "lucide-react";

import {
  authFetch,
  createLoginUrl,
  getAuthStorage,
} from "../../lib/auth";
import {
  isFullUkPostcode,
  normalisePostcode,
} from "../../lib/postcode";

const API_URL = "http://127.0.0.1:8000";

export default function FindCarePage() {
  const router = useRouter();

  const [providers, setProviders] = useState([]);
  const [savedProviders, setSavedProviders] = useState({});

  const [searchTerm, setSearchTerm] = useState("");
  const [locationTerm, setLocationTerm] = useState("");
  const [queryReady, setQueryReady] = useState(false);
  const [queryCorrections, setQueryCorrections] =
    useState([]);
  const [verificationFilter, setVerificationFilter] =
    useState("all");
  const [cqcFilter, setCqcFilter] = useState("all");
  const [fundingFilter, setFundingFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [careTypeFilter, setCareTypeFilter] = useState("");
  const [sortBy, setSortBy] = useState("best_match");
  const [radiusMiles, setRadiusMiles] = useState("25");
  const [distanceSearch, setDistanceSearch] = useState({
    enabled: false,
    origin_postcode: null,
    radius_miles: null,
  });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [resultCount, setResultCount] = useState(0);
  const [sourceCounts, setSourceCounts] = useState({
    caresphere: 0,
    cqc_directory: 0,
  });

  const [loading, setLoading] = useState(true);
  const [savingProviderId, setSavingProviderId] =
    useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Carry a homepage search into the full discovery experience. Reading the
  // browser URL after mount avoids a server/client hydration mismatch.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("q")?.trim();
    const location =
      params.get("origin_postcode")?.trim() ||
      params.get("location")?.trim();
    const radius = params.get("radius_miles")?.trim();
    const sort = params.get("sort")?.trim();

    if (query) {
      setSearchTerm(query);
    }

    if (location) {
      setLocationTerm(location);
    }

    if (
      radius &&
      Number.isFinite(Number(radius)) &&
      Number(radius) > 0 &&
      Number(radius) <= 50
    ) {
      setRadiusMiles(radius);
    }

    if (["best_match", "cqc_rating", "distance", "name"].includes(sort)) {
      setSortBy(sort);
    }

    setQueryReady(true);
  }, []);

  const isPostcodeSearch = isFullUkPostcode(locationTerm);

  useEffect(() => {
    if (sortBy === "distance" && !isPostcodeSearch) {
      setSortBy("best_match");
    }
  }, [isPostcodeSearch, sortBy]);

  // ======================================================
  // LOAD DISCOVERY RESULTS
  // Public endpoint - login not required. Search and filters run on the
  // backend so the complete CQC index can be queried, not just one page.
  // ======================================================

  useEffect(() => {
    if (!queryReady) {
      return undefined;
    }

    const controller = new AbortController();

    const loadProviders = async () => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({
          page: String(page),
          page_size: "24",
          source: sourceFilter,
          verification: verificationFilter,
          cqc_rating: cqcFilter,
          funding: fundingFilter,
          sort: sortBy,
        });

        if (searchTerm.trim()) {
          params.set("q", searchTerm.trim());
        }

        if (careTypeFilter) {
          params.set("care_type", careTypeFilter);
        }

        if (isPostcodeSearch) {
          params.set("origin_postcode", normalisePostcode(locationTerm));
          params.set("radius_miles", radiusMiles);
        } else if (locationTerm.trim()) {
          params.set("location", locationTerm.trim());
        }

        const response = await fetch(
          `${API_URL}/api/care-providers/discovery/?${params.toString()}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          const problem = await response.json().catch(() => ({}));
          const detail =
            problem.origin_postcode?.[0] ||
            problem.radius_miles?.[0] ||
            problem.sort?.[0] ||
            problem.detail;
          throw new Error(detail || "Unable to load care providers.");
        }

        const data = await response.json();

        setProviders(
          Array.isArray(data.results)
            ? data.results
            : []
        );
        setResultCount(Number(data.count) || 0);
        setTotalPages(Number(data.total_pages) || 0);
        setSourceCounts({
          caresphere:
            Number(data.source_counts?.caresphere) || 0,
          cqc_directory:
            Number(data.source_counts?.cqc_directory) || 0,
        });
        setQueryCorrections(
          Array.isArray(data.query_corrections)
            ? data.query_corrections
            : []
        );
        setDistanceSearch(
          data.distance_search || {
            enabled: false,
            origin_postcode: null,
            radius_miles: null,
          }
        );
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }

        console.error(
          "Provider loading error:",
          err
        );

        setError(
          err instanceof TypeError
            ? "We couldn't load care providers. Please make sure the CareSphere backend is running."
            : err.message || "We couldn't load care providers. Please try again."
        );
        setProviders([]);
        setResultCount(0);
        setTotalPages(0);
        setSourceCounts({
          caresphere: 0,
          cqc_directory: 0,
        });
        setQueryCorrections([]);
        setDistanceSearch({
          enabled: false,
          origin_postcode: null,
          radius_miles: null,
        });
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    const debounce = window.setTimeout(
      loadProviders,
      searchTerm.trim() || locationTerm.trim() ? 300 : 0
    );

    return () => {
      window.clearTimeout(debounce);
      controller.abort();
    };
  }, [
    queryReady,
    searchTerm,
    verificationFilter,
    cqcFilter,
    fundingFilter,
    sourceFilter,
    careTypeFilter,
    locationTerm,
    isPostcodeSearch,
    radiusMiles,
    sortBy,
    page,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    searchTerm,
    verificationFilter,
    cqcFilter,
    fundingFilter,
    sourceFilter,
    careTypeFilter,
    locationTerm,
    radiusMiles,
    sortBy,
  ]);

  // ======================================================
  // LOAD SAVED PROVIDER STATUS
  // ======================================================

  useEffect(() => {
    const loadSavedProviders = async () => {
      const storage = getAuthStorage();

      // Find Care is public.
      // If no user is logged in, simply don't load saved status.
      if (!storage) {
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

        if (!response) {
          return;
        }

        if (response.status === 401) {
          return;
        }

        if (!response.ok) {
          console.error(
            "Saved providers request failed:",
            response.status
          );
          return;
        }

        const data = await response.json();

        const items = Array.isArray(data)
          ? data
          : Array.isArray(data.results)
          ? data.results
          : [];

        const savedMap = {};

        items.forEach((item) => {
          if (item?.provider?.id) {
            savedMap[item.provider.id] =
              item.id;
          }
        });

        setSavedProviders(savedMap);
      } catch (err) {
        console.error(
          "Unable to load saved provider status:",
          err
        );
      }
    };

    loadSavedProviders();
  }, []);

  // ======================================================
  // REQUIRE LOGIN
  // ======================================================

  const requireLogin = () => {
    router.push(
      createLoginUrl("/find-care")
    );
  };

  // ======================================================
  // SAVE PROVIDER
  // ======================================================

  const handleSaveProvider = async (
    providerId
  ) => {
    setError("");
    setMessage("");

    if (!getAuthStorage()) {
      requireLogin();
      return;
    }

    try {
      setSavingProviderId(providerId);

      const response = await authFetch(
        `${API_URL}/api/family/saved-providers/`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            provider_id: providerId,
            notes: "",
          }),
        }
      );

      if (!response) {
        requireLogin();
        return;
      }

      if (response.status === 401) {
        requireLogin();
        return;
      }

      const data =
        await response.json();

      if (!response.ok) {
        if (data?.provider_id) {
          throw new Error(
            Array.isArray(
              data.provider_id
            )
              ? data.provider_id[0]
              : data.provider_id
          );
        }

        if (data?.non_field_errors) {
          throw new Error(
            Array.isArray(
              data.non_field_errors
            )
              ? data.non_field_errors[0]
              : data.non_field_errors
          );
        }

        throw new Error(
          data?.detail ||
            "Unable to save this provider."
        );
      }

      setSavedProviders(
        (current) => ({
          ...current,
          [providerId]: data.id,
        })
      );

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
      setSavingProviderId(null);
    }
  };

  // ======================================================
  // REMOVE PROVIDER
  // ======================================================

  const handleRemoveProvider = async (
    providerId
  ) => {
    const savedId =
      savedProviders[providerId];

    if (!getAuthStorage()) {
      requireLogin();
      return;
    }

    if (!savedId) {
      return;
    }

    setError("");
    setMessage("");

    try {
      setSavingProviderId(providerId);

      const response = await authFetch(
        `${API_URL}/api/family/saved-providers/${savedId}/`,
        {
          method: "DELETE",
        }
      );

      if (!response) {
        requireLogin();
        return;
      }

      if (response.status === 401) {
        requireLogin();
        return;
      }

      if (!response.ok) {
        throw new Error(
          "Unable to remove this provider."
        );
      }

      setSavedProviders(
        (current) => {
          const next = {
            ...current,
          };

          delete next[providerId];

          return next;
        }
      );

      setMessage(
        "Provider removed from your shortlist."
      );
    } catch (err) {
      console.error(
        "Remove saved provider error:",
        err
      );

      setError(
        err.message ||
          "We couldn't remove this provider."
      );
    } finally {
      setSavingProviderId(null);
    }
  };

  // ======================================================
  // TOGGLE SAVE
  // ======================================================

  const handleToggleSaved = (
    providerId
  ) => {
    if (
      savedProviders[providerId]
    ) {
      handleRemoveProvider(
        providerId
      );
    } else {
      handleSaveProvider(
        providerId
      );
    }
  };

  // ======================================================
  // PRICE FORMAT
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
  // CQC STYLING
  // ======================================================

  const getCqcClasses = (rating) => {
    const value = String(
      rating || ""
    ).toLowerCase();

    if (
      value === "outstanding"
    ) {
      return "bg-emerald-50 text-emerald-700";
    }

    if (value === "good") {
      return "bg-blue-50 text-blue-700";
    }

    if (
      value.includes("requires")
    ) {
      return "bg-amber-50 text-amber-700";
    }

    if (
      value === "inadequate"
    ) {
      return "bg-red-50 text-red-700";
    }

    return "bg-slate-100 text-slate-600";
  };

  // ======================================================
  // CLEAR FILTERS
  // ======================================================

  const clearFilters = () => {
    setSearchTerm("");
    setLocationTerm("");
    setVerificationFilter("all");
    setCqcFilter("all");
    setFundingFilter("all");
    setSourceFilter("all");
    setCareTypeFilter("");
    setSortBy("best_match");
    setRadiusMiles("25");
    setPage(1);
  };

  return (
    <main className="min-h-screen bg-[#F7FAFC] text-slate-950">

      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 lg:px-8">

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

          <div className="flex items-center gap-3">

            <Link
              href="/saved-providers"
              className="hidden rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-[#0F766E]/40 hover:bg-teal-50 sm:inline-flex"
            >
              <Heart className="mr-2 h-4 w-4" />
              Saved providers
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-[#0F766E]/40 hover:bg-teal-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>

          </div>
        </div>
      </header>

      {/* HERO */}

      <section className="bg-[#071A2B]">
        <div className="mx-auto max-w-[1500px] px-5 py-14 lg:px-8 lg:py-20">

          <div className="max-w-4xl">

            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-[#6EE7D8]">
              <Search className="h-4 w-4" />
              Find care across the UK
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-white md:text-6xl">
              Find care that fits
              <span className="block text-[#6EE7D8]">
                your needs.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              Search care providers by
              location, specialism,
              quality, funding and
              availability.
            </p>

          </div>

          <div className="mt-9 grid max-w-4xl gap-3 md:grid-cols-2">

            <div className="relative">

              <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                placeholder="Care need, specialism or provider name..."
                className="w-full rounded-2xl border border-white/10 bg-white py-4 pl-14 pr-5 text-slate-800 outline-none transition focus:ring-4 focus:ring-teal-500/20"
              />

            </div>

            <div className="relative">

              <MapPin className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={locationTerm}
                onChange={(event) =>
                  setLocationTerm(
                    event.target.value
                  )
                }
                placeholder="Town or full postcode, e.g. WD17 1NA"
                className="w-full rounded-2xl border border-white/10 bg-white py-4 pl-14 pr-5 text-slate-800 outline-none transition focus:ring-4 focus:ring-teal-500/20"
              />

            </div>

          </div>

        </div>
      </section>

      {/* CONTENT */}

      <div className="mx-auto max-w-[1500px] px-5 py-10 lg:px-8">

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

        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">

          {/* FILTERS */}

          <aside>
            <div className="sticky top-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-[#0F766E]">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-black">
                    Filters
                  </h2>

                  <p className="text-xs text-slate-500">
                    Refine your care search
                  </p>
                </div>

              </div>

              <div className="mt-7">

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Directory source
                </label>

                <select
                  value={sourceFilter}
                  onChange={(event) =>
                    setSourceFilter(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0F766E]"
                >
                  <option value="all">
                    All sources
                  </option>

                  <option value="caresphere">
                    CareSphere providers
                  </option>

                  <option value="cqc_directory">
                    CQC directory
                  </option>
                </select>

              </div>

              <div className="mt-5">

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Sort results
                </label>

                <select
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0F766E]"
                >
                  <option value="best_match">
                    Best match
                  </option>

                  <option value="cqc_rating">
                    CQC rating
                  </option>

                  <option value="distance" disabled={!isPostcodeSearch}>
                    Nearest first
                  </option>

                  <option value="name">
                    Provider name
                  </option>
                </select>

              </div>

              <div className="mt-5">

                <div className="mb-3 flex items-center justify-between gap-3">
                  <label className="block text-sm font-bold text-slate-700">
                    Search radius
                  </label>

                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {radiusMiles} miles
                  </span>
                </div>

                <input
                  type="range"
                  min="1"
                  max="50"
                  value={radiusMiles}
                  onChange={(event) => setRadiusMiles(event.target.value)}
                  disabled={!isPostcodeSearch}
                  className="w-full accent-[#0F766E] disabled:cursor-not-allowed disabled:opacity-40"
                />

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {isPostcodeSearch
                    ? `Using ${normalisePostcode(locationTerm)} as the centre.`
                    : "Enter a full postcode to use distance and radius."}
                </p>

              </div>

              <div className="mt-5">

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Care type
                </label>

                <select
                  value={careTypeFilter}
                  onChange={(event) =>
                    setCareTypeFilter(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0F766E]"
                >
                  <option value="">
                    All care types
                  </option>

                  <option value="domiciliary">
                    Domiciliary care
                  </option>

                  <option value="residential">
                    Residential care
                  </option>

                  <option value="nursing">
                    Nursing care
                  </option>

                  <option value="specialist">
                    Specialist care
                  </option>

                  <option value="live_in">
                    Live-in care
                  </option>

                  <option value="respite">
                    Respite care
                  </option>

                  <option value="day_care">
                    Day care
                  </option>
                </select>

              </div>

              <div className="mt-5">

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Provider verification
                </label>

                <select
                  value={
                    verificationFilter
                  }
                  onChange={(event) =>
                    setVerificationFilter(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0F766E]"
                >
                  <option value="all">
                    All providers
                  </option>

                  <option value="verified">
                    CareSphere verified
                  </option>

                  <option value="cqc">
                    CQC registered
                  </option>

                  <option value="unverified">
                    CareSphere unverified
                  </option>
                </select>

              </div>

              <div className="mt-5">

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  CQC rating
                </label>

                <select
                  value={cqcFilter}
                  onChange={(event) =>
                    setCqcFilter(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0F766E]"
                >
                  <option value="all">
                    All ratings
                  </option>

                  <option value="outstanding">
                    Outstanding
                  </option>

                  <option value="good">
                    Good
                  </option>

                  <option value="requires_improvement">
                    Requires Improvement
                  </option>

                  <option value="inadequate">
                    Inadequate
                  </option>
                </select>

              </div>

              <div className="mt-5">

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Funding
                </label>

                <select
                  value={fundingFilter}
                  onChange={(event) =>
                    setFundingFilter(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0F766E]"
                >
                  <option value="all">
                    All funding
                  </option>

                  <option value="nhs">
                    NHS funding
                  </option>

                  <option value="local_authority">
                    Local authority
                  </option>

                  <option value="private">
                    Private pay
                  </option>
                </select>

              </div>

              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 w-full rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Clear filters
              </button>

            </div>
          </aside>

          {/* RESULTS */}

          <section>

            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">

              <div>

                <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">
                  Care providers
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-tight">
                  Providers matching your needs
                </h2>

              </div>

              {!loading && (
                <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-500">
                  {resultCount} found
                </div>
              )}

            </div>

            {!loading && queryCorrections.length > 0 && (
              <div className="mb-6 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
                Showing matches for{" "}
                <span className="font-bold">
                  {queryCorrections
                    .map((correction) => correction.to)
                    .join(", ")}
                </span>
                .
              </div>
            )}

            {!loading && distanceSearch.enabled && (
              <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-950">
                Showing providers within{" "}
                <span className="font-bold">
                  {distanceSearch.radius_miles} miles of{" "}
                  {distanceSearch.origin_postcode}
                </span>
                . Distances are approximate straight-line distances between
                postcode centres, not driving distances.
              </div>
            )}

            {!loading && resultCount > 0 && (
              <div className="mb-6">
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-full bg-teal-50 px-3 py-1.5 text-teal-700">
                    {sourceCounts.caresphere} CareSphere
                  </span>

                  <span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-700">
                    {sourceCounts.cqc_directory} CQC directory
                  </span>
                </div>

                {sortBy === "best_match" && (
                  <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm leading-6 text-teal-950">
                    <span className="font-bold">
                      How best match works:
                    </span>{" "}
                    care needs come first, followed by{" "}
                    {distanceSearch.enabled ? "distance" : "location"}, available
                    CQC quality information and trusted registration. A provider
                    is not marked down when no CQC rating is available.
                  </div>
                )}

                {sourceCounts.cqc_directory > 0 && (
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Contains public Care Quality Commission information used under the{" "}
                    <a
                      href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-[#0F766E] underline"
                    >
                      Open Government Licence
                    </a>
                    . Check each CQC profile for the latest details.
                  </p>
                )}

                {distanceSearch.enabled && (
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Postcode coordinates supplied by{" "}
                    <a
                      href="https://postcodes.io/"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-[#0F766E] underline"
                    >
                      Postcodes.io
                    </a>
                    , using Ordnance Survey and Office for National Statistics
                    open data.
                  </p>
                )}
              </div>
            )}

            {loading && (
              <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-20 text-center">

                <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#0F766E]" />

                <p className="mt-4 font-semibold text-slate-500">
                  Finding care providers...
                </p>

              </div>
            )}

            {!loading &&
              providers.length ===
                0 && (
                <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center">

                  <Search className="mx-auto h-9 w-9 text-slate-300" />

                  <h3 className="mt-5 text-xl font-black">
                    No providers found
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Try changing your
                    search or removing
                    some filters.
                  </p>

                  <button
                    type="button"
                    onClick={
                      clearFilters
                    }
                    className="mt-6 rounded-xl bg-[#0F766E] px-5 py-3 text-sm font-bold text-white"
                  >
                    Clear filters
                  </button>

                </div>
              )}

            {!loading &&
              providers.length >
                0 && (
                <>
                <div className="grid gap-6 xl:grid-cols-2">

                  {providers.map(
                    (provider) => {
                      const isExternal =
                        provider.source ===
                        "cqc_directory";

                      const isSaved =
                        Boolean(
                          savedProviders[
                            provider.id
                          ]
                        );

                      const minRate =
                        formatPrice(
                          provider.hourly_rate_min
                        );

                      const maxRate =
                        formatPrice(
                          provider.hourly_rate_max
                        );

                      const displayServices =
                        isExternal &&
                        Array.isArray(
                          provider.service_types
                        )
                          ? provider.service_types
                          : Array.isArray(
                              provider.care_types
                            )
                          ? provider.care_types
                          : [];

                      return (
                        <article
                          key={
                            provider.id
                          }
                          className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.10)]"
                        >

                          <div className="p-6">

                            <div className="flex items-start justify-between gap-4">

                              <div className="flex min-w-0 items-start gap-4">

                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0F766E] to-[#2563EB] text-white">
                                  <Building2 className="h-7 w-7" />
                                </div>

                                <div className="min-w-0">

                                  <h3 className="truncate text-xl font-black">
                                    {
                                      provider.company_name
                                    }
                                  </h3>

                                  <div className="mt-2 flex flex-wrap gap-2">

                                    {isExternal && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        CQC directory
                                      </span>
                                    )}

                                    {provider.is_verified && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                        <BadgeCheck className="h-3.5 w-3.5" />
                                        Verified
                                      </span>
                                    )}

                                    {provider.cqc_rating && (
                                      <span
                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${getCqcClasses(
                                          provider.cqc_rating
                                        )}`}
                                      >
                                        <Star className="h-3.5 w-3.5" />
                                        {
                                          provider.cqc_rating
                                        }
                                      </span>
                                    )}

                                  </div>

                                </div>

                              </div>

                              {provider.can_save && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleSaved(
                                      provider.id
                                    )
                                  }
                                  disabled={
                                    savingProviderId ===
                                    provider.id
                                  }
                                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition ${
                                    isSaved
                                      ? "border-rose-200 bg-rose-50 text-rose-600"
                                      : "border-slate-200 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                                  }`}
                                  title={
                                    isSaved
                                      ? "Remove from saved providers"
                                      : "Save provider"
                                  }
                                >

                                  {savingProviderId ===
                                  provider.id ? (
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

                                </button>
                              )}

                            </div>

                            <div className="mt-6 space-y-3 rounded-2xl bg-slate-50 p-4">

                              {provider.distance_miles !== null &&
                                provider.distance_miles !== undefined && (
                                  <div className="flex items-center gap-3 text-sm font-bold text-[#0F766E]">
                                    <MapPin className="h-4 w-4" />
                                    <span>
                                      {Number(provider.distance_miles).toFixed(1)} miles away
                                    </span>
                                  </div>
                                )}

                              <div className="flex items-center gap-3 text-sm text-slate-600">

                                <MapPin className="h-4 w-4 text-[#0F766E]" />

                                <span>
                                  {[
                                    provider.city,
                                    provider.county,
                                    provider.postcode,
                                  ]
                                    .filter(
                                      Boolean
                                    )
                                    .join(
                                      ", "
                                    )}
                                </span>

                              </div>

                              <div className="flex items-center gap-3 text-sm text-slate-600">

                                <PoundSterling className="h-4 w-4 text-[#0F766E]" />

                                <span>
                                  {minRate &&
                                  maxRate
                                    ? `${minRate} – ${maxRate} per hour`
                                    : minRate
                                    ? `From ${minRate} per hour`
                                    : "Contact provider for pricing"}
                                </span>

                              </div>

                              <div className="flex items-center gap-3 text-sm text-slate-600">

                                <ShieldCheck className="h-4 w-4 text-[#0F766E]" />

                                <span>
                                  {provider.availability_status ===
                                  "available"
                                    ? "Currently accepting clients"
                                    : provider.availability_status ===
                                      "limited"
                                    ? "Limited availability"
                                    : provider.availability_status ===
                                      "full"
                                    ? "Currently full"
                                    : provider.availability_status ===
                                      "unknown"
                                    ? "Check availability with provider"
                                    : "Not accepting new clients"}
                                </span>

                              </div>

                            </div>

                            {Array.isArray(provider.match_reasons) &&
                              provider.match_reasons.length > 0 && (
                                <div className="mt-5">

                                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                                    Why this matches
                                  </p>

                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {provider.match_reasons
                                      .slice(0, 4)
                                      .map((reason) => (
                                        <span
                                          key={reason}
                                          className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800"
                                        >
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                          {reason}
                                        </span>
                                      ))}
                                  </div>

                                </div>
                              )}

                            {displayServices.length > 0 && (
                                <div className="mt-5">

                                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                                    Care services
                                  </p>

                                  <div className="mt-3 flex flex-wrap gap-2">

                                    {displayServices
                                      .slice(
                                        0,
                                        4
                                      )
                                      .map(
                                        (
                                          careType
                                        ) => (
                                          <span
                                            key={
                                              careType
                                            }
                                            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold capitalize text-slate-600"
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

                            <div className="mt-5 flex flex-wrap gap-2">

                              {provider.accepts_nhs_funding && (
                                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                  NHS funding
                                </span>
                              )}

                              {provider.accepts_local_authority_funding && (
                                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                                  Local authority
                                </span>
                              )}

                              {provider.accepts_private_pay && (
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                  Private pay
                                </span>
                              )}

                            </div>

                            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">

                              {provider.phone ? (
                                <a
                                  href={`tel:${provider.phone}`}
                                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                >
                                  <Phone className="h-4 w-4" />
                                  Call
                                </a>
                              ) : (
                                <div />
                              )}

                              {isExternal ? (
                                <a
                                  href={provider.external_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0D655F]"
                                >
                                  View on CQC
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              ) : (
                                <Link
                                  href={`/providers/${provider.id}`}
                                  className="flex items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0D655F]"
                                >
                                  View provider
                                  <ArrowRight className="h-4 w-4" />
                                </Link>
                              )}

                            </div>

                          </div>

                        </article>
                      );
                    }
                  )}

                </div>

                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        setPage((current) =>
                          Math.max(1, current - 1)
                        )
                      }
                      disabled={page <= 1}
                      className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>

                    <span className="text-sm font-semibold text-slate-500">
                      Page {page} of {totalPages}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setPage((current) =>
                          Math.min(
                            totalPages,
                            current + 1
                          )
                        )
                      }
                      disabled={page >= totalPages}
                      className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
                </>
              )}

          </section>

        </div>

      </div>

    </main>
  );
}
