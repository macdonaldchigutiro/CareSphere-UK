"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  HeartHandshake,
  Loader2,
  LogOut,
  Mail,
  MessageSquareText,
  Play,
  Search,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";

import {
  authFetch,
  clearAuthSession,
  createLoginUrl,
  getAuthStorage,
  getStoredUser,
} from "../../lib/auth";


const API_URL =
  "http://127.0.0.1:8000";


export default function ProviderDashboardPage() {
  const router = useRouter();

  const [
    user,
    setUser,
  ] = useState(null);

  const [
    bookings,
    setBookings,
  ] = useState([]);

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
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    activeFilter,
    setActiveFilter,
  ] = useState("all");

  const [
    unreadNotifications,
    setUnreadNotifications,
  ] = useState(0);


  // ======================================================
  // AUTHENTICATION
  // ======================================================

  const goToLogin = () => {
    router.replace(
      createLoginUrl(
        "/provider-dashboard"
      )
    );
  };


  // ======================================================
  // LOAD PROVIDER DASHBOARD
  // ======================================================

  const loadDashboard =
    async () => {
      if (!getAuthStorage()) {
        goToLogin();
        return;
      }

      try {
        setLoading(true);
        setError("");

        const storedUser =
          getStoredUser();

        if (storedUser) {
          setUser(storedUser);
        }

        // ----------------------------------------------
        // CURRENT USER
        // ----------------------------------------------

        const profileResponse =
          await authFetch(
            `${API_URL}/api/users/profile/`,
            {
              method: "GET",
              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );

        if (!profileResponse) {
          goToLogin();
          return;
        }

        if (
          profileResponse.status === 401
        ) {
          goToLogin();
          return;
        }

        if (!profileResponse.ok) {
          throw new Error(
            "Unable to load your provider profile."
          );
        }

        const profileData =
          await profileResponse.json();

        setUser(profileData);

        // ----------------------------------------------
        // PROVIDER ACCOUNT CHECK
        // ----------------------------------------------

        if (
          profileData.user_type !==
            "provider" &&
          !profileData.is_staff &&
          !profileData.is_superuser
        ) {
          setError(
            "This dashboard is only available to care provider accounts."
          );

          setBookings([]);
          return;
        }

        // ----------------------------------------------
        // BOOKINGS
        // ----------------------------------------------

        const bookingsResponse =
          await authFetch(
            `${API_URL}/api/bookings/`,
            {
              method: "GET",
              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );

        if (!bookingsResponse) {
          goToLogin();
          return;
        }

        if (
          bookingsResponse.status === 401
        ) {
          goToLogin();
          return;
        }

        if (!bookingsResponse.ok) {
          throw new Error(
            "Unable to load care requests."
          );
        }

        const bookingsData =
          await bookingsResponse.json();

        const bookingItems =
          Array.isArray(bookingsData)
            ? bookingsData
            : Array.isArray(
                bookingsData.results
              )
            ? bookingsData.results
            : [];

        setBookings(
          bookingItems
        );

        // ----------------------------------------------
        // NOTIFICATIONS
        // ----------------------------------------------

        const notificationResponse =
          await authFetch(
            `${API_URL}/api/notifications/notifications/unread-count/`,
            {
              method: "GET",
              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );

        if (
          notificationResponse &&
          notificationResponse.ok
        ) {
          const notificationData =
            await notificationResponse.json();

          setUnreadNotifications(
            Number(
              notificationData.unread_count
            ) || 0
          );
        }

      } catch (err) {
        console.error(
          "Provider dashboard error:",
          err
        );

        setError(
          err.message ||
            "We couldn't load the provider dashboard."
        );
      } finally {
        setLoading(false);
      }
    };


  useEffect(() => {
    loadDashboard();
  }, []);


  // ======================================================
  // BOOKING COUNTS
  // ======================================================

  const pendingBookings =
    useMemo(
      () =>
        bookings.filter(
          (booking) =>
            booking.status ===
            "pending"
        ),
      [bookings]
    );


  const acceptedBookings =
    useMemo(
      () =>
        bookings.filter(
          (booking) =>
            booking.status ===
            "accepted"
        ),
      [bookings]
    );


  const confirmedBookings =
    useMemo(
      () =>
        bookings.filter(
          (booking) =>
            booking.status ===
            "confirmed"
        ),
      [bookings]
    );


  const inProgressBookings =
    useMemo(
      () =>
        bookings.filter(
          (booking) =>
            booking.status ===
            "in_progress"
        ),
      [bookings]
    );


  const completedBookings =
    useMemo(
      () =>
        bookings.filter(
          (booking) =>
            booking.status ===
            "completed"
        ),
      [bookings]
    );


  const activeBookings =
    useMemo(
      () =>
        bookings.filter(
          (booking) =>
            [
              "accepted",
              "confirmed",
              "in_progress",
            ].includes(
              booking.status
            )
        ),
      [bookings]
    );


  // ======================================================
  // SEARCH / FILTER
  // ======================================================

  const filteredBookings =
    useMemo(() => {
      let items = [
        ...bookings,
      ];

      if (
        activeFilter !== "all"
      ) {
        if (
          activeFilter === "active"
        ) {
          items = items.filter(
            (booking) =>
              [
                "accepted",
                "confirmed",
                "in_progress",
              ].includes(
                booking.status
              )
          );
        } else {
          items = items.filter(
            (booking) =>
              booking.status ===
              activeFilter
          );
        }
      }

      const query =
        searchTerm
          .trim()
          .toLowerCase();

      if (query) {
        items = items.filter(
          (booking) => {
            const searchable = [
              booking.service_user_name,
              booking.care_recipient_name,
              booking.user_name,
              booking.user_email,
              booking.care_type,
              booking.frequency_display,
              booking.status_display,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            return searchable.includes(
              query
            );
          }
        );
      }

      return items;
    }, [
      bookings,
      activeFilter,
      searchTerm,
    ]);


  // ======================================================
  // PERFORM BOOKING ACTION
  // ======================================================

  const performBookingAction =
    async (
      bookingId,
      action
    ) => {
      try {
        setActionLoadingId(
          `${bookingId}-${action}`
        );

        setError("");
        setSuccess("");

        const response =
          await authFetch(
            `${API_URL}/api/bookings/${bookingId}/${action}/`,
            {
              method: "POST",
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
          response.status === 401
        ) {
          goToLogin();
          return;
        }

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
              data.message ||
              "Unable to update this booking."
          );
        }

        if (data.booking) {
          setBookings(
            (current) =>
              current.map(
                (booking) =>
                  booking.id ===
                  bookingId
                    ? data.booking
                    : booking
              )
          );
        } else {
          await loadDashboard();
        }

        setSuccess(
          data.message ||
            "Booking updated successfully."
        );

        window.setTimeout(
          () =>
            setSuccess(""),
          3500
        );

      } catch (err) {
        console.error(
          "Provider booking action error:",
          err
        );

        setError(
          err.message ||
            "We couldn't update this booking."
        );
      } finally {
        setActionLoadingId(
          null
        );
      }
    };


  // ======================================================
  // SIGN OUT
  // ======================================================

  const handleSignOut =
    () => {
      clearAuthSession();

      router.replace("/");
    };


  // ======================================================
  // DISPLAY HELPERS
  // ======================================================

  const getProviderName =
    () => {
      const fullName = [
        user?.first_name,
        user?.last_name,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      return (
        fullName ||
        user?.email ||
        "Care Provider"
      );
    };


  const getCareRecipientName =
    (booking) => {
      return (
        booking.service_user_name ||
        booking.care_recipient_name ||
        "Care recipient"
      );
    };


  const formatDate =
    (value) => {
      if (!value) {
        return "Not specified";
      }

      return new Intl.DateTimeFormat(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      ).format(
        new Date(value)
      );
    };


  const formatTime =
    (value) => {
      if (!value) {
        return "Not specified";
      }

      return value
        .toString()
        .slice(0, 5);
    };


  const statusClasses =
    (status) => {
      switch (status) {
        case "pending":
          return (
            "bg-amber-50 " +
            "text-amber-700 " +
            "border-amber-200"
          );

        case "accepted":
          return (
            "bg-blue-50 " +
            "text-blue-700 " +
            "border-blue-200"
          );

        case "confirmed":
          return (
            "bg-indigo-50 " +
            "text-indigo-700 " +
            "border-indigo-200"
          );

        case "in_progress":
          return (
            "bg-emerald-50 " +
            "text-emerald-700 " +
            "border-emerald-200"
          );

        case "completed":
          return (
            "bg-green-50 " +
            "text-green-700 " +
            "border-green-200"
          );

        case "declined":
          return (
            "bg-red-50 " +
            "text-red-700 " +
            "border-red-200"
          );

        case "cancelled":
          return (
            "bg-slate-100 " +
            "text-slate-600 " +
            "border-slate-200"
          );

        default:
          return (
            "bg-slate-50 " +
            "text-slate-700 " +
            "border-slate-200"
          );
      }
    };


  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <main
        className="
          flex
          min-h-screen
          items-center
          justify-center
          bg-[#F7FAFC]
        "
      >
        <div
          className="
            text-center
          "
        >
          <Loader2
            className="
              mx-auto
              h-9
              w-9
              animate-spin
              text-[#176B62]
            "
          />

          <p
            className="
              mt-4
              text-sm
              font-medium
              text-slate-600
            "
          >
            Loading provider workspace...
          </p>
        </div>
      </main>
    );
  }


  // ======================================================
  // PAGE
  // ======================================================

  return (
    <main
      className="
        min-h-screen
        bg-[#F7FAFC]
        text-slate-900
      "
    >

      {/* ==================================================
          TOP NAVIGATION
      ================================================== */}

      <header
        className="
          sticky
          top-0
          z-40
          border-b
          border-slate-200
          bg-white/95
          backdrop-blur
        "
      >
        <div
          className="
            mx-auto
            flex
            max-w-7xl
            items-center
            justify-between
            px-5
            py-4
            lg:px-8
          "
        >

          <Link
            href="/provider-dashboard"
            className="
              flex
              items-center
              gap-3
            "
          >
            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-[#176B62]
                text-white
              "
            >
              <HeartHandshake
                className="
                  h-5
                  w-5
                "
              />
            </div>

            <div>
              <div
                className="
                  text-lg
                  font-bold
                  tracking-tight
                  text-slate-900
                "
              >
                CareSphere
              </div>

              <div
                className="
                  text-xs
                  font-medium
                  text-slate-500
                "
              >
                Provider Workspace
              </div>
            </div>
          </Link>


          <div
            className="
              flex
              items-center
              gap-2
            "
          >

            <Link
              href="/notifications"
              className="
                relative
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                border
                border-slate-200
                bg-white
                text-slate-600
                transition
                hover:bg-slate-50
                hover:text-slate-900
              "
            >
              <Bell
                className="
                  h-5
                  w-5
                "
              />

              {unreadNotifications >
                0 && (
                <span
                  className="
                    absolute
                    -right-1
                    -top-1
                    flex
                    h-5
                    min-w-5
                    items-center
                    justify-center
                    rounded-full
                    bg-red-500
                    px-1
                    text-[10px]
                    font-bold
                    text-white
                  "
                >
                  {unreadNotifications >
                  99
                    ? "99+"
                    : unreadNotifications}
                </span>
              )}
            </Link>


            <button
              onClick={
                handleSignOut
              }
              className="
                flex
                h-10
                items-center
                gap-2
                rounded-xl
                border
                border-slate-200
                bg-white
                px-3
                text-sm
                font-semibold
                text-slate-600
                transition
                hover:bg-slate-50
                hover:text-slate-900
              "
            >
              <LogOut
                className="
                  h-4
                  w-4
                "
              />

              <span
                className="
                  hidden
                  sm:inline
                "
              >
                Sign out
              </span>
            </button>

          </div>
        </div>
      </header>


      <div
        className="
          mx-auto
          max-w-7xl
          px-5
          py-8
          lg:px-8
          lg:py-10
        "
      >

        {/* ==================================================
            WELCOME
        ================================================== */}

        <section
          className="
            overflow-hidden
            rounded-3xl
            bg-gradient-to-r
            from-[#124F49]
            via-[#176B62]
            to-[#23837A]
            px-6
            py-8
            text-white
            shadow-sm
            md:px-9
            md:py-10
          "
        >
          <div
            className="
              flex
              flex-col
              gap-7
              lg:flex-row
              lg:items-center
              lg:justify-between
            "
          >

            <div>
              <div
                className="
                  mb-3
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  bg-white/10
                  px-3
                  py-1.5
                  text-xs
                  font-semibold
                "
              >
                <ShieldCheck
                  className="
                    h-4
                    w-4
                  "
                />

                CareSphere Provider
              </div>

              <h1
                className="
                  text-3xl
                  font-bold
                  tracking-tight
                  md:text-4xl
                "
              >
                Welcome back,
                {" "}
                {getProviderName()}
              </h1>

              <p
                className="
                  mt-3
                  max-w-2xl
                  text-sm
                  leading-6
                  text-white/80
                  md:text-base
                "
              >
                Manage new care requests,
                confirmed bookings and
                ongoing care from one
                secure workspace.
              </p>
            </div>


            <div
              className="
                grid
                grid-cols-2
                gap-3
                sm:grid-cols-4
                lg:min-w-[430px]
              "
            >

              <div
                className="
                  rounded-2xl
                  bg-white/10
                  p-4
                  backdrop-blur
                "
              >
                <div
                  className="
                    text-2xl
                    font-bold
                  "
                >
                  {
                    pendingBookings.length
                  }
                </div>

                <div
                  className="
                    mt-1
                    text-xs
                    text-white/75
                  "
                >
                  New requests
                </div>
              </div>


              <div
                className="
                  rounded-2xl
                  bg-white/10
                  p-4
                  backdrop-blur
                "
              >
                <div
                  className="
                    text-2xl
                    font-bold
                  "
                >
                  {
                    activeBookings.length
                  }
                </div>

                <div
                  className="
                    mt-1
                    text-xs
                    text-white/75
                  "
                >
                  Active care
                </div>
              </div>


              <div
                className="
                  rounded-2xl
                  bg-white/10
                  p-4
                  backdrop-blur
                "
              >
                <div
                  className="
                    text-2xl
                    font-bold
                  "
                >
                  {
                    inProgressBookings.length
                  }
                </div>

                <div
                  className="
                    mt-1
                    text-xs
                    text-white/75
                  "
                >
                  In progress
                </div>
              </div>


              <div
                className="
                  rounded-2xl
                  bg-white/10
                  p-4
                  backdrop-blur
                "
              >
                <div
                  className="
                    text-2xl
                    font-bold
                  "
                >
                  {
                    completedBookings.length
                  }
                </div>

                <div
                  className="
                    mt-1
                    text-xs
                    text-white/75
                  "
                >
                  Completed
                </div>
              </div>

            </div>
          </div>
        </section>


        {/* ==================================================
            ALERTS
        ================================================== */}

        {error && (
          <div
            className="
              mt-6
              rounded-2xl
              border
              border-red-200
              bg-red-50
              px-5
              py-4
              text-sm
              font-medium
              text-red-700
            "
          >
            {error}
          </div>
        )}


        {success && (
          <div
            className="
              mt-6
              rounded-2xl
              border
              border-emerald-200
              bg-emerald-50
              px-5
              py-4
              text-sm
              font-medium
              text-emerald-700
            "
          >
            {success}
          </div>
        )}


        {/* ==================================================
            STAT CARDS
        ================================================== */}

        <section
          className="
            mt-7
            grid
            gap-4
            sm:grid-cols-2
            xl:grid-cols-4
          "
        >

          <button
            onClick={() =>
              setActiveFilter(
                "pending"
              )
            }
            className="
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-5
              text-left
              shadow-sm
              transition
              hover:-translate-y-0.5
              hover:shadow-md
            "
          >
            <div
              className="
                flex
                items-start
                justify-between
              "
            >
              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-amber-50
                  text-amber-700
                "
              >
                <Mail
                  className="
                    h-5
                    w-5
                  "
                />
              </div>

              <span
                className="
                  text-2xl
                  font-bold
                  text-slate-900
                "
              >
                {
                  pendingBookings.length
                }
              </span>
            </div>

            <h3
              className="
                mt-5
                font-bold
                text-slate-900
              "
            >
              New care requests
            </h3>

            <p
              className="
                mt-1
                text-sm
                text-slate-500
              "
            >
              Awaiting your response
            </p>
          </button>


          <button
            onClick={() =>
              setActiveFilter(
                "confirmed"
              )
            }
            className="
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-5
              text-left
              shadow-sm
              transition
              hover:-translate-y-0.5
              hover:shadow-md
            "
          >
            <div
              className="
                flex
                items-start
                justify-between
              "
            >
              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-indigo-50
                  text-indigo-700
                "
              >
                <CalendarDays
                  className="
                    h-5
                    w-5
                  "
                />
              </div>

              <span
                className="
                  text-2xl
                  font-bold
                  text-slate-900
                "
              >
                {
                  confirmedBookings.length
                }
              </span>
            </div>

            <h3
              className="
                mt-5
                font-bold
                text-slate-900
              "
            >
              Confirmed care
            </h3>

            <p
              className="
                mt-1
                text-sm
                text-slate-500
              "
            >
              Ready to be started
            </p>
          </button>


          <button
            onClick={() =>
              setActiveFilter(
                "in_progress"
              )
            }
            className="
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-5
              text-left
              shadow-sm
              transition
              hover:-translate-y-0.5
              hover:shadow-md
            "
          >
            <div
              className="
                flex
                items-start
                justify-between
              "
            >
              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-emerald-50
                  text-emerald-700
                "
              >
                <Play
                  className="
                    h-5
                    w-5
                  "
                />
              </div>

              <span
                className="
                  text-2xl
                  font-bold
                  text-slate-900
                "
              >
                {
                  inProgressBookings.length
                }
              </span>
            </div>

            <h3
              className="
                mt-5
                font-bold
                text-slate-900
              "
            >
              In progress
            </h3>

            <p
              className="
                mt-1
                text-sm
                text-slate-500
              "
            >
              Care currently underway
            </p>
          </button>


          <button
            onClick={() =>
              setActiveFilter(
                "completed"
              )
            }
            className="
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-5
              text-left
              shadow-sm
              transition
              hover:-translate-y-0.5
              hover:shadow-md
            "
          >
            <div
              className="
                flex
                items-start
                justify-between
              "
            >
              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-green-50
                  text-green-700
                "
              >
                <CheckCircle2
                  className="
                    h-5
                    w-5
                  "
                />
              </div>

              <span
                className="
                  text-2xl
                  font-bold
                  text-slate-900
                "
              >
                {
                  completedBookings.length
                }
              </span>
            </div>

            <h3
              className="
                mt-5
                font-bold
                text-slate-900
              "
            >
              Completed care
            </h3>

            <p
              className="
                mt-1
                text-sm
                text-slate-500
              "
            >
              Finished bookings
            </p>
          </button>

        </section>


        {/* ==================================================
            BOOKINGS WORKSPACE
        ================================================== */}

        <section
          className="
            mt-7
            overflow-hidden
            rounded-3xl
            border
            border-slate-200
            bg-white
            shadow-sm
          "
        >

          <div
            className="
              border-b
              border-slate-200
              px-5
              py-5
              md:px-6
            "
          >
            <div
              className="
                flex
                flex-col
                gap-4
                lg:flex-row
                lg:items-center
                lg:justify-between
              "
            >

              <div>
                <h2
                  className="
                    text-xl
                    font-bold
                    text-slate-900
                  "
                >
                  Care requests &
                  bookings
                </h2>

                <p
                  className="
                    mt-1
                    text-sm
                    text-slate-500
                  "
                >
                  Review requests and
                  manage each booking
                  through its care
                  lifecycle.
                </p>
              </div>


              <div
                className="
                  relative
                  w-full
                  lg:w-80
                "
              >
                <Search
                  className="
                    absolute
                    left-3
                    top-1/2
                    h-4
                    w-4
                    -translate-y-1/2
                    text-slate-400
                  "
                />

                <input
                  value={
                    searchTerm
                  }
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value
                    )
                  }
                  placeholder="Search bookings..."
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-50
                    py-2.5
                    pl-10
                    pr-4
                    text-sm
                    outline-none
                    transition
                    focus:border-[#176B62]
                    focus:bg-white
                    focus:ring-2
                    focus:ring-[#176B62]/10
                  "
                />
              </div>

            </div>


            <div
              className="
                mt-5
                flex
                flex-wrap
                gap-2
              "
            >
              {[
                [
                  "all",
                  "All",
                ],
                [
                  "pending",
                  "New requests",
                ],
                [
                  "accepted",
                  "Accepted",
                ],
                [
                  "confirmed",
                  "Confirmed",
                ],
                [
                  "in_progress",
                  "In progress",
                ],
                [
                  "completed",
                  "Completed",
                ],
              ].map(
                ([
                  value,
                  label,
                ]) => (
                  <button
                    key={value}
                    onClick={() =>
                      setActiveFilter(
                        value
                      )
                    }
                    className={`
                      rounded-full
                      px-4
                      py-2
                      text-xs
                      font-semibold
                      transition
                      ${
                        activeFilter ===
                        value
                          ? "bg-[#176B62] text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }
                    `}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>


          {/* ================================================
              EMPTY STATE
          ================================================ */}

          {filteredBookings.length ===
          0 ? (
            <div
              className="
                px-6
                py-16
                text-center
              "
            >
              <div
                className="
                  mx-auto
                  flex
                  h-14
                  w-14
                  items-center
                  justify-center
                  rounded-2xl
                  bg-slate-100
                  text-slate-500
                "
              >
                <CalendarDays
                  className="
                    h-6
                    w-6
                  "
                />
              </div>

              <h3
                className="
                  mt-5
                  text-lg
                  font-bold
                  text-slate-900
                "
              >
                No bookings found
              </h3>

              <p
                className="
                  mx-auto
                  mt-2
                  max-w-md
                  text-sm
                  leading-6
                  text-slate-500
                "
              >
                New care requests
                assigned to your
                provider account will
                appear here.
              </p>

              {activeFilter !==
                "all" && (
                <button
                  onClick={() =>
                    setActiveFilter(
                      "all"
                    )
                  }
                  className="
                    mt-5
                    rounded-xl
                    bg-[#176B62]
                    px-4
                    py-2.5
                    text-sm
                    font-semibold
                    text-white
                  "
                >
                  View all bookings
                </button>
              )}
            </div>
          ) : (

            <div
              className="
                divide-y
                divide-slate-100
              "
            >
              {filteredBookings.map(
                (booking) => {

                  const recipientName =
                    getCareRecipientName(
                      booking
                    );

                  return (
                    <article
                      key={
                        booking.id
                      }
                      className="
                        px-5
                        py-6
                        transition
                        hover:bg-slate-50/60
                        md:px-6
                      "
                    >
                      <div
                        className="
                          flex
                          flex-col
                          gap-5
                          xl:flex-row
                          xl:items-start
                          xl:justify-between
                        "
                      >

                        {/* LEFT */}

                        <div
                          className="
                            flex
                            min-w-0
                            gap-4
                          "
                        >
                          <div
                            className="
                              hidden
                              h-12
                              w-12
                              shrink-0
                              items-center
                              justify-center
                              rounded-2xl
                              bg-[#EAF5F3]
                              text-[#176B62]
                              sm:flex
                            "
                          >
                            <User
                              className="
                                h-5
                                w-5
                              "
                            />
                          </div>


                          <div
                            className="
                              min-w-0
                            "
                          >
                            <div
                              className="
                                flex
                                flex-wrap
                                items-center
                                gap-2
                              "
                            >
                              <h3
                                className="
                                  text-lg
                                  font-bold
                                  text-slate-900
                                "
                              >
                                {
                                  recipientName
                                }
                              </h3>

                              <span
                                className={`
                                  rounded-full
                                  border
                                  px-2.5
                                  py-1
                                  text-[11px]
                                  font-bold
                                  ${statusClasses(
                                    booking.status
                                  )}
                                `}
                              >
                                {
                                  booking.status_display ||
                                  booking.status
                                }
                              </span>
                            </div>


                            <div
                              className="
                                mt-3
                                grid
                                gap-x-7
                                gap-y-2
                                text-sm
                                text-slate-600
                                sm:grid-cols-2
                                lg:grid-cols-3
                              "
                            >

                              <div
                                className="
                                  flex
                                  items-center
                                  gap-2
                                "
                              >
                                <HeartHandshake
                                  className="
                                    h-4
                                    w-4
                                    text-slate-400
                                  "
                                />

                                <span>
                                  {
                                    booking.care_type ||
                                    "Care service"
                                  }
                                </span>
                              </div>


                              <div
                                className="
                                  flex
                                  items-center
                                  gap-2
                                "
                              >
                                <Clock3
                                  className="
                                    h-4
                                    w-4
                                    text-slate-400
                                  "
                                />

                                <span>
                                  {formatTime(
                                    booking.start_time
                                  )}
                                  {" – "}
                                  {formatTime(
                                    booking.end_time
                                  )}
                                </span>
                              </div>


                              <div
                                className="
                                  flex
                                  items-center
                                  gap-2
                                "
                              >
                                <CalendarDays
                                  className="
                                    h-4
                                    w-4
                                    text-slate-400
                                  "
                                />

                                <span>
                                  {
                                    booking.frequency_display ||
                                    booking.frequency ||
                                    "Frequency not specified"
                                  }
                                </span>
                              </div>


                              <div
                                className="
                                  flex
                                  items-center
                                  gap-2
                                "
                              >
                                <Users
                                  className="
                                    h-4
                                    w-4
                                    text-slate-400
                                  "
                                />

                                <span>
                                  Requested by
                                  {" "}
                                  {
                                    booking.user_name ||
                                    "Family member"
                                  }
                                </span>
                              </div>


                              <div
                                className="
                                  flex
                                  items-center
                                  gap-2
                                "
                              >
                                <Mail
                                  className="
                                    h-4
                                    w-4
                                    text-slate-400
                                  "
                                />

                                <span
                                  className="
                                    truncate
                                  "
                                >
                                  {
                                    booking.user_email ||
                                    "No email"
                                  }
                                </span>
                              </div>


                              <div
                                className="
                                  flex
                                  items-center
                                  gap-2
                                "
                              >
                                <Clock3
                                  className="
                                    h-4
                                    w-4
                                    text-slate-400
                                  "
                                />

                                <span>
                                  Received
                                  {" "}
                                  {formatDate(
                                    booking.created_at
                                  )}
                                </span>
                              </div>

                            </div>


                            {booking.requirements && (
                              <div
                                className="
                                  mt-4
                                  rounded-xl
                                  bg-slate-50
                                  px-4
                                  py-3
                                "
                              >
                                <div
                                  className="
                                    flex
                                    items-start
                                    gap-2
                                  "
                                >
                                  <MessageSquareText
                                    className="
                                      mt-0.5
                                      h-4
                                      w-4
                                      shrink-0
                                      text-slate-400
                                    "
                                  />

                                  <div>
                                    <div
                                      className="
                                        text-xs
                                        font-bold
                                        uppercase
                                        tracking-wide
                                        text-slate-500
                                      "
                                    >
                                      Care requirements
                                    </div>

                                    <p
                                      className="
                                        mt-1
                                        text-sm
                                        leading-6
                                        text-slate-700
                                      "
                                    >
                                      {
                                        booking.requirements
                                      }
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}


                            {booking.notes && (
                              <div
                                className="
                                  mt-3
                                  text-sm
                                  leading-6
                                  text-slate-500
                                "
                              >
                                <span
                                  className="
                                    font-semibold
                                    text-slate-700
                                  "
                                >
                                  Notes:
                                </span>
                                {" "}
                                {
                                  booking.notes
                                }
                              </div>
                            )}

                          </div>
                        </div>


                        {/* ACTIONS */}

                        <div
                          className="
                            flex
                            shrink-0
                            flex-wrap
                            gap-2
                            xl:max-w-[280px]
                            xl:justify-end
                          "
                        >

                          {booking.status ===
                            "pending" && (
                            <>
                              <button
                                disabled={
                                  Boolean(
                                    actionLoadingId
                                  )
                                }
                                onClick={() =>
                                  performBookingAction(
                                    booking.id,
                                    "accept"
                                  )
                                }
                                className="
                                  inline-flex
                                  items-center
                                  gap-2
                                  rounded-xl
                                  bg-[#176B62]
                                  px-4
                                  py-2.5
                                  text-sm
                                  font-semibold
                                  text-white
                                  transition
                                  hover:bg-[#12564F]
                                  disabled:cursor-not-allowed
                                  disabled:opacity-50
                                "
                              >
                                {actionLoadingId ===
                                `${booking.id}-accept` ? (
                                  <Loader2
                                    className="
                                      h-4
                                      w-4
                                      animate-spin
                                    "
                                  />
                                ) : (
                                  <CheckCircle2
                                    className="
                                      h-4
                                      w-4
                                    "
                                  />
                                )}

                                Accept
                              </button>


                              <button
                                disabled={
                                  Boolean(
                                    actionLoadingId
                                  )
                                }
                                onClick={() =>
                                  performBookingAction(
                                    booking.id,
                                    "decline"
                                  )
                                }
                                className="
                                  inline-flex
                                  items-center
                                  gap-2
                                  rounded-xl
                                  border
                                  border-red-200
                                  bg-white
                                  px-4
                                  py-2.5
                                  text-sm
                                  font-semibold
                                  text-red-600
                                  transition
                                  hover:bg-red-50
                                  disabled:cursor-not-allowed
                                  disabled:opacity-50
                                "
                              >
                                {actionLoadingId ===
                                `${booking.id}-decline` ? (
                                  <Loader2
                                    className="
                                      h-4
                                      w-4
                                      animate-spin
                                    "
                                  />
                                ) : (
                                  <X
                                    className="
                                      h-4
                                      w-4
                                    "
                                  />
                                )}

                                Decline
                              </button>
                            </>
                          )}


                          {booking.status ===
                            "accepted" && (
                            <button
                              disabled={
                                Boolean(
                                  actionLoadingId
                                )
                              }
                              onClick={() =>
                                performBookingAction(
                                  booking.id,
                                  "confirm"
                                )
                              }
                              className="
                                inline-flex
                                items-center
                                gap-2
                                rounded-xl
                                bg-indigo-600
                                px-4
                                py-2.5
                                text-sm
                                font-semibold
                                text-white
                                transition
                                hover:bg-indigo-700
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                              "
                            >
                              {actionLoadingId ===
                              `${booking.id}-confirm` ? (
                                <Loader2
                                  className="
                                    h-4
                                    w-4
                                    animate-spin
                                  "
                                />
                              ) : (
                                <CalendarDays
                                  className="
                                    h-4
                                    w-4
                                  "
                                />
                              )}

                              Confirm booking
                            </button>
                          )}


                          {booking.status ===
                            "confirmed" && (
                            <button
                              disabled={
                                Boolean(
                                  actionLoadingId
                                )
                              }
                              onClick={() =>
                                performBookingAction(
                                  booking.id,
                                  "start"
                                )
                              }
                              className="
                                inline-flex
                                items-center
                                gap-2
                                rounded-xl
                                bg-[#176B62]
                                px-4
                                py-2.5
                                text-sm
                                font-semibold
                                text-white
                                transition
                                hover:bg-[#12564F]
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                              "
                            >
                              {actionLoadingId ===
                              `${booking.id}-start` ? (
                                <Loader2
                                  className="
                                    h-4
                                    w-4
                                    animate-spin
                                  "
                                />
                              ) : (
                                <Play
                                  className="
                                    h-4
                                    w-4
                                  "
                                />
                              )}

                              Start care
                            </button>
                          )}


                          {booking.status ===
                            "in_progress" && (
                            <button
                              disabled={
                                Boolean(
                                  actionLoadingId
                                )
                              }
                              onClick={() =>
                                performBookingAction(
                                  booking.id,
                                  "complete"
                                )
                              }
                              className="
                                inline-flex
                                items-center
                                gap-2
                                rounded-xl
                                bg-green-600
                                px-4
                                py-2.5
                                text-sm
                                font-semibold
                                text-white
                                transition
                                hover:bg-green-700
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                              "
                            >
                              {actionLoadingId ===
                              `${booking.id}-complete` ? (
                                <Loader2
                                  className="
                                    h-4
                                    w-4
                                    animate-spin
                                  "
                                />
                              ) : (
                                <CheckCircle2
                                  className="
                                    h-4
                                    w-4
                                  "
                                />
                              )}

                              Complete care
                            </button>
                          )}


                          {[
                            "completed",
                            "declined",
                            "cancelled",
                          ].includes(
                            booking.status
                          ) && (
                            <span
                              className="
                                rounded-xl
                                bg-slate-100
                                px-4
                                py-2.5
                                text-sm
                                font-semibold
                                text-slate-500
                              "
                            >
                              No action required
                            </span>
                          )}

                        </div>

                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>


        {/* ==================================================
            QUICK LINKS
        ================================================== */}

        <section
          className="
            mt-7
            grid
            gap-4
            md:grid-cols-3
          "
        >

          <Link
            href="/bookings"
            className="
              flex
              items-center
              gap-4
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-5
              shadow-sm
              transition
              hover:-translate-y-0.5
              hover:shadow-md
            "
          >
            <div
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-xl
                bg-[#EAF5F3]
                text-[#176B62]
              "
            >
              <CalendarDays
                className="
                  h-5
                  w-5
                "
              />
            </div>

            <div>
              <div
                className="
                  font-bold
                  text-slate-900
                "
              >
                All bookings
              </div>

              <div
                className="
                  mt-1
                  text-sm
                  text-slate-500
                "
              >
                Open booking history
              </div>
            </div>
          </Link>


          <Link
            href="/notifications"
            className="
              flex
              items-center
              gap-4
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-5
              shadow-sm
              transition
              hover:-translate-y-0.5
              hover:shadow-md
            "
          >
            <div
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-xl
                bg-blue-50
                text-blue-700
              "
            >
              <Bell
                className="
                  h-5
                  w-5
                "
              />
            </div>

            <div>
              <div
                className="
                  font-bold
                  text-slate-900
                "
              >
                Notifications
              </div>

              <div
                className="
                  mt-1
                  text-sm
                  text-slate-500
                "
              >
                {unreadNotifications}
                {" "}
                unread
              </div>
            </div>
          </Link>


          <div
            className="
              flex
              items-center
              gap-4
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-5
              shadow-sm
            "
          >
            <div
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-xl
                bg-violet-50
                text-violet-700
              "
            >
              <Building2
                className="
                  h-5
                  w-5
                "
              />
            </div>

            <div>
              <div
                className="
                  font-bold
                  text-slate-900
                "
              >
                Provider account
              </div>

              <div
                className="
                  mt-1
                  text-sm
                  text-slate-500
                "
              >
                {
                  user?.email ||
                  "Care provider"
                }
              </div>
            </div>
          </div>

        </section>

      </div>
    </main>
  );
}