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
  title: 'Xeadspace - Own the internet',
  description: 'A decentralised forum built on Nostr and the Lightning Network',
  icons: {
    icon: '/xeadspace-icon.svg',
    apple: '/xeadspace-icon.svg',
  },
  openGraph: {
    title: 'Xeadspace - Own the internet',
    description: 'A decentralised forum built on Nostr and the Lightning Network',
    url: 'https://xead.space',
    siteName: 'Xeadspace',
    images: [
      {
        url: '/xeadspace-icon.svg',
        width: 800,
        height: 600,
        alt: 'Xeadspace Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Xeadspace - Own the internet',
    description: 'A decentralised forum built on Nostr and the Lightning Network',
    images: ['/xeadspace-icon.svg'],
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
    canonical: 'https://xead.space',
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
                {/* Initialize auth first, then Nostr connection */}
                <AuthInitializer />
                {/* NostrInitializer now depends on auth state */}
                <NostrInitializer />
                <MainLayout>
                  {children}
                </MainLayout>
                {/* Connection status indicator */}
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
