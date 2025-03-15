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

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Xeadline - Decentralized Reddit Alternative',
  description: 'A decentralized Reddit alternative built on Nostr and Lightning Network',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script id="theme-script" strategy="beforeInteractive">
          {`
            (function() {
              // Force dark mode
              document.documentElement.classList.add('dark');
              console.log('Dark mode enforced');
            })();
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <Providers>
          <ErrorHandler />
          <ErrorBoundary>
            <BrowserCheck>
              {/* Temporarily disabled NostrInitializer to fix client-side error */}
              {/* <NostrInitializer /> */}
              <AuthInitializer />
              <MainLayout>
                {children}
              </MainLayout>
              {/* Re-enabled ConnectionStatus with error handling */}
              <ConnectionStatus />
            </BrowserCheck>
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  )
}
