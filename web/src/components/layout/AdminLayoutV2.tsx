'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Building2Icon,
  UsersIcon,
  SettingsIcon,
  HomeIcon,
  MenuIcon,
  XIcon,
  BarChart3Icon,
  BellIcon,
  SearchIcon,
  UserIcon,
  LogOutIcon,
  Grid3x3Icon,
  TrendingUpIcon,
  ShieldCheckIcon
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { TenantSelector } from '@/components/TenantSelector'

interface AdminLayoutV2Props {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export function AdminLayoutV2({ children, title = "Dashboard", subtitle }: AdminLayoutV2Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState('overview')
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout, currentTenant } = useAuth()

  const navigation = [
    {
      name: 'Overview',
      href: '/dashboard',
      icon: HomeIcon,
      section: 'overview',
      color: 'text-blue-600 bg-blue-50'
    },
    {
      name: 'Tenants',
      href: '/manager/tenants',
      icon: Building2Icon,
      section: 'tenants',
      color: 'text-emerald-600 bg-emerald-50'
    },
    {
      name: 'Users',
      href: '/manager/users',
      icon: UsersIcon,
      section: 'users',
      color: 'text-purple-600 bg-purple-50'
    },
    {
      name: 'Analytics',
      href: '/dashboard/analytics',
      icon: TrendingUpIcon,
      section: 'analytics',
      color: 'text-orange-600 bg-orange-50'
    },
    {
      name: 'Security',
      href: '/dashboard/security',
      icon: ShieldCheckIcon,
      section: 'security',
      color: 'text-red-600 bg-red-50'
    }
  ]

  const quickActions = [
    { name: 'Add User', icon: UsersIcon, href: '/manager/users?action=add' },
    { name: 'Create Tenant', icon: Building2Icon, href: '/manager/tenants?action=create' },
    { name: 'View Reports', icon: BarChart3Icon, href: '/dashboard/analytics' }
  ]

  const stats = [
    { name: 'Total Tenants', value: '24', change: '+2', color: 'text-blue-600' },
    { name: 'Active Users', value: '1,246', change: '+18%', color: 'text-green-600' },
    { name: 'Revenue', value: '$24,500', change: '+12%', color: 'text-purple-600' }
  ]

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const isActiveLink = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  useEffect(() => {
    // Determine active section based on pathname
    const section = navigation.find(item => isActiveLink(item.href))?.section || 'overview'
    setActiveSection(section)
  }, [pathname])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-black/20 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-20 lg:w-24 bg-white/80 backdrop-blur-xl border-r border-gray-200/50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center p-6 border-b border-gray-200/50">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Grid3x3Icon className="w-7 h-7 text-white" />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-8 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setActiveSection(item.section)}
                className={`
                  group relative flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-200
                  ${isActiveLink(item.href)
                    ? item.color
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
                title={item.name}
              >
                <item.icon className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium hidden lg:block">{item.name}</span>
                {isActiveLink(item.href) && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-current rounded-r-full" />
                )}
              </Link>
            ))}
          </nav>

          {/* User */}
          <div className="p-4 border-t border-gray-200/50">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-violet-500 rounded-full flex items-center justify-center mb-2">
                <span className="text-white font-bold text-sm">
                  {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                </span>
              </div>
              <div className="text-xs text-gray-600 text-center hidden lg:block">
                <div className="font-medium truncate">{user?.name || 'Admin'}</div>
                <div className="text-gray-500 truncate">{currentTenant?.name || 'System'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-24">
        {/* Top navigation */}
        <header className="bg-white/60 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-30">
          <div className="px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Left side */}
              <div className="flex items-center space-x-6">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100"
                >
                  <MenuIcon className="w-6 h-6" />
                </button>

                <div className="flex items-center space-x-4">
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">{title}</h1>
                    {subtitle && (
                      <p className="text-sm text-gray-600">{subtitle}</p>
                    )}
                  </div>
                  {currentTenant && (
                    <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-200">
                      <Building2Icon className="w-4 h-4 text-violet-600" />
                      <span className="text-xs font-medium text-violet-700">{currentTenant.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right side */}
              <div className="flex items-center space-x-3">
                {/* Search */}
                <div className="hidden md:block">
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent w-64"
                      placeholder="Search anything..."
                    />
                  </div>
                </div>

                {/* Notifications */}
                <button className="relative p-2 rounded-xl text-gray-600 hover:bg-gray-100">
                  <BellIcon className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </button>

                {/* Profile */}
                <div className="relative group">
                  <button className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-100">
                    <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-violet-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">
                        {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                      </span>
                    </div>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-gray-900">{user?.name || 'Admin User'}</p>
                      <p className="text-xs text-gray-500">Administrator</p>
                    </div>
                  </button>

                  {/* Dropdown */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 rounded-b-xl"
                    >
                      <LogOutIcon className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6 lg:p-8">
          {/* Stats Overview */}
          {activeSection === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {stats.map((stat, index) => (
                <div key={index} className="bg-white/60 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    </div>
                    <div className={`text-sm font-medium ${stat.color}`}>{stat.change}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          {activeSection === 'overview' && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {quickActions.map((action, index) => (
                  <Link
                    key={index}
                    href={action.href}
                    className="bg-white/60 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-6 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-xl flex items-center justify-center group-hover:from-violet-200 group-hover:to-indigo-200 transition-colors">
                        <action.icon className="w-6 h-6 text-violet-600" />
                      </div>
                      <span className="font-medium text-gray-900">{action.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Main content area */}
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}