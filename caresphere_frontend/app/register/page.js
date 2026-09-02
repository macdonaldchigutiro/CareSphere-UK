"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  HeartHandshake,
  LockKeyhole,
  Mail,
  User,
  Users,
} from "lucide-react";
import { API_URL } from "../../lib/config";

export default function RegisterPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState("family");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (!agreed) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName =
      nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    try {
      setIsSubmitting(true);

      const response = await fetch(
        `${API_URL}/api/users/register/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            first_name: firstName,
            last_name: lastName,
            password,
            user_type: accountType,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.email) {
          setError(
            Array.isArray(data.email) ? data.email[0] : data.email
          );
        } else if (data.password) {
          setError(
            Array.isArray(data.password)
              ? data.password[0]
              : data.password
          );
        } else if (data.detail) {
          setError(data.detail);
        } else if (data.non_field_errors) {
          setError(
            Array.isArray(data.non_field_errors)
              ? data.non_field_errors[0]
              : data.non_field_errors
          );
        } else {
          setError("Registration failed. Please check your details.");
        }

        return;
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("caresphere_access", data.access);
        localStorage.setItem("caresphere_refresh", data.refresh);
        localStorage.setItem(
          "caresphere_user",
          JSON.stringify(data.user)
        );
      }

      setSuccess("Account created successfully.");

      setTimeout(() => {
        router.push("/");
      }, 800);
    } catch (err) {
      console.error("Registration error:", err);

      setError(
        "Unable to connect to CareSphere. Please make sure the backend is running."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F7FAFC]">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* LEFT PANEL */}
        <section className="relative hidden overflow-hidden bg-[#071A2B] p-12 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-[#0F766E]/30 blur-3xl" />
          <div className="absolute -bottom-24 right-0 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />

          <Link
            href="/"
            className="relative z-10 flex w-fit items-center gap-3 text-white"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F766E]">
              <HeartHandshake className="h-6 w-6" />
            </div>

            <div>
              <div className="text-xl font-extrabold">
                CareSphere <span className="text-[#6EE7D8]">UK</span>
              </div>

              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Care with confidence
              </div>
            </div>
          </Link>

          <div className="relative z-10 max-w-xl">
            <h1 className="text-5xl font-black leading-tight tracking-tight text-white">
              Better care decisions
              <span className="block text-[#6EE7D8]">start here.</span>
            </h1>

            <div className="mt-8 space-y-4">
              {[
                "Compare trusted care providers",
                "Save and shortlist your favourites",
                "Collaborate with family members",
                "Manage your care journey in one place",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 text-slate-200"
                >
                  <CheckCircle2 className="h-5 w-5 text-[#6EE7D8]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-sm text-slate-500">
            © {new Date().getFullYear()} CareSphere UK
          </p>
        </section>

        {/* REGISTRATION FORM */}
        <section className="flex items-center justify-center px-5 py-12 md:px-10">
          <div className="w-full max-w-lg">
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#0F766E] lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to CareSphere
            </Link>

            <div className="mb-7">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0F766E]">
                Get started
              </p>

              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
                Create your account
              </h2>

              <p className="mt-3 text-slate-500">
                Choose how you&apos;ll use CareSphere.
              </p>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAccountType("family")}
                className={`rounded-2xl border p-4 text-left transition ${
                  accountType === "family"
                    ? "border-[#0F766E] bg-teal-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <Users className="mb-3 h-5 w-5 text-[#0F766E]" />

                <div className="font-bold text-slate-950">
                  Family / Individual
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Find care for yourself or someone you support.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAccountType("provider")}
                className={`rounded-2xl border p-4 text-left transition ${
                  accountType === "provider"
                    ? "border-[#0F766E] bg-teal-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <HeartHandshake className="mb-3 h-5 w-5 text-[#0F766E]" />

                <div className="font-bold text-slate-950">
                  Care Provider
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Join CareSphere and reach families seeking care.
                </div>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Full name
                </label>

                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Your full name"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 outline-none transition focus:border-[#0F766E] focus:ring-4 focus:ring-teal-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Email address
                </label>

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 outline-none transition focus:border-[#0F766E] focus:ring-4 focus:ring-teal-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Create a secure password"
                    required
                    minLength={6}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-12 outline-none transition focus:border-[#0F766E] focus:ring-4 focus:ring-teal-100"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((value) => !value)
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-3 text-sm leading-6 text-slate-500">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(event) => setAgreed(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#0F766E]"
                />

                <span>
                  I agree to the CareSphere Terms of Service and Privacy Policy.
                </span>
              </label>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-[#0F766E] py-4 font-bold text-white shadow-lg shadow-teal-100 transition hover:bg-[#0D655F] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Creating your account..."
                  : "Create CareSphere account"}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-bold text-[#0F766E] hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
