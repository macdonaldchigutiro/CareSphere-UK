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
      className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 shadow-[0_6px_24px_rgba(6,27,44,0.06)] backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-[1560px] items-center gap-2 overflow-x-auto px-4 py-3 lg:px-8">
        <Link
          href={roleHome}
          className="mr-3 flex shrink-0 items-center gap-3 border-r border-slate-200 pr-5 font-black text-[#0A2035]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#087C76] to-[#16A89D] text-white shadow-[0_8px_22px_rgba(8,124,118,0.25)]">
            <HeartHandshake className="h-5 w-5" />
          </span>
          <span className="hidden sm:block">
            <span className="block leading-tight">CareSphere</span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#087C76]">
              {isProvider ? "Provider" : "My care"}
            </span>
          </span>
        </Link>

        {items.map(({ label, href, icon: Icon }) => {
          const active = pathMatches(pathname, href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition ${
                active
                  ? "bg-[#E8F8F4] text-[#087C76] shadow-[inset_0_0_0_1px_rgba(8,124,118,0.08)]"
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-[#0A2035]"
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
