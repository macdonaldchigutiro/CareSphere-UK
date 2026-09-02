"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Edit3,
  HeartHandshake,
  Loader2,
  MapPin,
  Plus,
  Search,
  User,
  X,
} from "lucide-react";

import {
  authFetch,
  createLoginUrl,
  getAuthStorage,
} from "../../lib/auth";
import { API_URL } from "../../lib/config";

const SLOT_TYPES = [
  ["hourly", "Hourly Care"],
  ["live_in", "Live-in Care"],
  ["overnight", "Overnight Care"],
  ["respite", "Respite Care"],
  ["emergency", "Emergency Care"],
  ["day_care", "Day Care"],
];

const RECURRENCE_TYPES = [
  ["none", "No Recurrence"],
  ["daily", "Daily"],
  ["weekly", "Weekly"],
  ["bi_weekly", "Bi-Weekly"],
  ["monthly", "Monthly"],
];

const EMPTY_FORM = {
  staff_member: "",
  slot_type: "hourly",

  start_date: "",
  end_date: "",

  start_time: "",
  end_time: "",

  is_recurring: false,
  recurrence_type: "none",
  recurrence_end_date: "",

  price_per_hour: "",
  price_per_day: "",
  price_per_week: "",

  is_at_facility: true,
  location_postcode: "",

  is_available: true,
  notes: "",
};

function getLabel(options, value) {
  return (
    options.find(
      ([key]) => key === value
    )?.[1] ||
    value ||
    "Not specified"
  );
}

function formatDate(value) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(
    `${value}T00:00:00`
  );

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatTime(value) {
  if (!value) {
    return "";
  }

  return value.slice(0, 5);
}

function money(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return `£${Number(value).toFixed(2)}`;
}
function getSlotOccurrenceForBooking(
  slot,
  booking
) {
  if (
    !slot?.start_date ||
    !slot?.start_time ||
    !slot?.end_time ||
    !booking?.start_time ||
    !booking?.end_time
  ) {
    return null;
  }

  const bookingStart =
    new Date(booking.start_time);

  const bookingEnd =
    new Date(booking.end_time);

  if (
    Number.isNaN(
      bookingStart.getTime()
    ) ||
    Number.isNaN(
      bookingEnd.getTime()
    )
  ) {
    return null;
  }

  const targetDate =
    new Date(
      bookingStart.getFullYear(),
      bookingStart.getMonth(),
      bookingStart.getDate()
    );

  const slotStartDate =
    new Date(
      `${slot.start_date}T00:00:00`
    );

  if (
    targetDate < slotStartDate
  ) {
    return null;
  }

  if (slot.end_date) {
    const slotEndDate =
      new Date(
        `${slot.end_date}T23:59:59`
      );

    if (
      targetDate > slotEndDate
    ) {
      return null;
    }
  }

  if (
    slot.recurrence_end_date
  ) {
    const recurrenceEnd =
      new Date(
        `${slot.recurrence_end_date}T23:59:59`
      );

    if (
      targetDate > recurrenceEnd
    ) {
      return null;
    }
  }

  let occurs = false;

  if (!slot.is_recurring) {
    occurs =
      targetDate.toDateString() ===
      slotStartDate.toDateString();
  } else {
    const dayDifference =
      Math.floor(
        (
          targetDate.getTime() -
          slotStartDate.getTime()
        ) /
          (24 * 60 * 60 * 1000)
      );

    if (
      slot.recurrence_type ===
      "daily"
    ) {
      occurs =
        dayDifference >= 0;
    }

    if (
      slot.recurrence_type ===
      "weekly"
    ) {
      occurs =
        dayDifference >= 0 &&
        dayDifference % 7 === 0;
    }

    if (
      slot.recurrence_type ===
      "bi_weekly"
    ) {
      occurs =
        dayDifference >= 0 &&
        dayDifference % 14 === 0;
    }

    if (
      slot.recurrence_type ===
      "monthly"
    ) {
      occurs =
        targetDate.getDate() ===
        slotStartDate.getDate();
    }
  }

  if (!occurs) {
    return null;
  }

  const datePart = [
    targetDate.getFullYear(),
    String(
      targetDate.getMonth() + 1
    ).padStart(2, "0"),
    String(
      targetDate.getDate()
    ).padStart(2, "0"),
  ].join("-");

  const slotStart =
    new Date(
      `${datePart}T${slot.start_time}`
    );

  let slotEnd =
    new Date(
      `${datePart}T${slot.end_time}`
    );

  if (
    slotEnd <= slotStart
  ) {
    slotEnd =
      new Date(
        slotEnd.getTime() +
          24 * 60 * 60 * 1000
      );
  }

  return {
    start: slotStart,
    end: slotEnd,
    bookingStart,
    bookingEnd,
  };
}


