import { ReactNode } from 'react'
import RouteGuard from '@/components/RouteGuard'

export default function TenantLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <RouteGuard>
      {children}
    </RouteGuard>
  )
}