'use client'

import React, { useState } from 'react'
import { AdminLayoutV1 } from '@/components/layout/AdminLayoutV1'
import { AdminLayoutV2 } from '@/components/layout/AdminLayoutV2'
import {
  Building2Icon,
  UsersIcon,
  TrendingUpIcon,
  DollarSignIcon,
  ActivityIcon,
  SettingsIcon,
  PlusIcon,
  EyeIcon,
  MoreVerticalIcon
} from 'lucide-react'

export default function AdminDashboardPage() {
  const [layoutVersion, setLayoutVersion] = useState<1 | 2>(1)

  const stats = [
    {
      name: 'Total Tenants',
      value: '24',
      change: '+2 from last month',
      changeType: 'increase',
      icon: Building2Icon,
      color: 'bg-blue-500'
    },
    {
      name: 'Active Users',
      value: '1,246',
      change: '+18% from last month',
      changeType: 'increase',
      icon: UsersIcon,
      color: 'bg-green-500'
    },
    {
      name: 'Revenue',
      value: '$24,500',
      change: '+12% from last month',
      changeType: 'increase',
      icon: DollarSignIcon,
      color: 'bg-purple-500'
    },
    {
      name: 'Growth Rate',
      value: '8.5%',
      change: '+2.1% from last month',
      changeType: 'increase',
      icon: TrendingUpIcon,
      color: 'bg-orange-500'
    }
  ]

  const recentTenants = [
    { id: 1, name: 'Tech Corp', type: 'Enterprise', status: 'Active', users: 156, joinDate: '2024-01-15' },
    { id: 2, name: 'StartupHub', type: 'Startup', status: 'Active', users: 23, joinDate: '2024-01-20' },
    { id: 3, name: 'Digital Agency', type: 'Business', status: 'Pending', users: 89, joinDate: '2024-01-22' },
    { id: 4, name: 'E-commerce Store', type: 'Retail', status: 'Active', users: 45, joinDate: '2024-01-25' }
  ]

  const activities = [
    { id: 1, type: 'user', message: 'New user registered: John Doe', time: '2 minutes ago', icon: UsersIcon },
    { id: 2, type: 'tenant', message: 'New tenant created: StartupHub', time: '15 minutes ago', icon: Building2Icon },
    { id: 3, type: 'revenue', message: 'Payment received: $500 from Tech Corp', time: '1 hour ago', icon: DollarSignIcon },
    { id: 4, type: 'system', message: 'System backup completed', time: '2 hours ago', icon: SettingsIcon }
  ]

  const LayoutComponent = layoutVersion === 1 ? AdminLayoutV1 : AdminLayoutV2

  return (
    <LayoutComponent
      title="Dashboard Overview"
      subtitle="Monitor your multi-tenant platform at a glance"
    >
      {/* Layout Switcher */}
      <div className="mb-6 flex justify-end">
        <div className="flex items-center space-x-2 bg-white rounded-lg border border-gray-200 p-1">
          <button
            onClick={() => setLayoutVersion(1)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              layoutVersion === 1
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Layout V1
          </button>
          <button
            onClick={() => setLayoutVersion(2)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              layoutVersion === 2
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Layout V2
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className={`flex-shrink-0 ${stat.color} rounded-lg p-3`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-green-600">{stat.change}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Tenants */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Tenants</h2>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View all
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Users
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                        <div className="text-sm text-gray-500">Joined {tenant.joinDate}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {tenant.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        tenant.status === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {tenant.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tenant.users}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreVerticalIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 p-2 rounded-lg ${
                    activity.type === 'user' ? 'bg-blue-100' :
                    activity.type === 'tenant' ? 'bg-green-100' :
                    activity.type === 'revenue' ? 'bg-purple-100' : 'bg-gray-100'
                  }`}>
                    <activity.icon className={`w-4 h-4 ${
                      activity.type === 'user' ? 'text-blue-600' :
                      activity.type === 'tenant' ? 'text-green-600' :
                      activity.type === 'revenue' ? 'text-purple-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <PlusIcon className="w-5 h-5" />
            <span>Add New Tenant</span>
          </button>
          <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <UsersIcon className="w-5 h-5" />
            <span>Manage Users</span>
          </button>
          <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            <TrendingUpIcon className="w-5 h-5" />
            <span>View Analytics</span>
          </button>
          <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
            <SettingsIcon className="w-5 h-5" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </LayoutComponent>
  )
}