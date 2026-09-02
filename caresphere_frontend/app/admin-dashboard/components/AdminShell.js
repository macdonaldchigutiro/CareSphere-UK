"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  Bell,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Search,
  ShieldCheck,
  Star,
  Stethoscope,
  UserSearch,
  Users,
  X,
} from "lucide-react";

import {
  authFetch,
  clearAuthSession,
  createLoginUrl,
  getAuthStorage,
  getStoredUser,
} from "../../../lib/auth";
import { API_URL } from "../../../lib/config";


const NAVIGATION = [
  {
    group: "WORKSPACE",
    items: [
      {
        label: "Overview",
        href: "/admin-dashboard",
        icon: LayoutDashboard,
      },
      {
        label: "Providers",
        href: "/admin-dashboard/providers",
        icon: Building2,
      },
      {
        label: "Bookings",
        href: "/admin-dashboard/bookings",
        icon: CalendarDays,
      },
      {
        label: "Staff & Capacity",
        href: "/admin-dashboard/staff-capacity",
        icon: Stethoscope,
      },
      {
        label: "Service Users",
        href: "/admin-dashboard/service-users",
        icon: HeartHandshake,
      },
      {
        label: "Matching",
        href: "/admin-dashboard/matching",
        icon: UserSearch,
      },
    ],
  },
  {
    group: "GOVERNANCE",
    items: [
      {
        label: "Trust & Verification",
        href: "/admin-dashboard/trust",
        icon: ShieldCheck,
      },
      {
        label: "Reviews",
        href: "/admin-dashboard/reviews",
        icon: Star,
      },
      {
        label: "Pricing",
        href: "/admin-dashboard/pricing",
        icon: CircleDollarSign,
      },
      {
        label: "Communications",
        href: "/admin-dashboard/communications",
        icon: MessageSquareText,
      },
      {
        label: "Notifications",
        href: "/admin-dashboard/notifications",
        icon: Bell,
      },
      {
        label: "Users",
        href: "/admin-dashboard/users",
        icon: Users,
      },
    ],
  },
];


function getDisplayName(user) {
  if (!user) {
    return "Administrator";
  }

  const name = [
    user.first_name,
    user.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    name ||
    user.email ||
    "Administrator"
  );
}


