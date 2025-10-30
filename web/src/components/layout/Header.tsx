'use client'

import { useState, useEffect } from 'react'
import { Bell, LogOut, Settings, User, ChevronDown, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAuthUser, clearAuthData } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function Header({
  sidebarCollapsed = false,
  onToggleSidebar
}: {
  sidebarCollapsed?: boolean
  onToggleSidebar?: () => void
}) {
  const [user, setUser] = useState<any>(null)
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'New user registration',
      description: 'John Doe has registered for an account',
      time: '2 min ago',
      read: false,
    },
    {
      id: 2,
      title: 'System update',
      description: 'Platform has been updated to version 2.0.1',
      time: '1 hour ago',
      read: false,
    },
    {
      id: 3,
      title: 'Security alert',
      description: 'Unusual login activity detected',
      time: '3 hours ago',
      read: true,
    },
  ])
  const router = useRouter()

  useEffect(() => {
    const authUser = getAuthUser()
    setUser(authUser)
  }, [])

  const handleLogout = () => {
    clearAuthData()
    router.push('/login')
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const getInitials = (name: string) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200/80 backdrop-blur-sm shadow-sm sticky top-0 z-30">
      <div className="h-full px-4 sm:px-6 lg:px-8">
        <div className="h-full flex items-center justify-between">
          {/* Left side - Sidebar toggle */}
          <div className="flex items-center space-x-4">
            {/* Desktop sidebar toggle */}
            <div className="hidden lg:block">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSidebar}
                className="h-9 w-9 rounded-lg hover:bg-gray-100 transition-colors p-0"
              >
                {sidebarCollapsed ? (
                  <Menu className="h-5 w-5 text-gray-600" />
                ) : (
                  <X className="h-5 w-5 text-gray-600" />
                )}
              </Button>
            </div>
            <div className="flex-1" />
          </div>

          {/* Right side - Notifications & Profile */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative h-9 w-9 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="font-semibold">
                  Notifications
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          !notification.read ? 'bg-blue-500' : 'bg-gray-300'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${
                            !notification.read ? 'text-gray-900' : 'text-gray-600'
                          }`}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {notification.description}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {notification.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-center text-sm text-blue-600 hover:text-blue-700">
                  View all notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 pl-2 pr-3 rounded-full hover:bg-gray-100 transition-colors flex items-center space-x-2"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src="" alt={user?.name} />
                    <AvatarFallback className="text-xs font-medium vibrant-gradient text-white">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user?.email?.split('@')[0]}@...
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                    <p className="text-xs leading-none text-blue-600 font-medium">
                      Manager
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}