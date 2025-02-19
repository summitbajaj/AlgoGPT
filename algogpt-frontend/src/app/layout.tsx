import "./globals.css"
import { Inter } from "next/font/google"
import Link from "next/link"
import type React from "react"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "AlgoGPT - Learn and Practice Coding",
  description: "A platform for learning and practicing coding problems with AI assistance",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="w-full flex h-14 items-center px-3 -ml-1">
          {/* Logo Section */}
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold">AlgoGPT</span>
            </Link>

            {/* Navigation Section */}
            <nav className="flex items-center space-x-6 text-sm font-medium ml-8">
              <Link href="/problems" className="transition-colors hover:text-foreground/80">
                Problems
              </Link>
              <Link href="/roadmap" className="transition-colors hover:text-foreground/80">
                Roadmap
              </Link>
              <Link href="/chat" className="transition-colors hover:text-foreground/80">
                AI Chat
              </Link>
            </nav>
          </div>
        </header>
          <main className="flex-grow">{children}</main>
        </div>
      </body>
    </html>
  )
}