function getBookingCommitments(
  slot,
  bookings
) {
  if (!slot.staff_member) {
    return [];
  }

  return bookings
    .filter(
      (booking) =>
        String(
          booking.assigned_staff ||
            ""
        ) ===
          String(
            slot.staff_member
          ) &&
        [
          "accepted",
          "confirmed",
          "in_progress",
        ].includes(
          booking.status
        )
    )
    .filter(
      (booking) => {
        const occurrence =
          getSlotOccurrenceForBooking(
            slot,
            booking
          );

        if (!occurrence) {
          return false;
        }

        return (
          occurrence.bookingStart <
            occurrence.end &&
          occurrence.bookingEnd >
            occurrence.start
        );
      }
    )
    .sort(
      (a, b) =>
        new Date(
          a.start_time
        ).getTime() -
        new Date(
          b.start_time
        ).getTime()
    );
}


function formatBookingClock(
  value
) {
  if (!value) {
    return "";
  }

  return new Date(
    value
  ).toLocaleTimeString(
    "en-GB",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}
function timeToMinutes(value) {
  if (!value) {
    return 0;
  }

  const [hours, minutes] =
    value.slice(0, 5).split(":").map(Number);

  return hours * 60 + minutes;
}


function formatMinutesAsTime(totalMinutes) {
  const normalised =
    ((totalMinutes % 1440) + 1440) % 1440;

  const hours =
    Math.floor(normalised / 60);

  const minutes =
    normalised % 60;

  return `${String(hours).padStart(
    2,
    "0"
  )}:${String(minutes).padStart(
    2,
    "0"
  )}`;
}


function getRemainingFreeRanges(
  slot,
  commitments
) {
  if (
    !slot?.start_time ||
    !slot?.end_time ||
    slot.is_recurring ||
    !commitments?.length
  ) {
    return [];
  }

  let slotStart =
    timeToMinutes(slot.start_time);

  let slotEnd =
    timeToMinutes(slot.end_time);

  if (slotEnd <= slotStart) {
    slotEnd += 1440;
  }

  const busyRanges =
    commitments
      .map((booking) => {
        const bookingStartDate =
          new Date(booking.start_time);

        const bookingEndDate =
          new Date(booking.end_time);

        let start =
          bookingStartDate.getHours() *
            60 +
          bookingStartDate.getMinutes();

        let end =
          bookingEndDate.getHours() *
            60 +
          bookingEndDate.getMinutes();

        if (
          bookingEndDate.getDate() !==
            bookingStartDate.getDate() ||
          end <= start
        ) {
          end += 1440;
        }

        return {
          start: Math.max(
            start,
            slotStart
          ),
          end: Math.min(
            end,
            slotEnd
          ),
        };
      })
      .filter(
        (range) =>
          range.end > range.start
      )
      .sort(
        (a, b) =>
          a.start - b.start
      );

  const mergedBusyRanges = [];

  busyRanges.forEach((range) => {
    const previous =
      mergedBusyRanges[
        mergedBusyRanges.length - 1
      ];

    if (
      previous &&
      range.start <= previous.end
    ) {
      previous.end =
        Math.max(
          previous.end,
          range.end
        );
    } else {
      mergedBusyRanges.push({
        ...range,
      });
    }
  });

  const freeRanges = [];

  let cursor = slotStart;

  mergedBusyRanges.forEach(
    (range) => {
      if (range.start > cursor) {
        freeRanges.push({
          start: cursor,
          end: range.start,
        });
      }

      cursor =
        Math.max(
          cursor,
          range.end
        );
    }
  );

  if (cursor < slotEnd) {
    freeRanges.push({
      start: cursor,
      end: slotEnd,
    });
  }

  return freeRanges.map(
    (range) => ({
      start:
        formatMinutesAsTime(
          range.start
        ),
      end:
        formatMinutesAsTime(
          range.end
        ),
    })
  );
}
export default function ProviderAvailabilityPage() {
  const router = useRouter();

  const [slots, setSlots] =
    useState([]);

  const [staff, setStaff] =
    useState([]);

  const [bookings, setBookings] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [actionId, setActionId] =
    useState(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [filter, setFilter] =
    useState("all");

  const [showForm, setShowForm] =
    useState(false);

  const [editingSlot, setEditingSlot] =
    useState(null);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const goToLogin = () => {
    router.replace(
      createLoginUrl(
        "/provider-availability"
      )
    );
  };

  // ==================================================
  // LOAD DATA
  // ==================================================

  const loadData = async () => {
    if (!getAuthStorage()) {
      goToLogin();
      return;
    }

    try {
      setLoading(true);
      setError("");

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

      if (
        !profileResponse ||
        profileResponse.status === 401
      ) {
        goToLogin();
        return;
      }

      if (!profileResponse.ok) {
        throw new Error(
          "Unable to verify your provider account."
        );
      }

      const profile =
        await profileResponse.json();

      if (
        profile.user_type !==
          "provider" &&
        !profile.is_staff &&
        !profile.is_superuser
      ) {
        router.replace(
          "/dashboard"
        );
        return;
      }

      const [
        availabilityResponse,
        staffResponse,
        bookingsResponse,
      ] = await Promise.all([
        authFetch(
          `${API_URL}/api/care-providers/my-availability/`,
          {
            method: "GET",
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        ),

        authFetch(
          `${API_URL}/api/care-providers/my-staff/`,
          {
            method: "GET",
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        ),

        authFetch(
          `${API_URL}/api/bookings/`,
          {
            method: "GET",
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        ),
      ]);

      if (
        !availabilityResponse ||
        !staffResponse ||
        !bookingsResponse ||
        availabilityResponse.status ===
          401 ||
        staffResponse.status === 401 ||
        bookingsResponse.status === 401
      ) {
        goToLogin();
        return;
      }

      const availabilityData =
        await availabilityResponse.json();

      const staffData =
        await staffResponse.json();

      const bookingsData =
        await bookingsResponse.json();

      if (
        !availabilityResponse.ok
      ) {
        throw new Error(
          availabilityData.detail ||
            "Unable to load availability."
        );
      }
            if (!staffResponse.ok) {
        throw new Error(
          staffData.detail ||
            "Unable to load staff."
        );
      }

      if (!bookingsResponse.ok) {
        throw new Error(
          bookingsData.detail ||
            "Unable to load bookings."
        );
      }

      setSlots(
        Array.isArray(
          availabilityData
        )
          ? availabilityData
          : availabilityData.results ||
              []
      );

      setStaff(
        (
          Array.isArray(staffData)
            ? staffData
            : staffData.results || []
        ).filter(
          (member) =>
            member.is_active
        )
      );
           

      setBookings(
        Array.isArray(bookingsData)
          ? bookingsData
          : bookingsData.results || []
      );
    } catch (err) {
      console.error(
        "Availability load error:",
        err
      );

      setError(
        err.message ||
          "We couldn't load availability."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ==================================================
  // COUNTS
  // ==================================================

  const availableCount =
    useMemo(
      () =>
        slots.filter(
          (slot) =>
            slot.is_available &&
            !slot.is_booked &&
            !slot.is_past
        ).length,
      [slots]
    );

  const bookedCount =
    useMemo(
      () =>
        slots.filter(
          (slot) =>
            slot.is_booked
        ).length,
      [slots]
    );

  const recurringCount =
    useMemo(
      () =>
        slots.filter(
          (slot) =>
            slot.is_recurring
        ).length,
      [slots]
    );

  // ==================================================
  // FILTERING
  // ==================================================

  const filteredSlots =
    useMemo(() => {
      let items = [...slots];

      if (filter === "available") {
        items = items.filter(
          (slot) =>
            slot.is_available &&
            !slot.is_booked
        );
      }

      if (filter === "booked") {
        items = items.filter(
          (slot) =>
            slot.is_booked
        );
      }

      if (filter === "recurring") {
        items = items.filter(
          (slot) =>
            slot.is_recurring
        );
      }

      if (filter === "unavailable") {
        items = items.filter(
          (slot) =>
            !slot.is_available
        );
      }

      const query =
        searchTerm
          .trim()
          .toLowerCase();

      if (query) {
        items = items.filter(
          (slot) => {
            const text = [
              slot.staff_member_name,
              getLabel(
                SLOT_TYPES,
                slot.slot_type
              ),
              slot.location_postcode,
              slot.notes,
              slot.start_date,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            return text.includes(
              query
            );
          }
        );
      }

      return items;
    }, [
      slots,
      filter,
      searchTerm,
    ]);

  // ==================================================
  // FORM
  // ==================================================

  const updateForm = (
    field,
    value
  ) => {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  };

  const openAddForm = () => {
    setEditingSlot(null);

    setForm({
      ...EMPTY_FORM,
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEditForm = (
    slot
  ) => {
    setEditingSlot(slot);

    setForm({
      staff_member:
        slot.staff_member
          ? String(
              slot.staff_member
            )
          : "",

      slot_type:
        slot.slot_type ||
        "hourly",

      start_date:
        slot.start_date || "",

      end_date:
        slot.end_date || "",

      start_time:
        formatTime(
          slot.start_time
        ),

      end_time:
        formatTime(
          slot.end_time
        ),

      is_recurring:
        Boolean(
          slot.is_recurring
        ),

      recurrence_type:
        slot.recurrence_type ||
        "none",

      recurrence_end_date:
        slot.recurrence_end_date ||
        "",

      price_per_hour:
        slot.price_per_hour ??
        "",

      price_per_day:
        slot.price_per_day ?? "",

      price_per_week:
        slot.price_per_week ??
        "",

      is_at_facility:
        Boolean(
          slot.is_at_facility
        ),

      location_postcode:
        slot.location_postcode ||
        "",

      is_available:
        Boolean(
          slot.is_available
        ),

      notes:
        slot.notes || "",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingSlot(null);

    setForm({
      ...EMPTY_FORM,
    });
  };

  // ==================================================
  // SAVE
  // ==================================================

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (
        !form.start_date ||
        !form.start_time ||
        !form.end_time
      ) {
        setError(
          "Start date, start time and end time are required."
        );
        return;
      }

      try {
        setSaving(true);
        setError("");
        setSuccess("");

        const payload = {
          staff_member:
            form.staff_member
              ? form.staff_member
              : null,

          slot_type:
            form.slot_type,

          start_date:
            form.start_date,

          end_date:
            form.end_date ||
            null,

          start_time:
            form.start_time,

          end_time:
            form.end_time,

          is_recurring:
            form.is_recurring,

          recurrence_type:
            form.is_recurring
              ? form.recurrence_type
              : "none",

          recurrence_pattern: {},

          recurrence_end_date:
            form.is_recurring &&
            form.recurrence_end_date
              ? form.recurrence_end_date
              : null,

          price_per_hour:
            form.price_per_hour ===
            ""
              ? null
              : form.price_per_hour,

          price_per_day:
            form.price_per_day ===
            ""
              ? null
              : form.price_per_day,

          price_per_week:
            form.price_per_week ===
            ""
              ? null
              : form.price_per_week,

          is_at_facility:
            form.is_at_facility,

          location_postcode:
            form.is_at_facility
              ? ""
              : form.location_postcode.trim(),

          is_available:
            form.is_available,

          notes:
            form.notes.trim(),
        };

        const url =
          editingSlot
            ? `${API_URL}/api/care-providers/my-availability/${editingSlot.id}/`
            : `${API_URL}/api/care-providers/my-availability/`;

        const response =
          await authFetch(
            url,
            {
              method:
                editingSlot
                  ? "PATCH"
                  : "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  payload
                ),
            }
          );

        if (
          !response ||
          response.status === 401
        ) {
          goToLogin();
          return;
        }

        const data =
          await response.json();

        if (!response.ok) {
          const firstError =
            Object.values(data)
              .flat()
              .find(Boolean);

          throw new Error(
            typeof firstError ===
              "string"
              ? firstError
              : data.detail ||
                  "Unable to save availability."
          );
        }

        if (editingSlot) {
          setSlots(
            (current) =>
              current.map(
                (slot) =>
                  slot.id === data.id
                    ? data
                    : slot
              )
          );

          setSuccess(
            "Availability slot updated successfully."
          );
        } else {
          setSlots(
            (current) => [
              ...current,
              data,
            ]
          );

          setSuccess(
            "Availability slot created successfully."
          );
        }

        setShowForm(false);
        setEditingSlot(null);

        setForm({
          ...EMPTY_FORM,
        });
      } catch (err) {
        console.error(
          "Availability save error:",
          err
        );

        setError(
          err.message ||
            "We couldn't save this availability slot."
        );
      } finally {
        setSaving(false);
      }
    };

  // ==================================================
  // TOGGLE AVAILABILITY
  // ==================================================

  const toggleAvailability =
    async (slot) => {
      if (slot.is_booked) {
        setError(
          "Booked availability cannot be manually disabled."
        );
        return;
      }

      try {
        setActionId(slot.id);
        setError("");
        setSuccess("");

        const response =
          await authFetch(
            `${API_URL}/api/care-providers/my-availability/${slot.id}/`,
            {
              method: "PATCH",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  is_available:
                    !slot.is_available,
                }),
            }
          );

        if (
          !response ||
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
              "Unable to update availability."
          );
        }

        setSlots(
          (current) =>
            current.map(
              (item) =>
                item.id === data.id
                  ? data
                  : item
            )
        );

        setSuccess(
          data.is_available
            ? "Availability slot is now active."
            : "Availability slot has been marked unavailable."
        );
      } catch (err) {
        setError(
          err.message ||
            "We couldn't update this availability slot."
        );
      } finally {
        setActionId(null);
      }
    };

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FAFC]">
        <div className="text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-[#176B62]" />

          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading availability...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7FAFC] text-slate-900">

      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">

          <Link
            href="/provider-dashboard"
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#176B62] text-white">
              <HeartHandshake className="h-5 w-5" />
            </div>

            <div>
              <p className="font-bold">
                CareSphere
              </p>

              <p className="text-xs text-slate-500">
                Provider Workspace
              </p>
            </div>
          </Link>

          <Link
            href="/provider-dashboard"
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>

        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">

        {/* TITLE */}

        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">

          <div>
            <p className="text-sm font-semibold text-[#176B62]">
              SCHEDULING
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Availability & Scheduling
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Publish care availability, assign staff and manage when your organisation can accept care.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#176B62] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#12564F]"
          >
            <Plus className="h-4 w-4" />
            Add Availability
          </button>

        </div>

        {/* MESSAGES */}

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </div>
        )}

        {/* STATS */}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <StatCard
            title="Total Slots"
            value={slots.length}
            icon={CalendarDays}
          />

          <StatCard
            title="Available"
            value={availableCount}
            icon={CheckCircle2}
          />

          <StatCard
            title="Booked"
            value={bookedCount}
            icon={User}
          />

          <StatCard
            title="Recurring"
            value={recurringCount}
            icon={Clock}
          />

        </div>

        {/* SEARCH + FILTER */}

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="flex flex-col gap-4 lg:flex-row">

            <div className="relative flex-1">

              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />

              <input
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                placeholder="Search by staff member, care type, postcode or notes..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#176B62]"
              />

            </div>

            <div className="flex flex-wrap gap-2">

              {[
                ["all", "All"],
                ["available", "Available"],
                ["booked", "Booked"],
                ["recurring", "Recurring"],
                ["unavailable", "Unavailable"],
              ].map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setFilter(value)
                    }
                    className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                      filter === value
                        ? "bg-[#176B62] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                )
              )}

            </div>
          </div>
        </div>

        {/* LIST */}

        <div className="mt-6">

          {filteredSlots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">

              <CalendarDays className="mx-auto h-10 w-10 text-slate-300" />

              <h2 className="mt-4 text-lg font-bold">
                No availability found
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {slots.length === 0
                  ? "Create your first availability slot and optionally assign it to one of your active staff members."
                  : "No availability matches your current search or filter."}
              </p>

              {slots.length === 0 && (
                <button
                  type="button"
                  onClick={openAddForm}
                  className="mt-5 rounded-xl bg-[#176B62] px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Add First Availability
                </button>
              )}

            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">

              {filteredSlots.map(
                (slot) => (
                  <AvailabilityCard
                    key={slot.id}
                    slot={slot}
                    bookings={bookings}
                    actionId={actionId}
                    onEdit={() =>
                      openEditForm(slot)
                    }
                    onToggle={() =>
                      toggleAvailability(
                        slot
                      )
                    }
                  />
                )
              )}

            </div>
          )}

        </div>

      </div>

      {/* MODAL */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-4 py-8">

          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

              <div>
                <h2 className="text-xl font-bold">
                  {editingSlot
                    ? "Edit Availability"
                    : "Add Availability"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Define when care is available and optionally assign a staff member.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6"
            >

              <FormSection title="Care & staff">

                <div className="grid gap-4 md:grid-cols-2">

                  <Select
                    label="Care type"
                    value={form.slot_type}
                    options={SLOT_TYPES}
                    onChange={(value) =>
                      updateForm(
                        "slot_type",
                        value
                      )
                    }
                  />

                  <div>
                    <label className="block text-sm font-semibold text-slate-700">
                      Staff member
                    </label>

                    <select
                      value={
                        form.staff_member
                      }
                      onChange={(event) =>
                        updateForm(
                          "staff_member",
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#176B62]"
                    >
                      <option value="">
                        Organisation / Unassigned
                      </option>

                      {staff.map(
                        (member) => (
                          <option
                            key={member.id}
                            value={member.id}
                          >
                            {member.full_name ||
                              `${member.first_name} ${member.last_name}`}
                          </option>
                        )
                      )}
                    </select>

                    <p className="mt-1.5 text-xs text-slate-400">
                      Only active staff members are shown.
                    </p>
                  </div>

                </div>

              </FormSection>

              <FormSection title="Date & time">

                <div className="grid gap-4 md:grid-cols-2">

                  <Input
                    label="Start date"
                    type="date"
                    required
                    value={
                      form.start_date
                    }
                    onChange={(value) =>
                      updateForm(
                        "start_date",
                        value
                      )
                    }
                  />

                  <Input
                    label="End date"
                    type="date"
                    value={
                      form.end_date
                    }
                    onChange={(value) =>
                      updateForm(
                        "end_date",
                        value
                      )
                    }
                  />

                  <Input
                    label="Start time"
                    type="time"
                    required
                    value={
                      form.start_time
                    }
                    onChange={(value) =>
                      updateForm(
                        "start_time",
                        value
                      )
                    }
                  />

                  <Input
                    label="End time"
                    type="time"
                    required
                    value={
                      form.end_time
                    }
                    onChange={(value) =>
                      updateForm(
                        "end_time",
                        value
                      )
                    }
                  />

                </div>

              </FormSection>

              <FormSection title="Recurring availability">

                <Toggle
                  label="Repeat this availability"
                  checked={
                    form.is_recurring
                  }
                  onChange={(value) => {
                    updateForm(
                      "is_recurring",
                      value
                    );

                    if (!value) {
                      updateForm(
                        "recurrence_type",
                        "none"
                      );
                    }
                  }}
                />

                {form.is_recurring && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">

                    <Select
                      label="Repeat"
                      value={
                        form.recurrence_type
                      }
                      options={
                        RECURRENCE_TYPES.filter(
                          ([value]) =>
                            value !== "none"
                        )
                      }
                      onChange={(value) =>
                        updateForm(
                          "recurrence_type",
                          value
                        )
                      }
                    />

                    <Input
                      label="Repeat until"
                      type="date"
                      value={
                        form.recurrence_end_date
                      }
                      onChange={(value) =>
                        updateForm(
                          "recurrence_end_date",
                          value
                        )
                      }
                    />

                  </div>
                )}

              </FormSection>

              <FormSection title="Pricing">

                <div className="grid gap-4 md:grid-cols-3">

                  <Input
                    label="Price per hour (£)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.price_per_hour
                    }
                    onChange={(value) =>
                      updateForm(
                        "price_per_hour",
                        value
                      )
                    }
                  />

                  <Input
                    label="Price per day (£)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.price_per_day
                    }
                    onChange={(value) =>
                      updateForm(
                        "price_per_day",
                        value
                      )
                    }
                  />

                  <Input
                    label="Price per week (£)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.price_per_week
                    }
                    onChange={(value) =>
                      updateForm(
                        "price_per_week",
                        value
                      )
                    }
                  />

                </div>

              </FormSection>

              <FormSection title="Location">

                <Toggle
                  label="Care delivered at facility"
                  checked={
                    form.is_at_facility
                  }
                  onChange={(value) =>
                    updateForm(
                      "is_at_facility",
                      value
                    )
                  }
                />

                {!form.is_at_facility && (
                  <div className="mt-4">
                    <Input
                      label="Care location postcode"
                      value={
                        form.location_postcode
                      }
                      onChange={(value) =>
                        updateForm(
                          "location_postcode",
                          value
                        )
                      }
                    />
                  </div>
                )}

              </FormSection>

              <FormSection title="Status & notes">

                <Toggle
                  label="Available for booking"
                  checked={
                    form.is_available
                  }
                  onChange={(value) =>
                    updateForm(
                      "is_available",
                      value
                    )
                  }
                />

                <div className="mt-4">

                  <label className="block text-sm font-semibold text-slate-700">
                    Notes
                  </label>

                  <textarea
                    rows={4}
                    value={form.notes}
                    onChange={(event) =>
                      updateForm(
                        "notes",
                        event.target.value
                      )
                    }
                    placeholder="Optional scheduling information..."
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#176B62]"
                  />

                </div>

              </FormSection>

              {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  disabled={saving}
                  onClick={closeForm}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#176B62] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingSlot ? (
                    "Save Changes"
                  ) : (
                    "Add Availability"
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

function StatCard({
  title,
  value,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-[#176B62]">
          <Icon className="h-5 w-5" />
        </div>

      </div>

    </div>
  );
}

function AvailabilityCard({
  slot,
  bookings,
  actionId,
  onEdit,
  onToggle,
}) {
    const commitments =
  getBookingCommitments(
    slot,
    bookings || []
  );

const remainingFreeRanges =
  getRemainingFreeRanges(
    slot,
    commitments
  );

const prices = [
    slot.price_per_hour
      ? `${money(slot.price_per_hour)}/hr`
      : null,

    slot.price_per_day
      ? `${money(slot.price_per_day)}/day`
      : null,

    slot.price_per_week
      ? `${money(slot.price_per_week)}/week`
      : null,
  ].filter(Boolean);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex flex-wrap items-start justify-between gap-3">

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#176B62]">
            {getLabel(
              SLOT_TYPES,
              slot.slot_type
            )}
          </p>

          <h2 className="mt-1 text-lg font-bold">
            {slot.staff_member_name ||
              "Organisation availability"}
          </h2>
        </div>

        <StatusBadge slot={slot} />

      </div>

      <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">

        <Info
          icon={CalendarDays}
          text={
            slot.end_date &&
            slot.end_date !==
              slot.start_date
              ? `${formatDate(
                  slot.start_date
                )} – ${formatDate(
                  slot.end_date
                )}`
              : formatDate(
                  slot.start_date
                )
          }
        />

        <Info
          icon={Clock}
          text={`${formatTime(
            slot.start_time
          )} – ${formatTime(
            slot.end_time
          )}`}
        />

        <Info
          icon={User}
          text={
            slot.staff_member_name ||
            "Unassigned"
          }
        />

        <Info
          icon={MapPin}
          text={
            slot.is_at_facility
              ? "Provider facility"
              : slot.location_postcode ||
                "Home care location"
          }
        />

      </div>

      {slot.is_recurring && (
        <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Repeats{" "}
          <strong>
            {getLabel(
              RECURRENCE_TYPES,
              slot.recurrence_type
            )}
          </strong>

          {slot.recurrence_end_date
            ? ` until ${formatDate(
                slot.recurrence_end_date
              )}`
            : ""}
        </div>
      )}
        {commitments.length > 0 && (
        <div
          className="
            mt-4
            rounded-xl
            border
            border-blue-200
            bg-blue-50
            p-4
          "
        >
          <div
            className="
              text-xs
              font-bold
              uppercase
              tracking-wide
              text-blue-700
            "
          >
            Booking commitments
          </div>

          <div className="mt-3 space-y-3">
            {commitments.map(
              (booking) => (
                <div
                  key={booking.id}
                  className="
                    rounded-lg
                    bg-white
                    px-3
                    py-3
                  "
                >
                  <div
                    className="
                      flex
                      flex-wrap
                      items-center
                      justify-between
                      gap-2
                    "
                  >
                    <span
                      className="
                        text-sm
                        font-bold
                        text-slate-900
                      "
                    >
                      {formatBookingClock(
                        booking.start_time
                      )}
                      {" – "}
                      {formatBookingClock(
                        booking.end_time
                      )}
                    </span>

                    <span
                      className="
                        rounded-full
                        bg-blue-100
                        px-2.5
                        py-1
                        text-[11px]
                        font-bold
                        text-blue-700
                      "
                    >
                      {booking.status_display ||
                        booking.status}
                    </span>
                  </div>

                  <p
                    className="
                      mt-1
                      text-sm
                      text-slate-600
                    "
                  >
                    {booking.service_user_name ||
                      booking.care_recipient_name ||
                      "Care booking"}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      )}
            {remainingFreeRanges.length > 0 && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            Remaining free time
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {remainingFreeRanges.map(
              (range, index) => (
                <div
  key={`${range.start}-${range.end}-${index}`}
  className="rounded-lg border border-emerald-200 bg-white px-3 py-2"
>
  <div className="text-sm font-bold text-emerald-700">
    {range.start} – {range.end}
  </div>

  <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-emerald-600">
    Bookable
  </div>
</div>
              )
            )}
          </div>
        </div>
      )}
      {prices.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">

          {prices.map(
            (price) => (
              <span
                key={price}
                className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-[#176B62]"
              >
                {price}
              </span>
            )
          )}

        </div>
      )}

      {slot.notes && (
        <p className="mt-4 text-sm leading-6 text-slate-500">
          {slot.notes}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">

        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Edit3 className="h-4 w-4" />
          Edit
        </button>

        {!slot.is_booked && (
          <button
            type="button"
            disabled={
              actionId === slot.id
            }
            onClick={onToggle}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              slot.is_available
                ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            {actionId === slot.id
              ? "Updating..."
              : slot.is_available
              ? "Mark Unavailable"
              : "Make Available"}
          </button>
        )}

      </div>

    </article>
  );
}

function StatusBadge({
  slot,
}) {
  let text = "Available";
  let className =
    "border-emerald-200 bg-emerald-50 text-emerald-700";

  if (slot.is_booked) {
    text = "Booked";
    className =
      "border-blue-200 bg-blue-50 text-blue-700";
  } else if (slot.is_past) {
    text = "Past";
    className =
      "border-slate-200 bg-slate-100 text-slate-500";
  } else if (!slot.is_available) {
    text = "Unavailable";
    className =
      "border-amber-200 bg-amber-50 text-amber-700";
  }

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
    >
      {text}
    </span>
  );
}

function Info({
  icon: Icon,
  text,
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">

      <Icon className="h-4 w-4 shrink-0 text-slate-400" />

      <span className="truncate">
        {text}
      </span>

    </div>
  );
}

function FormSection({
  title,
  children,
}) {
  return (
    <section className="mb-7">

      <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
        {title}
      </h3>

      {children}

    </section>
  );
}

function Input({
  label,
  type = "text",
  required,
  min,
  step,
  value,
  onChange,
}) {
  return (
    <div>

      <label className="block text-sm font-semibold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      <input
        type={type}
        required={required}
        min={min}
        step={step}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#176B62]"
      />

    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}) {
  return (
    <div>

      <label className="block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#176B62]"
      >
        {options.map(
          ([key, name]) => (
            <option
              key={key}
              value={key}
            >
              {name}
            </option>
          )
        )}
      </select>

    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-4">

      <span className="text-sm font-semibold text-slate-700">
        {label}
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(
            event.target.checked
          )
        }
        className="h-4 w-4 accent-[#176B62]"
      />

    </label>
  );
}
