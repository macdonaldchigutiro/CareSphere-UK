import './globals.css'
import WorkspaceNavigation from '../components/WorkspaceNavigation'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <WorkspaceNavigation />
        {children}
      </body>
    </html>
  )
}
