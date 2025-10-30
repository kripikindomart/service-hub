'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Table from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import { permissionApi } from '@/lib/api'
import { Permission } from '@/types'
import toast from 'react-hot-toast'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [filters, setFilters] = useState({
    search: '',
    resource: '',
    action: '',
    scope: '',
  })
  const [newPermission, setNewPermission] = useState({
    name: '',
    resource: '',
    action: '',
    scope: 'TENANT',
    description: '',
    category: '',
  })

  useEffect(() => {
    fetchPermissions()
  }, [pagination.page, filters])

  const fetchPermissions = async () => {
    setIsLoading(true)
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        ),
      }

      const response = await permissionApi.getPermissions(params)
      if (response.success && response.data) {
        setPermissions(response.data.items)
        setPagination(prev => ({
          ...prev,
          ...response.data!.pagination,
        }))
      } else {
        toast.error(response.message || 'Failed to fetch permissions')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch permissions')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreatePermission = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await permissionApi.createPermission(newPermission)
      if (response.success) {
        toast.success('Permission created successfully')
        setShowCreateModal(false)
        setNewPermission({
          name: '',
          resource: '',
          action: '',
          scope: 'TENANT',
          description: '',
          category: '',
        })
        fetchPermissions()
      } else {
        toast.error(response.message || 'Failed to create permission')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create permission')
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }

  const getScopeBadge = (scope: string) => {
    const colors = {
      OWN: 'bg-blue-100 text-blue-800',
      TENANT: 'bg-green-100 text-green-800',
      ALL: 'bg-purple-100 text-purple-800',
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[scope as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {scope}
      </span>
    )
  }

  const columns = [
    {
      key: 'name',
      label: 'Name',
    },
    {
      key: 'resource',
      label: 'Resource',
    },
    {
      key: 'action',
      label: 'Action',
    },
    {
      key: 'scope',
      label: 'Scope',
      render: (value: string) => getScopeBadge(value),
    },
    {
      key: 'category',
      label: 'Category',
    },
    {
      key: 'description',
      label: 'Description',
      render: (value: string) => value || '-',
    },
    {
      key: 'isSystemPermission',
      label: 'System Permission',
      render: (value: boolean) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value ? 'Yes' : 'No'}
        </span>
      ),
    },
  ]

  return (
    <DashboardLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Permissions Management</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage system permissions and access control.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Permission
            </button>
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
                  placeholder="Search permissions..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="input-field pl-10"
                />
              </div>

              <input
                type="text"
                placeholder="Resource"
                value={filters.resource}
                onChange={(e) => handleFilterChange('resource', e.target.value)}
                className="input-field"
              />

              <input
                type="text"
                placeholder="Action"
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="input-field"
              />

              <select
                value={filters.scope}
                onChange={(e) => handleFilterChange('scope', e.target.value)}
                className="input-field"
              >
                <option value="">All Scopes</option>
                <option value="OWN">Own</option>
                <option value="TENANT">Tenant</option>
                <option value="ALL">All</option>
              </select>
            </div>
          </div>

          {/* Permissions Table */}
          <div className="bg-white shadow rounded-lg">
            <Table data={permissions} columns={columns} isLoading={isLoading} />
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      </div>

      {/* Create Permission Modal */}
      {showCreateModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateModal(false)} />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleCreatePermission}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Create New Permission
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        required
                        value={newPermission.name}
                        onChange={(e) => setNewPermission(prev => ({ ...prev, name: e.target.value }))}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Resource
                      </label>
                      <input
                        type="text"
                        required
                        value={newPermission.resource}
                        onChange={(e) => setNewPermission(prev => ({ ...prev, resource: e.target.value }))}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Action
                      </label>
                      <input
                        type="text"
                        required
                        value={newPermission.action}
                        onChange={(e) => setNewPermission(prev => ({ ...prev, action: e.target.value }))}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Scope
                      </label>
                      <select
                        value={newPermission.scope}
                        onChange={(e) => setNewPermission(prev => ({ ...prev, scope: e.target.value }))}
                        className="input-field"
                      >
                        <option value="OWN">Own</option>
                        <option value="TENANT">Tenant</option>
                        <option value="ALL">All</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        value={newPermission.category}
                        onChange={(e) => setNewPermission(prev => ({ ...prev, category: e.target.value }))}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        rows={3}
                        value={newPermission.description}
                        onChange={(e) => setNewPermission(prev => ({ ...prev, description: e.target.value }))}
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Create Permission
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}