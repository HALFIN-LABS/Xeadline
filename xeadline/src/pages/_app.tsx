import type { AppProps } from 'next/app'
import { Providers } from '../redux/provider'
import '../app/globals.css'
import { useEffect } from 'react'
import AuthInitializer from '../components/auth/AuthInitializer'
import NostrInitializer from '../components/NostrInitializer'
import { PasswordModalProvider } from '../contexts/PasswordModalContext'

export default function MyApp({ Component, pageProps }: AppProps) {
  // Apply dark mode class to HTML element to match App Router behavior
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  return (
    <Providers>
      <PasswordModalProvider>
        {/* Initialize authentication and Nostr connections */}
        <NostrInitializer />
        <AuthInitializer />
        <Component {...pageProps} />
      </PasswordModalProvider>
    </Providers>
  )
}