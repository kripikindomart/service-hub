'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { RouteGuard } from '@/components/guards/RouteGuard'
import { AuthProvider } from '@/hooks/useAuth'
import { LayoutProvider, useLayout } from '@/providers/LayoutProvider'
import { toast } from 'sonner'
import {
  Building2Icon,
  UsersIcon,
  PlusIcon,
  EyeIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
  FilterIcon,
  MoreVerticalIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArchiveIcon,
  ActivityIcon,
  GlobeIcon,
  SettingsIcon,
  CopyIcon,
  DownloadIcon
} from 'lucide-react'

interface Tenant {
  id: string
  name: string
  slug: string
  domain?: string
  type: string
  tier: string
  status: string
  primaryColor: string
  userCount: number
  createdAt: string
  updatedAt: string
  settings?: any
}

const mockTenants: Tenant[] = [
  {
    id: '1',
    name: 'Tech Corp',
    slug: 'tech-corp',
    domain: 'techcorp.example.com',
    type: 'ENTERPRISE',
    tier: 'PREMIUM',
    status: 'ACTIVE',
    primaryColor: '#3B82F6',
    userCount: 156,
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-20T14:22:00Z'
  },
  {
    id: '2',
    name: 'StartupHub',
    slug: 'startup-hub',
    domain: 'startup.example.com',
    type: 'STARTUP',
    tier: 'PROFESSIONAL',
    status: 'ACTIVE',
    primaryColor: '#10B981',
    userCount: 23,
    createdAt: '2024-01-20T09:15:00Z',
    updatedAt: '2024-01-25T16:45:00Z'
  },
  {
    id: '3',
    name: 'Digital Agency',
    slug: 'digital-agency',
    domain: 'digital.example.com',
    type: 'BUSINESS',
    tier: 'STANDARD',
    status: 'PENDING',
    primaryColor: '#8B5CF6',
    userCount: 89,
    createdAt: '2024-01-22T11:00:00Z',
    updatedAt: '2024-01-22T11:00:00Z'
  },
  {
    id: '4',
    name: 'E-commerce Store',
    slug: 'ecommerce-store',
    domain: 'store.example.com',
    type: 'RETAIL',
    tier: 'STARTUP',
    status: 'ACTIVE',
    primaryColor: '#F59E0B',
    userCount: 45,
    createdAt: '2024-01-25T13:20:00Z',
    updatedAt: '2024-01-28T10:10:00Z'
  }
]

const tenantTypes = [
  { value: 'ENTERPRISE', label: 'Enterprise', color: 'bg-blue-100 text-blue-800' },
  { value: 'BUSINESS', label: 'Business', color: 'bg-green-100 text-green-800' },
  { value: 'STARTUP', label: 'Startup', color: 'bg-purple-100 text-purple-800' },
  { value: 'RETAIL', label: 'Retail', color: 'bg-orange-100 text-orange-800' }
]

const tenantTiers = [
  { value: 'STARTUP', label: 'Startup', color: 'bg-gray-100 text-gray-800' },
  { value: 'STANDARD', label: 'Standard', color: 'bg-blue-100 text-blue-800' },
  { value: 'PROFESSIONAL', label: 'Professional', color: 'bg-purple-100 text-purple-800' },
  { value: 'PREMIUM', label: 'Premium', color: 'bg-yellow-100 text-yellow-800' }
]

