import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import Navigation from '@/components/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Duvall Farmers Market Online Service',
  description: 'Online ordering platform for the Duvall Farmers Market Online Service - Fresh local produce, artisan goods, and more every Thursday',
  keywords: 'farmers market, local produce, artisan goods, Duvall, fresh food, organic',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navigation />
        <main className="min-h-screen">
          {children}
        </main>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#ffffff',
              color: '#1f2937',
              border: '1px solid #d1d5db',
            },
            success: {
              style: {
                background: '#dcf2e4',
                color: '#1f623e',
              },
            },
            error: {
              style: {
                background: '#fef2f2',
                color: '#991b1b',
              },
            },
          }}
        />
      </body>
    </html>
  )
} 