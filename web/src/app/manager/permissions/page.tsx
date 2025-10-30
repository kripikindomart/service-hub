'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { getAuthUser } from '@/lib/auth'
import {
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  KeyIcon,
  LockClosedIcon,
  LockOpenIcon,
} from '@heroicons/react/24/outline'

export default function PermissionsPage() {
  const [user, setUser] = useState<any>(null)
  const [permissions, setPermissions] = useState([
    {
      id: 1,
      name: 'READ_USERS',
      description: 'View user information and profiles',
      category: 'Users',
      isActive: true,
      createdAt: '2024-01-15',
      usageCount: 45,
    },
    {
      id: 2,
      name: 'WRITE_USERS',
      description: 'Create and modify user accounts',
      category: 'Users',
      isActive: true,
      createdAt: '2024-01-16',
      usageCount: 23,
    },
    {
      id: 3,
      name: 'DELETE_USERS',
      description: 'Remove user accounts from system',
      category: 'Users',
      isActive: false,
      createdAt: '2024-01-17',
      usageCount: 0,
    },
    {
      id: 4,
      name: 'MANAGE_PERMISSIONS',
      description: 'Modify system permissions and roles',
      category: 'System',
      isActive: true,
      createdAt: '2024-01-18',
      usageCount: 12,
    },
    {
      id: 5,
      name: 'TENANT_ADMIN',
      description: 'Full administrative access to tenant',
      category: 'Tenants',
      isActive: true,
      createdAt: '2024-01-19',
      usageCount: 8,
    },
  ])
  const [searchTerm, setSearchTerm] = useState('')
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
          <p className="text-gray-600">Loading permissions...</p>
        </div>
      </div>
    )
  }

  const filteredPermissions = permissions.filter(permission =>
    permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permission.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permission.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Users':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100'
      case 'System':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-100'
      case 'Tenants':
        return 'bg-green-100 text-green-800 hover:bg-green-100'
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100'
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-gradient mb-2">Permission Management</h1>
              <p className="text-gray-600 text-lg">Configure system permissions and access controls</p>
            </div>
            <Button className="btn-gradient">
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Permission
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search permissions by name, description, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 border-gray-200 focus:border-primary"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="h-12">
                  Category
                </Button>
                <Button variant="outline" className="h-12">
                  Status
                </Button>
                <Button variant="outline" className="h-12">
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permissions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPermissions.map((permission) => (
            <Card key={permission.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      permission.isActive ? 'vibrant-gradient' : 'bg-gray-300'
                    }`}>
                      {permission.isActive ? (
                        <LockOpenIcon className="w-4 h-4 text-white" />
                      ) : (
                        <LockClosedIcon className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {permission.name}
                      </CardTitle>
                      <Badge className={`text-xs ${getCategoryColor(permission.category)}`}>
                        {permission.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {permission.isActive ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {permission.description}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <KeyIcon className="w-3 h-3" />
                      <span>{permission.usageCount} uses</span>
                    </div>
                    <div>Created {permission.createdAt}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-8 hover:bg-blue-50"
                  >
                    <EyeIcon className="w-4 h-4 text-blue-600 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-8 hover:bg-green-50"
                  >
                    <PencilIcon className="w-4 h-4 text-green-600 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-red-50"
                  >
                    <TrashIcon className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats Summary */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900">
              Permission Statistics
            </CardTitle>
            <CardDescription>
              Overview of system permissions and their usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{permissions.length}</div>
                <div className="text-sm text-gray-500">Total Permissions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {permissions.filter(p => p.isActive).length}
                </div>
                <div className="text-sm text-gray-500">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {permissions.filter(p => !p.isActive).length}
                </div>
                <div className="text-sm text-gray-500">Inactive</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {permissions.reduce((sum, p) => sum + p.usageCount, 0)}
                </div>
                <div className="text-sm text-gray-500">Total Uses</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}