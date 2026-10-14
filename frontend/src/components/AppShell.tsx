import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, KeyRound, Menu, X } from "lucide-react";
import Logo from "./Logo";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/connect", label: "Cloud connections", icon: KeyRound },
];

export default function AppShell() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[var(--sidebar-width)_1fr]">
      {/* Mobile top bar */}
      <header className="flex h-(--topbar-height) items-center justify-between border-b border-border bg-surface px-4 md:hidden">
        <Logo />
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="rounded-md p-2 text-muted hover:text-foreground"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>

      <aside
        className={`${open ? "block" : "hidden"} border-b border-border bg-surface p-3 md:sticky md:top-0 md:block md:h-dvh md:border-r md:border-b-0`}
      >
        <div className="mb-4 hidden px-2 py-2 md:block">
          <Logo />
        </div>
        <nav className="flex flex-col gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 ${
                  isActive ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-2 hover:text-foreground"
                }`
              }
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 p-4 sm:p-6">
        <div className="mx-auto max-w-(--content-max-width)">
          <Outlet />
        </div>
      </main>
    </div>
  );
}