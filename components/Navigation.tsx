"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import MovieClerkMascot from "@/components/MovieClerkMascot";

const NAV_LINKS = [
  { href: "/", label: "Discover" },
  { href: "/library", label: "My Library" },
  { href: "/recommendations", label: "Movie Clerk Recommends" },
  { href: "/stats", label: "My Stats" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav
      style={{ background: "#111", borderBottom: "1px solid #222" }}
      className="sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-8 h-14">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <MovieClerkMascot size={36} />
          <span>Movie Clerk</span>
        </Link>
        <div className="flex gap-1 ml-4">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  background: active ? "#e50914" : "transparent",
                  color: active ? "#fff" : "#aaa",
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
