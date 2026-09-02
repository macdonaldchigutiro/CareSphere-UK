"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  HeartHandshake,
  Home,
  Search,
  Star,
  User,
  Users,
} from "lucide-react";

import {
  getDashboardPath,
  getStoredUser,
} from "../lib/auth";

const PROVIDER_ITEMS = [
  { label: "Overview", href: "/provider-dashboard", icon: Home },
  { label: "Bookings", href: "/bookings", icon: CalendarDays },
  { label: "Staff", href: "/provider-staff", icon: Users },
  { label: "Availability", href: "/provider-availability", icon: CalendarDays },
  { label: "Company profile", href: "/provider-profile", icon: User },
  { label: "Notifications", href: "/notifications", icon: Bell },
];

const FAMILY_ITEMS = [
  { label: "Overview", href: "/dashboard", icon: Home },
  { label: "Find care", href: "/find-care", icon: Search },
  { label: "Saved", href: "/saved-providers", icon: Star },
  { label: "Care recipients", href: "/care-recipients", icon: HeartHandshake },
  { label: "Bookings", href: "/bookings", icon: CalendarDays },
  { label: "Family", href: "/family-circle", icon: Users },
  { label: "Profile", href: "/profile", icon: User },
  { label: "Notifications", href: "/notifications", icon: Bell },
];

const WORKSPACE_PATHS = [
  "/dashboard",
  "/find-care",
  "/saved-providers",
  "/care-recipients",
  "/bookings",
  "/family-circle",
  "/family-discussions",
  "/family-notes",
  "/family-decisions",
  "/profile",
  "/notifications",
  "/provider-dashboard",
  "/provider-profile",
  "/provider-staff",
  "/provider-availability",
];

function pathMatches(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function WorkspaceNavigation() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const updateUser = () => {
      setUser(getStoredUser());
    };

    const timer = window.setTimeout(updateUser, 0);
    window.addEventListener("storage", updateUser);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", updateUser);
    };
  }, [pathname]);

  const isWorkspacePath = WORKSPACE_PATHS.some((path) =>
    pathMatches(pathname, path)
  );

  if (!isWorkspacePath || !user) {
    return null;
  }

  const roleHome = getDashboardPath(user);

  if (roleHome === "/admin-dashboard") {
    return null;
  }

  const isProvider = roleHome === "/provider-dashboard";
  const items = isProvider ? PROVIDER_ITEMS : FAMILY_ITEMS;

  return (
    <nav
      aria-label={`${isProvider ? "Care company" : "Client and family"} workspace`}
      className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur"
    >
      <div className="mx-auto flex max-w-[1500px] items-center gap-2 overflow-x-auto px-4 py-3 lg:px-8">
        <Link
          href={roleHome}
          className="mr-3 flex shrink-0 items-center gap-2 border-r border-slate-200 pr-5 font-black text-slate-950"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F766E] text-white">
            <HeartHandshake className="h-5 w-5" />
          </span>
          <span className="hidden sm:inline">
            {isProvider ? "Care Company" : "My Care"}
          </span>
        </Link>

        {items.map(({ label, href, icon: Icon }) => {
          const active = pathMatches(pathname, href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${
                active
                  ? "bg-teal-50 text-[#0F766E]"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
