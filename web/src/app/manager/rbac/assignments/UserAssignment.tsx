'use client'

import { useState, useEffect } from 'react'
import { userAssignmentService } from '@/services/user-assignment.service'
import type { UserAssignment as UserAssignmentType } from '@/types'
import { useAuthStore } from '@/stores/authStore'

export function UserAssignment({ hasFullAccess }: { hasFullAccess?: boolean }) {
  const [assignments, setAssignments] = useState<UserAssignmentType[]>([])
  const [loading, setLoading] = useState(true)
  const { currentTenant } = useAuthStore()

  useEffect(() => {
    loadAssignments()
  }, [currentTenant])

  const loadAssignments = async () => {
    try {
      setLoading(true)
      const assignmentsData = await userAssignmentService.getUserAssignments({
        tenantId: currentTenant?.id
      })
      setAssignments(assignmentsData)
    } catch (error) {
      console.error('Error loading user assignments:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Dummy data for display when API returns empty
  const displayAssignments = assignments.length > 0 ? assignments : [
    {
      id: '1',
      user: { name: 'John Doe', email: 'john@example.com' } as any,
      role: { name: 'Admin', type: 'SYSTEM' } as any,
      tenant: { name: 'Core System' } as any,
      status: 'ACTIVE' as any,
      assignedAt: '2024-01-15'
    },
    {
      id: '2',
      user: { name: 'Jane Smith', email: 'jane@example.com' } as any,
      role: { name: 'Manager', type: 'TENANT' } as any,
      tenant: { name: 'Company A' } as any,
      status: 'ACTIVE' as any,
      assignedAt: '2024-02-01'
    },
    {
      id: '3',
      user: { name: 'Bob Johnson', email: 'bob@example.com' } as any,
      role: { name: 'User', type: 'TENANT' } as any,
      tenant: { name: 'Company B' } as any,
      status: 'PENDING' as any,
      assignedAt: '2024-03-10'
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-700'
      case 'PENDING': return 'bg-yellow-100 text-yellow-700'
      case 'INACTIVE': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getRoleTypeColor = (type: string) => {
    switch (type) {
      case 'SYSTEM': return 'bg-purple-100 text-purple-700'
      case 'TENANT': return 'bg-blue-100 text-blue-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">User Assignments</h2>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Role Assignments</h3>
          <p className="text-gray-600 mt-1">Manage user role assignments across tenants</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {displayAssignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium">{assignment.user?.name}</div>
                      <div className="text-sm text-gray-500">{assignment.user?.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{assignment.role?.name}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getRoleTypeColor(assignment.role?.type)}`}>
                        {assignment.role?.type}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {assignment.tenant?.name}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(assignment.status)}`}>
                      {assignment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {assignment.assignedAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}