"use client";

import { Bell, LogOut, Search, Settings, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { logout } from "@/features/auth/authSlice";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppDispatch, useAppSelector } from "@/lib/hook";

export function Topbar() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  function handleLogout() {
    dispatch(logout());
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/90 px-6 backdrop-blur">
      <div className="flex w-full max-w-md items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-500">
        <Search size={16} />
        <input
          placeholder="Search employees, payroll, invoices..."
          className="w-full bg-transparent outline-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <Bell size={18} />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-slate-50">
            <UserCircle size={20} />
            <span className="hidden font-medium sm:inline">
              {user?.name || "Owner"}
            </span>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="text-sm font-medium">
                  {user?.name || "Factory Owner"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.email || "owner@factory1.com"}
                </p>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => router.push("/organization-settings")}
            >
              <Settings className="mr-2 h-4 w-4" />
              Organization Settings
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}