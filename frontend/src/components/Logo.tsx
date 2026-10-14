import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

export default function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-semibold text-foreground">
      <span className="grid size-8 place-items-center rounded-md bg-brand text-brand-foreground">
        <ShieldCheck className="size-5" aria-hidden />
      </span>
      CloudSentinel
    </Link>
  );
}