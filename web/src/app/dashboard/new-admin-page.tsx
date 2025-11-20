'use client'

import { AuthProvider } from '@/hooks/useAuth'
import AdminDashboardPage from './admin-page'

export default function NewAdminDashboardPage() {
  return (
    <AuthProvider>
      <AdminDashboardPage />
    </AuthProvider>
  )
}