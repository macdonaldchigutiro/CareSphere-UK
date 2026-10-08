"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  HeartHandshake,
  Home,
  Search,
  Settings,
  Star,
  User,
  Users,
} from "lucide-react";
import CareSphereLogo from "./CareSphereLogo";

import {
  getDashboardPath,
  getStoredUser,
} from "../lib/auth";

const PROVIDER_ITEMS = [
  { label: "Overview", href: "/provider-dashboard", icon: Home },
  { label: "Bookings", href: "/bookings", icon: CalendarDays },
  { label: "Staff", href: "/provider-staff", icon: Users },
  { label: "Blocks & rotas", href: "/provider-rota", icon: CalendarDays },
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
  "/provider-rota",
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

  const roleHome = user ? getDashboardPath(user) : null;
  const isProvider = roleHome === "/provider-dashboard";

  useEffect(() => {
    document.body.classList.toggle("cs-provider-workspace", isProvider);
    return () => document.body.classList.remove("cs-provider-workspace");
  }, [isProvider]);

  const isWorkspacePath = WORKSPACE_PATHS.some((path) =>
    pathMatches(pathname, path)
  );

  if (!isWorkspacePath || !user) {
    return null;
  }

  if (roleHome === "/admin-dashboard") {
    return null;
  }

  const items = isProvider ? PROVIDER_ITEMS : FAMILY_ITEMS;

  if (isProvider) {
    return (
      <>
        <aside className="fixed inset-y-0 left-0 z-50 hidden w-[248px] flex-col bg-gradient-to-b from-[#032F2B] via-[#063D37] to-[#022824] text-white shadow-[12px_0_36px_rgba(3,47,43,0.12)] lg:flex">
          <Link href="/provider-dashboard" className="border-b border-white/10 px-6 py-6">
            <CareSphereLogo light context="Provider" className="[&>svg]:h-11 [&>svg]:w-11" />
          </Link>

          <nav aria-label="Care company workspace" className="flex-1 px-3 py-6">
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">Operations</p>
            {items.map(({ label, href, icon: Icon }) => {
              const active = pathMatches(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative mb-1 flex min-h-11 items-center gap-3.5 rounded-xl px-4 text-sm font-semibold transition ${
                    active
                      ? "bg-white/10 text-white shadow-[inset_3px_0_0_#D4AE57]"
                      : "text-white/72 hover:bg-white/7 hover:text-white"
                  }`}
                >
                  <Icon className={`h-[18px] w-[18px] ${active ? "text-white" : "text-white/65"}`} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-1 border-t border-white/10 p-4">
            <Link href="/provider-profile" className="flex min-h-11 items-center gap-3 rounded-xl px-4 text-sm font-bold text-slate-300 transition hover:bg-white/8 hover:text-white">
              <Settings className="h-[18px] w-[18px]" />
              Settings
            </Link>
            <button type="button" aria-label="Collapse navigation" className="flex min-h-10 w-full items-center justify-between rounded-xl px-4 text-xs font-semibold text-slate-400 hover:bg-white/8 hover:text-white">
              Collapse
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </aside>

        <nav aria-label="Care company workspace" className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-xl lg:hidden">
          <div className="flex items-center gap-2 overflow-x-auto">
            <Link href="/provider-dashboard" className="mr-2 shrink-0">
              <CareSphereLogo compact />
            </Link>
            {items.map(({ label, href, icon: Icon }) => {
              const active = pathMatches(pathname, href);
              return (
                <Link key={href} href={href} className={`flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-bold ${active ? "bg-[#E5FAF1] text-[#087F68]" : "text-slate-600"}`}>
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      </>
    );
  }

  return (
    <nav
      aria-label={`${isProvider ? "Care company" : "Client and family"} workspace`}
      className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 shadow-[0_6px_24px_rgba(6,27,44,0.06)] backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-[1560px] items-center gap-2 overflow-x-auto px-4 py-3 lg:px-8">
        <Link
          href={roleHome}
          className="mr-3 flex shrink-0 items-center gap-3 border-r border-slate-200 pr-5 font-black text-[#123B36]"
        >
          <CareSphereLogo
            compact={false}
            context={isProvider ? "Provider" : "My care"}
            className="[&>svg]:h-10 [&>svg]:w-10"
          />
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
                  ? "bg-[#E5FAF1] text-[#087F68] shadow-[inset_0_0_0_1px_rgba(8,127,104,0.1)]"
                  : "text-slate-600 hover:bg-emerald-50/70 hover:text-[#123B36]"
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
