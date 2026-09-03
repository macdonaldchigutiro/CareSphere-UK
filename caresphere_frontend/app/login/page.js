"use client";

import {
  Suspense,
  useState,
} from "react";

import Link from "next/link";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  ArrowLeft,
  Eye,
  EyeOff,
  HeartHandshake,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import {
  getDashboardPath,
  saveAuthSession,
} from "../../lib/auth";
import { API_URL } from "../../lib/config";

// ======================================================
// LOGIN CONTENT
// ======================================================

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showPassword, setShowPassword] =
    useState(false);

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    keepSignedIn,
    setKeepSignedIn,
  ] = useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [error, setError] =
    useState("");

  // ======================================================
  // RETURN DESTINATION
  // ======================================================

  const requestedNext =
    searchParams.get("next");

  const safeNext =
    requestedNext &&
    requestedNext.startsWith("/") &&
    !requestedNext.startsWith("//")
      ? requestedNext
      : "/dashboard";

  // ======================================================
  // SUBMIT
  // ======================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!email.trim()) {
      setError(
        "Please enter your email address."
      );
      return;
    }

    if (!password) {
      setError(
        "Please enter your password."
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(
        `${API_URL}/api/users/login/`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            email:
              email
                .trim()
                .toLowerCase(),

            password,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        if (data.non_field_errors) {
          setError(
            Array.isArray(
              data.non_field_errors
            )
              ? data.non_field_errors[0]
              : data.non_field_errors
          );
        } else if (data.detail) {
          setError(data.detail);
        } else {
          setError(
            "Invalid email address or password."
          );
        }

        return;
      }

      saveAuthSession({
        access: data.access,
        refresh: data.refresh,
        user: data.user,
        persistent: keepSignedIn,
      });

      const destination = requestedNext
        ? safeNext
        : getDashboardPath(data.user);

      router.replace(destination);
    } catch (err) {
      console.error(
        "Login error:",
        err
      );

      setError(
        "Unable to connect to CareSphere. Please make sure the backend is running."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ======================================================
  // UI
  // ======================================================

  return (
    <main className="min-h-screen bg-[#F7FAFC]">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* LEFT PANEL */}

        <section className="relative hidden overflow-hidden bg-[#071A2B] p-12 lg:flex lg:flex-col lg:justify-between">

          <div className="absolute -left-32 top-16 h-96 w-96 rounded-full bg-[#0F766E]/30 blur-3xl" />

          <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />

          <Link
            href="/"
            className="relative z-10 flex w-fit items-center gap-3 text-white"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F766E]">
              <HeartHandshake className="h-6 w-6" />
            </div>

            <div>
              <div className="text-xl font-extrabold">
                CareSphere{" "}
                <span className="text-[#6EE7D8]">
                  UK
                </span>
              </div>

              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Care with confidence
              </div>
            </div>
          </Link>

          <div className="relative z-10 max-w-xl">

            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-[#6EE7D8]">

              <ShieldCheck className="h-4 w-4" />

              Secure access
            </div>

            <h1 className="text-5xl font-black leading-tight tracking-tight text-white">

              Welcome back to

              <span className="block text-[#6EE7D8]">
                CareSphere.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
              Sign in to manage your care
              journey, review providers,
              collaborate with family and
              keep your decisions organised.
            </p>

          </div>

          <p className="relative z-10 text-sm text-slate-500">
            ©{" "}
            {new Date().getFullYear()}{" "}
            CareSphere UK
          </p>

        </section>

        {/* LOGIN FORM */}

        <section className="flex items-center justify-center px-5 py-12 md:px-10">

          <div className="w-full max-w-md">

            <Link
              href="/"
              className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#0F766E] lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to CareSphere
            </Link>

            <div className="mb-8">

              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0F766E]">
                Sign in
              </p>

              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
                Welcome back
              </h2>

              <p className="mt-3 leading-7 text-slate-500">
                Enter your account details
                to continue.
              </p>

              {requestedNext && (
                <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-medium text-[#0F766E]">
                  Sign in and we&apos;ll
                  return you to where you
                  left off.
                </div>
              )}

            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

              {/* EMAIL */}

              <div>

                <label
                  htmlFor="login-email"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Email address
                </label>

                <div className="relative">

                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 outline-none transition focus:border-[#0F766E] focus:ring-4 focus:ring-teal-100"
                  />

                </div>
              </div>

              {/* PASSWORD */}

              <div>

                <div className="mb-2 flex items-center justify-between">

                  <label
                    htmlFor="login-password"
                    className="text-sm font-bold text-slate-700"
                  >
                    Password
                  </label>

                  <button
                    type="button"
                    className="text-sm font-semibold text-[#0F766E]"
                  >
                    Forgot password?
                  </button>

                </div>

                <div className="relative">

                  <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    id="login-password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value
                      )
                    }
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-12 outline-none transition focus:border-[#0F766E] focus:ring-4 focus:ring-teal-100"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (value) => !value
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>

                </div>

              </div>

              {/* KEEP SIGNED IN */}

              <label className="flex items-center gap-3 text-sm text-slate-600">

                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(event) =>
                    setKeepSignedIn(
                      event.target.checked
                    )
                  }
                  className="h-4 w-4 accent-[#0F766E]"
                />

                Keep me signed in

              </label>

              {/* ERROR */}

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              {/* SUBMIT */}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-[#0F766E] py-4 font-bold text-white shadow-lg shadow-teal-100 transition hover:bg-[#0D655F] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Signing you in..."
                  : "Sign in to CareSphere"}
              </button>

            </form>

            <p className="mt-8 text-center text-sm text-slate-500">

              Don&apos;t have an account?{" "}

              <Link
                href="/register"
                className="font-bold text-[#0F766E] hover:underline"
              >
                Create one
              </Link>

            </p>

          </div>

        </section>

      </div>
    </main>
  );
}

// ======================================================
// PAGE
// ======================================================

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F7FAFC]">
          <p className="font-semibold text-slate-500">
            Loading CareSphere...
          </p>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
