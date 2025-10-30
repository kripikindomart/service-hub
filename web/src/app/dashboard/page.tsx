'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getAuthUser } from '@/lib/auth'
import { adminApi, tenantApi } from '@/lib/api'
import {
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { TrendingUp, TrendingDown, Users, Activity, DollarSign } from 'lucide-react'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [recentActivity, setRecentActivity] = useState([
    {
      id: 1,
      type: 'user_registration',
      message: 'New user John Doe registered',
      time: '2 minutes ago',
      icon: UserGroupIcon,
      color: 'text-blue-600',
    },
    {
      id: 2,
      type: 'user_activated',
      message: 'Admin activated Jane Smith account',
      time: '15 minutes ago',
      icon: CheckCircleIcon,
      color: 'text-green-600',
    },
    {
      id: 3,
      type: 'permission_created',
      message: 'New permission "READ_USERS" created',
      time: '1 hour ago',
      icon: ShieldCheckIcon,
      color: 'text-purple-600',
    },
    {
      id: 4,
      type: 'tenant_created',
      message: 'New tenant "Tech Corp" added',
      time: '2 hours ago',
      icon: BuildingOfficeIcon,
      color: 'text-orange-600',
    },
  ])
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const authUser = getAuthUser()
      if (!authUser) {
        router.push('/login')
        return
      }
      setUser(authUser)

      try {
        setLoading(true)

        // Fetch dashboard statistics from the API
        const dashboardResponse = await tenantApi.getDashboardStats()

        if (dashboardResponse.success) {
          setDashboardData(dashboardResponse.data)

          // Extract stats from dashboard response
          const overview = dashboardResponse.data.overview
          const userStats = dashboardResponse.data.userStats

          setStats({
            totalUsers: overview.totalUsers,
            activeUsers: userStats?.byStatus?.find(s => s.status === 'ACTIVE')?.count || 0,
            pendingUsers: userStats?.byStatus?.find(s => s.status === 'PENDING')?.count || 0,
            inactiveUsers: userStats?.byStatus?.find(s => s.status === 'INACTIVE')?.count || 0,
            totalTenants: overview.totalTenants,
            activeTenants: overview.totalTenants, // All tenants are active based on our filter
            totalPermissions: overview.totalRoles,
            systemRoles: overview.totalRoles,
          })
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
        // Set default values if API fails
        setStats({
          totalUsers: 0,
          activeUsers: 0,
          pendingUsers: 0,
          inactiveUsers: 0,
          totalTenants: 0,
          activeTenants: 0,
          totalPermissions: 0,
          systemRoles: 0,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const usersResponse = await adminApi.getUsers({ limit: 1000 })
      const tenantsResponse = await tenantApi.getTenants({ limit: 1000 })

      if (usersResponse.success && tenantsResponse.success) {
        const users = usersResponse.data.items || []
        const tenants = tenantsResponse.data.items || []

        const activeUsers = users.filter(user => user.status === 'ACTIVE').length
        const pendingUsers = users.filter(user => user.status === 'PENDING').length
        const inactiveUsers = users.filter(user => user.status === 'INACTIVE').length
        const activeTenants = tenants.filter(tenant => tenant.status === 'ACTIVE').length

        setStats({
          totalUsers: users.length,
          activeUsers,
          pendingUsers,
          inactiveUsers,
          totalTenants: tenants.length,
          activeTenants,
          totalPermissions: 24,
          systemRoles: 3,
        })
      }
    } catch (error) {
      console.error('Failed to refresh dashboard data:', error)
    } finally {
      setRefreshing(false)
    }
  }

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
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-gradient mb-2">
                Welcome back, {user.name}!
              </h1>
              <p className="text-gray-600 text-lg">
                Here's what's happening with your platform today.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2"
              >
                <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </Button>
              <div className="hidden sm:block">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Current Time</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date().toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Users Card */}
          <Card className="card-hover border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Users
              </CardTitle>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-gray-900">
                  {stats?.totalUsers?.toLocaleString() || 0}
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center text-green-600 text-sm">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +12%
                  </div>
                  <span className="text-gray-500 text-sm">from last month</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Users Card */}
          <Card className="card-hover border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Active Users
              </CardTitle>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-gray-900">
                  {stats?.activeUsers?.toLocaleString() || 0}
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center text-green-600 text-sm">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +8%
                  </div>
                  <span className="text-gray-500 text-sm">from last week</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Users Card */}
          <Card className="card-hover border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pending Users
              </CardTitle>
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <ClockIcon className="w-4 h-4 text-yellow-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-gray-900">
                  {stats?.pendingUsers || 0}
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center text-red-600 text-sm">
                    <TrendingDown className="w-4 h-4 mr-1" />
                    -5%
                  </div>
                  <span className="text-gray-500 text-sm">from yesterday</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Tenants Card */}
          <Card className="card-hover border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Tenants
              </CardTitle>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <BuildingOfficeIcon className="w-4 h-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-gray-900">
                  {stats?.totalTenants || 0}
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center text-green-600 text-sm">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +2
                  </div>
                  <span className="text-gray-500 text-sm">new this month</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="lg:col-span-2 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">
                Quick Actions
              </CardTitle>
              <CardDescription>
                Manage your platform efficiently
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button
                  onClick={() => router.push('/manager/users')}
                  className="h-20 btn-gradient text-left justify-start flex flex-col items-start space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <UserGroupIcon className="w-5 h-5" />
                    <span className="font-semibold">Manage Users</span>
                  </div>
                  <span className="text-sm opacity-90">View, activate, and manage user accounts</span>
                </Button>

                <Button
                  onClick={() => router.push('/manager/permissions')}
                  variant="outline"
                  className="h-20 text-left justify-start flex flex-col items-start space-y-2 hover:border-primary/50"
                >
                  <div className="flex items-center space-x-2">
                    <ShieldCheckIcon className="w-5 h-5" />
                    <span className="font-semibold">Permissions</span>
                  </div>
                  <span className="text-sm text-gray-600">Configure system permissions</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 text-left justify-start flex flex-col items-start space-y-2 hover:border-primary/50"
                >
                  <div className="flex items-center space-x-2">
                    <BuildingOfficeIcon className="w-5 h-5" />
                    <span className="font-semibold">Tenants</span>
                  </div>
                  <span className="text-sm text-gray-600">Manage tenant settings</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 text-left justify-start flex flex-col items-start space-y-2 hover:border-primary/50"
                >
                  <div className="flex items-center space-x-2">
                    <ChartBarIcon className="w-5 h-5" />
                    <span className="font-semibold">Analytics</span>
                  </div>
                  <span className="text-sm text-gray-600">View platform statistics</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest system updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100`}>
                      <activity.icon className={`w-4 h-4 ${activity.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.message}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                className="w-full mt-4 text-primary hover:text-primary/80"
              >
                View all activity
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Platform Overview */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900">
              Platform Overview
            </CardTitle>
            <CardDescription>
              System health and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-green-50 rounded-xl border border-green-200">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircleIcon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-green-900 mb-1">System Status</h3>
                <p className="text-sm text-green-700">All systems operational</p>
              </div>

              <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-200">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ShieldCheckIcon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-blue-900 mb-1">Security</h3>
                <p className="text-sm text-blue-700">Advanced protection enabled</p>
              </div>

              <div className="text-center p-6 bg-purple-50 rounded-xl border border-purple-200">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ArrowTrendingUpIcon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-purple-900 mb-1">Performance</h3>
                <p className="text-sm text-purple-700">Optimized and responsive</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}