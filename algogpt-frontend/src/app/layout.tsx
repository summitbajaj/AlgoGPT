// import type { Metadata } from "next";
// import localFont from "next/font/local";
// import "./globals.css";

// const geistSans = localFont({
//   src: "./fonts/GeistVF.woff",
//   variable: "--font-geist-sans",
//   weight: "100 900",
// });
// const geistMono = localFont({
//   src: "./fonts/GeistMonoVF.woff",
//   variable: "--font-geist-mono",
//   weight: "100 900",
// });

// export const metadata: Metadata = {
//   title: "AlgoGPT",
//   description: "An advanced algorithm editor powered by GPT",
// };

// export default function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode;
// }>) {
//   return (
//     <html lang="en">
//       <body
//         className={`${geistSans.variable} ${geistMono.variable} antialiased`}
//       >
//         {children}
//       </body>
//     </html>
//   );
// }

import "./globals.css"
import { Inter } from "next/font/google"
import Link from "next/link"
import type React from "react" // Added import for React

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
            <div className="container flex h-14 items-center">
              <Link href="/" className="mr-6 flex items-center space-x-2">
                <span className="text-xl font-bold">AlgoGPT</span>
              </Link>
              <nav className="flex items-center space-x-6 text-sm font-medium">
                <Link href="/problems" className="transition-colors hover:text-foreground/80">
                  Problems
                </Link>
                <Link href="/problems/roadmap" className="transition-colors hover:text-foreground/80">
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


