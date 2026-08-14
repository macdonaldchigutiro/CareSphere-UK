"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  HeartHandshake,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  User,
} from "lucide-react";

import {
  authFetch,
  createLoginUrl,
  getAuthStorage,
  updateStoredUser,
} from "../../lib/auth";

const API_URL = "http://127.0.0.1:8000";

export default function ProfilePage() {
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);

  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    date_of_birth: "",
    user_type: "family",
    is_verified: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ======================================================
  // LOGIN REDIRECT
  // ======================================================

  const goToLogin = () => {
    router.replace(
      createLoginUrl("/profile")
    );
  };

  // ======================================================
  // LOAD PROFILE
  // ======================================================

  useEffect(() => {
    const loadProfile = async () => {
      if (!getAuthStorage()) {
        goToLogin();
        return;
      }

      try {
        setIsLoading(true);
        setError("");

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

        // authFetch has already attempted a refresh.
        // A remaining 401 means login is genuinely required.
        if (response.status === 401) {
          goToLogin();
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.detail ||
              "Unable to load your CareSphere profile."
          );
        }

        setProfile({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          phone_number: data.phone_number || "",
          date_of_birth: data.date_of_birth || "",
          user_type: data.user_type || "family",
          is_verified: Boolean(data.is_verified),
        });

        updateStoredUser(data);
      } catch (err) {
        console.error(
          "Profile load error:",
          err
        );

        setError(
          err?.message ||
            "Unable to load your profile. Please try again."
        );
      } finally {
        setIsLoading(false);
        setAuthReady(true);
      }
    };

    loadProfile();
  }, [router]);

  // ======================================================
  // HANDLE FIELD CHANGES
  // ======================================================

  const handleChange = (event) => {
    const { name, value } =
      event.target;

    setProfile((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  // ======================================================
  // SAVE PROFILE
  // ======================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!profile.first_name.trim()) {
      setError(
        "Please enter your first name."
      );
      return;
    }

    if (!getAuthStorage()) {
      goToLogin();
      return;
    }

    try {
      setIsSaving(true);

      const response = await authFetch(
        `${API_URL}/api/users/profile/`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            first_name:
              profile.first_name.trim(),

            last_name:
              profile.last_name.trim(),

            phone_number:
              profile.phone_number.trim(),

            date_of_birth:
              profile.date_of_birth || null,
          }),
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

      const data = await response.json();

      if (!response.ok) {
        if (data.phone_number) {
          setError(
            Array.isArray(
              data.phone_number
            )
              ? data.phone_number[0]
              : data.phone_number
          );

          return;
        }

        if (data.date_of_birth) {
          setError(
            Array.isArray(
              data.date_of_birth
            )
              ? data.date_of_birth[0]
              : data.date_of_birth
          );

          return;
        }

        if (data.first_name) {
          setError(
            Array.isArray(
              data.first_name
            )
              ? data.first_name[0]
              : data.first_name
          );

          return;
        }

        if (data.last_name) {
          setError(
            Array.isArray(
              data.last_name
            )
              ? data.last_name[0]
              : data.last_name
          );

          return;
        }

        if (data.detail) {
          setError(data.detail);
          return;
        }

        setError(
          "Unable to update your profile."
        );

        return;
      }

      setProfile((current) => ({
        ...current,

        first_name:
          data.first_name || "",

        last_name:
          data.last_name || "",

        email:
          data.email || current.email,

        phone_number:
          data.phone_number || "",

        date_of_birth:
          data.date_of_birth || "",

        user_type:
          data.user_type ||
          current.user_type,

        is_verified:
          Boolean(data.is_verified),
      }));

      // Keep the locally stored user in sync
      // with the latest backend data.
      updateStoredUser(data);

      setSuccess(
        "Your profile has been updated successfully."
      );
    } catch (err) {
      console.error(
        "Profile update error:",
        err
      );

      setError(
        "Unable to connect to CareSphere. Please make sure the backend is running."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ======================================================
  // LOADING SCREEN
  // ======================================================

  if (!authReady || isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FAFC]">
        <div className="text-center">

          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#0F766E]" />

          <p className="mt-4 text-sm font-medium text-slate-500">
            Loading your profile...
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
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>

        </div>

      </header>

      <div className="mx-auto max-w-[1200px] px-5 py-10 lg:px-8">

        {/* HERO */}

        <section className="overflow-hidden rounded-[32px] bg-[#071A2B] px-7 py-10 text-white shadow-xl md:px-10">

          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">

            <div>

              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#6EE7D8]">
                My profile
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
                Manage your CareSphere details.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
                Keep your personal information accurate
                so CareSphere can give you a better and
                more personalised experience.
              </p>

            </div>

            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] bg-white/10 text-3xl font-black text-[#6EE7D8]">

              {(profile.first_name ||
                profile.email ||
                "U")
                .charAt(0)
                .toUpperCase()}

            </div>

          </div>

        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">

          {/* PROFILE FORM */}

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">

            <div className="mb-8">

              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">
                Personal information
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-tight">
                Your account details
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Update the details connected to your
                CareSphere account.
              </p>

            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >

              {/* NAME */}

              <div className="grid gap-5 md:grid-cols-2">

                <div>

                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    First name
                  </label>

                  <div className="relative">

                    <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      name="first_name"
                      value={
                        profile.first_name
                      }
                      onChange={
                        handleChange
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 outline-none transition focus:border-[#0F766E] focus:ring-4 focus:ring-teal-100"
                    />

                  </div>

                </div>

                <div>

                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Last name
                  </label>

                  <div className="relative">

                    <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      name="last_name"
                      value={
                        profile.last_name
                      }
                      onChange={
                        handleChange
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 outline-none transition focus:border-[#0F766E] focus:ring-4 focus:ring-teal-100"
                    />

                  </div>

                </div>

              </div>

              {/* EMAIL */}

              <div>

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Email address
                </label>

                <div className="relative">

                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 py-4 pl-12 pr-4 text-slate-500 outline-none"
                  />

                </div>

                <p className="mt-2 text-xs text-slate-400">
                  Email changes will be handled separately
                  for account security.
                </p>

              </div>

              {/* PHONE + DOB */}

              <div className="grid gap-5 md:grid-cols-2">

                <div>

                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Phone number
                  </label>

                  <div className="relative">

                    <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      type="tel"
                      name="phone_number"
                      value={
                        profile.phone_number
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="e.g. 07700 900000"
                      className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 outline-none transition focus:border-[#0F766E] focus:ring-4 focus:ring-teal-100"
                    />

                  </div>

                </div>

                <div>

                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Date of birth
                  </label>

                  <div className="relative">

                    <CalendarDays className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      type="date"
                      name="date_of_birth"
                      value={
                        profile.date_of_birth
                      }
                      onChange={
                        handleChange
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 outline-none transition focus:border-[#0F766E] focus:ring-4 focus:ring-teal-100"
                    />

                  </div>

                </div>

              </div>

              {/* ERROR */}

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              {/* SUCCESS */}

              {success && (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">

                  <CheckCircle2 className="h-5 w-5" />

                  {success}

                </div>
              )}

              {/* SAVE */}

              <div className="flex justify-end border-t border-slate-100 pt-6">

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0F766E] px-6 py-3 font-bold text-white transition hover:bg-[#0D655F] disabled:cursor-not-allowed disabled:opacity-60"
                >

                  <Save className="h-4 w-4" />

                  {isSaving
                    ? "Saving changes..."
                    : "Save changes"}

                </button>

              </div>

            </form>

          </section>

          {/* ACCOUNT SUMMARY */}

          <aside className="space-y-6">

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-[#0F766E]">
                <User className="h-6 w-6" />
              </div>

              <h3 className="mt-5 text-xl font-black">
                {profile.first_name ||
                  "CareSphere"}{" "}
                {profile.last_name ||
                  "User"}
              </h3>

              <p className="mt-1 break-all text-sm text-slate-500">
                {profile.email}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">

                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold capitalize text-[#0F766E]">

                  {profile.user_type ===
                  "provider"
                    ? "Care Provider"
                    : "Family Account"}

                </span>

                {profile.is_verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">

                    <ShieldCheck className="h-3.5 w-3.5" />

                    Verified

                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                    Verification pending
                  </span>
                )}

              </div>

            </div>

            {/* PRIVACY */}

            <div className="rounded-[28px] bg-gradient-to-br from-[#0F766E] to-[#0A5B69] p-6 text-white shadow-xl">

              <ShieldCheck className="h-7 w-7 text-[#6EE7D8]" />

              <h3 className="mt-5 text-xl font-black">
                Your privacy matters
              </h3>

              <p className="mt-3 text-sm leading-6 text-teal-50/90">
                CareSphere only uses your account
                information to support your care journey
                and personalise your experience.
              </p>

            </div>

          </aside>

        </div>

      </div>

    </main>
  );
}