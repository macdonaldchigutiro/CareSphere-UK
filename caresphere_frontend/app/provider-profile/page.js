"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronDown,
  PoundSterling,
  Clock3,
  HeartHandshake,
  Loader2,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Users,
} from "lucide-react";

import {
  authFetch,
  createLoginUrl,
  getAuthStorage,
} from "../../lib/auth";
import { API_URL } from "../../lib/config";

const CARE_TYPES = [
  {
    value: "domiciliary",
    label: "Domiciliary Care",
  },
  {
    value: "residential",
    label: "Residential Care",
  },
  {
    value: "nursing",
    label: "Nursing Care",
  },
  {
    value: "live_in",
    label: "Live-in Care",
  },
  {
    value: "respite",
    label: "Respite Care",
  },
  {
    value: "day_care",
    label: "Day Care Centre",
  },
  {
    value: "specialist",
    label: "Specialist Care",
  },
];

const BUSINESS_TYPES = [
  {
    value: "individual",
    label: "Individual Caregiver",
  },
  {
    value: "agency",
    label: "Care Agency",
  },
  {
    value: "nursing_home",
    label: "Nursing Home",
  },
  {
    value: "residential_home",
    label: "Residential Home",
  },
  {
    value: "charity",
    label: "Charity / Non-profit",
  },
  {
    value: "nhs",
    label: "NHS Trust",
  },
];

const SPECIALISATION_OPTIONS = [
  "Dementia Care",
  "Alzheimer's Care",
  "Parkinson's Care",
  "Stroke Recovery",
  "Palliative Care",
  "Disability Care",
  "Mental Health",
  "Learning Disabilities",
  "Physical Disabilities",
  "Sensory Impairment",
  "Medication Management",
  "Personal Care",
  "Mobility Support",
  "Meal Preparation",
  "Housekeeping",
  "Companionship",
  "Transportation",
  "Night Care",
  "Weekend Care",
  "Holiday Care",
];

const EMPTY_FORM = {
  company_name: "",
  trading_name: "",
  business_type: "",
  company_number: "",
  vat_number: "",

  care_types: [],
  specializations: [],

  address_line1: "",
  address_line2: "",
  city: "",
  postcode: "",
  county: "",
  country: "United Kingdom",

  phone: "",
  email: "",
  website: "",

  max_capacity: 1,
  current_clients: 0,
  staff_count: 0,
  years_operating: 0,

  is_accepting_clients: false,
  emergency_care_available: false,

  hourly_rate_min: "",
  hourly_rate_max: "",
  live_in_rate_min: "",
  live_in_rate_max: "",

  accepts_local_authority_funding: false,
  accepts_nhs_funding: false,
  accepts_private_pay: true,

  is_verified: false,
  verification_status: "",
  verification_badge: "",

  cqc_location_id: "",
  cqc_verified: false,
  cqc_rating: "",
  cqc_status: "",

  insurance_provider: "",
  insurance_expiry: "",
  liability_insurance: false,
  safeguarding_training: false,

  availability_status: "",
};

function normaliseForm(data) {
  return {
    ...EMPTY_FORM,
    ...data,

    care_types: Array.isArray(data?.care_types)
      ? data.care_types
      : [],

    specializations: Array.isArray(data?.specializations)
      ? data.specializations
      : [],

    hourly_rate_min:
      data?.hourly_rate_min ?? "",

    hourly_rate_max:
      data?.hourly_rate_max ?? "",

    live_in_rate_min:
      data?.live_in_rate_min ?? "",

    live_in_rate_max:
      data?.live_in_rate_max ?? "",

    insurance_expiry:
      data?.insurance_expiry ?? "",
  };
}

function FieldLabel({ children, required = false }) {
  return (
    <label className="mb-2 block text-sm font-semibold text-slate-700">
      {children}
      {required && (
        <span className="ml-1 text-rose-500">*</span>
      )}
    </label>
  );
}

