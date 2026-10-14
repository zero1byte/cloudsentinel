import { Link, Outlet } from "react-router-dom";
import Logo from "./Logo";

export default function PublicLayout() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-(--topbar-height) max-w-(--content-max-width) items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link to="/dashboard" className="hidden rounded-md px-3 py-1.5 text-muted hover:text-foreground sm:block">
              Dashboard
            </Link>
            <Link to="/connect" className="rounded-md bg-brand px-3 py-1.5 font-medium text-brand-foreground hover:bg-brand-hover">
              Connect clouds
            </Link>
          </nav>
        </div>
      </header>
      <Outlet />
      <footer className="border-t border-border py-6 text-center text-sm text-subtle">
        CloudSentinel: evidence-backed incidents from AWS and Azure logs.
      </footer>
    </div>
  );
}