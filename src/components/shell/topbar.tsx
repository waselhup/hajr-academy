"use client";
import { LogOut, User as UserIcon, Search } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LanguageToggle } from "./language-toggle";
import { MobileSidebar } from "./mobile-sidebar";
import { NotificationBell } from "@/components/shared/notification-bell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Role } from "@prisma/client";

/** Fires the same keyboard event Cmd+K listens for, opening the palette. */
function openCommandPalette() {
  const isMac =
    typeof navigator !== "undefined" &&
    navigator.platform.toLowerCase().includes("mac");
  const event = new KeyboardEvent("keydown", {
    key: "k",
    code: "KeyK",
    metaKey: isMac,
    ctrlKey: !isMac,
    bubbles: true,
    cancelable: true,
  });
  window.dispatchEvent(event);
}

export function Topbar({
  userId,
  name,
  email,
  role,
}: {
  userId: string;
  name: string;
  email: string;
  role: Role;
}) {
  const t = useTranslations();
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const isAdminish = role === "ADMIN" || role === "SUPER_ADMIN";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-hajr-gray-200 bg-white px-4 shadow-sm sm:px-6">
      <div className="flex items-center gap-2">
        <MobileSidebar role={role} />
      </div>

      {/* Center: admin search trigger */}
      {isAdminish && (
        <div className="hidden flex-1 justify-center px-4 md:flex">
          <button
            type="button"
            onClick={openCommandPalette}
            aria-label={t("Search.triggerLabel")}
            className="group flex w-full max-w-md items-center gap-2 rounded-lg border border-hajr-gray-200 bg-hajr-gray-50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-hajr-gray-300 hover:bg-white"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-start">{t("Search.placeholder")}</span>
            <kbd className="hidden rounded border bg-white px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Mobile-only icon trigger for admin search */}
        {isAdminish && (
          <button
            type="button"
            onClick={openCommandPalette}
            aria-label={t("Search.triggerLabel")}
            className="rounded-lg p-2 text-hajr-navy transition-colors hover:bg-hajr-gray-100 md:hidden"
          >
            <Search className="h-5 w-5" />
          </button>
        )}
        <LanguageToggle />
        <NotificationBell userId={userId} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-hajr-gray-100">
              <Avatar className="h-9 w-9 ring-2 ring-hajr-gray-200">
                <AvatarImage src="" />
                <AvatarFallback className="bg-hajr-navy text-sm font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium text-hajr-navy sm:inline">
                {name}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-hajr-navy">
                  {name}
                </span>
                <span className="text-xs text-hajr-gray-500">{email}</span>
                <span className="mt-1.5 inline-flex w-fit items-center rounded-full bg-hajr-rose/10 px-2 py-0.5 text-xs font-medium text-hajr-rose">
                  {t(("Roles." + role) as any)}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                (window.location.href =
                  "/" +
                  window.location.pathname.split("/")[1] +
                  (role === "STUDENT"
                    ? "/student/profile"
                    : role === "TEACHER"
                    ? "/teacher/profile"
                    : "/admin"))
              }
            >
              <UserIcon className="me-2 h-4 w-4" />
              {t("Nav.profile")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
              <LogOut className="me-2 h-4 w-4" />
              {t("Common.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
