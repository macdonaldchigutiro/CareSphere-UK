"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Heart,
  HeartHandshake,
  Loader2,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  PoundSterling,
  ShieldCheck,
  Star,
  User,
  Users,
  X,
} from "lucide-react";

import {
  authFetch,
  createLoginUrl,
  getAuthStorage,
} from "../../../lib/auth";


const API_URL =
  "http://127.0.0.1:8000";


const EMPTY_BOOKING_FORM = {
  service_user: "",
  care_type: "",
  frequency: "flexible",
  start_time: "",
  end_time: "",
  requirements: "",
  notes: "",
};


export default function ProviderDetailsPage() {
  const params =
    useParams();

  const router =
    useRouter();

  const providerId =
    params?.id;

  const [
    provider,
    setProvider,
  ] = useState(null);

  const [
    savedProviderId,
    setSavedProviderId,
  ] = useState(null);

  const [
    serviceUsers,
    setServiceUsers,
  ] = useState([]);

  const [
    showBookingModal,
    setShowBookingModal,
  ] = useState(false);

  const [
    bookingForm,
    setBookingForm,
  ] = useState(
    EMPTY_BOOKING_FORM
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    bookingSaving,
    setBookingSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");


  // ======================================================
  // LOAD PROVIDER
  // ======================================================

  useEffect(() => {
    const loadProvider =
      async () => {
        if (!providerId) {
          return;
        }

        try {
          setLoading(true);
          setError("");

          const response =
            await fetch(
              `${API_URL}/api/care-providers/providers/${providerId}/`
            );

          if (!response.ok) {
            throw new Error(
              "Unable to load this care provider."
            );
          }

          const data =
            await response.json();

          setProvider(
            data
          );

          if (
            Array.isArray(
              data.care_types
            ) &&
            data.care_types.length >
              0
          ) {
            setBookingForm(
              (current) => ({
                ...current,
                care_type:
                  data.care_types[
                    0
                  ],
              })
            );
          }
        } catch (err) {
          console.error(
            "Provider detail error:",
            err
          );

          setError(
            err.message ||
              "We couldn't load this care provider."
          );
        } finally {
          setLoading(
            false
          );
        }
      };

    loadProvider();
  }, [
    providerId,
  ]);


  // ======================================================
  // CHECK SAVED PROVIDER
  // ======================================================

  useEffect(() => {
    const checkSavedStatus =
      async () => {
        if (!providerId) {
          return;
        }

        if (
          !getAuthStorage()
        ) {
          return;
        }

        try {
          const response =
            await authFetch(
              `${API_URL}/api/family/saved-providers/`,
              {
                method:
                  "GET",

                headers: {
                  "Content-Type":
                    "application/json",
                },
              }
            );

          if (
            !response ||
            !response.ok
          ) {
            return;
          }

          const data =
            await response.json();

          const items =
            Array.isArray(data)
              ? data
              : Array.isArray(
                  data.results
                )
              ? data.results
              : [];

          const match =
            items.find(
              (item) =>
                item?.provider
                  ?.id ===
                providerId
            );

          if (match) {
            setSavedProviderId(
              match.id
            );
          }
        } catch (err) {
          console.error(
            "Saved provider check error:",
            err
          );
        }
      };

    checkSavedStatus();
  }, [
    providerId,
  ]);


  // ======================================================
  // LOAD SERVICE USERS
  // ======================================================

  useEffect(() => {
    const loadServiceUsers =
      async () => {
        if (
          !getAuthStorage()
        ) {
          return;
        }

        try {
          const response =
            await authFetch(
              `${API_URL}/api/service-users/profiles/`,
              {
                method:
                  "GET",

                headers: {
                  "Content-Type":
                    "application/json",
                },
              }
            );

          if (!response) {
            return;
          }

          if (
            response.status ===
            401
          ) {
            return;
          }

          if (!response.ok) {
            return;
          }

          const data =
            await response.json();

          const items =
            Array.isArray(data)
              ? data
              : Array.isArray(
                  data.results
                )
              ? data.results
              : [];

          const activeItems =
            items.filter(
              (item) =>
                item.is_active !==
                false
            );

          setServiceUsers(
            activeItems
          );

          if (
            activeItems.length ===
              1 &&
            !bookingForm.service_user
          ) {
            setBookingForm(
              (current) => ({
                ...current,

                service_user:
                  String(
                    activeItems[0]
                      .id
                  ),
              })
            );
          }
        } catch (err) {
          console.error(
            "Service users loading error:",
            err
          );
        }
      };

    loadServiceUsers();
  }, []);


  // ======================================================
  // SAVE PROVIDER
  // ======================================================

  const handleSaveProvider =
    async () => {
      setError("");
      setMessage("");

      if (
        !getAuthStorage()
      ) {
        router.push(
          createLoginUrl(
            `/providers/${providerId}`
          )
        );

        return;
      }

      try {
        setSaving(true);

        const response =
          await authFetch(
            `${API_URL}/api/family/saved-providers/`,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  {
                    provider_id:
                      providerId,

                    notes: "",
                  }
                ),
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

        if (
          response.status ===
          401
        ) {
          router.push(
            createLoginUrl(
              `/providers/${providerId}`
            )
          );

          return;
        }

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.detail ||
              "Unable to save this provider."
          );
        }

        setSavedProviderId(
          data.id
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
        setSaving(
          false
        );
      }
    };


  // ======================================================
  // REMOVE SAVED PROVIDER
  // ======================================================

  const handleRemoveProvider =
    async () => {
      if (
        !savedProviderId
      ) {
        return;
      }

      setError("");
      setMessage("");

      try {
        setSaving(true);

        const response =
          await authFetch(
            `${API_URL}/api/family/saved-providers/${savedProviderId}/`,
            {
              method:
                "DELETE",
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

        setSavedProviderId(
          null
        );

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
        setSaving(
          false
        );
      }
    };


  // ======================================================
  // OPEN BOOKING FORM
  // ======================================================

  const handleOpenBooking =
    () => {
      setError("");
      setMessage("");

      if (
        !getAuthStorage()
      ) {
        router.push(
          createLoginUrl(
            `/providers/${providerId}`
          )
        );

        return;
      }

      setShowBookingModal(
        true
      );
    };


  // ======================================================
  // BOOKING FORM
  // ======================================================

  const handleBookingChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setBookingForm(
        (current) => ({
          ...current,
          [name]: value,
        })
      );

      setError("");
      setMessage("");
    };


  // ======================================================
  // CREATE CARE REQUEST
  // ======================================================

  const handleCreateBooking =
    async (event) => {
      event.preventDefault();

      if (
        !getAuthStorage()
      ) {
        router.push(
          createLoginUrl(
            `/providers/${providerId}`
          )
        );

        return;
      }

      if (
        !bookingForm
          .service_user
      ) {
        setError(
          "Please choose who the care is for."
        );

        return;
      }

      if (
        !bookingForm.care_type
      ) {
        setError(
          "Please choose the type of care required."
        );

        return;
      }

      if (
        !bookingForm.start_time
      ) {
        setError(
          "Please choose the preferred start date and time."
        );

        return;
      }

      if (
        !bookingForm.end_time
      ) {
        setError(
          "Please choose the preferred end date and time."
        );

        return;
      }

      if (
        new Date(
          bookingForm.end_time
        ) <=
          new Date(
            bookingForm.start_time
          )
      ) {
        setError(
          "End date and time must be later than the start date and time."
        );

        return;
      }

      try {
        setBookingSaving(
          true
        );

        setError("");
        setMessage("");

        const response =
          await authFetch(
            `${API_URL}/api/bookings/`,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  {
                    provider:
                      providerId,

                    service_user:
                      Number(
                        bookingForm
                          .service_user
                      ),

                    care_type:
                      bookingForm
                        .care_type,

                    frequency:
                      bookingForm
                        .frequency,

                    start_time:
                      bookingForm
                        .start_time
                        ? new Date(
                            bookingForm
                              .start_time
                          ).toISOString()
                        : null,

                    end_time:
                      bookingForm
                        .end_time
                        ? new Date(
                            bookingForm
                              .end_time
                          ).toISOString()
                        : null,

                    requirements:
                      bookingForm
                        .requirements
                        .trim(),

                    notes:
                      bookingForm
                        .notes
                        .trim(),
                  }
                ),
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

        if (
          response.status ===
          401
        ) {
          router.push(
            createLoginUrl(
              `/providers/${providerId}`
            )
          );

          return;
        }

        const data =
          await response.json();

        if (!response.ok) {
          const detail =
            data?.detail;

          const serviceUserError =
            data
              ?.service_user?.[0];

          const providerError =
            data
              ?.provider?.[0];

          const endTimeError =
            data
              ?.end_time?.[0];

          throw new Error(
            detail ||
              serviceUserError ||
              providerError ||
              endTimeError ||
              "Unable to create this care request."
          );
        }

        setShowBookingModal(
          false
        );

        setBookingForm(
          {
            ...EMPTY_BOOKING_FORM,

            care_type:
              Array.isArray(
                provider
                  ?.care_types
              ) &&
              provider
                .care_types
                .length >
                0
                ? provider
                    .care_types[
                    0
                  ]
                : "",

            service_user:
              serviceUsers
                .length ===
              1
                ? String(
                    serviceUsers[
                      0
                    ].id
                  )
                : "",
          }
        );

        setMessage(
          "Care request sent successfully."
        );

        router.push(
          "/bookings"
        );
      } catch (err) {
        console.error(
          "Create booking error:",
          err
        );

        setError(
          err.message ||
            "We couldn't send this care request."
        );
      } finally {
        setBookingSaving(
          false
        );
      }
    };


  // ======================================================
  // PRICING
  // ======================================================

  const formatPrice = (
    value
  ) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }

    const number =
      Number(value);

    if (
      Number.isNaN(number)
    ) {
      return value;
    }

    return new Intl.NumberFormat(
      "en-GB",
      {
        style:
          "currency",
        currency:
          "GBP",
        minimumFractionDigits:
          0,
        maximumFractionDigits:
          2,
      }
    ).format(
      number
    );
  };


  const minRate =
    useMemo(
      () =>
        formatPrice(
          provider
            ?.hourly_rate_min
        ),
      [
        provider,
      ]
    );

  const maxRate =
    useMemo(
      () =>
        formatPrice(
          provider
            ?.hourly_rate_max
        ),
      [
        provider,
      ]
    );

  const liveInMin =
    useMemo(
      () =>
        formatPrice(
          provider
            ?.live_in_rate_min
        ),
      [
        provider,
      ]
    );

  const liveInMax =
    useMemo(
      () =>
        formatPrice(
          provider
            ?.live_in_rate_max
        ),
      [
        provider,
      ]
    );


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


  const isSaved =
    Boolean(
      savedProviderId
    );


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
            href="/find-care"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >

            <ArrowLeft className="h-4 w-4" />

            Back to Find Care

          </Link>

        </div>

      </header>


      <div className="mx-auto max-w-[1400px] px-5 py-10 lg:px-8">

        {/* MESSAGES */}

        {message && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">

            <CheckCircle2 className="h-5 w-5" />

            {message}

          </div>
        )}

        {error &&
          !showBookingModal && (
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
                    Trading as{" "}
                    {provider.trading_name}
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
                      .filter(
                        Boolean
                      )
                      .join(", ")}

                  </span>

                  <span className="inline-flex items-center gap-2">

                    <CalendarDays className="h-4 w-4 text-[#6EE7D8]" />

                    {provider.years_operating ||
                      0}{" "}
                    years operating

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
              disabled={
                saving
              }
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
                  icon={
                    Building2
                  }
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
                  icon={
                    Users
                  }
                  title="Staff"
                  value={`${provider.staff_count || 0}`}
                />

                <InfoCard
                  icon={
                    ShieldCheck
                  }
                  title="Availability"
                  value={
                    provider.availability_status ===
                    "available"
                      ? "Accepting clients"
                      : provider.availability_status ===
                        "limited"
                      ? "Limited availability"
                      : provider.availability_status ===
                        "full"
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

                {Array.isArray(
                  provider.care_types
                ) &&
                provider.care_types
                  .length >
                  0 ? (
                  provider.care_types.map(
                    (
                      careType
                    ) => (
                      <span
                        key={
                          careType
                        }
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

              {Array.isArray(
                provider.specializations
              ) &&
                provider
                  .specializations
                  .length >
                  0 && (
                  <div className="mt-7">

                    <h3 className="font-black">
                      Specialisations
                    </h3>

                    <div className="mt-3 flex flex-wrap gap-2">

                      {provider.specializations.map(
                        (
                          item
                        ) => (
                          <span
                            key={
                              item
                            }
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

                    {minRate &&
                    maxRate
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

                    {liveInMin &&
                    liveInMax
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
                    href={
                      provider.website
                    }
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


            {/* REQUEST CARE */}

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
                onClick={
                  handleOpenBooking
                }
                className="mt-5 w-full rounded-xl bg-white px-5 py-3 font-bold text-[#0F766E]"
              >
                Request care
              </button>

              <Link
                href="/bookings"
                className="mt-3 block text-center text-sm font-bold text-teal-100"
              >
                View my bookings
              </Link>

            </section>

          </aside>

        </div>

      </div>


      {/* ==================================================
          REQUEST CARE MODAL
      ================================================== */}

      {showBookingModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-4 py-8 backdrop-blur-sm">

          <div className="mx-auto w-full max-w-3xl rounded-[30px] bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 md:px-8">

              <div>

                <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">
                  Care request
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  Request care from{" "}
                  {provider.company_name}
                </h2>

              </div>

              <button
                type="button"
                onClick={() => {
                  setShowBookingModal(
                    false
                  );

                  setError("");
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500"
              >

                <X className="h-5 w-5" />

              </button>

            </div>


            <form
              onSubmit={
                handleCreateBooking
              }
              className="space-y-6 p-6 md:p-8"
            >

              {/* CARE RECIPIENT */}

              <div>

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Who is the care for?
                </label>

                {serviceUsers.length >
                0 ? (
                  <select
                    name="service_user"
                    value={
                      bookingForm.service_user
                    }
                    onChange={
                      handleBookingChange
                    }
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none focus:border-[#0F766E] focus:ring-4 focus:ring-teal-100"
                  >

                    <option value="">
                      Select care recipient
                    </option>

                    {serviceUsers.map(
                      (
                        serviceUser
                      ) => (
                        <option
                          key={
                            serviceUser.id
                          }
                          value={
                            serviceUser.id
                          }
                        >

                          {serviceUser.full_name ||
                            `${serviceUser.first_name || ""} ${serviceUser.last_name || ""}`.trim()}

                        </option>
                      )
                    )}

                  </select>
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">

                    <p className="font-bold text-amber-800">
                      No care recipients available
                    </p>

                    <p className="mt-1 text-sm text-amber-700">
                      Create a care recipient profile before requesting care.
                    </p>

                    <Link
                      href="/care-recipients"
                      className="mt-3 inline-flex rounded-xl bg-[#0F766E] px-4 py-2 text-sm font-bold text-white"
                    >
                      Manage care recipients
                    </Link>

                  </div>
                )}

              </div>


              {/* CARE TYPE */}

              <div>

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Type of care
                </label>

                {Array.isArray(
                  provider.care_types
                ) &&
                provider.care_types
                  .length >
                  0 ? (
                  <select
                    name="care_type"
                    value={
                      bookingForm.care_type
                    }
                    onChange={
                      handleBookingChange
                    }
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none focus:border-[#0F766E]"
                  >

                    {provider.care_types.map(
                      (
                        careType
                      ) => (
                        <option
                          key={
                            careType
                          }
                          value={
                            careType
                          }
                        >

                          {String(
                            careType
                          ).replaceAll(
                            "_",
                            " "
                          )}

                        </option>
                      )
                    )}

                  </select>
                ) : (
                  <input
                    type="text"
                    name="care_type"
                    value={
                      bookingForm.care_type
                    }
                    onChange={
                      handleBookingChange
                    }
                    placeholder="e.g. Personal care"
                    required
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 outline-none focus:border-[#0F766E]"
                  />
                )}

              </div>


              {/* FREQUENCY */}

              <div>

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Frequency
                </label>

                <select
                  name="frequency"
                  value={
                    bookingForm.frequency
                  }
                  onChange={
                    handleBookingChange
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none focus:border-[#0F766E]"
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
                    Flexible / To be discussed
                  </option>

                </select>

              </div>


              {/* DATE / TIME */}

              <div className="grid gap-5 md:grid-cols-2">

                <div>

                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Preferred start
                  </label>

                  <input
                    type="datetime-local"
                    name="start_time"
                    value={
                      bookingForm.start_time
                    }
                    onChange={
                      handleBookingChange
                    }
                    required
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 outline-none focus:border-[#0F766E]"
                  />

                </div>

                <div>

                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Preferred end
                  </label>

                  <input
                    type="datetime-local"
                    name="end_time"
                    value={
                      bookingForm.end_time
                    }
                    onChange={
                      handleBookingChange
                    }
                    required
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 outline-none focus:border-[#0F766E]"
                  />

                </div>

              </div>

              <p className="-mt-2 text-xs leading-5 text-slate-500">
                Start and end date/time are required so the provider can check
                staff availability before confirming the booking.
              </p>


              {/* REQUIREMENTS */}

              <div>

                <label className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">

                  <MessageSquareText className="h-4 w-4 text-[#0F766E]" />

                  Care requirements

                </label>

                <textarea
                  name="requirements"
                  value={
                    bookingForm.requirements
                  }
                  onChange={
                    handleBookingChange
                  }
                  rows={4}
                  placeholder="Describe the care needed, support requirements, routines or important information..."
                  className="w-full resize-none rounded-2xl border border-slate-200 p-4 outline-none focus:border-[#0F766E] focus:ring-4 focus:ring-teal-100"
                />

              </div>


              {/* NOTES */}

              <div>

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Additional notes
                </label>

                <textarea
                  name="notes"
                  value={
                    bookingForm.notes
                  }
                  onChange={
                    handleBookingChange
                  }
                  rows={3}
                  placeholder="Anything else you would like the provider to know?"
                  className="w-full resize-none rounded-2xl border border-slate-200 p-4 outline-none focus:border-[#0F766E]"
                />

              </div>


              {/* ERROR */}

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}


              {/* BUTTONS */}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={() => {
                    setShowBookingModal(
                      false
                    );

                    setError("");
                  }}
                  className="rounded-xl border border-slate-200 px-6 py-3 font-bold text-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    bookingSaving ||
                    serviceUsers.length ===
                      0
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-6 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {bookingSaving ? (
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

          </div>

        </div>
      )}

    </main>
  );
}


// ======================================================
// INFO CARD
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


// ======================================================
// QUALITY ROW
// ======================================================

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