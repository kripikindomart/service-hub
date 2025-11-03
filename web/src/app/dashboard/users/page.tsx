'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Table } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import { userApi } from '@/lib/api'
import { User } from '@/types'
import toast from 'react-hot-toast'
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    emailVerified: '',
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc',
  })

  useEffect(() => {
    fetchUsers()
  }, [pagination.page, filters])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        ),
      }

      const response = await userApi.getUsers(params)
      if (response.success && response.data) {
        setUsers(response.data.items)
        setPagination(prev => ({
          ...prev,
          ...response.data!.pagination,
        }))
      } else {
        toast.error(response.message || 'Failed to fetch users')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch users')
    } finally {
      setIsLoading(false)
    }
  }

  const handleActivateUser = async (userId: string) => {
    try {
      const response = await userApi.activateUser(userId)
      if (response.success) {
        toast.success('User activated successfully')
        fetchUsers()
      } else {
        toast.error(response.message || 'Failed to activate user')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to activate user')
    }
  }

  const handleDeactivateUser = async (userId: string) => {
    try {
      const response = await userApi.deactivateUser(userId)
      if (response.success) {
        toast.success('User deactivated successfully')
        fetchUsers()
      } else {
        toast.error(response.message || 'Failed to deactivate user')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to deactivate user')
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            Active
          </span>
        )
      case 'INACTIVE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircleIcon className="w-3 h-3 mr-1" />
            Inactive
          </span>
        )
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="w-3 h-3 mr-1" />
            Pending
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        )
    }
  }

  const columns = [
    {
      key: 'name' as keyof User,
      label: 'Name',
    },
    {
      key: 'email' as keyof User,
      label: 'Email',
    },
    {
      key: 'status' as keyof User,
      label: 'Status',
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'emailVerified' as keyof User,
      label: 'Email Verified',
      render: (value: boolean) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value ? 'Verified' : 'Not Verified'}
        </span>
      ),
    },
    {
      key: 'createdAt' as keyof User,
      label: 'Created At',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'actions' as keyof User,
      label: 'Actions',
      render: (_: any, user: User) => (
        <div className="flex space-x-2">
          {user.status === 'PENDING' || user.status === 'INACTIVE' ? (
            <button
              onClick={() => handleActivateUser(user.id)}
              className="text-green-600 hover:text-green-900 text-sm font-medium"
            >
              Activate
            </button>
          ) : (
            <button
              onClick={() => handleDeactivateUser(user.id)}
              className="text-red-600 hover:text-red-900 text-sm font-medium"
            >
              Deactivate
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <DashboardLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage and monitor all user accounts in the system.
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="input-field pl-10"
                />
              </div>

              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="input-field"
              >
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="PENDING">Pending</option>
              </select>

              <select
                value={filters.emailVerified}
                onChange={(e) => handleFilterChange('emailVerified', e.target.value)}
                className="input-field"
              >
                <option value="">All Email Status</option>
                <option value="true">Verified</option>
                <option value="false">Not Verified</option>
              </select>

              <select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-')
                  setFilters(prev => ({ ...prev, sortBy, sortOrder: sortOrder as 'asc' | 'desc' }))
                }}
                className="input-field"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="email-asc">Email (A-Z)</option>
                <option value="email-desc">Email (Z-A)</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white shadow rounded-lg">
            <Table data={users} columns={columns} isLoading={isLoading} />
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}