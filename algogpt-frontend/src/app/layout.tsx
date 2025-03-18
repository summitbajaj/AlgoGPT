import "./globals.css"
import { Inter } from "next/font/google"
import type React from "react"
import { AuthProvider } from "@/firebase/AuthContext"
import NavBar from "@/app/components/NavBar" 

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
        <AuthProvider>
          <div className="flex flex-col min-h-screen">
            <NavBar />
            <main className="flex-grow">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}