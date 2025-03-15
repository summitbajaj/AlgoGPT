"use client";
import Link from "next/link";
import { useAuth } from '@/firebase/AuthContext';

export default function NavBar() {
  const { user, logout } = useAuth();
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full flex h-14 items-center px-3 justify-between">
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">AlgoGPT</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium ml-8">
            <Link href="/problems" className="transition-colors hover:text-foreground/80">
              Problems
            </Link>
            <Link href="/roadmap" className="transition-colors hover:text-foreground/80">
              Roadmap
            </Link>
            {user && (
              <Link href="/profile" className="transition-colors hover:text-foreground/80">
                Profile
              </Link>
            )}
          </nav>
        </div>
        
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <span className="text-sm">Hello, {user.email?.split('@')[0]}</span>
              <button 
                onClick={() => logout()}
                className="bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-3 rounded"
              >
                Logout
              </button>
            </>
          ) : (
            <Link 
              href="/login" 
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
