"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProviderCommandCentre from "../../components/ProviderCommandCentre";
import { useRouter } from "next/navigation";

import {
  ArrowUpRight,
  Bell,
  Building2,
  CalendarPlus,
  CalendarDays,
  CheckCircle2,
  Clock3,
  HeartHandshake,
  Loader2,
  LockKeyhole,
  MapPin,
  Mail,
  Megaphone,
  MessageSquareText,
  Play,
  Search,
  ShieldCheck,
  User,
  UserPlus,
  Users,
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


export default function ProviderDashboardPage() {
  const router = useRouter();
  const [isNewAccount, setIsNewAccount] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isNew = params.get("new") === "1";
    setIsNewAccount(isNew);
    if (isNew) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const [
    user,
    setUser,
  ] = useState(null);

  const [
    bookings,
    setBookings,
  ] = useState([]);

  const [
    staffMembers,
    setStaffMembers,
  ] = useState([]);

  const [
    selectedStaff,
    setSelectedStaff,
  ] = useState({});

  const [
    staffAssignmentMessages,
    setStaffAssignmentMessages,
  ] = useState({});

  const [
    bookingStaffOptions,
    setBookingStaffOptions,
  ] = useState({});

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

  const [showLiveNames, setShowLiveNames] = useState(false);


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

        if (profileData.user_type !== "provider") {
          router.replace(getDashboardPath(profileData));
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
        // PROVIDER STAFF
        // ----------------------------------------------

        const staffResponse =
          await authFetch(
            `${API_URL}/api/care-providers/my-staff/`,
            {
              method: "GET",
              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );

        if (
          staffResponse &&
          staffResponse.status === 401
        ) {
          goToLogin();
          return;
        }

        if (
          staffResponse &&
          staffResponse.ok
        ) {
          const staffData =
            await staffResponse.json();

          const staffItems =
            Array.isArray(staffData)
              ? staffData
              : Array.isArray(
                  staffData.results
                )
              ? staffData.results
              : [];

          setStaffMembers(
            staffItems.filter(
              (staffMember) =>
                staffMember.is_active
            )
          );
        } else {
          setStaffMembers([]);
        }

        await loadStaffOptionsForBookings(
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
  // LOAD SMART STAFF OPTIONS
  // ======================================================

  const loadStaffOptionsForBooking =
    async (bookingId) => {
      try {
        const response =
          await authFetch(
            `${API_URL}/api/bookings/${bookingId}/staff-options/`,
            {
              method: "GET",
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

        const options =
          Array.isArray(
            data.staff_options
          )
            ? data.staff_options
            : [];

        setBookingStaffOptions(
          (current) => ({
            ...current,
            [bookingId]: options,
          })
        );

      } catch {
        // Keep the ordinary staff list as a graceful fallback.
      }
    };


  const loadStaffOptionsForBookings =
    async (bookingItems) => {
      const accepted =
        bookingItems.filter(
          (booking) =>
            booking.status ===
            "accepted"
        );

      await Promise.all(
        accepted.map(
          (booking) =>
            loadStaffOptionsForBooking(
              booking.id
            )
        )
      );
    };


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

      const unassignedBookings =
    useMemo(
      () =>
        bookings.filter(
          (booking) =>
            booking.status ===
              "accepted" &&
            !booking.assigned_staff
        ),
      [bookings]
    );


  const staffingRiskBookings =
    useMemo(
      () =>
        unassignedBookings.filter(
          (booking) => {
            const options =
              bookingStaffOptions[
                booking.id
              ];

            if (!Array.isArray(options)) {
              return false;
            }

            return (
              options.filter(
                (option) =>
                  option.can_assign
              ).length === 0
            );
          }
        ),
      [
        unassignedBookings,
        bookingStaffOptions,
      ]
    );


    const overdueUnfilledBookings =
    useMemo(
      () =>
        unassignedBookings.filter(
          (booking) => {
            if (!booking.start_time) {
              return false;
            }

            const start =
              new Date(
                booking.start_time
              );

            if (
              Number.isNaN(
                start.getTime()
              )
            ) {
              return false;
            }

            return (
              start.getTime() <
              Date.now()
            );
          }
        ),
      [unassignedBookings]
    );


  const urgentUnfilledBookings =
    useMemo(
      () =>
        unassignedBookings.filter(
          (booking) => {
            if (!booking.start_time) {
              return false;
            }

            const start =
              new Date(
                booking.start_time
              );

            if (
              Number.isNaN(
                start.getTime()
              )
            ) {
              return false;
            }

            const millisecondsUntilStart =
              start.getTime() -
              Date.now();

            const twentyFourHours =
              24 * 60 * 60 * 1000;

            return (
              millisecondsUntilStart >
                0 &&
              millisecondsUntilStart <=
                twentyFourHours
            );
          }
        ),
      [unassignedBookings]
    );

  const next72HourBookings =
    useMemo(() => {
      const now = Date.now();
      const horizon = now + 72 * 60 * 60 * 1000;

      return bookings.filter((booking) => {
        if (!booking.start_time) return false;
        if (!["accepted", "confirmed", "in_progress"].includes(booking.status)) {
          return false;
        }

        const start = new Date(booking.start_time).getTime();
        return !Number.isNaN(start) && start >= now && start <= horizon;
      });
    }, [bookings]);

  const next72HourUncovered =
    useMemo(
      () =>
        next72HourBookings.filter(
          (booking) => booking.status === "accepted" && !booking.assigned_staff
        ),
      [next72HourBookings]
    );

  const next72HourCoverage =
    next72HourBookings.length === 0
      ? 100
      : Math.round(
          ((next72HourBookings.length - next72HourUncovered.length) /
            next72HourBookings.length) *
            100
        );

  const unassignedWithMatches =
    useMemo(
      () =>
        unassignedBookings.filter((booking) =>
          (bookingStaffOptions[booking.id] || []).some(
            (option) => option.can_assign
          )
        ),
      [unassignedBookings, bookingStaffOptions]
    );

  const primaryAttentionBooking =
    useMemo(
      () =>
        [...next72HourUncovered].sort(
          (left, right) =>
            new Date(left.start_time).getTime() -
            new Date(right.start_time).getTime()
        )[0] || null,
      [next72HourUncovered]
    );

  const primaryAttentionMatches = primaryAttentionBooking
    ? (bookingStaffOptions[primaryAttentionBooking.id] || []).filter(
        (option) => option.can_assign
      ).length
    : 0;

  const liveOperations =
    useMemo(() => {
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      const thirtyMinutes = 30 * 60 * 1000;
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const today = bookings
        .filter((booking) => {
          const start = new Date(booking.start_time).getTime();
          return (
            !Number.isNaN(start) &&
            start >= startOfDay.getTime() &&
            start < endOfDay.getTime() &&
            !["cancelled", "declined"].includes(booking.status)
          );
        })
        .sort(
          (left, right) =>
            new Date(left.start_time).getTime() -
            new Date(right.start_time).getTime()
        );

      const onVisit = today.filter(
        (booking) => booking.status === "in_progress"
      );
      const startingSoon = today.filter((booking) => {
        if (!["accepted", "confirmed"].includes(booking.status)) return false;
        const start = new Date(booking.start_time).getTime();
        return start >= now && start <= now + oneHour;
      });
      const lateCheckIns = today.filter((booking) => {
        if (!["accepted", "confirmed"].includes(booking.status)) return false;
        const delay = now - new Date(booking.start_time).getTime();
        return delay > 0 && delay <= thirtyMinutes;
      });
      const missed = today.filter((booking) => {
        if (!["accepted", "confirmed"].includes(booking.status)) return false;
        return now - new Date(booking.start_time).getTime() > thirtyMinutes;
      });

      return { today, onVisit, startingSoon, lateCheckIns, missed };
    }, [bookings]);

  const sevenDayCoverage = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, dayOffset) => {
      const start = new Date(today);
      start.setDate(start.getDate() + dayOffset);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const visits = bookings.filter((booking) => {
        const bookingStart = new Date(booking.start_time).getTime();
        return (
          !Number.isNaN(bookingStart) &&
          bookingStart >= start.getTime() &&
          bookingStart < end.getTime() &&
          !["cancelled", "declined"].includes(booking.status)
        );
      });
      const uncovered = visits.filter(
        (booking) => booking.status === "accepted" && !booking.assigned_staff
      );
      const percentage = visits.length
        ? Math.round(((visits.length - uncovered.length) / visits.length) * 100)
        : 100;

      return {
        label: new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(start),
        percentage,
        needsCover: uncovered.length > 0,
      };
    });
  }, [bookings]);

  const shiftsToFill = useMemo(
    () =>
      [...next72HourUncovered]
        .sort(
          (left, right) =>
            new Date(left.start_time).getTime() -
            new Date(right.start_time).getTime()
        )
        .slice(0, 3),
    [next72HourUncovered]
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
        } else if (
          activeFilter ===
          "unassigned"
        ) {
          items = items.filter(
            (booking) =>
              booking.status ===
                "accepted" &&
              !booking.assigned_staff
          );
        } else if (activeFilter === "late") {
          items = items.filter((booking) =>
            liveOperations.lateCheckIns.some((item) => item.id === booking.id)
          );
        } else if (activeFilter === "missed") {
          items = items.filter((booking) =>
            liveOperations.missed.some((item) => item.id === booking.id)
          );
        } else if (activeFilter === "starting_soon") {
          items = items.filter((booking) =>
            liveOperations.startingSoon.some((item) => item.id === booking.id)
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
              booking.assigned_staff_name,
              booking.assigned_staff_role,
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
      liveOperations,
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

          // If a pending request has just been accepted,
          // immediately load booking-specific staff availability.
          if (
            action === "accept" &&
            data.booking.status ===
              "accepted"
          ) {
            await loadStaffOptionsForBooking(
              bookingId
            );
          }
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
  // ASSIGN STAFF TO BOOKING
  // ======================================================

  const assignStaffToBooking =
    async (bookingId) => {
      try {
        setActionLoadingId(
          `${bookingId}-assign-staff`
        );

        setError("");
        setSuccess("");

        setStaffAssignmentMessages(
          (current) => ({
            ...current,
            [bookingId]: null,
          })
        );

        const staffMemberId =
          selectedStaff[bookingId] || null;

        const response =
          await authFetch(
            `${API_URL}/api/bookings/${bookingId}/assign-staff/`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                staff_member:
                  staffMemberId,
              }),
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

        let data = {};

        try {
          data =
            await response.json();
        } catch {
          data = {};
        }

        if (!response.ok) {
          const message =
            data.detail ||
            data.message ||
            "Unable to assign this staff member.";

          setStaffAssignmentMessages(
            (current) => ({
              ...current,
              [bookingId]: {
                type: "error",
                message,
              },
            })
          );

          return;
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

          setSelectedStaff(
            (current) => ({
              ...current,
              [bookingId]:
                data.booking.assigned_staff ||
                "",
            })
          );
        } else {
          await loadDashboard();
        }

        await loadStaffOptionsForBooking(
          bookingId
        );

        const message =
          data.message ||
          "Staff assignment updated successfully.";

        setStaffAssignmentMessages(
          (current) => ({
            ...current,
            [bookingId]: {
              type: "success",
              message,
            },
          })
        );

        window.setTimeout(
          () =>
            setStaffAssignmentMessages(
              (current) => ({
                ...current,
                [bookingId]: null,
              })
            ),
          4500
        );

      } catch (err) {
        setStaffAssignmentMessages(
          (current) => ({
            ...current,
            [bookingId]: {
              type: "error",
              message:
                err?.message ||
                "We couldn't assign this staff member.",
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

  const getFirstName =
    () =>
      user?.first_name ||
      getProviderName().split(/\s+/)[0] ||
      "there";

  const getGreeting =
    () => {
      const hour = new Date().getHours();
      if (hour < 12) return "Good morning";
      if (hour < 18) return "Good afternoon";
      return "Good evening";
    };


  const getCareRecipientName =
    (booking) => {
      return (
        booking.service_user_name ||
        booking.care_recipient_name ||
        "Care recipient"
      );
    };


  const getInitials =
    (name) =>
      String(name || "Care recipient")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");


  const getAvatarClasses =
    (name) => {
      const palettes = [
        "bg-teal-100 text-teal-800",
        "bg-blue-100 text-blue-800",
        "bg-violet-100 text-violet-800",
        "bg-amber-100 text-amber-800",
        "bg-rose-100 text-rose-800",
      ];
      const score = Array.from(String(name || "")).reduce(
        (total, character) => total + character.charCodeAt(0),
        0
      );

      return palettes[score % palettes.length];
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

      const parsed =
        new Date(value);

      if (
        Number.isNaN(
          parsed.getTime()
        )
      ) {
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
      ).format(parsed);
    };

  const getStaffingState =
    (booking) => {
      if (
        booking.status !==
          "accepted" ||
        booking.assigned_staff
      ) {
        return null;
      }

      const options =
        bookingStaffOptions[
          booking.id
        ];

      const availableCount =
        Array.isArray(options)
          ? options.filter(
              (option) =>
                option.can_assign
            ).length
          : null;

            let overdue = false;
      let urgent = false;

      if (booking.start_time) {
        const start =
          new Date(
            booking.start_time
          );

        if (
          !Number.isNaN(
            start.getTime()
          )
        ) {
          const millisecondsUntilStart =
            start.getTime() -
            Date.now();

          overdue =
            millisecondsUntilStart < 0;

          urgent =
            millisecondsUntilStart >
              0 &&
            millisecondsUntilStart <=
              24 * 60 * 60 * 1000;
        }
      }

      if (overdue) {
        return {
          label:
            "OVERDUE â€” SHIFT START TIME PASSED",
          classes:
            "border-red-300 bg-red-100 text-red-800",
        };
      }

      if (urgent) {
        return {
          label:
            "URGENT â€” STARTS WITHIN 24 HOURS",
          classes:
            "border-orange-300 bg-orange-100 text-orange-800",
        };
      }

      if (availableCount === 0) {
        return {
          label:
            "STAFFING RISK â€” NO STAFF AVAILABLE",
          classes:
            "border-red-200 bg-red-50 text-red-700",
        };
      }

      if (
        availableCount !== null &&
        availableCount > 0
      ) {
        return {
          label:
            `NEEDS ASSIGNMENT â€” ${availableCount} AVAILABLE`,
          classes:
            "border-amber-200 bg-amber-50 text-amber-700",
        };
      }

      return {
        label:
          "UNASSIGNED SHIFT",
        classes:
          "border-amber-200 bg-amber-50 text-amber-700",
      };
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
          cs-page
          flex
          min-h-screen
          items-center
          justify-center
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
        cs-page
        min-h-screen
        text-slate-900
      "
    >

      <div
        className="
          mx-auto
          max-w-[1560px]
          px-5
          py-8
          lg:px-8
          lg:py-10
        "
      >

        {/* ==================================================
            WELCOME
        ================================================== */}

        <ProviderCommandCentre name={getFirstName()} greeting={isNewAccount ? "Welcome" : getGreeting()} live={liveOperations} staffCount={staffMembers.length} coverage={next72HourCoverage} scheduled={next72HourBookings} uncovered={next72HourUncovered} attention={primaryAttentionBooking} matches={primaryAttentionMatches} recipientName={getCareRecipientName} formatDate={formatDate} week={sevenDayCoverage} onFilter={setActiveFilter} />
        <section className="cs-enter mt-7 rounded-[22px] border border-[#E3E9E7] bg-white p-5 shadow-[0_8px_24px_rgba(18,37,32,0.04)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#087765]">Live care operations</p>
              <h2 className="mt-2 font-serif text-2xl font-semibold tracking-[-0.025em] text-[#0F1E1B]">See where care needs attention</h2>
              <p className="mt-1 text-sm leading-6 text-[#5B6B67]">Operational view only. Updates refresh as visit statuses change.</p>
            </div>
            <label className="inline-flex min-h-11 w-fit cursor-pointer items-center gap-3 rounded-full border border-[#E3E9E7] bg-[#FAFCFB] px-4 text-sm font-semibold text-[#5B6B67]">
              <input
                type="checkbox"
                checked={showLiveNames}
                onChange={(event) => setShowLiveNames(event.target.checked)}
                className="sr-only"
              />
              <span className={`relative h-6 w-10 rounded-full transition ${showLiveNames ? "bg-[#087765]" : "bg-[#DDE5E2]"}`}>
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${showLiveNames ? "left-5" : "left-1"}`} />
              </span>
              {showLiveNames ? "Hide names" : "Show names"}
            </label>
          </div>

          <div className="relative mt-5 h-[300px] overflow-hidden rounded-[20px] border border-[#DCE6E3] bg-[#E8EFEC] sm:h-[370px]">
            <div className="absolute inset-x-[-10%] top-[24%] h-3 rotate-[-5deg] bg-white/80" />
            <div className="absolute inset-x-[-10%] top-[69%] h-3 rotate-[7deg] bg-white/80" />
            <div className="absolute bottom-[-16%] left-[26%] h-[140%] w-3 rotate-[-12deg] bg-white/80" />
            <div className="absolute bottom-[-16%] right-[23%] h-[140%] w-3 rotate-[8deg] bg-white/80" />
            <div className="absolute inset-x-[-10%] top-[48%] h-16 rotate-[-4deg] bg-[#D8E9ED]/90" />

            {[
              ["18%", "31%", false],
              ["46%", "24%", false],
              ["72%", "37%", true],
              ["31%", "71%", false],
              ["68%", "75%", false],
            ].map(([left, top, attention], index) => (
              <button
                key={`${left}-${top}`}
                type="button"
                onClick={() => setActiveFilter(attention ? "unassigned" : "in_progress")}
                aria-label={attention ? "Visit needs cover" : "Carer on visit or en route"}
                className={`absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[5px] shadow-[0_0_0_5px_rgba(255,255,255,0.42)] transition hover:scale-110 ${attention ? "border-[#F3E5B9] bg-[#C9A24B]" : "border-[#B8DDD3] bg-[#0E8B73]"}`}
                style={{ left, top }}
              >
                <span className="sr-only">Map point {index + 1}</span>
              </button>
            ))}

            {liveOperations.onVisit[0] && (
              <div className="absolute left-4 top-5 max-w-[240px] rounded-2xl bg-white px-4 py-3 shadow-[0_12px_30px_rgba(18,37,32,0.15)]">
                <p className="truncate text-sm font-bold text-[#122520]">
                  {showLiveNames ? getCareRecipientName(liveOperations.onVisit[0]) : "Active care visit"}
                </p>
                <p className="mt-1 text-xs text-[#5B6B67]">Carer with client Â· {formatTime(liveOperations.onVisit[0].start_time)}</p>
              </div>
            )}

            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-x-5 gap-y-2 rounded-xl bg-white/95 px-4 py-3 text-xs font-semibold text-[#5B6B67] shadow-sm backdrop-blur">
              <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#0E8B73]" />Carer on visit or en route</span>
              <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#C9A24B]" />Visit needs cover</span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-[#6B7C77]">
            <LockKeyhole className="h-4 w-4 text-[#087765]" />
            Names are hidden by default. Map access is role-controlled and audited.
          </div>
        </section>

        <section className="cs-enter mt-7 grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
          <article className="rounded-[22px] border border-[#E3E9E7] bg-white p-6 shadow-[0_8px_24px_rgba(18,37,32,0.04)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0E7C6B]">Live operations</p>
                <h2 className="mt-2 font-serif text-2xl font-semibold tracking-[-0.025em] text-[#0F1E1B]">Today&apos;s visit tracker</h2>
                <p className="mt-1 text-sm text-[#5B6B67]">See what is happening now and intervene before a visit is missed.</p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#F1F7F5] px-3 py-1.5 text-xs font-bold text-[#176B62]">
                <span className="h-2 w-2 rounded-full bg-[#12805C]" />
                {liveOperations.today.length} visits today
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [liveOperations.onVisit.length, "On visit", "in_progress", "Care underway", "#E7F5EF", "#12805C"],
                [liveOperations.startingSoon.length, "Starting soon", "starting_soon", "Next 60 minutes", "#FCF3E1", "#9A661B"],
                [liveOperations.lateCheckIns.length, "Late check-in", "late", "Needs a check", "#FFF4D8", "#B7791F"],
                [liveOperations.missed.length, "Missed", "missed", "Immediate action", "#FBEAE8", "#C0392B"],
              ].map(([value, label, filter, hint, background, colour]) => {
                const active = Number(value) > 0;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setActiveFilter(filter)}
                    className="rounded-2xl border border-[#E6ECEA] p-4 text-left transition duration-150 hover:-translate-y-0.5 hover:border-[#C9D8D3] hover:shadow-sm"
                  >
                    <span
                      className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-lg font-semibold tabular-nums"
                      style={{
                        backgroundColor: active ? background : "#F3F6F5",
                        color: active ? colour : "#7A8985",
                      }}
                    >
                      {value}
                    </span>
                    <span className="mt-3 block text-sm font-bold text-[#0F1E1B]">{label}</span>
                    <span className="mt-1 block text-xs text-[#6B7C77]">{active ? hint : "None right now"}</span>
                  </button>
                );
              })}
            </div>

            {(liveOperations.missed.length > 0 || liveOperations.lateCheckIns.length > 0) && (
              <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[#F0D6D1] bg-[#FFF9F8] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-[#8F2E25]">A visit needs intervention</p>
                  <p className="mt-1 text-xs leading-5 text-[#6B4B47]">
                    {liveOperations.missed.length > 0
                      ? `${liveOperations.missed.length} visit${liveOperations.missed.length === 1 ? " has" : "s have"} passed the 30-minute safety threshold.`
                      : `${liveOperations.lateCheckIns.length} carer check-in${liveOperations.lateCheckIns.length === 1 ? " is" : "s are"} late.`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveFilter(liveOperations.missed.length > 0 ? "missed" : "late")}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#0F1E1B] px-4 text-xs font-bold text-white transition hover:bg-[#21332F]"
                >
                  Review affected visits â†’
                </button>
              </div>
            )}
          </article>

          <article className="rounded-[22px] border border-[#E3E9E7] bg-white p-6 shadow-[0_8px_24px_rgba(18,37,32,0.04)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0E7C6B]">Visit timeline</p>
                <h2 className="mt-2 font-serif text-2xl font-semibold tracking-[-0.025em] text-[#0F1E1B]">What&apos;s next</h2>
              </div>
              <button type="button" onClick={() => setActiveFilter("all")} className="text-xs font-bold text-[#0E7C6B]">View all â†’</button>
            </div>

            {liveOperations.today.length > 0 ? (
              <div className="mt-5 divide-y divide-[#EDF1F0]">
                {liveOperations.today.slice(0, 5).map((booking) => {
                  const isMissed = liveOperations.missed.some((item) => item.id === booking.id);
                  const isLate = liveOperations.lateCheckIns.some((item) => item.id === booking.id);
                  const statusLabel = isMissed
                    ? "Missed"
                    : isLate
                    ? "Late"
                    : booking.status === "in_progress"
                    ? "On visit"
                    : booking.status === "completed"
                    ? "Complete"
                    : "Scheduled";
                  const statusClass = isMissed
                    ? "bg-[#FBEAE8] text-[#C0392B]"
                    : isLate
                    ? "bg-[#FCF3E1] text-[#9A661B]"
                    : booking.status === "in_progress"
                    ? "bg-[#E7F5EF] text-[#12805C]"
                    : "bg-[#F1F5F4] text-[#5B6B67]";

                  return (
                    <button
                      key={booking.id}
                      type="button"
                      onClick={() => setActiveFilter(isMissed ? "missed" : isLate ? "late" : booking.status)}
                      className="flex w-full items-center gap-3 py-4 text-left first:pt-1"
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${getAvatarClasses(getCareRecipientName(booking))}`}>
                        {getInitials(getCareRecipientName(booking))}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-[#0F1E1B]">{getCareRecipientName(booking)}</span>
                        <span className="mt-1 block text-xs text-[#6B7C77]">{formatTime(booking.start_time)} Â· {booking.care_type || "Care visit"}</span>
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass}`}>{statusLabel}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-[#D9E3E0] bg-[#F8FAF9] px-5 py-8 text-center">
                <CheckCircle2 className="mx-auto h-6 w-6 text-[#0E7C6B]" />
                <p className="mt-3 text-sm font-bold text-[#0F1E1B]">No visits scheduled today</p>
                <p className="mt-1 text-xs leading-5 text-[#6B7C77]">Your timeline will update automatically when care is booked.</p>
              </div>
            )}
          </article>
        </section>

        <section className="cs-enter mt-7 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <article className="rounded-[22px] border border-[#E3E9E7] bg-white p-5 shadow-[0_8px_24px_rgba(18,37,32,0.04)] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#087765]">Coverage, next 72 hours</p>
                <h2 className="mt-2 font-serif text-2xl font-semibold tracking-[-0.025em] text-[#0F1E1B]">Forward rota confidence</h2>
              </div>
              <span className="text-4xl font-semibold tabular-nums tracking-[-0.05em] text-[#0F1E1B]">{next72HourCoverage}%</span>
            </div>
            <div className="mt-6 grid grid-cols-7 gap-2 sm:gap-3">
              {sevenDayCoverage.map((day) => (
                <div key={day.label} className="text-center">
                  <div className="flex h-24 items-end overflow-hidden rounded-xl bg-[#EDF2F0]">
                    <div
                      className={`w-full rounded-xl ${day.needsCover ? "bg-[#C9A24B]" : "bg-[#0E8B73]"}`}
                      style={{ height: `${Math.max(day.percentage, 12)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs font-bold tabular-nums text-[#122520]">{day.percentage}%</p>
                  <p className="mt-0.5 text-[11px] text-[#71817C]">{day.label}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[22px] border border-[#E3E9E7] bg-white p-5 shadow-[0_8px_24px_rgba(18,37,32,0.04)] sm:p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#087765]">Shifts to fill</p>
              <h2 className="mt-2 font-serif text-2xl font-semibold tracking-[-0.025em] text-[#0F1E1B]">Close coverage gaps</h2>
            </div>
            {shiftsToFill.length ? (
              <div className="mt-5 space-y-3">
                {shiftsToFill.map((booking) => (
                  <div key={booking.id} className="flex flex-col gap-3 rounded-2xl bg-[#F7F9F8] p-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[#122520]">{formatDate(booking.start_time)}</p>
                      <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-[#5B6B67]"><MapPin className="h-3.5 w-3.5" />{booking.care_type || "Care visit"}</p>
                    </div>
                    <button type="button" onClick={() => setActiveFilter("unassigned")} className="cs-button-primary px-5 text-sm">Assign</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-[#DDEAE5] bg-[#F3F9F6] p-5">
                <CheckCircle2 className="h-6 w-6 text-[#12805C]" />
                <p className="mt-3 text-sm font-bold text-[#174E45]">All shifts are covered</p>
                <p className="mt-1 text-xs leading-5 text-[#5B6B67]">CareSphere will surface the next staffing gap here automatically.</p>
              </div>
            )}
          </article>
        </section>

        <section className="cs-enter mt-7 rounded-[22px] border border-[#E3E9E7] bg-white p-5 shadow-[0_8px_24px_rgba(18,37,32,0.04)] sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#087765]">CQC evidence readiness</p>
              <h2 className="mt-2 font-serif text-2xl font-semibold tracking-[-0.025em] text-[#0F1E1B]">Your evidence workspace</h2>
              <p className="mt-1 text-sm leading-6 text-[#5B6B67]">Organise evidence against the Single Assessment Framework. This is not a CQC rating or guarantee.</p>
            </div>
            <Link href="/provider-profile" className="text-sm font-bold text-[#087765]">View evidence â†’</Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {["Safe care", "Effective care", "Caring support", "Well-led service"].map((area) => (
              <div key={area} className="flex min-h-16 items-center gap-3 rounded-2xl bg-[#F7F9F8] px-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#E4F4ED] text-[#087765]"><CheckCircle2 className="h-4 w-4" /></span>
                <span className="text-sm font-semibold text-[#435650]">{area}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="cs-enter mt-7 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[22px] border border-[#E3E9E7] bg-white p-6 shadow-[0_8px_24px_rgba(18,37,32,0.04)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#087765]">Quick actions</p>
                <h2 className="mt-2 font-serif text-2xl font-semibold tracking-[-0.025em] text-[#0F1E1B]">Move work forward</h2>
                <p className="mt-1 text-sm leading-6 text-[#5B6B67]">The most common coordinator tasks, without hunting through menus.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link href="/provider-staff" className="flex min-h-16 items-center gap-3 rounded-2xl border border-[#E3E9E7] bg-[#FAFCFB] px-4 text-sm font-bold text-[#17352E] transition hover:border-[#BFD5CE] hover:bg-[#F3F8F6]">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E6F4EF] text-[#087765]"><UserPlus className="h-5 w-5" /></span>
                Add team member
                <ArrowUpRight className="ml-auto h-4 w-4 text-[#71817C]" />
              </Link>
              <button type="button" onClick={() => setActiveFilter("unassigned")} className="flex min-h-16 items-center gap-3 rounded-2xl border border-[#E3E9E7] bg-[#FAFCFB] px-4 text-left text-sm font-bold text-[#17352E] transition hover:border-[#BFD5CE] hover:bg-[#F3F8F6]">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F7F0DD] text-[#8A681A]"><CalendarPlus className="h-5 w-5" /></span>
                Fill rota gaps
                <ArrowUpRight className="ml-auto h-4 w-4 text-[#71817C]" />
              </button>
              <Link href="/provider-availability" className="flex min-h-16 items-center gap-3 rounded-2xl border border-[#E3E9E7] bg-[#FAFCFB] px-4 text-sm font-bold text-[#17352E] transition hover:border-[#BFD5CE] hover:bg-[#F3F8F6]">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E6F4EF] text-[#087765]"><CalendarDays className="h-5 w-5" /></span>
                Update capacity
                <ArrowUpRight className="ml-auto h-4 w-4 text-[#71817C]" />
              </Link>
              <Link href="/notifications" className="flex min-h-16 items-center gap-3 rounded-2xl border border-[#E3E9E7] bg-[#FAFCFB] px-4 text-sm font-bold text-[#17352E] transition hover:border-[#BFD5CE] hover:bg-[#F3F8F6]">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F0F2F7] text-[#526183]"><Megaphone className="h-5 w-5" /></span>
                Send notification
                <ArrowUpRight className="ml-auto h-4 w-4 text-[#71817C]" />
              </Link>
            </div>
          </article>

          <article className="rounded-[22px] border border-[#E3E9E7] bg-white p-6 shadow-[0_8px_24px_rgba(18,37,32,0.04)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#087765]">Marketplace pulse</p>
                <h2 className="mt-2 font-serif text-2xl font-semibold tracking-[-0.025em] text-[#0F1E1B]">Care demand</h2>
                <p className="mt-1 text-sm leading-6 text-[#5B6B67]">Real activity from your current CareSphere care journey.</p>
              </div>
              <Link href="/provider-profile" className="text-sm font-bold text-[#087765]">Improve profile â†’</Link>
            </div>
            <dl className="mt-5 divide-y divide-[#E9EFEC]">
              <div className="flex items-center justify-between gap-4 py-3 first:pt-0"><dt className="text-sm text-[#5B6B67]">New care requests</dt><dd className="text-lg font-bold tabular-nums text-[#122520]">{pendingBookings.length}</dd></div>
              <div className="flex items-center justify-between gap-4 py-3"><dt className="text-sm text-[#5B6B67]">Active care journeys</dt><dd className="text-lg font-bold tabular-nums text-[#122520]">{activeBookings.length}</dd></div>
              <div className="flex items-center justify-between gap-4 py-3"><dt className="text-sm text-[#5B6B67]">Awaiting staff assignment</dt><dd className={`text-lg font-bold tabular-nums ${unassignedBookings.length ? "text-[#B7791F]" : "text-[#12805C]"}`}>{unassignedBookings.length}</dd></div>
              <div className="flex items-center justify-between gap-4 pt-3"><dt className="text-sm text-[#5B6B67]">Completed care</dt><dd className="text-lg font-bold tabular-nums text-[#122520]">{completedBookings.length}</dd></div>
            </dl>
          </article>
        </section>

        <footer className="cs-enter mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#E3E9E7] py-5 text-[13px] font-medium text-[#5B6B67]">
          <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#087765]" /> CQC evidence workspace</span>
          <span className="inline-flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-[#087765]" /> Encrypted data with complete audit history</span>
          <span className="ml-auto text-[#71817C]">CareSphere Provider Command Centre</span>
        </footer>

        <section hidden className="cs-enter grid gap-4 xl:grid-cols-[1.15fr_1fr_0.72fr]">
          <article className="cs-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-[#123B36]">Today&apos;s operations</p>
                <p className="mt-1 text-xs text-slate-500">Current care activity</p>
              </div>
              <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Live
              </span>
            </div>
            <div className="mt-6 grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">
              {[
                [activeBookings.length, "Active", "in_progress", "text-emerald-700", "bg-emerald-100"],
                [pendingBookings.length, "New", "pending", "text-amber-700", "bg-amber-100"],
                [unassignedBookings.length, "Unassigned", "unassigned", "text-red-700", "bg-red-100"],
                [completedBookings.length, "Completed", "completed", "text-blue-700", "bg-blue-100"],
              ].map(([value, label, filter, colour, background]) => (
                <button key={label} type="button" onClick={() => setActiveFilter(filter)} className="px-3 py-3 text-left first:pl-0">
                  <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-black ${colour} ${background}`}>{value}</span>
                  <span className="mt-2 block text-xs font-bold text-slate-600">{label}</span>
                </button>
              ))}
            </div>
          </article>

          <article className="cs-surface p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-[#123B36]">Booking progress</p>
                <p className="mt-1 text-xs text-slate-500">Across the current care journey</p>
              </div>
              <span className="text-xs font-bold text-slate-400">{bookings.length} total</span>
            </div>
            {bookings.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-4">
                <p className="text-sm font-semibold text-[#123B36]">Ready for your first care request</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Keep your availability current so families can request suitable care.</p>
                <Link href="/provider-availability" className="mt-3 inline-flex text-xs font-bold text-[#087C76]">Update availability â†’</Link>
              </div>
            ) : (
              <div className="mt-7 flex items-start">
                {[
                  ["Requested", pendingBookings.length, "bg-amber-500"],
                  ["Confirmed", confirmedBookings.length, "bg-blue-500"],
                  ["In progress", inProgressBookings.length, "bg-[#0B9A7C]"],
                  ["Completed", completedBookings.length, "bg-emerald-500"],
                ].map(([label, value, colour], index, stages) => (
                  <div key={label} className="relative flex flex-1 flex-col items-center text-center">
                    {index < stages.length - 1 && <span className="absolute left-1/2 top-3 h-0.5 w-full bg-slate-200" />}
                    <span className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ${colour}`}>{value}</span>
                    <span className="mt-2 text-[10px] font-bold leading-4 text-slate-500">{label}</span>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="cs-surface p-5">
            <p className="font-bold text-[#123B36]">Team readiness</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Team members</span>
                <span className="font-bold text-[#123B36]">{staffMembers.length}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Active bookings</span>
                <span className="font-bold text-emerald-700">{activeBookings.length}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Uncovered visits</span>
                <span className={`font-bold ${unassignedBookings.length ? "text-red-700" : "text-slate-700"}`}>{unassignedBookings.length}</span>
              </div>
            </div>
            <Link href="/provider-staff" className="mt-4 inline-flex text-xs font-bold text-[#087C76]">Manage team â†’</Link>
          </article>
        </section>

        <section
          className="
            hidden
            cs-enter
            relative
            overflow-hidden
            rounded-[28px]
            bg-gradient-to-r
            from-[#033A34]
            via-[#07534A]
            to-[#0B9A7C]
            px-6
            py-8
            text-white
            shadow-[0_22px_60px_rgba(6,27,44,0.18)]
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

                Provider operations
              </div>

              <h1
                className="
                  text-3xl
                  font-bold
                  tracking-tight
                  md:text-4xl
                "
              >
                {isNewAccount ? "Welcome," : "Welcome back,"}
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
                See what needs attention, assign the right staff and move every care request forward with confidence.
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
                  border
                  border-white/10
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
                  border
                  border-white/10
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
                  border
                  border-white/10
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
                  border
                  border-white/10
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
          {unassignedBookings.length >
          0 && (
          <button
            hidden
            type="button"
            onClick={() =>
              setActiveFilter(
                "unassigned"
              )
            }
            className={`
              mt-7
              flex
              w-full
              flex-col
              gap-3
              rounded-2xl
              border
              px-5
              py-4
              text-left
              transition
              hover:shadow-sm
              sm:flex-row
              sm:items-center
              sm:justify-between
              ${
                               overdueUnfilledBookings.length >
                0
                  ? "border-red-300 bg-red-50"
                  : urgentUnfilledBookings.length >
                    0
                  ? "border-orange-300 bg-orange-50"
                  : staffingRiskBookings.length >
                    0
                  ? "border-orange-200 bg-orange-50"
                  : "border-amber-200 bg-amber-50"
              }
            `}
          >
            <div>
              <div
                className={`
                  text-sm
                  font-bold
                  ${
                    urgentUnfilledBookings.length >
                    0
                      ? "text-red-700"
                      : staffingRiskBookings.length >
                        0
                      ? "text-orange-700"
                      : "text-amber-700"
                  }
                `}
              >
                Staffing attention required
              </div>

              <p className="mt-1 text-sm text-slate-700">
                {
                  unassignedBookings.length
                }
                {" "}
                accepted
                {unassignedBookings.length ===
                1
                  ? " shift is"
                  : " shifts are"}
                {" "}
                currently unassigned.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {staffingRiskBookings.length >
                0 && (
                <span className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700">
                  {
                    staffingRiskBookings.length
                  }
                  {" "}
                  with no staff available
                </span>
              )}

                            {overdueUnfilledBookings.length >
                0 && (
                <span className="rounded-full bg-red-700 px-3 py-1.5 text-xs font-bold text-white">
                  {
                    overdueUnfilledBookings.length
                  }
                  {" "}
                  overdue
                </span>
              )}

              {urgentUnfilledBookings.length >
                0 && (
                <span className="rounded-full bg-orange-600 px-3 py-1.5 text-xs font-bold text-white">
                  {
                    urgentUnfilledBookings.length
                  }
                  {" "}
                  urgent
                </span>
              )}

              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700">
                View unassigned shifts â†’
              </span>
            </div>
          </button>
        )}

        {/* ==================================================
            STAT CARDS
        ================================================== */}

        <section
          className="
            hidden
            mt-7
            grid
            gap-4
            sm:grid-cols-2
            xl:grid-cols-5
            cs-enter
          "
        >

          <button
            onClick={() =>
              setActiveFilter(
                "pending"
              )
            }
            className="
              rounded-[20px]
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
                "unassigned"
              )
            }
            className="
              rounded-[20px]
              border
              border-red-200
              bg-white
              p-5
              text-left
              shadow-sm
              transition
              hover:-translate-y-0.5
              hover:shadow-md
            "
          >
            <div className="flex items-start justify-between">
              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-red-50
                  text-red-700
                "
              >
                <Users className="h-5 w-5" />
              </div>

              <span className="text-2xl font-bold text-red-700">
                {
                  unassignedBookings.length
                }
              </span>
            </div>

            <h3 className="mt-5 font-bold text-slate-900">
              Unassigned shifts
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Accepted care awaiting staff
            </p>

                       <div className="mt-2 space-y-1">
              {overdueUnfilledBookings.length >
                0 && (
                <p className="text-xs font-bold text-red-700">
                  {
                    overdueUnfilledBookings.length
                  }
                  {" "}
                  overdue unfilled
                  {overdueUnfilledBookings.length ===
                  1
                    ? " shift"
                    : " shifts"}
                </p>
              )}

              {urgentUnfilledBookings.length >
                0 && (
                <p className="text-xs font-bold text-orange-600">
                  {
                    urgentUnfilledBookings.length
                  }
                  {" "}
                  starting within 24 hours
                </p>
              )}

              {staffingRiskBookings.length >
                0 && (
                <p className="text-xs font-bold text-red-600">
                  {
                    staffingRiskBookings.length
                  }
                  {" "}
                  currently have no available staff
                </p>
              )}
            </div>
          </button>



          <button
            onClick={() =>
              setActiveFilter(
                "confirmed"
              )
            }
            className="
              rounded-[20px]
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
              rounded-[20px]
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
              rounded-[20px]
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
            cs-enter
            mt-7
            overflow-hidden
            rounded-[24px]
            border
            border-slate-200
            bg-white
            shadow-[0_12px_38px_rgba(6,27,44,0.07)]
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
                  "unassigned",
                  "Unassigned",
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
                {activeFilter === "all" ? "No care requests yet" : "Nothing in this view"}
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
                {activeFilter === "all"
                  ? "Your workspace is ready. New requests from families will appear here when they match your services and availability."
                  : "There are no bookings matching this status or search. Try another filter or return to all bookings."}
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
              {activeFilter === "all" && (
                <Link href="/provider-availability" className="mt-5 inline-flex rounded-xl bg-[#176B62] px-4 py-2.5 text-sm font-semibold text-white">
                  Review availability
                </Link>
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

                  const staffingState =
                    getStaffingState(
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
                            className={`
                              hidden
                              h-12
                              w-12
                              shrink-0
                              items-center
                              justify-center
                              rounded-2xl
                              text-sm
                              font-bold
                              sm:flex
                              ${getAvatarClasses(recipientName)}
                            `}
                            aria-label={`${recipientName} initials`}
                          >
                            {getInitials(recipientName)}
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
                                                            {staffingState && (
                                <span
                                  className={`
                                    rounded-full
                                    border
                                    px-2.5
                                    py-1
                                    text-[11px]
                                    font-bold
                                    ${staffingState.classes}
                                  `}
                                >
                                  {
                                    staffingState.label
                                  }
                                </span>
                              )}
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
                                  {" â€“ "}
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


                            {booking.assigned_staff_name && (
                              <div
                                className="
                                  mt-4
                                  rounded-xl
                                  border
                                  border-emerald-200
                                  bg-emerald-50
                                  px-4
                                  py-3
                                "
                              >
                                <div
                                  className="
                                    flex
                                    items-center
                                    gap-3
                                  "
                                >
                                  <div
                                    className="
                                      flex
                                      h-9
                                      w-9
                                      shrink-0
                                      items-center
                                      justify-center
                                      rounded-xl
                                      bg-white
                                      text-emerald-700
                                    "
                                  >
                                    <Users
                                      className="
                                        h-4
                                        w-4
                                      "
                                    />
                                  </div>

                                  <div>
                                    <div
                                      className="
                                        text-xs
                                        font-bold
                                        uppercase
                                        tracking-wide
                                        text-emerald-700
                                      "
                                    >
                                      Assigned staff
                                    </div>

                                    <div
                                      className="
                                        mt-0.5
                                        text-sm
                                        font-semibold
                                        text-slate-900
                                      "
                                    >
                                      {
                                        booking.assigned_staff_name
                                      }
                                      {booking.assigned_staff_role &&
                                        ` Â· ${booking.assigned_staff_role}`}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}


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
                            <div
                              className="
                                flex
                                w-full
                                flex-col
                                gap-2
                                xl:w-[280px]
                              "
                            >
                              <label
                                className="
                                  text-xs
                                  font-bold
                                  uppercase
                                  tracking-wide
                                  text-slate-500
                                "
                              >
                                Assign staff
                              </label>

                              <select
                                value={
                                  selectedStaff[
                                    booking.id
                                  ] ??
                                  booking.assigned_staff ??
                                  ""
                                }
                                onChange={(event) =>
                                  setSelectedStaff(
                                    (current) => ({
                                      ...current,
                                      [booking.id]:
                                        event.target.value,
                                    })
                                  )
                                }
                                disabled={
                                  Boolean(
                                    actionLoadingId
                                  )
                                }
                                className="
                                  w-full
                                  rounded-xl
                                  border
                                  border-slate-200
                                  bg-white
                                  px-3
                                  py-2.5
                                  text-sm
                                  text-slate-700
                                  outline-none
                                  transition
                                  focus:border-[#176B62]
                                  focus:ring-2
                                  focus:ring-[#176B62]/10
                                  disabled:cursor-not-allowed
                                  disabled:opacity-50
                                "
                              >
                                <option value="">
                                  Select staff member
                                </option>

                                {(
                                  bookingStaffOptions[
                                    booking.id
                                  ] ||
                                  staffMembers.map(
                                    (staffMember) => ({
                                      id:
                                        staffMember.id,
                                      full_name:
                                        staffMember.full_name ||
                                        `${staffMember.first_name || ""} ${staffMember.last_name || ""}`.trim(),
                                      role:
                                        staffMember.role,
                                      can_assign:
                                        staffMember.is_active &&
                                        staffMember.is_available,
                                      reason:
                                        staffMember.is_available
                                          ? "Available"
                                          : "Marked unavailable",
                                    })
                                  )
                                ).map(
                                  (staffOption) => (
                                    <option
                                      key={
                                        staffOption.id
                                      }
                                      value={
                                        staffOption.id
                                      }
                                      disabled={
                                        !staffOption.can_assign &&
                                        String(
                                          booking.assigned_staff ||
                                          ""
                                        ) !==
                                          String(
                                            staffOption.id
                                          )
                                      }
                                    >
                                      {
                                        staffOption.full_name
                                      }
                                      {staffOption.role
                                        ? ` Â· ${staffOption.role}`
                                        : ""}
                                      {staffOption.can_assign
                                        ? " â€” Available"
                                        : ` â€” ${staffOption.reason}`}
                                    </option>
                                  )
                                )}
                              </select>

                              {bookingStaffOptions[
                                booking.id
                              ] && (
                                <>
                                  {bookingStaffOptions[
                                    booking.id
                                  ].filter(
                                    (option) =>
                                      option.can_assign
                                  ).length === 0 ? (
                                    <div
                                      className="
                                        rounded-xl
                                        border
                                        border-red-200
                                        bg-red-50
                                        px-3
                                        py-2.5
                                        text-xs
                                        font-semibold
                                        leading-5
                                        text-red-700
                                      "
                                    >
                                      NO STAFF AVAILABLE FOR THIS SHIFT
                                    </div>
                                  ) : (
                                    <div className="text-xs leading-5 text-slate-500">
                                      {
                                        bookingStaffOptions[
                                          booking.id
                                        ].filter(
                                          (option) =>
                                            option.can_assign
                                        ).length
                                      }
                                      {" "}
                                      staff member
                                      {
                                        bookingStaffOptions[
                                          booking.id
                                        ].filter(
                                          (option) =>
                                            option.can_assign
                                        ).length === 1
                                          ? ""
                                          : "s"
                                      }
                                      {" "}
                                      available for this booking.
                                    </div>
                                  )}
                                </>
                              )}

                              <button
                                disabled={
                                  Boolean(
                                    actionLoadingId
                                  ) ||
                                  !(
                                    selectedStaff[
                                      booking.id
                                    ] ??
                                    booking.assigned_staff
                                  )
                                }
                                onClick={() =>
                                  assignStaffToBooking(
                                    booking.id
                                  )
                                }
                                className="
                                  inline-flex
                                  items-center
                                  justify-center
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
                                `${booking.id}-assign-staff` ? (
                                  <Loader2
                                    className="
                                      h-4
                                      w-4
                                      animate-spin
                                    "
                                  />
                                ) : (
                                  <Users
                                    className="
                                      h-4
                                      w-4
                                    "
                                  />
                                )}

                                {booking.assigned_staff
                                  ? "Update staff"
                                  : "Assign staff"}
                              </button>

                              {staffAssignmentMessages[
                                booking.id
                              ] && (
                                <div
                                  className={`rounded-xl border px-3 py-2.5 text-xs font-semibold leading-5 ${
                                    staffAssignmentMessages[
                                      booking.id
                                    ].type === "error"
                                      ? "border-red-200 bg-red-50 text-red-700"
                                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  }`}
                                >
                                  {
                                    staffAssignmentMessages[
                                      booking.id
                                    ].message
                                  }
                                </div>
                              )}

                              <button
                                disabled={
                                  Boolean(
                                    actionLoadingId
                                  ) ||
                                  !booking.assigned_staff
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
                                  justify-center
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

                              {!booking.assigned_staff && (
                                <p
                                  className="
                                    text-xs
                                    leading-5
                                    text-slate-500
                                  "
                                >
                                  Assign an available staff
                                  member before confirming.
                                </p>
                              )}
                            </div>
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
            md:grid-cols-2
            xl:grid-cols-3
          "
        >
          <Link
  href="/provider-profile"
  className="
    flex
    items-center
    gap-3
    rounded-2xl
    border
    border-slate-200
    bg-white
    p-4
    transition
    hover:border-[#176B62]
    hover:shadow-sm
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
      bg-teal-50
      text-[#176B62]
    "
  >
    <Building2 className="h-5 w-5" />
  </div>

  <div>
    <p className="font-semibold text-slate-900">
      My Provider Profile
    </p>

    <p className="mt-1 text-sm text-slate-500">
      Manage business details, services and pricing
    </p>
    </div>
</Link>

<Link
  href="/provider-staff"
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
      bg-emerald-50
      text-emerald-700
    "
  >
    <Users className="h-5 w-5" />
  </div>

  <div>
    <div className="font-bold text-slate-900">
      Staff Management
    </div>

    <div className="mt-1 text-sm text-slate-500">
      Manage carers, nurses and provider staff
    </div>
  </div>
</Link>

<Link
  href="/provider-availability"
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
      bg-indigo-50
      text-indigo-700
    "
  >
    <Clock3 className="h-5 w-5" />
  </div>

  <div>
    <div className="font-bold text-slate-900">
      Availability & Scheduling
    </div>

    <div className="mt-1 text-sm text-slate-500">
      Manage staff availability and care schedules
    </div>
  </div>
</Link>

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
