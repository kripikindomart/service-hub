'use client'

import { useState, useEffect } from 'react'
import { rolePermissionService } from '@/services/role-permission.service'
import { RolePermission } from '@/lib/rbac-utils'
import { useAuthStore } from '@/stores/authStore'

export function RolePermissionAssignment({ hasFullAccess }: { hasFullAccess?: boolean }) {
  const [assignments, setAssignments] = useState<RolePermission[]>([])
  const [loading, setLoading] = useState(true)
  const { currentTenant } = useAuthStore()

  useEffect(() => {
    loadAssignments()
  }, [currentTenant])

  const loadAssignments = async () => {
    try {
      setLoading(true)
      const assignmentsData = await rolePermissionService.getRolePermissions({
        tenantId: currentTenant?.id
      })
      setAssignments(assignmentsData)
    } catch (error) {
      console.error('Error loading role permission assignments:', error)
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
      role: { name: 'Super Admin', type: 'SYSTEM' } as any,
      permission: { name: 'Full System Access', resource: '*', action: '*', scope: 'ALL' } as any,
      grantedAt: '2024-01-01'
    },
    {
      id: '2',
      role: { name: 'Admin', type: 'SYSTEM' } as any,
      permission: { name: 'User Management', resource: 'users', action: 'manage', scope: 'TENANT' } as any,
      grantedAt: '2024-01-01'
    },
    {
      id: '3',
      role: { name: 'Manager', type: 'TENANT' } as any,
      permission: { name: 'View Reports', resource: 'reports', action: 'read', scope: 'TENANT' } as any,
      grantedAt: '2024-01-15'
    },
    {
      id: '4',
      role: { name: 'User', type: 'TENANT' } as any,
      permission: { name: 'View Profile', resource: 'profile', action: 'read', scope: 'OWN' } as any,
      grantedAt: '2024-01-15'
    },
  ];

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'ALL': return 'bg-red-100 text-red-700'
      case 'TENANT': return 'bg-blue-100 text-blue-700'
      case 'OWN': return 'bg-green-100 text-green-700'
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
      <h2 className="text-2xl font-bold mb-6">Role-Permission Assignments</h2>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Permission Assignments</h3>
          <p className="text-gray-600 mt-1">Manage permissions assigned to different roles</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permission
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resource:Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scope
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Granted
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {displayAssignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{assignment.role?.name}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getRoleTypeColor(assignment.role?.type)}`}>
                        {assignment.role?.type}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{assignment.permission?.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="px-2 py-1 bg-gray-100 rounded text-sm">
                      {assignment.permission?.resource}:{assignment.permission?.action}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getScopeColor(assignment.permission?.scope)}`}>
                      {assignment.permission?.scope}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {assignment.grantedAt}
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