"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  HeartHandshake,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  Star,
  User,
  Users,
} from "lucide-react";

import {
  authFetch,
  clearAuthSession,
  createLoginUrl,
  getAuthStorage,
  getStoredUser,
  updateStoredUser,
} from "../../lib/auth";

const API_URL = "http://127.0.0.1:8000";

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  // ======================================================
  // LOGIN REDIRECT
  // ======================================================

  const goToLogin = () => {
    router.replace(
      createLoginUrl("/dashboard")
    );
  };

  // ======================================================
  // LOAD AUTHENTICATED USER + LATEST PROFILE
  // ======================================================

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        // We need at least a refresh token/session.
        if (!getAuthStorage()) {
          goToLogin();
          return;
        }

        // Show stored user immediately while Django
        // checks for the latest profile information.
        const storedUser = getStoredUser();

        if (storedUser) {
          setUser(storedUser);
        }

        const response = await authFetch(
          `${API_URL}/api/users/profile/`,
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

        // authFetch has already tried refreshing the
        // access token. A remaining 401 means login
        // is genuinely required.
        if (response.status === 401) {
          goToLogin();
          return;
        }

        if (!response.ok) {
          throw new Error(
            "Unable to load your latest CareSphere profile."
          );
        }

        const profileData =
          await response.json();

        setUser(profileData);

        updateStoredUser(profileData);
      } catch (error) {
        console.error(
          "Dashboard loading error:",
          error
        );

        // If we already have stored user information,
        // keep the dashboard usable during a temporary
        // backend/network problem.
        const storedUser =
          getStoredUser();

        if (storedUser) {
          setUser(storedUser);
        }
      } finally {
        setProfileLoading(false);
        setAuthReady(true);
      }
    };

    loadDashboard();
  }, [router]);

  // ======================================================
  // SIGN OUT
  // ======================================================

  const handleSignOut = () => {
    clearAuthSession();

    router.replace("/");
  };

  // ======================================================
  // LOADING
  // ======================================================

  if (!authReady || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FAFC]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#0F766E]" />

          <p className="mt-4 text-sm font-medium text-slate-500">
            Loading your CareSphere dashboard...
          </p>
        </div>
      </main>
    );
  }

  // ======================================================
  // USER INFORMATION
  // ======================================================

  const displayName =
    user?.first_name?.trim() ||
    user?.email?.split("@")[0] ||
    "User";

  const fullName =
    `${user?.first_name || ""} ${
      user?.last_name || ""
    }`.trim() || displayName;

  const isProvider =
    user?.user_type === "provider";

  // ======================================================
  // PROFILE COMPLETION
  // ======================================================

  const profileFields = [
    user?.first_name,
    user?.last_name,
    user?.email,
    user?.phone_number,
    user?.date_of_birth,
  ];

  const completedFields =
    profileFields.filter(
      (field) =>
        field !== null &&
        field !== undefined &&
        String(field).trim() !== ""
    ).length;

  const profileCompletion = Math.round(
    (completedFields /
      profileFields.length) *
      100
  );

  const profileComplete =
    profileCompletion === 100;

  // ======================================================
  // DASHBOARD STATS
  // ======================================================

  const providerStats = [
    {
      label: "New enquiries",
      value: "0",
      icon: Bell,
      note: "No new enquiries yet",
    },
    {
      label: "Upcoming bookings",
      value: "0",
      icon: CalendarDays,
      note: "No upcoming bookings",
    },
    {
      label: "Profile completion",
      value: `${profileCompletion}%`,
      icon: User,
      note: profileComplete
        ? "Your personal profile is complete"
        : "Complete your provider profile",
    },
    {
      label: "Verification",
      value: user?.is_verified
        ? "Verified"
        : "Pending",
      icon: ShieldCheck,
      note: user?.is_verified
        ? "Your profile is verified"
        : "Verification still required",
    },
  ];

  const familyStats = [
    {
      label: "Saved providers",
      value: "0",
      icon: Star,
      note: "Build and manage your shortlist",
    },
    {
      label: "Upcoming bookings",
      value: "0",
      icon: CalendarDays,
      note: "No upcoming bookings",
    },
    {
      label: "Family circle",
      value: "0",
      icon: Users,
      note: "Invite relatives to collaborate",
    },
    {
      label: "Profile completion",
      value: `${profileCompletion}%`,
      icon: User,
      note: profileComplete
        ? "Your profile is complete"
        : "Add more details to your profile",
    },
  ];

  // ======================================================
  // QUICK ACTIONS
  // ======================================================

  const providerActions = [
    {
      title: "Complete provider profile",
      text: "Add and manage your personal CareSphere details.",
      icon: User,
      href: "/profile",
    },
    {
      title: "Manage availability",
      text: "Update when your care team is available.",
      icon: CalendarDays,
      href: null,
    },
    {
      title: "Review enquiries",
      text: "Respond to families interested in your services.",
      icon: Bell,
      href: null,
    },
    {
      title: "Verification centre",
      text: "Manage your verification information and documents.",
      icon: ShieldCheck,
      href: null,
    },
  ];

  const familyActions = [
    {
      title: "Find care",
      text: "Search and compare providers based on your needs.",
      icon: Search,
      href: "/find-care",
    },
    {
      title: "Saved providers",
      text: "Review care providers you have shortlisted.",
      icon: Star,
      href: "/saved-providers",
    },
    {
      title: "Family circle",
      text: "Invite relatives to help compare care options.",
      icon: Users,
      href: null,
    },
    {
      title: "My bookings",
      text: "Review upcoming and previous care bookings.",
      icon: CalendarDays,
      href: null,
    },
  ];

  const quickActions = isProvider
    ? providerActions
    : familyActions;

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
                  {" "}
                  UK
                </span>
              </div>

              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Care with confidence
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">

            <button
              type="button"
              className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </button>

            <div className="hidden text-right md:block">

              <div className="text-sm font-bold text-slate-900">
                {displayName}
              </div>

              <div className="text-xs capitalize text-slate-500">
                {user?.user_type ||
                  "family"}{" "}
                account
              </div>

            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />

              <span className="hidden sm:inline">
                Sign out
              </span>
            </button>

          </div>

        </div>
      </header>

      {/* PAGE */}

      <div className="mx-auto max-w-[1500px] px-5 py-10 lg:px-8">

        {/* WELCOME */}

        <section className="overflow-hidden rounded-[32px] bg-[#071A2B] px-7 py-10 text-white shadow-xl md:px-10 md:py-12">

          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">

            <div>

              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#6EE7D8]">
                CareSphere dashboard
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
                Welcome back, {displayName}.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
                {isProvider
                  ? "Manage your care profile, enquiries, bookings and availability from one place."
                  : "Manage your care journey, saved providers, bookings and family decisions from one place."}
              </p>

            </div>

            <Link
              href="/find-care"
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#6EE7D8] px-6 py-3 font-bold text-[#071A2B] transition hover:bg-white"
            >
              <Search className="h-5 w-5" />

              {isProvider
                ? "View marketplace"
                : "Find care"}
            </Link>

          </div>

        </section>

        {/* STATS */}

        <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

          {(isProvider
            ? providerStats
            : familyStats
          ).map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_10px_35px_rgba(15,23,42,0.05)]"
              >

                <div className="flex items-start justify-between gap-4">

                  <div>

                    <p className="text-sm font-semibold text-slate-500">
                      {item.label}
                    </p>

                    <p className="mt-2 text-3xl font-black text-slate-950">
                      {item.value}
                    </p>

                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-[#0F766E]">
                    <Icon className="h-5 w-5" />
                  </div>

                </div>

                <p className="mt-4 text-sm leading-6 text-slate-500">
                  {item.note}
                </p>

                {item.label ===
                  "Profile completion" && (
                  <div className="mt-4">

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                      <div
                        className="h-full rounded-full bg-[#0F766E] transition-all duration-500"
                        style={{
                          width: `${profileCompletion}%`,
                        }}
                      />

                    </div>

                  </div>
                )}

              </div>
            );
          })}

        </section>

        {/* MAIN CONTENT */}

        <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">

          <div className="space-y-8">

            {/* QUICK ACTIONS */}

            <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">

              <div className="mb-6">

                <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">
                  Quick actions
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  What would you like to do?
                </h2>

              </div>

              <div className="grid gap-4 md:grid-cols-2">

                {quickActions.map(
                  (action) => {
                    const Icon =
                      action.icon;

                    if (action.href) {
                      return (
                        <Link
                          key={
                            action.title
                          }
                          href={
                            action.href
                          }
                          className="group rounded-2xl border border-slate-200 p-5 text-left transition hover:border-[#0F766E]/40 hover:bg-teal-50/40"
                        >

                          <div className="mb-4 flex items-center justify-between">

                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-[#0F766E] transition group-hover:bg-white">
                              <Icon className="h-5 w-5" />
                            </div>

                            <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#0F766E]" />

                          </div>

                          <h3 className="text-lg font-extrabold text-slate-950">
                            {action.title}
                          </h3>

                          <p className="mt-2 text-sm leading-6 text-slate-500">
                            {action.text}
                          </p>

                        </Link>
                      );
                    }

                    return (
                      <button
                        key={action.title}
                        type="button"
                        className="group rounded-2xl border border-slate-200 p-5 text-left transition hover:border-[#0F766E]/40 hover:bg-teal-50/40"
                      >

                        <div className="mb-4 flex items-center justify-between">

                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-[#0F766E] transition group-hover:bg-white">
                            <Icon className="h-5 w-5" />
                          </div>

                          <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#0F766E]" />

                        </div>

                        <h3 className="text-lg font-extrabold text-slate-950">
                          {action.title}
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          {action.text}
                        </p>

                      </button>
                    );
                  }
                )}

              </div>

            </div>

            {/* RECENT ACTIVITY */}

            <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">

              <div>

                <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">
                  Recent activity
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  Your latest CareSphere activity
                </h2>

              </div>

              <div className="mt-7 rounded-2xl bg-slate-50 px-6 py-10 text-center">

                <CheckCircle2 className="mx-auto h-8 w-8 text-slate-300" />

                <h3 className="mt-4 font-bold text-slate-800">
                  Nothing here yet
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  As you use CareSphere,
                  your bookings, saved
                  providers, enquiries and
                  other activity will
                  appear here.
                </p>

              </div>

            </div>

          </div>

          {/* SIDE PANEL */}

          <aside className="space-y-6">

            {/* USER CARD */}

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F766E] text-xl font-black text-white">
                {displayName
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <h3 className="mt-5 text-xl font-black">
                {fullName}
              </h3>

              <p className="mt-1 break-all text-sm text-slate-500">
                {user?.email}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2">

                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold capitalize text-[#0F766E]">
                  {isProvider
                    ? "Care Provider"
                    : "Family Account"}
                </span>

                {user?.is_verified ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    Verified
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                    Verification pending
                  </span>
                )}

              </div>

              {/* PROFILE SUMMARY */}

              <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">

                <div className="flex items-center justify-between text-sm">

                  <span className="text-slate-500">
                    Profile
                  </span>

                  <span className="font-bold text-slate-900">
                    {profileCompletion}%
                  </span>

                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                  <div
                    className="h-full rounded-full bg-[#0F766E] transition-all duration-500"
                    style={{
                      width: `${profileCompletion}%`,
                    }}
                  />

                </div>

                {user?.phone_number && (
                  <p className="text-sm text-slate-500">
                    {user.phone_number}
                  </p>
                )}

              </div>

              <Link
                href="/profile"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 transition hover:border-[#0F766E]/40 hover:bg-teal-50"
              >
                <Settings className="h-4 w-4" />
                Account settings
              </Link>

            </div>

            {/* SUPPORT */}

            <div className="rounded-[28px] bg-gradient-to-br from-[#0F766E] to-[#0A5B69] p-6 text-white shadow-xl">

              <HeartHandshake className="h-7 w-7 text-[#6EE7D8]" />

              <h3 className="mt-5 text-xl font-black">
                Need some help?
              </h3>

              <p className="mt-3 text-sm leading-6 text-teal-50/90">
                CareSphere is here to make
                your care journey easier.
              </p>

              <button
                type="button"
                className="mt-5 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#0F766E]"
              >
                Contact support
              </button>

            </div>

          </aside>

        </section>

        {profileLoading && (
          <p className="mt-6 text-center text-xs text-slate-400">
            Updating your latest profile
            information...
          </p>
        )}

      </div>

    </main>
  );
}