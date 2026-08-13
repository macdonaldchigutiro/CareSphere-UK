"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  HeartHandshake,
  MapPin,
  Menu,
  PoundSterling,
  Search,
  Shield,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";

const matchStrategies = [
  {
    id: "quality",
    label: "Quality First",
    description: "Best CQC ratings",
    icon: Star,
  },
  {
    id: "budget",
    label: "Budget Friendly",
    description: "Within your budget",
    icon: PoundSterling,
  },
  {
    id: "distance",
    label: "Nearest First",
    description: "Closest to you",
    icon: MapPin,
  },
  {
    id: "trust",
    label: "Trust First",
    description: "Highest verified",
    icon: Shield,
  },
  {
    id: "family",
    label: "Family Choice",
    description: "Family recommended",
    icon: Users,
  },
  {
    id: "emergency",
    label: "Emergency Care",
    description: "Immediate help",
    icon: Clock,
  },
];

const providers = [
  {
    id: 1,
    name: "ExcelCare Services",
    initials: "EC",
    location: "London",
    distance: 2.5,
    price: 25,
    funding: "Accepts NHS funding",
    rating: "Outstanding CQC",
    verified: "DBS Verified",
    score: 98,
    specializations: [
      "Dementia Care",
      "Mobility Support",
      "Personal Care",
      "Medication Management",
    ],
    availability: "Available today",
  },
  {
    id: 2,
    name: "ComfortCare Homes",
    initials: "CC",
    location: "Manchester",
    distance: 5,
    price: 22,
    funding: "Local authority funding",
    rating: "Good CQC",
    verified: "Insurance Verified",
    score: 92,
    specializations: [
      "Live-in Care",
      "Respite Care",
      "Alzheimer's Care",
      "Companionship",
    ],
    availability: "Available this week",
  },
  {
    id: 3,
    name: "Golden Years Care",
    initials: "GY",
    location: "Birmingham",
    distance: 3,
    price: 28,
    funding: "Private pay only",
    rating: "Outstanding CQC",
    verified: "Training Certified",
    score: 95,
    specializations: [
      "Palliative Care",
      "Stroke Recovery",
      "Diabetes Care",
      "Night Care",
    ],
    availability: "Limited availability",
  },
  {
    id: 4,
    name: "Family First Care",
    initials: "FF",
    location: "Leeds",
    distance: 4,
    price: 20,
    funding: "All funding accepted",
    rating: "Good CQC",
    verified: "24/7 Emergency",
    score: 90,
    specializations: [
      "Emergency Care",
      "Weekend Care",
      "Holiday Cover",
      "Transport",
    ],
    availability: "24/7 availability",
  },
];

