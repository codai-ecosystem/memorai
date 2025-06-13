import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Memorai Dashboard - AI Memory Management | 110% Enhanced',
    description: 'Advanced AI Memory Management Dashboard with real-time analytics and visual memory graphs',
    keywords: ['memorai', 'ai', 'memory', 'dashboard', 'nextjs', 'typescript', 'analytics'],
    authors: [{ name: 'Codai Team' }],
    creator: 'Codai Team',
    publisher: 'Codai Team',
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    manifest: '/manifest.json',
    icons: {
        icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧠</text></svg>",
    },
}

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#ffffff' },
        { media: '(prefers-color-scheme: dark)', color: '#1e293b' },
    ],
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>                <ThemeProvider>
                {children}
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: 'hsl(var(--card))',
                            color: 'hsl(var(--card-foreground))',
                            border: '1px solid hsl(var(--border))',
                        },
                    }}
                />
            </ThemeProvider>
            </body>
        </html>
    )
}