function InputField({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  min,
  step,
  disabled = false,
}) {
  return (
    <div>
      <FieldLabel required={required}>
        {label}
      </FieldLabel>

      <input
        name={name}
        value={value ?? ""}
        onChange={onChange}
        type={type}
        placeholder={placeholder}
        required={required}
        min={min}
        step={step}
        disabled={disabled}
        className={[
          "w-full rounded-xl border px-4 py-3 text-sm",
          "outline-none transition",
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
            : "border-slate-300 bg-white text-slate-900 focus:border-teal-500 focus:ring-4 focus:ring-teal-100",
        ].join(" ")}
      />
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        "flex w-full items-center justify-between gap-4",
        "rounded-2xl border p-4 text-left transition",
        checked
          ? "border-teal-300 bg-teal-50"
          : "border-slate-200 bg-white hover:bg-slate-50",
      ].join(" ")}
    >
      <div>
        <p className="font-semibold text-slate-900">
          {label}
        </p>

        {description && (
          <p className="mt-1 text-sm leading-5 text-slate-500">
            {description}
          </p>
        )}
      </div>

      <div
        className={[
          "relative h-6 w-11 flex-shrink-0 rounded-full transition",
          checked
            ? "bg-teal-600"
            : "bg-slate-300",
        ].join(" ")}
      >
        <div
          className={[
            "absolute top-1 h-4 w-4 rounded-full bg-white shadow transition",
            checked
              ? "left-6"
              : "left-1",
          ].join(" ")}
        />
      </div>
    </button>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5 sm:px-7">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-teal-50 p-2.5 text-teal-700">
            <Icon size={20} />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {title}
            </h2>

            {description && (
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-7">
        {children}
      </div>
    </section>
  );
}