function ProviderCard({ provider }) {
  return (
    <article className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(15,23,42,0.12)]">
      <div className="p-6 md:p-7">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0F766E] to-[#2563EB] text-lg font-bold text-white shadow-lg shadow-blue-100">
              {provider.initials}
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-xl font-bold text-slate-950">
                {provider.name}
              </h3>

              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {provider.rating}
                </span>

                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {provider.verified}
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-3xl font-extrabold tracking-tight text-[#2563EB]">
              {provider.score}%
            </div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Match score
            </div>
          </div>
        </div>

        <div className="mb-5 space-y-3 rounded-2xl bg-slate-50 p-4">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <MapPin className="h-4 w-4 shrink-0 text-[#0F766E]" />
            <span>
              {provider.location} · {provider.distance} miles away
            </span>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-600">
            <PoundSterling className="h-4 w-4 shrink-0 text-[#0F766E]" />
            <span>
              £{provider.price}/hour · {provider.funding}
            </span>
          </div>

          <div className="flex items-center gap-3 text-sm font-medium text-emerald-700">
            <Clock className="h-4 w-4 shrink-0" />
            <span>{provider.availability}</span>
          </div>
        </div>

        <div className="mb-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
            Specialisms
          </p>

          <div className="flex flex-wrap gap-2">
            {provider.specializations.map((specialization) => (
              <span
                key={specialization}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
              >
                {specialization}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
            View profile
          </button>

          <button className="flex items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0D655F]">
            Check availability
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState("quality");
  const [distance, setDistance] = useState(25);
  const [budget, setBudget] = useState(500);
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ======================================================
  // AUTHENTICATION STATE
  // ======================================================

  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    try {
      const savedUser =
        localStorage.getItem("caresphere_user") ||
        sessionStorage.getItem("caresphere_user");

      if (savedUser) {
        setUser(JSON.parse(savedUser));
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Could not load CareSphere user:", error);
      setUser(null);
    } finally {
      setAuthReady(true);
    }
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("caresphere_access");
    localStorage.removeItem("caresphere_refresh");
    localStorage.removeItem("caresphere_user");

    sessionStorage.removeItem("caresphere_access");
    sessionStorage.removeItem("caresphere_refresh");
    sessionStorage.removeItem("caresphere_user");

    setUser(null);
    setMobileMenuOpen(false);
  };

  const displayName =
    user?.first_name?.trim() ||
    user?.email?.split("@")[0] ||
    "User";

  // ======================================================
  // MATCHING
  // ======================================================

  const handleMatch = () => {
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
    }, 1200);
  };

  const filteredProviders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return providers;
    }

    return providers.filter((provider) => {
      const searchable = [
        provider.name,
        provider.location,
        provider.rating,
        provider.verified,
        provider.funding,
        ...provider.specializations,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [searchTerm]);

  return (
    <main className="min-h-screen bg-[#F7FAFC] text-slate-950">
      {/* ======================================================
          NAVIGATION
      ====================================================== */}

      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0F766E] text-white shadow-md">
              <HeartHandshake className="h-6 w-6" />
            </div>

            <div>
              <div className="text-xl font-extrabold tracking-tight text-slate-950">
                CareSphere
                <span className="text-[#0F766E]"> UK</span>
              </div>

              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Care with confidence
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            <a
              href="#find-care"
              className="text-sm font-semibold text-slate-600 transition hover:text-[#0F766E]"
            >
              Find Care
            </a>

            <a
              href="#how-it-works"
              className="text-sm font-semibold text-slate-600 transition hover:text-[#0F766E]"
            >
              How It Works
            </a>

            <a
              href="#providers"
              className="text-sm font-semibold text-slate-600 transition hover:text-[#0F766E]"
            >
              For Care Providers
            </a>

            <a
              href="#families"
              className="text-sm font-semibold text-slate-600 transition hover:text-[#0F766E]"
            >
              Families
            </a>
          </nav>

          {/* DESKTOP AUTH NAVIGATION */}

          <div className="hidden items-center gap-3 lg:flex">
            {authReady &&
              (user ? (
                <>
                  <span className="hidden text-sm font-semibold text-slate-600 xl:inline">
                    Hi, {displayName}
                  </span>

                  <Link
                    href="/dashboard"
                    className="rounded-xl bg-[#0F766E] px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#0D655F]"
                  >
                    My Dashboard
                  </Link>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                  >
                    Sign in
                  </Link>

                  <Link
                    href="/register"
                    className="rounded-xl bg-[#0F766E] px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#0D655F]"
                  >
                    Get started
                  </Link>
                </>
              ))}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((value) => !value)}
            className="rounded-xl border border-slate-200 p-2.5 lg:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* MOBILE MENU */}

        {mobileMenuOpen && (
          <div className="border-t border-slate-100 bg-white px-5 py-5 lg:hidden">
            <div className="flex flex-col gap-4">
              <a
                href="#find-care"
                onClick={() => setMobileMenuOpen(false)}
                className="font-semibold text-slate-700"
              >
                Find Care
              </a>

              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="font-semibold text-slate-700"
              >
                How It Works
              </a>

              <a
                href="#providers"
                onClick={() => setMobileMenuOpen(false)}
                className="font-semibold text-slate-700"
              >
                For Care Providers
              </a>

              <a
                href="#families"
                onClick={() => setMobileMenuOpen(false)}
                className="font-semibold text-slate-700"
              >
                Families
              </a>

              <div className="mt-2 border-t border-slate-100 pt-4">
                {authReady &&
                  (user ? (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-slate-500">
                        Signed in as {displayName}
                      </p>

                      <Link
                        href="/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block rounded-xl bg-[#0F766E] px-4 py-3 text-center text-sm font-bold text-white"
                      >
                        My Dashboard
                      </Link>

                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700"
                      >
                        Sign out
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        href="/login"
                        onClick={() => setMobileMenuOpen(false)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-700"
                      >
                        Sign in
                      </Link>

                      <Link
                        href="/register"
                        onClick={() => setMobileMenuOpen(false)}
                        className="rounded-xl bg-[#0F766E] px-4 py-3 text-center text-sm font-bold text-white"
                      >
                        Get started
                      </Link>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ======================================================
          HERO
      ====================================================== */}

      <section className="relative overflow-hidden bg-[#071A2B]">
        <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-[#0F766E]/30 blur-3xl" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />

        <div className="relative mx-auto grid max-w-[1500px] gap-14 px-5 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-24">
          <div className="flex flex-col justify-center">
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-emerald-100">
              <Sparkles className="h-4 w-4" />
              Smarter care matching across the UK
            </div>

            <h1 className="max-w-4xl text-4xl font-black leading-[1.08] tracking-tight text-white md:text-6xl lg:text-7xl">
              Trusted care,
              <span className="block text-[#6EE7D8]">
                matched to the people
              </span>
              who matter most.
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              Compare verified care providers based on quality, location,
              budget and the needs of your family — all in one place.
            </p>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-200">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#6EE7D8]" />
                CQC-focused provider matching
              </span>

              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#6EE7D8]" />
                No booking fees
              </span>

              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#6EE7D8]" />
                Family collaboration
              </span>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-white p-7 shadow-2xl md:p-9">
              <div className="mb-6">
                <p className="text-sm font-bold uppercase tracking-[0.15em] text-[#0F766E]">
                  Start your search
                </p>

                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
                  What kind of care do you need?
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Tell us what matters and we&apos;ll help narrow down the
                  options.
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Dementia care, live-in care, respite..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-sm outline-none transition focus:border-[#0F766E] focus:bg-white focus:ring-4 focus:ring-teal-100"
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleMatch}
                  className="col-span-2 flex items-center justify-center gap-2 rounded-2xl bg-[#0F766E] px-5 py-4 font-bold text-white shadow-lg shadow-teal-100 transition hover:bg-[#0D655F]"
                >
                  Find my best matches
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-6 grid grid-cols-3 divide-x divide-slate-200 border-t border-slate-100 pt-6 text-center">
                <div>
                  <div className="text-xl font-black text-slate-950">
                    500+
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Providers
                  </div>
                </div>

                <div>
                  <div className="text-xl font-black text-slate-950">
                    98%
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Match accuracy
                  </div>
                </div>

                <div>
                  <div className="text-xl font-black text-slate-950">
                    24/7
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Support
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          TRUST STRIP
      ====================================================== */}

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-[1500px] grid-cols-2 gap-6 px-5 py-7 md:grid-cols-4 lg:px-8">
          {[
            ["CQC", "Quality-led matching"],
            ["DBS", "Verified professionals"],
            ["UK-wide", "Growing provider network"],
            ["Family", "Collaborative decisions"],
          ].map(([title, description]) => (
            <div key={title} className="text-center">
              <div className="text-sm font-extrabold text-slate-950">
                {title}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                {description}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ======================================================
          MATCHING AREA
      ====================================================== */}

      <section
        id="find-care"
        className="mx-auto max-w-[1500px] px-5 py-14 lg:px-8 lg:py-20"
      >
        <div className="mb-10">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0F766E]">
            Personalised matching
          </p>

          <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
            Find care that fits your priorities
          </h2>

          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Choose what matters most and refine the results around your
            family&apos;s needs.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[330px_minmax(0,1fr)]">
          {/* QUICK MATCH */}

          <aside>
            <div className="sticky top-28 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-[#0F766E]">
                  <Filter className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="font-extrabold text-slate-950">
                    Quick Match
                  </h3>
                  <p className="text-xs text-slate-500">
                    Set your priorities
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {matchStrategies.map((strategy) => {
                  const Icon = strategy.icon;
                  const isActive = selectedStrategy === strategy.id;

                  return (
                    <button
                      key={strategy.id}
                      type="button"
                      onClick={() => setSelectedStrategy(strategy.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
                        isActive
                          ? "border-[#0F766E] bg-teal-50"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          isActive
                            ? "bg-[#0F766E] text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-slate-950">
                          {strategy.label}
                        </div>

                        <div className="text-xs text-slate-500">
                          {strategy.description}
                        </div>
                      </div>

                      <ChevronRight
                        className={`h-4 w-4 ${
                          isActive
                            ? "text-[#0F766E]"
                            : "text-slate-300"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 border-t border-slate-100 pt-6">
                <div className="mb-6">
                  <div className="mb-3 flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-800">
                      Distance
                    </label>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {distance} miles
                    </span>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={distance}
                    onChange={(event) =>
                      setDistance(Number(event.target.value))
                    }
                    className="w-full accent-[#0F766E]"
                  />
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-800">
                      Weekly budget
                    </label>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      £{budget}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="100"
                    max="2000"
                    step="50"
                    value={budget}
                    onChange={(event) =>
                      setBudget(Number(event.target.value))
                    }
                    className="w-full accent-[#2563EB]"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleMatch}
                  className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#071A2B] py-3.5 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  Update matches
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </aside>

          {/* PROVIDERS */}

          <div id="providers">
            <div className="mb-7 rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                  placeholder="Search by care type, provider, city or specialism..."
                  className="w-full rounded-2xl bg-slate-50 py-4 pl-12 pr-4 text-sm text-slate-700 outline-none transition focus:bg-white focus:ring-2 focus:ring-[#0F766E]/30"
                />
              </div>
            </div>

            <div className="mb-7 flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-semibold text-[#0F766E]">
                  Recommended for you
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                  {isLoading
                    ? "Finding your best matches..."
                    : "Top care providers"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Ranked by your selected preferences and care needs.
                </p>
              </div>

              <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500">
                {filteredProviders.length} shown
              </div>
            </div>

            {isLoading ? (
              <div className="grid gap-6 xl:grid-cols-2">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="h-[390px] animate-pulse rounded-[28px] border border-slate-200 bg-white p-7"
                  >
                    <div className="mb-5 h-14 w-14 rounded-2xl bg-slate-200" />
                    <div className="mb-3 h-5 w-1/2 rounded bg-slate-200" />
                    <div className="mb-7 h-4 w-1/3 rounded bg-slate-100" />
                    <div className="mb-3 h-16 rounded-2xl bg-slate-100" />
                    <div className="mb-7 h-20 rounded-2xl bg-slate-100" />
                    <div className="h-12 rounded-xl bg-slate-200" />
                  </div>
                ))}
              </div>
            ) : filteredProviders.length > 0 ? (
              <div className="grid gap-6 xl:grid-cols-2">
                {filteredProviders.map((provider) => (
                  <ProviderCard
                    key={provider.id}
                    provider={provider}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <Search className="mx-auto h-8 w-8 text-slate-300" />

                <h3 className="mt-4 text-xl font-bold text-slate-900">
                  No matching providers found
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Try another care type, location or specialism.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ======================================================
          HOW IT WORKS
      ====================================================== */}

      <section id="how-it-works" className="bg-white py-20">
        <div className="mx-auto max-w-[1500px] px-5 lg:px-8">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0F766E]">
              Simple and transparent
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
              Finding the right care shouldn&apos;t feel overwhelming
            </h2>

            <p className="mt-4 text-slate-600">
              CareSphere helps families move from searching to making an
              informed care decision.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                number: "01",
                title: "Tell us what you need",
                text: "Share your care needs, location, priorities and budget.",
                icon: Search,
              },
              {
                number: "02",
                title: "Compare trusted providers",
                text: "Review quality indicators, specialisms, availability and pricing.",
                icon: Shield,
              },
              {
                number: "03",
                title: "Choose with confidence",
                text: "Shortlist providers, involve family and move forward together.",
                icon: HeartHandshake,
              },
            ].map((step) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.number}
                  className="rounded-[28px] border border-slate-200 bg-[#F8FAFC] p-7"
                >
                  <div className="mb-8 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#0F766E] shadow-sm">
                      <Icon className="h-6 w-6" />
                    </div>

                    <span className="text-3xl font-black text-slate-200">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="text-xl font-extrabold text-slate-950">
                    {step.title}
                  </h3>

                  <p className="mt-3 leading-7 text-slate-600">
                    {step.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ======================================================
          FAMILY COLLABORATION
      ====================================================== */}

      <section id="families" className="bg-[#071A2B] py-20">
        <div className="mx-auto grid max-w-[1500px] gap-10 px-5 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-[#6EE7D8]">
              <Users className="h-4 w-4" />
              Family collaboration
            </div>

            <h2 className="max-w-2xl text-3xl font-black tracking-tight text-white md:text-5xl">
              Care decisions are often family decisions.
            </h2>

            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
              Create a private family circle, compare providers together
              and keep everyone involved in one place.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-xl bg-[#6EE7D8] px-6 py-3 font-bold text-[#071A2B] transition hover:bg-white"
              >
                Create family circle
              </button>

              <button
                type="button"
                className="rounded-xl border border-white/20 px-6 py-3 font-bold text-white transition hover:bg-white/10"
              >
                Learn more
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              [
                "Invite relatives",
                "Bring trusted family members into the decision.",
              ],
              [
                "Compare together",
                "Save and review potential providers as a group.",
              ],
              [
                "Stay informed",
                "Keep important care information organised.",
              ],
              [
                "Choose confidently",
                "Make a shared decision with better information.",
              ],
            ].map(([title, text]) => (
              <div
                key={title}
                className="rounded-[24px] border border-white/10 bg-white/5 p-6 backdrop-blur"
              >
                <CheckCircle2 className="h-6 w-6 text-[#6EE7D8]" />

                <h3 className="mt-5 text-lg font-bold text-white">
                  {title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================
          FINAL CTA
      ====================================================== */}

      <section className="bg-white py-20">
        <div className="mx-auto max-w-[1200px] px-5 lg:px-8">
          <div className="overflow-hidden rounded-[34px] bg-gradient-to-br from-[#0F766E] to-[#0A5B69] px-7 py-12 text-center shadow-2xl md:px-14 md:py-16">
            <p className="text-sm font-bold uppercase tracking-[0.15em] text-teal-100">
              Start today
            </p>

            <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-black tracking-tight text-white md:text-5xl">
              Find care that feels right for your family.
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-teal-50/90">
              Explore providers, compare your options and make your next
              care decision with greater confidence.
            </p>

            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("find-care")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 font-bold text-[#0F766E] transition hover:bg-slate-50"
            >
              Find care now
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <footer className="border-t border-slate-200 bg-[#F8FAFC]">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-6 px-5 py-10 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F766E] text-white">
              <HeartHandshake className="h-5 w-5" />
            </div>

            <div>
              <div className="font-extrabold text-slate-950">
                CareSphere UK
              </div>

              <div className="text-xs text-slate-500">
                Care with confidence
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-slate-500">
            <a
              href="#find-care"
              className="hover:text-slate-950"
            >
              Find Care
            </a>

            <a
              href="#how-it-works"
              className="hover:text-slate-950"
            >
              How It Works
            </a>

            <a
              href="#families"
              className="hover:text-slate-950"
            >
              Families
            </a>

            <a
              href="#"
              className="hover:text-slate-950"
            >
              Privacy
            </a>
          </div>

          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} CareSphere UK
          </p>
        </div>
      </footer>
    </main>
  );
}