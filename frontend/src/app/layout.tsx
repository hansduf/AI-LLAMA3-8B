import type { Metadata } from 'next'
import './globals.css'

// Menghapus import font Inter untuk sementara untuk mengatasi error
// import { Inter } from 'next/font/google'
// const inter = Inter({ subsets: ['latin'] })

// Gunakan variabel dummy untuk className
const inter = { className: '' }

export const metadata: Metadata = {
  title: 'Dokai - Yooo pembaca dokumen',
  description: 'Smart AI assistant for your needs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
