import './globals.css'
import ClientLayout from './ClientLayout'
import { generateMetadata } from './metadata'

export { generateMetadata }

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="p-2.5 h-svh overflow-hidden">
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
} 