function StatusPill({
  children,
  positive = false,
  warning = false,
}) {
  let styles =
    "border-slate-200 bg-slate-100 text-slate-700";

  if (positive) {
    styles =
      "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (warning) {
    styles =
      "border-amber-200 bg-amber-50 text-amber-700";
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${styles}`}
    >
      {children}
    </span>
  );
}

export default function ProviderProfilePage() {
  const router = useRouter();

  const [form, setForm] = useState(EMPTY_FORM);
  const [originalForm, setOriginalForm] =
    useState(EMPTY_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const hasChanges = useMemo(() => {
    return (
      JSON.stringify(form) !==
      JSON.stringify(originalForm)
    );
  }, [form, originalForm]);

  useEffect(() => {
    async function loadProviderProfile() {
      const auth = getAuthStorage();

      if (!auth) {
        router.replace(
          createLoginUrl("/provider-profile")
        );
        return;
      }

      try {
        setLoading(true);
        setError("");

        const profileResponse = await authFetch(
          `${API_URL}/api/users/profile/`
        );

        if (!profileResponse.ok) {
          throw new Error(
            "We could not verify your account."
          );
        }

        const userProfile =
          await profileResponse.json();

        if (
          userProfile.user_type !== "provider" &&
          !userProfile.is_staff &&
          !userProfile.is_superuser
        ) {
          router.replace("/dashboard");
          return;
        }

        const response = await authFetch(
          `${API_URL}/api/care-providers/my-profile/`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.detail ||
              "We could not load your provider profile."
          );
        }

        const normalised = normaliseForm(data);

        setForm(normalised);
        setOriginalForm(normalised);
      } catch (err) {
        setError(
          err.message ||
            "Something went wrong while loading your profile."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProviderProfile();
  }, [router]);

  function handleChange(event) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setSuccess("");

    setForm((current) => ({
      ...current,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  }

  function updateBoolean(name, value) {
    setSuccess("");

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function toggleCareType(value) {
    setSuccess("");

    setForm((current) => {
      const exists =
        current.care_types.includes(value);

      return {
        ...current,
        care_types: exists
          ? current.care_types.filter(
              (item) => item !== value
            )
          : [...current.care_types, value],
      };
    });
  }

  function toggleSpecialisation(value) {
    setSuccess("");

    setForm((current) => {
      const exists =
        current.specializations.includes(value);

      return {
        ...current,
        specializations: exists
          ? current.specializations.filter(
              (item) => item !== value
            )
          : [
              ...current.specializations,
              value,
            ],
      };
    });
  }

  function buildPayload() {
    const nullableMoney = (value) => {
      if (
        value === "" ||
        value === null ||
        value === undefined
      ) {
        return null;
      }

      return value;
    };

    return {
      company_name: form.company_name,
      trading_name: form.trading_name,
      business_type: form.business_type,
      company_number: form.company_number,
      vat_number: form.vat_number,

      care_types: form.care_types,
      specializations: form.specializations,

      address_line1: form.address_line1,
      address_line2: form.address_line2,
      city: form.city,
      postcode: form.postcode,
      county: form.county,
      country: form.country,

      phone: form.phone,
      email: form.email,
      website: form.website,

      max_capacity: Number(
        form.max_capacity || 1
      ),

      years_operating: Number(
        form.years_operating || 0
      ),

      is_accepting_clients:
        form.is_accepting_clients,

      emergency_care_available:
        form.emergency_care_available,

      hourly_rate_min: nullableMoney(
        form.hourly_rate_min
      ),

      hourly_rate_max: nullableMoney(
        form.hourly_rate_max
      ),

      live_in_rate_min: nullableMoney(
        form.live_in_rate_min
      ),

      live_in_rate_max: nullableMoney(
        form.live_in_rate_max
      ),

      accepts_local_authority_funding:
        form.accepts_local_authority_funding,

      accepts_nhs_funding:
        form.accepts_nhs_funding,

      accepts_private_pay:
        form.accepts_private_pay,

      insurance_provider:
        form.insurance_provider,

      insurance_expiry:
        form.insurance_expiry || null,

      liability_insurance:
        form.liability_insurance,

      safeguarding_training:
        form.safeguarding_training,
    };
  }

  function formatApiErrors(data) {
    if (!data) {
      return "Unable to save your changes.";
    }

    if (typeof data.detail === "string") {
      return data.detail;
    }

    const messages = [];

    Object.entries(data).forEach(
      ([field, value]) => {
        if (Array.isArray(value)) {
          messages.push(
            `${field.replaceAll("_", " ")}: ${value.join(
              " "
            )}`
          );
        } else if (
          typeof value === "string"
        ) {
          messages.push(
            `${field.replaceAll("_", " ")}: ${value}`
          );
        }
      }
    );

    return (
      messages.join(" • ") ||
      "Unable to save your changes."
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await authFetch(
        `${API_URL}/api/care-providers/my-profile/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            buildPayload()
          ),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          formatApiErrors(data)
        );
      }

      const normalised =
        normaliseForm(data);

      setForm(normalised);
      setOriginalForm(normalised);

      setSuccess(
        "Provider profile updated successfully."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      setError(
        err.message ||
          "Unable to save your changes."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2
            size={38}
            className="mx-auto animate-spin text-teal-600"
          />

          <p className="mt-4 font-medium text-slate-600">
            Loading provider profile...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-600 p-2.5 text-white">
              <HeartHandshake size={23} />
            </div>

            <div>
              <p className="font-bold text-slate-900">
                CareSphere
              </p>

              <p className="text-xs text-slate-500">
                Provider Workspace
              </p>
            </div>
          </div>

          <Link
            href="/provider-dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={17} />
            Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-teal-700">
              Provider settings
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              My Provider Profile
            </h1>

            <p className="mt-3 max-w-2xl text-slate-600">
              Keep your organisation,
              services, pricing and
              availability information up to
              date for families using
              CareSphere.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusPill
              positive={
                form.availability_status ===
                "available"
              }
              warning={
                form.availability_status ===
                "limited"
              }
            >
              {form.availability_status ===
              "available"
                ? "Accepting clients"
                : form.availability_status ===
                    "limited"
                  ? "Limited capacity"
                  : form.availability_status ===
                      "full"
                    ? "At capacity"
                    : "Not accepting clients"}
            </StatusPill>

            <StatusPill
              positive={form.is_verified}
              warning={
                form.verification_status ===
                "pending"
              }
            >
              {form.verification_badge ||
                "Verification status"}
            </StatusPill>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
            <CheckCircle2 size={19} />
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <Section
            icon={Building2}
            title="Business information"
            description="The core information families see about your organisation."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <InputField
                label="Company name"
                name="company_name"
                value={form.company_name}
                onChange={handleChange}
                required
              />

              <InputField
                label="Trading name"
                name="trading_name"
                value={form.trading_name}
                onChange={handleChange}
              />

              <div>
                <FieldLabel required>
                  Business type
                </FieldLabel>

                <div className="relative">
                  <select
                    name="business_type"
                    value={
                      form.business_type
                    }
                    onChange={handleChange}
                    required
                    className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                  >
                    <option value="">
                      Select business type
                    </option>

                    {BUSINESS_TYPES.map(
                      (item) => (
                        <option
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </option>
                      )
                    )}
                  </select>

                  <ChevronDown
                    size={17}
                    className="pointer-events-none absolute right-3 top-3.5 text-slate-400"
                  />
                </div>
              </div>

              <InputField
                label="Years operating"
                name="years_operating"
                value={form.years_operating}
                onChange={handleChange}
                type="number"
                min="0"
              />

              <InputField
                label="Company number"
                name="company_number"
                value={form.company_number}
                onChange={handleChange}
              />

              <InputField
                label="VAT number"
                name="vat_number"
                value={form.vat_number}
                onChange={handleChange}
              />
            </div>
          </Section>

          <Section
            icon={Phone}
            title="Contact details"
            description="How families and CareSphere can contact your organisation."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <InputField
                label="Phone number"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
              />

              <InputField
                label="Email address"
                name="email"
                value={form.email}
                onChange={handleChange}
                type="email"
                required
              />

              <div className="md:col-span-2">
                <InputField
                  label="Website"
                  name="website"
                  value={form.website}
                  onChange={handleChange}
                  type="url"
                  placeholder="https://"
                />
              </div>
            </div>
          </Section>

          <Section
            icon={MapPin}
            title="Business address"
            description="The main location associated with your care service."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <InputField
                  label="Address line 1"
                  name="address_line1"
                  value={form.address_line1}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <InputField
                  label="Address line 2"
                  name="address_line2"
                  value={form.address_line2}
                  onChange={handleChange}
                />
              </div>

              <InputField
                label="Town / City"
                name="city"
                value={form.city}
                onChange={handleChange}
                required
              />

              <InputField
                label="County"
                name="county"
                value={form.county}
                onChange={handleChange}
                required
              />

              <InputField
                label="Postcode"
                name="postcode"
                value={form.postcode}
                onChange={handleChange}
                required
              />

              <InputField
                label="Country"
                name="country"
                value={form.country}
                onChange={handleChange}
                required
              />
            </div>
          </Section>

          <Section
            icon={HeartHandshake}
            title="Care services"
            description="Choose the main types of care your organisation provides."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CARE_TYPES.map((item) => {
                const selected =
                  form.care_types.includes(
                    item.value
                  );

                return (
                  <button
                    type="button"
                    key={item.value}
                    onClick={() =>
                      toggleCareType(
                        item.value
                      )
                    }
                    className={[
                      "flex items-center gap-3 rounded-2xl border p-4 text-left transition",
                      selected
                        ? "border-teal-300 bg-teal-50 text-teal-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "flex h-5 w-5 items-center justify-center rounded-md border",
                        selected
                          ? "border-teal-600 bg-teal-600 text-white"
                          : "border-slate-300 bg-white",
                      ].join(" ")}
                    >
                      {selected && (
                        <CheckCircle2
                          size={14}
                        />
                      )}
                    </div>

                    <span className="text-sm font-semibold">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section
            icon={BadgeCheck}
            title="Specialisations"
            description="Highlight areas where your service has additional experience or capability."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SPECIALISATION_OPTIONS.map(
                (item) => {
                  const selected =
                    form.specializations.includes(
                      item
                    );

                  return (
                    <button
                      type="button"
                      key={item}
                      onClick={() =>
                        toggleSpecialisation(
                          item
                        )
                      }
                      className={[
                        "rounded-xl border px-4 py-3 text-left text-sm font-medium transition",
                        selected
                          ? "border-teal-300 bg-teal-50 text-teal-800"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      {selected
                        ? "✓ "
                        : ""}
                      {item}
                    </button>
                  );
                }
              )}
            </div>
          </Section>

          <Section
            icon={PoundSterling}
            title="Pricing & funding"
            description="Provide indicative pricing and the funding arrangements you accept."
          >
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <InputField
                label="Hourly rate from (£)"
                name="hourly_rate_min"
                value={form.hourly_rate_min}
                onChange={handleChange}
                type="number"
                min="0"
                step="0.01"
              />

              <InputField
                label="Hourly rate to (£)"
                name="hourly_rate_max"
                value={form.hourly_rate_max}
                onChange={handleChange}
                type="number"
                min="0"
                step="0.01"
              />

              <InputField
                label="Live-in rate from (£)"
                name="live_in_rate_min"
                value={form.live_in_rate_min}
                onChange={handleChange}
                type="number"
                min="0"
                step="0.01"
              />

              <InputField
                label="Live-in rate to (£)"
                name="live_in_rate_max"
                value={form.live_in_rate_max}
                onChange={handleChange}
                type="number"
                min="0"
                step="0.01"
              />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <Toggle
                checked={
                  form.accepts_private_pay
                }
                onChange={(value) =>
                  updateBoolean(
                    "accepts_private_pay",
                    value
                  )
                }
                label="Private pay"
                description="Accept privately funded care."
              />

              <Toggle
                checked={
                  form.accepts_local_authority_funding
                }
                onChange={(value) =>
                  updateBoolean(
                    "accepts_local_authority_funding",
                    value
                  )
                }
                label="Local authority funding"
                description="Accept local authority funded care."
              />

              <Toggle
                checked={
                  form.accepts_nhs_funding
                }
                onChange={(value) =>
                  updateBoolean(
                    "accepts_nhs_funding",
                    value
                  )
                }
                label="NHS funding"
                description="Accept eligible NHS-funded care."
              />
            </div>
          </Section>

          <Section
            icon={Users}
            title="Capacity & availability"
            description="Control whether families can currently consider your service for new care."
          >
            <div className="mb-6 grid gap-5 md:grid-cols-3">
              <InputField
                label="Maximum client capacity"
                name="max_capacity"
                value={form.max_capacity}
                onChange={handleChange}
                type="number"
                min="1"
                required
              />

              <InputField
                label="Current clients"
                name="current_clients"
                value={form.current_clients}
                onChange={handleChange}
                type="number"
                disabled
              />

              <InputField
                label="Registered staff"
                name="staff_count"
                value={form.staff_count}
                onChange={handleChange}
                type="number"
                disabled
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Toggle
                checked={
                  form.is_accepting_clients
                }
                onChange={(value) =>
                  updateBoolean(
                    "is_accepting_clients",
                    value
                  )
                }
                label="Accepting new clients"
                description="Allow your provider profile to appear as accepting new care enquiries."
              />

              <Toggle
                checked={
                  form.emergency_care_available
                }
                onChange={(value) =>
                  updateBoolean(
                    "emergency_care_available",
                    value
                  )
                }
                label="Emergency care available"
                description="Indicate that your service may be able to respond to urgent care requirements."
              />
            </div>
          </Section>

          <Section
            icon={ShieldCheck}
            title="Compliance & verification"
            description="Provider-managed compliance details and CareSphere verification information."
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-5">
                <InputField
                  label="Insurance provider"
                  name="insurance_provider"
                  value={
                    form.insurance_provider
                  }
                  onChange={handleChange}
                />

                <InputField
                  label="Insurance expiry"
                  name="insurance_expiry"
                  value={
                    form.insurance_expiry
                  }
                  onChange={handleChange}
                  type="date"
                />

                <Toggle
                  checked={
                    form.liability_insurance
                  }
                  onChange={(value) =>
                    updateBoolean(
                      "liability_insurance",
                      value
                    )
                  }
                  label="Liability insurance"
                  description="Confirm that appropriate liability insurance is currently held."
                />

                <Toggle
                  checked={
                    form.safeguarding_training
                  }
                  onChange={(value) =>
                    updateBoolean(
                      "safeguarding_training",
                      value
                    )
                  }
                  label="Safeguarding training"
                  description="Confirm safeguarding training arrangements are in place."
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-3">
                  <ShieldCheck
                    size={22}
                    className="text-teal-700"
                  />

                  <h3 className="font-bold text-slate-900">
                    CareSphere verification
                  </h3>
                </div>

                <div className="mt-5 space-y-4 text-sm">
                  <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
                    <span className="text-slate-500">
                      Provider status
                    </span>

                    <span className="font-semibold text-slate-800">
                      {form.verification_badge ||
                        form.verification_status ||
                        "Pending"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
                    <span className="text-slate-500">
                      CQC status
                    </span>

                    <span className="text-right font-semibold text-slate-800">
                      {form.cqc_status ||
                        "Not CQC registered"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
                    <span className="text-slate-500">
                      CQC rating
                    </span>

                    <span className="font-semibold text-slate-800">
                      {form.cqc_rating ||
                        "Not rated"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">
                      CQC location ID
                    </span>

                    <span className="font-semibold text-slate-800">
                      {form.cqc_location_id ||
                        "Not recorded"}
                    </span>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-700">
                  Verification and CQC
                  approval information is
                  controlled by CareSphere
                  administrators and cannot
                  be changed from this page.
                </div>
              </div>
            </div>
          </Section>

          <div className="sticky bottom-4 z-20">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {hasChanges
                    ? "You have unsaved changes."
                    : "Your profile is up to date."}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Changes to public
                  information may be visible
                  to families using
                  CareSphere.
                </p>
              </div>

              <div className="flex gap-3">
                <Link
                  href="/provider-dashboard"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={
                    saving || !hasChanges
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={17} />
                      Save changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
