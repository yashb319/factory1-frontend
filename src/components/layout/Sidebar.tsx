"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Factory } from "lucide-react";
import { navigationItems } from "@/config/navigation";
import { useAppSelector } from "@/lib/hook";

export function Sidebar() {
  const pathname = usePathname();
  const user = useAppSelector((state) => state.auth.user);

  const items = navigationItems.filter(
    (item) => !user?.role || item.roles.includes(user.role)
  );

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r bg-slate-950 text-white lg:block">
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
          <Factory size={20} />
        </div>

        <div>
          <h1 className="text-sm font-semibold">Factory1</h1>
          <p className="text-xs text-slate-400">Operations OS</p>
        </div>
      </div>

      <nav className="space-y-1 px-3 py-4">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
