import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/redux/provider'
import NostrInitializer from '@/components/NostrInitializer'
import AuthInitializer from '@/components/auth/AuthInitializer'
import ConnectionStatus from '@/components/ui/ConnectionStatus'
import MainLayout from '@/components/layout/MainLayout'
import BrowserCheck from '@/components/BrowserCheck'
import ErrorBoundary from '@/components/ErrorBoundary'
import ErrorHandler from '@/components/ErrorHandler'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Xeadline - Decentralized Reddit Alternative',
  description: 'A decentralized Reddit alternative built on Nostr and Lightning Network',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Dark mode is now applied directly to the HTML element */}
      </head>
      <body className={inter.className}>
        <Providers>
          <ErrorHandler />
          <ErrorBoundary>
            <BrowserCheck>
              {/* Phase 2: Re-enabled NostrInitializer with feature flags and phased initialization */}
              <NostrInitializer />
              <AuthInitializer />
              <MainLayout>
                {children}
              </MainLayout>
              {/* Phase 1: Re-enabled ConnectionStatus with error handling */}
              <ConnectionStatus />
            </BrowserCheck>
          </ErrorBoundary>
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