function TenantManagementContent() {
  const { layoutVersion, switchLayout, isLayoutSwitchingAllowed, layoutConfig } = useLayout()
  const [tenants, setTenants] = useState<Tenant[]>(mockTenants)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tenant.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (tenant.domain && tenant.domain.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesType = !selectedType || tenant.type === selectedType
    const matchesStatus = !selectedStatus || tenant.status === selectedStatus
    return matchesSearch && matchesType && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'INACTIVE':
        return 'bg-red-100 text-red-800'
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeInfo = (type: string) => {
    return tenantTypes.find(t => t.value === type) || tenantTypes[0]
  }

  const getTierInfo = (tier: string) => {
    return tenantTiers.find(t => t.value === tier) || tenantTiers[0]
  }

  const handleDeleteTenant = (tenantId: string) => {
    const updatedTenants = tenants.filter(t => t.id !== tenantId)
    setTenants(updatedTenants)
    toast.success('Tenant deleted successfully')
  }

  const handleArchiveTenant = (tenantId: string) => {
    const updatedTenants = tenants.map(t =>
      t.id === tenantId
        ? { ...t, status: 'ARCHIVED', updatedAt: new Date().toISOString() }
        : t
    )
    setTenants(updatedTenants)
    toast.success('Tenant archived successfully')
  }

  const openViewModal = (tenant: Tenant) => {
    setSelectedTenant(tenant)
    setShowViewModal(true)
  }

  const stats = [
    {
      name: 'Total Tenants',
      value: tenants.length.toString(),
      change: '+2 this month',
      changeType: 'increase',
      icon: Building2Icon,
      color: 'bg-blue-500'
    },
    {
      name: 'Active Tenants',
      value: tenants.filter(t => t.status === 'ACTIVE').length.toString(),
      change: '+1 this week',
      changeType: 'increase',
      icon: CheckCircleIcon,
      color: 'bg-green-500'
    },
    {
      name: 'Pending Approval',
      value: tenants.filter(t => t.status === 'PENDING').length.toString(),
      change: '+3 this week',
      changeType: 'increase',
      icon: ActivityIcon,
      color: 'bg-yellow-500'
    },
    {
      name: 'Total Users',
      value: tenants.reduce((sum, t) => sum + t.userCount, 0).toLocaleString(),
      change: '+156 this month',
      changeType: 'increase',
      icon: UsersIcon,
      color: 'bg-purple-500'
    }
  ]

  return (
    <>
      {/* Layout Switcher - Only show if switching is allowed */}
      {isLayoutSwitchingAllowed && (
        <div className="mb-6 flex justify-end">
          <div className="flex items-center space-x-2 bg-white rounded-lg border border-gray-200 p-1">
            <button
              onClick={switchLayout}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                layoutVersion === 1
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Layout V{layoutVersion}
            </button>
            <button
              onClick={switchLayout}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                layoutVersion === 2
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Layout V{layoutVersion === 1 ? 2 : 1}
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid - Only show if enabled in config */}
      {layoutConfig.features.showStats && (
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
      )}

      {/* Add New Tenant Button */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add New Tenant</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search tenants..."
              />
            </div>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              {tenantTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <FilterIcon className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <DownloadIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
                  Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: tenant.primaryColor }}
                      >
                        {tenant.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                        <div className="text-sm text-gray-500">{tenant.slug}</div>
                        {tenant.domain && (
                          <div className="text-xs text-gray-400 flex items-center mt-1">
                            <GlobeIcon className="w-3 h-3 mr-1" />
                            {tenant.domain}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeInfo(tenant.type).color}`}>
                      {getTypeInfo(tenant.type).label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTierInfo(tenant.tier).color}`}>
                      {getTierInfo(tenant.tier).label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(tenant.status)}`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <UsersIcon className="w-4 h-4 mr-1 text-gray-400" />
                      {tenant.userCount}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => openViewModal(tenant)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="View details"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <div className="relative group">
                        <button className="text-gray-600 hover:text-gray-900 p-1 rounded">
                          <MoreVerticalIcon className="w-4 h-4" />
                        </button>
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10 invisible hover:visible group-hover:visible">
                          <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                            <EditIcon className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
                          <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                            <CopyIcon className="w-4 h-4" />
                            <span>Duplicate</span>
                          </button>
                          <button
                            onClick={() => handleArchiveTenant(tenant.id)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                          >
                            <ArchiveIcon className="w-4 h-4" />
                            <span>Archive</span>
                          </button>
                          <button
                            onClick={() => handleDeleteTenant(tenant.id)}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 rounded-b-lg"
                          >
                            <TrashIcon className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTenants.length === 0 && (
          <div className="text-center py-12">
            <Building2Icon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No tenants found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || selectedType || selectedStatus
                ? 'Try adjusting your filters'
                : 'Get started by creating a new tenant'}
            </p>
            {!searchQuery && !selectedType && !selectedStatus && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add New Tenant
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* View Tenant Modal */}
      {showViewModal && selectedTenant && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <div className="flex items-center mb-4">
                      <div
                        className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-xl mr-4"
                        style={{ backgroundColor: selectedTenant.primaryColor }}
                      >
                        {selectedTenant.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-xl leading-6 font-medium text-gray-900">
                          {selectedTenant.name}
                        </h3>
                        <p className="text-sm text-gray-500">{selectedTenant.slug}</p>
                        <p className="text-xs text-gray-400 flex items-center mt-1">
                          <GlobeIcon className="w-3 h-3 mr-1" />
                          {selectedTenant.domain || 'No domain configured'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Type</h4>
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeInfo(selectedTenant.type).color}`}>
                          {getTypeInfo(selectedTenant.type).label}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Tier</h4>
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTierInfo(selectedTenant.tier).color}`}>
                          {getTierInfo(selectedTenant.tier).label}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Status</h4>
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedTenant.status)}`}>
                          {selectedTenant.status}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Users</h4>
                        <div className="flex items-center">
                          <UsersIcon className="w-4 h-4 mr-1 text-gray-400" />
                          <span className="text-sm text-gray-900">{selectedTenant.userCount}</span>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Created</h4>
                        <p className="text-sm text-gray-900">{new Date(selectedTenant.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Last Updated</h4>
                        <p className="text-sm text-gray-900">{new Date(selectedTenant.updatedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => {
                    setShowViewModal(false)
                    setSelectedTenant(null)
                  }}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function TenantManagementPage() {
  return (
    <AuthProvider>
      <RouteGuard>
        <LayoutProvider
          title="Tenant Management"
          subtitle="Manage and configure your platform tenants"
        >
          <TenantManagementContent />
        </LayoutProvider>
      </RouteGuard>
    </AuthProvider>
  )
}