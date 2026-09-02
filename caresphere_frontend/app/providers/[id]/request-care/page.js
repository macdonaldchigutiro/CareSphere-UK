"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  HeartHandshake,
  Loader2,
  MessageSquareText,
  User,
} from "lucide-react";

import {
  authFetch,
  createLoginUrl,
  getAuthStorage,
} from "../../../../lib/auth";
import { API_URL } from "../../../../lib/config";

export default function RequestCarePage() {
  const params = useParams();
  const router = useRouter();

  const providerId = params?.id;

  const [provider, setProvider] = useState(null);

  const [form, setForm] = useState({
    care_recipient_name: "",
    care_type: "",
    frequency: "flexible",
    start_date: "",
    start_time: "",
    end_time: "",
    requirements: "",
    notes: "",
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // ======================================================
  // LOGIN REDIRECT
  // ======================================================

  const goToLogin = () => {
    router.replace(
      createLoginUrl(
        `/providers/${providerId}/request-care`
      )
    );
  };

  // ======================================================
  // LOAD PROVIDER
  // ======================================================

  useEffect(() => {
    const loadProvider = async () => {
      if (!providerId) {
        return;
      }

      if (!getAuthStorage()) {
        goToLogin();
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
          "Request care provider load error:",
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
  // FORM CHANGE
  // ======================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
  };

  // ======================================================
  // CREATE DATETIME
  // ======================================================

  const buildDateTime = (date, time) => {
    if (!date || !time) {
      return null;
    }

    return `${date}T${time}:00`;
  };

  // ======================================================
  // SUBMIT REQUEST
  // ======================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!getAuthStorage()) {
      goToLogin();
      return;
    }

    if (!form.care_recipient_name.trim()) {
      setError(
        "Please enter the name of the person who needs care."
      );
      return;
    }

    if (!form.care_type) {
      setError(
        "Please select the type of care required."
      );
      return;
    }

    if (!form.start_date) {
      setError(
        "Please select a preferred start date."
      );
      return;
    }

    if (!form.start_time) {
      setError(
        "Please select a preferred start time."
      );
      return;
    }

    const startTime = buildDateTime(
      form.start_date,
      form.start_time
    );

    let endTime = null;

    if (form.end_time) {
      endTime = buildDateTime(
        form.start_date,
        form.end_time
      );

      if (
        new Date(endTime) <=
        new Date(startTime)
      ) {
        setError(
          "End time must be later than the start time."
        );
        return;
      }
    }

    try {
      setSubmitting(true);

      const response = await authFetch(
        `${API_URL}/api/bookings/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            provider: providerId,
            care_recipient_name:
              form.care_recipient_name.trim(),
            care_type: form.care_type,
            frequency: form.frequency,
            start_time: startTime,
            end_time: endTime,
            requirements:
              form.requirements.trim(),
            notes: form.notes.trim(),
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
        if (data.end_time) {
          throw new Error(
            Array.isArray(data.end_time)
              ? data.end_time[0]
              : data.end_time
          );
        }

        if (data.provider) {
          throw new Error(
            Array.isArray(data.provider)
              ? data.provider[0]
              : data.provider
          );
        }

        if (data.detail) {
          throw new Error(data.detail);
        }

        throw new Error(
          "Unable to submit your care request."
        );
      }

      setSuccess(true);
    } catch (err) {
      console.error(
        "Care request error:",
        err
      );

      setError(
        err.message ||
          "We couldn't submit your care request."
      );
    } finally {
      setSubmitting(false);
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
            Preparing your care request...
          </p>
        </div>
      </main>
    );
  }

  // ======================================================
  // SUCCESS
  // ======================================================

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FAFC] px-5">
        <div className="w-full max-w-xl rounded-[30px] border border-slate-200 bg-white p-8 text-center shadow-xl">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <h1 className="mt-6 text-3xl font-black">
            Care request sent
          </h1>

          <p className="mt-3 leading-7 text-slate-500">
            Your request has been sent to{" "}
            <strong className="text-slate-800">
              {provider?.company_name}
            </strong>
            . The provider can now review your request.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">

            <Link
              href="/dashboard"
              className="rounded-xl bg-[#0F766E] px-6 py-3 font-bold text-white"
            >
              Back to dashboard
            </Link>

            <Link
              href={`/providers/${providerId}`}
              className="rounded-xl border border-slate-200 px-6 py-3 font-bold text-slate-700"
            >
              Provider profile
            </Link>

          </div>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7FAFC] text-slate-950">

      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white">

        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-4 lg:px-8">

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
            href={`/providers/${providerId}`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Provider profile
          </Link>

        </div>

      </header>

      {/* PAGE */}

      <div className="mx-auto max-w-[1000px] px-5 py-10 lg:px-8">

        {/* HERO */}

        <section className="rounded-[32px] bg-[#071A2B] px-7 py-10 text-white shadow-xl md:px-10">

          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#6EE7D8]">
            Request care
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight">
            Request care from{" "}
            {provider?.company_name ||
              "this provider"}
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
            Tell the provider what kind of support
            you need and when you would like care
            to start.
          </p>

        </section>

        {/* FORM */}

        <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">

          <form
            onSubmit={handleSubmit}
            className="space-y-7"
          >

            {/* RECIPIENT */}

            <div>

              <label className="mb-2 block text-sm font-bold text-slate-700">
                Who needs care?
              </label>

              <div className="relative">

                <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  name="care_recipient_name"
                  value={
                    form.care_recipient_name
                  }
                  onChange={handleChange}
                  placeholder="Full name of person needing care"
                  className="w-full rounded-2xl border border-slate-200 py-4 pl-12 pr-4 outline-none focus:border-[#0F766E] focus:ring-4 focus:ring-teal-100"
                />

              </div>

            </div>

            {/* CARE TYPE + FREQUENCY */}

            <div className="grid gap-5 md:grid-cols-2">

              <div>

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Type of care
                </label>

                <select
                  name="care_type"
                  value={form.care_type}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-[#0F766E]"
                >
                  <option value="">
                    Select care type
                  </option>

                  <option value="domiciliary_care">
                    Domiciliary care
                  </option>

                  <option value="personal_care">
                    Personal care
                  </option>

                  <option value="companionship">
                    Companionship
                  </option>

                  <option value="live_in">
                    Live-in care
                  </option>

                  <option value="overnight">
                    Overnight care
                  </option>

                  <option value="respite">
                    Respite care
                  </option>

                  <option value="specialist">
                    Specialist care
                  </option>
                </select>

              </div>

              <div>

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Frequency
                </label>

                <select
                  name="frequency"
                  value={form.frequency}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-[#0F766E]"
                >
                  <option value="one_off">
                    One-off care
                  </option>

                  <option value="daily">
                    Daily
                  </option>

                  <option value="weekly">
                    Weekly
                  </option>

                  <option value="multiple_weekly">
                    Multiple times per week
                  </option>

                  <option value="fortnightly">
                    Fortnightly
                  </option>

                  <option value="live_in">
                    Live-in care
                  </option>

                  <option value="flexible">
                    Flexible / discuss with provider
                  </option>
                </select>

              </div>

            </div>

            {/* DATE */}

            <div>

              <label className="mb-2 block text-sm font-bold text-slate-700">
                Preferred start date
              </label>

              <div className="relative">

                <CalendarDays className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  type="date"
                  name="start_date"
                  value={form.start_date}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 py-4 pl-12 pr-4 outline-none focus:border-[#0F766E]"
                />

              </div>

            </div>

            {/* TIMES */}

            <div className="grid gap-5 md:grid-cols-2">

              <div>

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Preferred start time
                </label>

                <div className="relative">

                  <Clock3 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    type="time"
                    name="start_time"
                    value={form.start_time}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 py-4 pl-12 pr-4 outline-none focus:border-[#0F766E]"
                  />

                </div>

              </div>

              <div>

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Preferred end time
                </label>

                <div className="relative">

                  <Clock3 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    type="time"
                    name="end_time"
                    value={form.end_time}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 py-4 pl-12 pr-4 outline-none focus:border-[#0F766E]"
                  />

                </div>

              </div>

            </div>

            {/* REQUIREMENTS */}

            <div>

              <label className="mb-2 block text-sm font-bold text-slate-700">
                Care requirements
              </label>

              <div className="relative">

                <MessageSquareText className="absolute left-4 top-4 h-5 w-5 text-slate-400" />

                <textarea
                  name="requirements"
                  value={form.requirements}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Tell the provider about mobility support, medication, dementia care, personal care, companionship or other needs..."
                  className="w-full resize-none rounded-2xl border border-slate-200 py-4 pl-12 pr-4 outline-none focus:border-[#0F766E] focus:ring-4 focus:ring-teal-100"
                />

              </div>

            </div>

            {/* NOTES */}

            <div>

              <label className="mb-2 block text-sm font-bold text-slate-700">
                Additional notes
              </label>

              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Anything else you would like the provider to know?"
                className="w-full resize-none rounded-2xl border border-slate-200 p-4 outline-none focus:border-[#0F766E] focus:ring-4 focus:ring-teal-100"
              />

            </div>

            {/* ERROR */}

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            {/* SUBMIT */}

            <div className="flex justify-end border-t border-slate-100 pt-6">

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0F766E] px-7 py-3.5 font-bold text-white transition hover:bg-[#0D655F] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Sending request...
                  </>
                ) : (
                  <>
                    <HeartHandshake className="h-5 w-5" />
                    Send care request
                  </>
                )}
              </button>

            </div>

          </form>

        </section>

      </div>

    </main>
  );
}
