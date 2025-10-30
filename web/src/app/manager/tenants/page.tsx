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
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  UsersIcon,
  CogIcon,
} from '@heroicons/react/24/outline'

export default function TenantsPage() {
  const [user, setUser] = useState<any>(null)
  const [tenants, setTenants] = useState([
    {
      id: 1,
      name: 'System Core',
      slug: 'core',
      type: 'CORE',
      status: 'active',
      userCount: 156,
      storageUsed: '45.2 GB',
      createdAt: '2024-01-01',
      lastActivity: '2024-01-30',
    },
    {
      id: 2,
      name: 'Company A',
      slug: 'company-a',
      type: 'BUSINESS',
      status: 'active',
      userCount: 89,
      storageUsed: '23.8 GB',
      createdAt: '2024-01-15',
      lastActivity: '2024-01-29',
    },
    {
      id: 3,
      name: 'Company B',
      slug: 'company-b',
      type: 'BUSINESS',
      status: 'inactive',
      userCount: 45,
      storageUsed: '12.1 GB',
      createdAt: '2024-01-20',
      lastActivity: '2024-01-25',
    },
    {
      id: 4,
      name: 'Personal Account',
      slug: 'personal',
      type: 'PERSONAL',
      status: 'active',
      userCount: 3,
      storageUsed: '0.5 GB',
      createdAt: '2024-01-22',
      lastActivity: '2024-01-30',
    },
    {
      id: 5,
      name: 'Startup XYZ',
      slug: 'startup-xyz',
      type: 'BUSINESS',
      status: 'pending',
      userCount: 12,
      storageUsed: '1.2 GB',
      createdAt: '2024-01-28',
      lastActivity: 'Never',
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
          <p className="text-gray-600">Loading tenants...</p>
        </div>
      </div>
    )
  }

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'CORE':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-100'
      case 'BUSINESS':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100'
      case 'PERSONAL':
        return 'bg-green-100 text-green-800 hover:bg-green-100'
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
      case 'inactive':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Inactive</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CORE':
        return <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
          <CogIcon className="w-4 h-4 text-white" />
        </div>
      case 'BUSINESS':
        return <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <BuildingOfficeIcon className="w-4 h-4 text-white" />
        </div>
      case 'PERSONAL':
        return <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
          <UsersIcon className="w-4 h-4 text-white" />
        </div>
      default:
        return <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center">
          <BuildingOfficeIcon className="w-4 h-4 text-white" />
        </div>
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-gradient mb-2">Tenant Management</h1>
              <p className="text-gray-600 text-lg">Manage organizational units and their settings</p>
            </div>
            <Button className="btn-gradient">
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Tenant
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
                  placeholder="Search tenants by name, slug, or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 border-gray-200 focus:border-primary"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="h-12">
                  Type
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

        {/* Tenants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTenants.map((tenant) => (
            <Card key={tenant.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {getTypeIcon(tenant.type)}
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {tenant.name}
                      </CardTitle>
                      <p className="text-sm text-gray-500">@{tenant.slug}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <Badge className={`text-xs ${getTypeColor(tenant.type)}`}>
                      {tenant.type}
                    </Badge>
                    {getStatusBadge(tenant.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600">
                      <UsersIcon className="w-4 h-4 mr-2" />
                      Users
                    </div>
                    <span className="font-medium text-gray-900">{tenant.userCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600">
                      <BuildingOfficeIcon className="w-4 h-4 mr-2" />
                      Storage
                    </div>
                    <span className="font-medium text-gray-900">{tenant.storageUsed}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-gray-600">Last Activity</div>
                    <span className="font-medium text-gray-900">{tenant.lastActivity}</span>
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
              Tenant Statistics
            </CardTitle>
            <CardDescription>
              Overview of organizational units and their usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{tenants.length}</div>
                <div className="text-sm text-gray-500">Total Tenants</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {tenants.filter(t => t.status === 'active').length}
                </div>
                <div className="text-sm text-gray-500">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {tenants.filter(t => t.status === 'pending').length}
                </div>
                <div className="text-sm text-gray-500">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {tenants.reduce((sum, t) => sum + t.userCount, 0)}
                </div>
                <div className="text-sm text-gray-500">Total Users</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}