function isNavigationItemActive(
  pathname,
  href
) {
  if (href === "/admin-dashboard") {
    return pathname === "/admin-dashboard";
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}


export default function AdminShell({
  children,
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] =
    useState(() => getStoredUser());

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  useEffect(() => {
    let cancelled = false;

    async function verifyAdministrator() {
      const auth = getAuthStorage();

      if (!auth) {
        router.replace(
          createLoginUrl(pathname)
        );
        return;
      }

      try {
        const response = await authFetch(
          `${API_URL}/api/users/profile/`
        );

        if (response.status === 401) {
          clearAuthSession();

          router.replace(
            createLoginUrl(pathname)
          );

          return;
        }

        if (!response.ok) {
          throw new Error(
            "We couldn't verify your CareSphere account."
          );
        }

        const profile =
          await response.json();

        if (
          !profile.is_staff &&
          !profile.is_superuser
        ) {
          setError(
            "This workspace is restricted to CareSphere platform administrators."
          );

          setLoading(false);

          return;
        }

        if (!cancelled) {
          setUser(profile);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError(
            err.message ||
              "We couldn't verify administrator access."
          );

          setLoading(false);
        }
      }
    }

    verifyAdministrator();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);


  function handleLogout() {
    clearAuthSession();

    router.replace(
      createLoginUrl("/")
    );
  }


  if (loading) {
    return (
      <div className="
        flex min-h-screen
        items-center justify-center
        bg-slate-50
      ">
        <div className="text-center">
          <div className="
            mx-auto flex h-16 w-16
            items-center justify-center
            rounded-2xl
            bg-[#0D3F3A]
            text-white shadow-xl
          ">
            <HeartHandshake
              className="h-8 w-8"
            />
          </div>

          <div className="
            mt-5 text-lg font-black
            text-slate-950
          ">
            CareSphere Admin
          </div>

          <div className="
            mt-1 text-sm text-slate-500
          ">
            Preparing your workspace...
          </div>
        </div>
      </div>
    );
  }


  if (error) {
    return (
      <div className="
        flex min-h-screen
        items-center justify-center
        bg-slate-50 px-6
      ">
        <div className="
          max-w-lg rounded-3xl
          border border-rose-100
          bg-white p-8
          text-center shadow-xl
        ">
          <div className="
            mx-auto flex h-14 w-14
            items-center justify-center
            rounded-2xl bg-rose-50
            text-rose-600
          ">
            <ShieldCheck
              className="h-7 w-7"
            />
          </div>

          <h1 className="
            mt-5 text-2xl font-black
            text-slate-950
          ">
            Admin access required
          </h1>

          <p className="
            mt-3 text-sm leading-6
            text-slate-500
          ">
            {error}
          </p>

          <button
            onClick={handleLogout}
            className="
              mt-6 rounded-xl
              bg-[#0D3F3A]
              px-5 py-3
              text-sm font-bold
              text-white
            "
          >
            Return to sign in
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="
      min-h-screen
      bg-[#F5F8FA]
    ">
      {mobileOpen && (
        <button
          aria-label="Close navigation overlay"
          onClick={() =>
            setMobileOpen(false)
          }
          className="
            fixed inset-0 z-40
            bg-slate-950/40
            backdrop-blur-sm
            lg:hidden
          "
        />
      )}


      <aside
        className={`
          fixed inset-y-0 left-0
          z-50 flex
          w-[290px] flex-col
          bg-[#0D3F3A]
          text-white
          shadow-2xl
          transition-transform
          duration-300
          lg:translate-x-0
          ${
            mobileOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        <div className="
          flex h-20
          items-center
          justify-between
          border-b
          border-white/10
          px-6
        ">
          <Link
            href="/admin-dashboard"
            onClick={() =>
              setMobileOpen(false)
            }
            className="
              flex items-center gap-3
            "
          >
            <div className="
              flex h-11 w-11
              items-center justify-center
              rounded-2xl
              bg-white
              text-[#176B62]
              shadow-lg
            ">
              <HeartHandshake
                className="h-6 w-6"
              />
            </div>

            <div>
              <div className="
                text-lg font-black
                tracking-tight
              ">
                CareSphere
              </div>

              <div className="
                text-[10px]
                font-bold uppercase
                tracking-[0.22em]
                text-teal-200
              ">
                Admin Workspace
              </div>
            </div>
          </Link>

          <button
            onClick={() =>
              setMobileOpen(false)
            }
            className="
              rounded-xl p-2
              text-white/70
              hover:bg-white/10
              lg:hidden
            "
          >
            <X className="h-5 w-5" />
          </button>
        </div>


        <nav className="
          flex-1 overflow-y-auto
          px-4 py-6
        ">
          {NAVIGATION.map(
            (section) => (
              <div
                key={section.group}
                className="mb-7"
              >
                <div className="
                  mb-2 px-3
                  text-[10px]
                  font-bold
                  tracking-[0.2em]
                  text-teal-200/70
                ">
                  {section.group}
                </div>

                <div className="space-y-1">
                  {section.items.map(
                    (item) => {
                      const Icon =
                        item.icon;

                      const active =
                        isNavigationItemActive(
                          pathname,
                          item.href
                        );

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() =>
                            setMobileOpen(
                              false
                            )
                          }
                          className={`
                            flex w-full
                            items-center gap-3
                            rounded-xl
                            px-3 py-3
                            text-left
                            text-sm
                            font-semibold
                            transition
                            ${
                              active
                                ? "bg-white text-[#0D3F3A] shadow-lg"
                                : "text-teal-50/80 hover:bg-white/10 hover:text-white"
                            }
                          `}
                        >
                          <Icon
                            className="
                              h-5 w-5
                              shrink-0
                            "
                          />

                          <span>
                            {item.label}
                          </span>

                          {active && (
                            <ChevronRight
                              className="
                                ml-auto
                                h-4 w-4
                              "
                            />
                          )}
                        </Link>
                      );
                    }
                  )}
                </div>
              </div>
            )
          )}
        </nav>


        <div className="
          border-t
          border-white/10
          p-4
        ">
          <div className="
            mb-3 rounded-2xl
            bg-white/10 p-4
          ">
            <div className="
              flex items-center gap-3
            ">
              <div className="
                flex h-10 w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-teal-100
                font-black
                text-[#0D3F3A]
              ">
                {getDisplayName(user)
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="
                min-w-0 flex-1
              ">
                <div className="
                  truncate text-sm
                  font-bold
                ">
                  {getDisplayName(user)}
                </div>

                <div className="
                  truncate text-xs
                  text-teal-100/70
                ">
                  Platform Administrator
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="
              flex w-full
              items-center gap-3
              rounded-xl
              px-3 py-3
              text-sm font-semibold
              text-teal-50/80
              transition
              hover:bg-white/10
              hover:text-white
            "
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </aside>


      <div className="lg:pl-[290px]">
        <header className="
          sticky top-0 z-30
          flex h-20
          items-center
          border-b
          border-slate-200
          bg-white/95
          px-4
          backdrop-blur
          sm:px-6
          xl:px-8
        ">
          <button
            onClick={() =>
              setMobileOpen(true)
            }
            className="
              mr-3 rounded-xl
              border border-slate-200
              p-2.5
              text-slate-600
              lg:hidden
            "
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="
            flex w-full
            items-center
            justify-between
            gap-4
          ">
            <div className="
              hidden w-full
              max-w-xl
              sm:block
            ">
              <div className="relative">
                <Search
                  className="
                    absolute left-4 top-1/2
                    h-4 w-4
                    -translate-y-1/2
                    text-slate-400
                  "
                />

                <input
                  type="text"
                  placeholder="Search CareSphere..."
                  className="
                    h-12 w-full
                    rounded-2xl
                    border
                    border-slate-200
                    bg-slate-50
                    pl-11 pr-4
                    text-sm
                    text-slate-700
                    outline-none
                    transition
                    focus:border-teal-300
                    focus:bg-white
                    focus:ring-4
                    focus:ring-teal-50
                  "
                />
              </div>
            </div>

            <div className="
              ml-auto flex
              items-center gap-3
            ">
              <Link
                href="/admin-dashboard/notifications"
                className="
                  flex h-11 w-11
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  text-slate-700
                  hover:bg-slate-50
                "
              >
                <Bell className="h-5 w-5" />
              </Link>

              <div className="
                hidden h-10 w-px
                bg-slate-200
                md:block
              " />

              <div className="
                hidden text-right
                sm:block
              ">
                <div className="
                  max-w-[220px]
                  truncate
                  text-sm
                  font-black
                  text-slate-900
                ">
                  {getDisplayName(user)}
                </div>

                <div className="
                  text-xs text-slate-500
                ">
                  Platform Admin
                </div>
              </div>

              <div className="
                flex h-10 w-10
                items-center
                justify-center
                rounded-xl
                bg-[#176B62]
                font-black
                text-white
              ">
                {getDisplayName(user)
                  .charAt(0)
                  .toUpperCase()}
              </div>
            </div>
          </div>
        </header>


        <main className="
          px-4 py-6
          sm:px-6
          xl:px-8
          xl:py-8
        ">
          {children}
        </main>
      </div>
    </div>
  );
}
