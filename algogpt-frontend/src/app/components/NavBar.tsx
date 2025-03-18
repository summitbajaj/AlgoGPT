"use client";
import Link from "next/link";
import { useAuth } from "@/firebase/AuthContext";

export default function NavBar() {
  const { user, logout } = useAuth();

  // Use displayName if available, otherwise email prefix, otherwise fallback
  const userName =
    user?.displayName ?? user?.email?.split("@")[0] ?? "Friend";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-7xl mx-auto flex h-14 items-center px-4 justify-between">
        {/* Left Section: Brand + Nav Items */}
        <div className="flex items-center space-x-8">
          {/* Brand */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold tracking-wide text-gray-800">AlgoGPT</span>
          </Link>

          {/* Main Nav Links */}
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/problems"
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              Problems
            </Link>
            <Link
              href="/roadmap"
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              Roadmap
            </Link>
            {user && (
              <Link
                href="/profile"
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                Profile
              </Link>
            )}
          </nav>
        </div>

        {/* Right Section: User Info / Auth Buttons */}
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <span className="text-sm font-semibold text-gray-700">
                Hello, {userName}
              </span>
              <button
                onClick={() => logout()}
                className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-1 px-3 rounded transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-1.5 px-4 rounded transition-colors shadow-md"
            >
              Log In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
