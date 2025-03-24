import type { Metadata } from 'next'
import { Inter, Roboto } from 'next/font/google'
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
import { PasswordModalProvider } from '@/contexts/PasswordModalContext'

const inter = Inter({ subsets: ['latin'] })
const roboto = Roboto({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-roboto'
})

export const metadata: Metadata = {
  title: 'Xeadline - Own the internet',
  description: 'A decentralised forum built on Nostr and the Lightning Network',
  icons: {
    icon: '/xeadline-icon.svg',
    apple: '/xeadline-icon.svg',
  },
  openGraph: {
    title: 'Xeadline - Own the internet',
    description: 'A decentralised forum built on Nostr and the Lightning Network',
    url: 'https://xeadline.com',
    siteName: 'Xeadline',
    images: [
      {
        url: '/xeadline-icon.svg',
        width: 800,
        height: 600,
        alt: 'Xeadline Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Xeadline - Own the internet',
    description: 'A decentralised forum built on Nostr and the Lightning Network',
    images: ['/xeadline-icon.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'verification_token', // Replace with actual Google verification token when available
  },
  alternates: {
    canonical: 'https://xeadline.com',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${roboto.variable}`}>
      <head>
        {/* Dark mode is now applied directly to the HTML element */}
      </head>
      <body className={inter.className}>
        <Providers>
          <ErrorHandler />
          <ErrorBoundary>
            <PasswordModalProvider>
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
            </PasswordModalProvider>
          </ErrorBoundary>
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
