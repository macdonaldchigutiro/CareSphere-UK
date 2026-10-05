"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  Ban,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  HeartHandshake,
  Loader2,
  Mail,
  MapPin,
  MessageSquareText,
  Play,
  Search,
  User,
  X,
} from "lucide-react";

import {
  authFetch,
  createLoginUrl,
  getDashboardPath,
  getAuthStorage,
  getStoredUser,
} from "../../lib/auth";
import { API_URL } from "../../lib/config";


export default function BookingsPage() {
  const router = useRouter();

  const [
    bookings,
    setBookings,
  ] = useState([]);

  const [
    user,
    setUser,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    actionLoadingId,
    setActionLoadingId,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    bookingActionMessages,
    setBookingActionMessages,
  ] = useState({});

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");


  // ======================================================
  // USER TYPE
  // ======================================================

  const isProvider =
    user?.user_type ===
    "provider";

  const dashboardPath =
    getDashboardPath(user);


  // ======================================================
  // LOGIN
  // ======================================================

  const goToLogin = () => {
    router.replace(
      createLoginUrl(
        "/bookings"
      )
    );
  };


  // ======================================================
  // LOAD BOOKINGS
  // ======================================================

  useEffect(() => {
    const loadBookings =
      async () => {
        if (
          !getAuthStorage()
        ) {
          goToLogin();

          return;
        }

        try {
          setLoading(true);
          setError("");

          const storedUser =
            getStoredUser();

          if (storedUser) {
            setUser(
              storedUser
            );
          }

          // ----------------------------------------------
          // CURRENT USER PROFILE
          // ----------------------------------------------

          const profileResponse =
            await authFetch(
              `${API_URL}/api/users/profile/`,
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
            !profileResponse
          ) {
            goToLogin();

            return;
          }

          if (
            profileResponse.status ===
            401
          ) {
            goToLogin();

            return;
          }

          if (
            profileResponse.ok
          ) {
            const profileData =
              await profileResponse.json();

            setUser(
              profileData
            );
          }

          // ----------------------------------------------
          // BOOKINGS
          // ----------------------------------------------

          const response =
            await authFetch(
              `${API_URL}/api/bookings/`,
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
            goToLogin();

            return;
          }

          if (
            response.status ===
            401
          ) {
            goToLogin();

            return;
          }

          if (!response.ok) {
            throw new Error(
              "Unable to load your bookings."
            );
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

          setBookings(
            items
          );
        } catch (err) {
          console.error(
            "Bookings loading error:",
            err
          );

          setError(
            err.message ||
              "We couldn't load your bookings."
          );
        } finally {
          setLoading(
            false
          );
        }
      };

    loadBookings();
  }, [
    router,
  ]);


  // ======================================================
  // UPDATE LOCAL BOOKING
  // ======================================================

  const replaceBooking = (
    updatedBooking
  ) => {
    setBookings(
      (current) =>
        current.map(
          (booking) =>
            booking.id ===
            updatedBooking.id
              ? updatedBooking
              : booking
        )
    );
  };


  // ======================================================
  // BOOKING ACTION
  // ======================================================

  const performBookingAction =
    async (
      bookingId,
      action
    ) => {
      // Provider-only actions.
      const providerActions = [
        "accept",
        "decline",
        "confirm",
        "start",
        "complete",
      ];

      if (
        providerActions.includes(
          action
        ) &&
        !isProvider
      ) {
        setError(
          "Only the care provider can perform this action."
        );

        return;
      }

      // Family cancellation.
      if (
        action === "cancel" &&
        isProvider
      ) {
        setError(
          "This booking must be cancelled by the family account that created it."
        );

        return;
      }

      if (
        action === "cancel"
      ) {
        const confirmed =
          window.confirm(
            "Are you sure you want to cancel this booking?"
          );

        if (!confirmed) {
          return;
        }
      }

      setError("");
      setSuccess("");

      setBookingActionMessages(
        (current) => ({
          ...current,
          [bookingId]: null,
        })
      );

      setActionLoadingId(
        `${bookingId}-${action}`
      );

      try {
        const response =
          await authFetch(
            `${API_URL}/api/bookings/${bookingId}/${action}/`,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );

        if (!response) {
          goToLogin();

          return;
        }

        if (
          response.status ===
          401
        ) {
          goToLogin();

          return;
        }

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.detail ||
              "Unable to update this booking."
          );
        }

        if (
          data.booking
        ) {
          replaceBooking(
            data.booking
          );
        }

        setSuccess(
          data.message ||
            "Booking updated successfully."
        );

        setBookingActionMessages(
          (current) => ({
            ...current,
            [bookingId]: {
              type: "success",
              message:
                data.message ||
                "Booking updated successfully.",
            },
          })
        );
      } catch (err) {
        console.error(
          `Booking ${action} error:`,
          err
        );

        setBookingActionMessages(
          (current) => ({
            ...current,
            [bookingId]: {
              type: "error",
              message:
                err.message ||
                "We couldn't update this booking.",
            },
          })
        );
      } finally {
        setActionLoadingId(
          null
        );
      }
    };


  // ======================================================
  // SEARCH
  // ======================================================

  const filteredBookings =
    useMemo(() => {
      const query =
        searchTerm
          .trim()
          .toLowerCase();

      return bookings.filter(
        (booking) => {
          const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "active"
              ? ["confirmed", "in_progress"].includes(booking.status)
              : booking.status === statusFilter);

          if (!matchesStatus) {
            return false;
          }

          if (!query) {
            return true;
          }

          const searchable = [
            booking.provider_name,
            booking.provider_city,
            booking.user_name,
            booking.user_email,
            booking.service_user_name,
            booking.care_recipient_name,
            booking.care_type,
            booking.frequency_display,
            booking.status_display,
            booking.requirements,
            booking.notes,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchable.includes(
            query
          );
        }
      );
    }, [
      bookings,
      searchTerm,
      statusFilter,
    ]);


  // ======================================================
  // COUNTS
  // ======================================================

  const pendingCount =
    bookings.filter(
      (booking) =>
        booking.status ===
        "pending"
    ).length;

  const acceptedCount =
    bookings.filter(
      (booking) =>
        booking.status ===
        "accepted"
    ).length;

  const activeCount =
    bookings.filter(
      (booking) =>
        [
          "confirmed",
          "in_progress",
        ].includes(
          booking.status
        )
    ).length;

  const completedCount =
    bookings.filter(
      (booking) =>
        booking.status ===
        "completed"
    ).length;


  // ======================================================
  // FORMATTERS
  // ======================================================

  const formatDate = (
    value
  ) => {
    if (!value) {
      return "Not set";
    }

    return new Intl.DateTimeFormat(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    ).format(
      new Date(value)
    );
  };


  const formatTime = (
    value
  ) => {
    if (!value) {
      return "Not set";
    }

    return new Intl.DateTimeFormat(
      "en-GB",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(
      new Date(value)
    );
  };


  // ======================================================
  // STATUS STYLES
  // ======================================================

  const getStatusClasses = (
    bookingStatus
  ) => {
    const value =
      String(
        bookingStatus || ""
      ).toLowerCase();

    if (
      value ===
      "confirmed"
    ) {
      return (
        "bg-emerald-50 " +
        "text-emerald-700"
      );
    }

    if (
      value ===
      "accepted"
    ) {
      return (
        "bg-blue-50 " +
        "text-blue-700"
      );
    }

    if (
      value ===
      "pending"
    ) {
      return (
        "bg-amber-50 " +
        "text-amber-700"
      );
    }

    if (
      value ===
      "completed"
    ) {
      return (
        "bg-teal-50 " +
        "text-[#0F766E]"
      );
    }

    if (
      value ===
      "in_progress"
    ) {
      return (
        "bg-purple-50 " +
        "text-purple-700"
      );
    }

    if (
      value ===
        "cancelled" ||
      value ===
        "declined"
    ) {
      return (
        "bg-red-50 " +
        "text-red-700"
      );
    }

    return (
      "bg-slate-100 " +
      "text-slate-600"
    );
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
            Loading your bookings...
          </p>

        </div>

      </main>
    );
  }


  // ======================================================
  // PAGE
  // ======================================================

  return (
    <main className={`${isProvider ? "cs-page" : "min-h-screen bg-[#F7FAFC]"} text-slate-950`}>

      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white">

        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 lg:px-8">

          <Link
            href={dashboardPath}
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
            href={dashboardPath}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >

            <ArrowLeft className="h-4 w-4" />

            Dashboard

          </Link>

        </div>

      </header>


      {/* CONTENT */}

      <div className={`mx-auto ${isProvider ? "max-w-[1560px] py-8 lg:py-10" : "max-w-[1400px] py-10"} px-5 lg:px-8`}>

        {/* HERO */}

        <section className={isProvider ? "cs-enter" : "overflow-hidden rounded-[32px] bg-[#032F2B] px-7 py-10 text-white shadow-xl md:px-10 md:py-12"}>

          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">

            <div className={isProvider ? "w-full" : ""}>

              <p className={isProvider ? "text-sm font-bold text-[#087C76]" : "text-sm font-bold uppercase tracking-[0.16em] text-[#6EE7D8]"}>

                {isProvider
                  ? "Care enquiries"
                  : "My bookings"}

              </p>

              <h1 className={isProvider ? "mt-1 text-3xl font-extrabold tracking-[-0.025em] text-[#0A2035]" : "mt-3 text-4xl font-black tracking-tight md:text-5xl"}>

                {isProvider
                  ? "Bookings"
                  : "Your care requests and bookings."}

              </h1>

              <p className={isProvider ? "mt-1 max-w-2xl text-sm text-slate-500" : "mt-4 max-w-2xl text-lg leading-8 text-slate-300"}>

                {isProvider
                  ? "Review enquiries, assign staff and move every booking safely through the care journey."
                  : "Track your care requests from enquiry through to confirmed, active and completed care."}

              </p>

            </div>

            {!isProvider && (
              <Link
                href="/find-care"
                className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#6EE7D8] px-6 py-3 font-bold text-[#032F2B] transition hover:bg-white"
              >

                <Search className="h-5 w-5" />

                Find more care

              </Link>
            )}

          </div>

        </section>


        {/* MESSAGES */}

        {success && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">

            <CheckCircle2 className="h-5 w-5" />

            {success}

          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}


        {/* SUMMARY */}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <SummaryCard
            title={
              isProvider
                ? "New enquiries"
                : "Pending"
            }
            value={
              pendingCount
            }
            text="Waiting for review"
            tone="amber"
            active={statusFilter === "pending"}
            onClick={isProvider ? () => setStatusFilter(statusFilter === "pending" ? "all" : "pending") : undefined}
          />

          <SummaryCard
            title="Accepted"
            value={
              acceptedCount
            }
            text="Provider has accepted"
            tone="blue"
            active={statusFilter === "accepted"}
            onClick={isProvider ? () => setStatusFilter(statusFilter === "accepted" ? "all" : "accepted") : undefined}
          />

          <SummaryCard
            title="Active care"
            value={
              activeCount
            }
            text="Confirmed or in progress"
            tone="teal"
            active={statusFilter === "active"}
            onClick={isProvider ? () => setStatusFilter(statusFilter === "active" ? "all" : "active") : undefined}
          />

          <SummaryCard
            title="Completed"
            value={
              completedCount
            }
            text="Finished care bookings"
            tone="slate"
            active={statusFilter === "completed"}
            onClick={isProvider ? () => setStatusFilter(statusFilter === "completed" ? "all" : "completed") : undefined}
          />

        </section>


        {/* SEARCH */}

        <section className={isProvider ? "cs-surface mt-6 p-5" : "mt-8"}>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

            <div>

              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F766E]">

                {isProvider
                  ? "Incoming requests"
                  : "Booking history"}

              </p>

              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0A2035]">

                {bookings.length ===
                1
                  ? isProvider
                    ? "1 care enquiry"
                    : "1 care request"
                  : isProvider
                  ? `${bookings.length} care enquiries`
                  : `${bookings.length} care requests`}

              </h2>

            </div>

            <div className="relative w-full lg:max-w-md">

              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={
                  searchTerm
                }
                onChange={(
                  event
                ) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                placeholder={
                  isProvider
                    ? "Search enquiries..."
                    : "Search bookings..."
                }
                className="cs-input w-full py-3.5 pl-12 pr-4 outline-none"
              />

            </div>

          </div>

          {isProvider && (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4" aria-label="Filter bookings by status">
              {[
                ["all", "All"],
                ["pending", "New"],
                ["accepted", "Accepted"],
                ["active", "Active care"],
                ["completed", "Completed"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    statusFilter === value
                      ? "bg-[#0A2035] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

        </section>


        {/* EMPTY */}

        {filteredBookings.length ===
          0 && (
          <section className={`${isProvider ? "cs-surface" : "rounded-[30px] border border-slate-200 bg-white shadow-sm"} mt-8 px-6 py-16 text-center`}>

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-[#0F766E]">

              <CalendarDays className="h-8 w-8" />

            </div>

            <h2 className="mt-6 text-2xl font-black">

              {isProvider
                ? "No care enquiries found"
                : "No bookings found"}

            </h2>

            <p className="mx-auto mt-3 max-w-lg leading-7 text-slate-500">

              {isProvider
                ? "New requests sent to your care provider profile will appear here."
                : "When you send a care request to a provider, it will appear here so you can track its progress."}

            </p>

            {!isProvider && (
              <Link
                href="/find-care"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#0F766E] px-6 py-3 font-bold text-white"
              >

                <Search className="h-5 w-5" />

                Find care providers

              </Link>
            )}

          </section>
        )}


        {/* BOOKINGS */}

        {filteredBookings.length >
          0 && (
          <section className="mt-8 space-y-5">

            {filteredBookings.map(
              (booking) => {
                const careRecipientName =
                  booking.service_user_name ||
                  booking.care_recipient_name ||
                  "Not specified";

                const canFamilyCancel =
                  !isProvider &&
                  [
                    "pending",
                    "accepted",
                    "confirmed",
                  ].includes(
                    booking.status
                  );

                return (
                  <article
                    key={
                      booking.id
                    }
                    className={`${isProvider ? "cs-card" : "rounded-[28px] border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.05)]"} p-6 md:p-7`}
                  >

                    {/* TOP */}

                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">

                      <div>

                        <div className="flex flex-wrap items-center gap-3">

                          <h3 className="text-xl font-black">

                            {isProvider
                              ? careRecipientName
                              : booking.provider_name ||
                                "Care provider"}

                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClasses(
                              booking.status
                            )}`}
                          >

                            {booking.status_display ||
                              booking.status ||
                              "Pending"}

                          </span>

                        </div>

                        {isProvider ? (
                          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">

                            <span className="inline-flex items-center gap-2">

                              <User className="h-4 w-4 text-[#0F766E]" />

                              {booking.user_name ||
                                "Family user"}

                            </span>

                            {booking.user_email && (
                              <span className="inline-flex items-center gap-2">

                                <Mail className="h-4 w-4 text-[#0F766E]" />

                                {booking.user_email}

                              </span>
                            )}

                          </div>
                        ) : (
                          booking.provider_city && (
                            <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-500">

                              <MapPin className="h-4 w-4 text-[#0F766E]" />

                              {booking.provider_city}

                            </p>
                          )
                        )}

                      </div>

                      {!isProvider &&
                        booking.provider && (
                        <Link
                          href={`/providers/${booking.provider}`}
                          className="w-fit rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          View provider
                        </Link>
                      )}

                    </div>


                    {/* DETAILS */}

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                      <InfoBlock
                        icon={
                          isProvider
                            ? Building2
                            : User
                        }
                        title={
                          isProvider
                            ? "Provider"
                            : "Care recipient"
                        }
                        value={
                          isProvider
                            ? booking.provider_name ||
                              "Care provider"
                            : careRecipientName
                        }
                      />

                      <InfoBlock
                        icon={
                          HeartHandshake
                        }
                        title="Care type"
                        value={
                          booking.care_type
                            ? String(
                                booking.care_type
                              ).replaceAll(
                                "_",
                                " "
                              )
                            : "Not specified"
                        }
                      />

                      <InfoBlock
                        icon={
                          CalendarDays
                        }
                        title="Start date"
                        value={
                          formatDate(
                            booking.start_time
                          )
                        }
                      />

                      <InfoBlock
                        icon={
                          Clock3
                        }
                        title="Time"
                        value={
                          booking.start_time
                            ? `${formatTime(
                                booking.start_time
                              )}${
                                booking.end_time
                                  ? ` – ${formatTime(
                                      booking.end_time
                                    )}`
                                  : ""
                              }`
                            : "Not specified"
                        }
                      />

                    </div>


                    {/* FREQUENCY */}

                    <div className="mt-5 rounded-2xl bg-slate-50 p-4">

                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                        Frequency
                      </p>

                      <p className="mt-2 font-bold text-slate-800">

                        {booking.frequency_display ||
                          booking.frequency ||
                          "Flexible"}

                      </p>

                    </div>


                    {/* REQUIREMENTS */}

                    {booking.requirements && (
                      <div className="mt-5">

                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">

                          <MessageSquareText className="h-4 w-4 text-[#0F766E]" />

                          Care requirements

                        </div>

                        <p className="mt-2 leading-7 text-slate-500">
                          {booking.requirements}
                        </p>

                      </div>
                    )}


                    {/* NOTES */}

                    {booking.notes && (
                      <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/60 p-4">

                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-700">
                          Additional notes
                        </p>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {booking.notes}
                        </p>

                      </div>
                    )}


                    {/* PROVIDER: PENDING */}

                    {isProvider &&
                      booking.status ===
                        "pending" && (
                        <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">

                          <button
                            type="button"
                            onClick={() =>
                              performBookingAction(
                                booking.id,
                                "accept"
                              )
                            }
                            disabled={
                              actionLoadingId !==
                              null
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-[#0F766E] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                          >

                            {actionLoadingId ===
                            `${booking.id}-accept` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}

                            Accept request

                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              performBookingAction(
                                booking.id,
                                "decline"
                              )
                            }
                            disabled={
                              actionLoadingId !==
                              null
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 disabled:opacity-60"
                          >

                            {actionLoadingId ===
                            `${booking.id}-decline` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}

                            Decline

                          </button>

                        </div>
                      )}


                    {/* PROVIDER: ACCEPTED */}

                    {isProvider &&
                      booking.status ===
                        "accepted" && (
                        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">

                          <div className="max-w-2xl">
                            <p className="text-sm font-semibold text-blue-700">
                              Request accepted. Confirm when the care arrangement is final.
                            </p>

                            {!booking.assigned_staff && (
                              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                <p className="font-bold">
                                  Staff assignment required
                                </p>
                                <p className="mt-1">
                                  Assign an available staff member before confirming this booking.
                                </p>
                                <Link
                                  href="/provider-dashboard"
                                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-700 px-4 py-2 font-bold text-white hover:bg-amber-800"
                                >
                                  <User className="h-4 w-4" />
                                  Go to staff assignment
                                </Link>
                              </div>
                            )}

                            {bookingActionMessages[
                              booking.id
                            ] && (
                              <div
                                className={`mt-3 rounded-xl border px-4 py-3 text-sm font-semibold ${
                                  bookingActionMessages[
                                    booking.id
                                  ].type === "error"
                                    ? "border-red-200 bg-red-50 text-red-700"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                }`}
                              >
                                {
                                  bookingActionMessages[
                                    booking.id
                                  ].message
                                }
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              performBookingAction(
                                booking.id,
                                "confirm"
                              )
                            }
                            disabled={
                              actionLoadingId !==
                                null ||
                              !booking.assigned_staff
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >

                            {actionLoadingId ===
                            `${booking.id}-confirm` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}

                            Confirm booking

                          </button>

                        </div>
                      )}


                    {/* PROVIDER: CONFIRMED */}

                    {isProvider &&
                      booking.status ===
                        "confirmed" && (
                        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">

                          <div>

                            <p className="font-bold text-emerald-700">
                              Care confirmed
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              Start the booking when care actually begins.
                            </p>

                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              performBookingAction(
                                booking.id,
                                "start"
                              )
                            }
                            disabled={
                              actionLoadingId !==
                              null
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                          >

                            {actionLoadingId ===
                            `${booking.id}-start` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}

                            Start care

                          </button>

                        </div>
                      )}


                    {/* PROVIDER: IN PROGRESS */}

                    {isProvider &&
                      booking.status ===
                        "in_progress" && (
                        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">

                          <div>

                            <p className="font-bold text-purple-700">
                              Care is in progress
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              Complete the booking when the agreed care has finished.
                            </p>

                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              performBookingAction(
                                booking.id,
                                "complete"
                              )
                            }
                            disabled={
                              actionLoadingId !==
                              null
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-[#0F766E] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                          >

                            {actionLoadingId ===
                            `${booking.id}-complete` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}

                            Complete care

                          </button>

                        </div>
                      )}


                    {/* FAMILY CANCEL */}

                    {canFamilyCancel && (
                      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">

                        <p className="text-sm text-slate-500">

                          {booking.status ===
                          "confirmed"
                            ? "Care has been confirmed. You can still cancel before care starts."
                            : "You can cancel this request before care begins."}

                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            performBookingAction(
                              booking.id,
                              "cancel"
                            )
                          }
                          disabled={
                            actionLoadingId !==
                            null
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 disabled:opacity-60"
                        >

                          {actionLoadingId ===
                          `${booking.id}-cancel` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Ban className="h-4 w-4" />
                          )}

                          Cancel booking

                        </button>

                      </div>
                    )}


                    {/* FAMILY: CONFIRMED */}

                    {!isProvider &&
                      booking.status ===
                        "confirmed" && (
                        <StatusMessage
                          icon={
                            CheckCircle2
                          }
                          title="Care confirmed"
                          text="The provider has confirmed this care arrangement."
                          className="text-emerald-700"
                        />
                      )}


                    {/* FAMILY: IN PROGRESS */}

                    {!isProvider &&
                      booking.status ===
                        "in_progress" && (
                        <StatusMessage
                          icon={
                            Play
                          }
                          title="Care in progress"
                          text="The provider has started this care booking."
                          className="text-purple-700"
                        />
                      )}


                    {/* COMPLETED */}

                    {booking.status ===
                      "completed" && (
                      <StatusMessage
                        icon={
                          CheckCircle2
                        }
                        title="Care completed"
                        text="This care booking has been completed."
                        className="text-[#0F766E]"
                      />
                    )}


                    {/* CANCELLED */}

                    {booking.status ===
                      "cancelled" && (
                      <StatusMessage
                        icon={
                          Ban
                        }
                        title="Booking cancelled"
                        text="This booking is no longer active."
                        className="text-red-700"
                      />
                    )}


                    {/* DECLINED */}

                    {booking.status ===
                      "declined" && (
                      <StatusMessage
                        icon={
                          X
                        }
                        title="Request declined"
                        text="The provider declined this care request."
                        className="text-red-700"
                      />
                    )}


                    {/* FOOTER */}

                    <div className="mt-6 border-t border-slate-100 pt-5">

                      <p className="text-xs text-slate-400">

                        Request sent{" "}

                        {formatDate(
                          booking.created_at
                        )}

                      </p>

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


// ======================================================
// SUMMARY CARD
// ======================================================

function SummaryCard({
  title,
  value,
  text,
  tone = "teal",
  active = false,
  onClick,
}) {
  const tones = {
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    teal: "bg-emerald-100 text-emerald-700",
    slate: "bg-slate-100 text-slate-700",
  };

  const Element = onClick ? "button" : "div";

  return (
    <Element
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      className={`cs-surface p-5 text-left transition ${
        onClick ? "hover:-translate-y-0.5 hover:border-teal-300" : ""
      } ${active ? "border-[#0B9188] ring-4 ring-teal-100" : ""}`}
    >

      <div className="flex items-start justify-between gap-3">

        <div>

          <p className="text-sm font-semibold text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-black text-[#0A2035]">
            {value}
          </p>

        </div>

        <span className={`mt-1 h-3 w-3 rounded-full ${tones[tone] || tones.teal}`} aria-hidden="true" />

      </div>

      <p className="mt-2 text-sm text-slate-500">
        {text}
      </p>

    </Element>
  );
}


// ======================================================
// INFO BLOCK
// ======================================================

function InfoBlock({
  icon: Icon,
  title,
  value,
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">

      <Icon className="h-5 w-5 text-[#0F766E]" />

      <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
        {title}
      </p>

      <p className="mt-2 font-bold capitalize text-slate-800">
        {value}
      </p>

    </div>
  );
}


// ======================================================
// STATUS MESSAGE
// ======================================================

function StatusMessage({
  icon: Icon,
  title,
  text,
  className = "",
}) {
  return (
    <div className="mt-6 border-t border-slate-100 pt-5">

      <div
        className={`flex items-start gap-3 ${className}`}
      >

        <Icon className="mt-0.5 h-5 w-5 shrink-0" />

        <div>

          <p className="font-bold">
            {title}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {text}
          </p>

        </div>

      </div>

    </div>
  );
}
