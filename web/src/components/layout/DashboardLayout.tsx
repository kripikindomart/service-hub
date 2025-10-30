'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import Header from './Header'
import Sidebar from './Sidebar'
import { getAuthUser } from '@/lib/auth'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const authUser = getAuthUser()
    if (!authUser) {
      router.push('/login')
      return
    }
    setUser(authUser)
  }, [router])

  if (!user) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 vibrant-gradient rounded-2xl shadow-lg mb-4">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen gradient-bg flex">
      {/* Sidebar - Fixed on left */}
      <Sidebar
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
      />

      {/* Main Content Area - Takes remaining space */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile sidebar trigger */}
        <div className="lg:hidden fixed top-4 left-4 z-40">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="h-10 w-10 rounded-lg bg-white/80 backdrop-blur-sm shadow-lg border border-white/20"
          >
            <Bars3Icon className="h-5 w-5" />
          </Button>
        </div>

        {/* Header */}
        <Header
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main Content */}
        <main className={`flex-1 p-4 sm:p-6 lg:p-8 overflow-auto transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-0'
        }`}>
          <div className={`max-w-full transition-all duration-300 ${
            sidebarCollapsed ? 'lg:px-4 lg:pr-8' : 'lg:px-6 lg:pr-12'
          }`}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}