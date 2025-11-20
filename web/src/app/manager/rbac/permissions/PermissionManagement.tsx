'use client'

import { useState, useEffect } from 'react'
import { permissionService } from '@/services/permission.service'
import { Permission } from '@/lib/rbac-utils'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  KeyIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  LockClosedIcon,
  UserGroupIcon,
  FolderIcon,
  CogIcon
} from '@heroicons/react/24/outline'

interface CreatePermissionData {
  name: string
  description: string
  resource: string
  action: string
  scope: 'ALL' | 'TENANT' | 'OWN'
  // REMOVED: isActive field not in Permission type
}

export function PermissionManagement({ hasFullAccess }: { hasFullAccess?: boolean }) {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null)
  const [selectedResource, setSelectedResource] = useState('')
  const [formData, setFormData] = useState<CreatePermissionData>({
    name: '',
    description: '',
    resource: '',
    action: '',
    scope: 'OWN'
    // REMOVED: isActive field not in Permission type
  })
  const { currentTenant } = useAuthStore()

  const RESOURCES = [
    { value: 'users', label: 'Users', icon: UserGroupIcon },
    { value: 'tenants', label: 'Tenants', icon: FolderIcon },
    { value: 'roles', label: 'Roles', icon: ShieldCheckIcon },
    { value: 'permissions', label: 'Permissions', icon: KeyIcon },
    { value: 'system', label: 'System', icon: CogIcon },
    { value: 'analytics', label: 'Analytics', icon: ShieldCheckIcon },
    { value: 'logs', label: 'Logs', icon: FolderIcon },
  ]

  const ACTIONS = [
    { value: 'create', label: 'Create', color: 'bg-green-100 text-green-700' },
    { value: 'read', label: 'Read', color: 'bg-blue-100 text-blue-700' },
    { value: 'update', label: 'Update', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'delete', label: 'Delete', color: 'bg-red-100 text-red-700' },
    { value: 'manage', label: 'Manage', color: 'bg-purple-100 text-purple-700' },
    { value: 'assign', label: 'Assign', color: 'bg-indigo-100 text-indigo-700' },
    { value: 'revoke', label: 'Revoke', color: 'bg-orange-100 text-orange-700' },
  ]

  useEffect(() => {
    loadPermissions()
  }, [currentTenant])

  const loadPermissions = async () => {
    try {
      setLoading(true)
      const permissionsData = await permissionService.getPermissions({
        tenantId: currentTenant?.id
      })
      setPermissions(permissionsData)
    } catch (error) {
      console.error('Error loading permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPermissions = permissions.filter(permission =>
    permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permission.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permission.action.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreatePermission = async () => {
    try {
      await permissionService.createPermission({
        ...formData
        // REMOVED: tenantId not in Permission schema
      })
      setIsCreateDialogOpen(false)
      resetForm()
      loadPermissions()
    } catch (error) {
      console.error('Error creating permission:', error)
    }
  }

  const handleUpdatePermission = async () => {
    if (!editingPermission) return

    try {
      await permissionService.updatePermission(editingPermission.id, {
        ...formData
        // REMOVED: tenantId not in Permission schema
      })
      setEditingPermission(null)
      resetForm()
      loadPermissions()
    } catch (error) {
      console.error('Error updating permission:', error)
    }
  }

  const handleDeletePermission = async (permissionId: string) => {
    if (!confirm('Are you sure you want to delete this permission?')) return

    try {
      await permissionService.deletePermission(permissionId)
      loadPermissions()
    } catch (error) {
      console.error('Error deleting permission:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      resource: '',
      action: '',
      scope: 'OWN'
      // REMOVED: isActive field not in Permission type
    })
    setSelectedResource('')
  }

  const startEdit = (permission: Permission) => {
    setEditingPermission(permission)
    setFormData({
      name: permission.name,
      description: permission.description || '',
      resource: permission.resource,
      action: permission.action,
      scope: permission.scope
      // REMOVED: isActive field not in Permission type
    })
  }

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'ALL': return 'bg-red-100 text-red-700 border-red-200'
      case 'TENANT': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'OWN': return 'bg-green-100 text-green-700 border-green-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getActionColor = (action: string) => {
    const actionConfig = ACTIONS.find(a => a.value === action)
    return actionConfig?.color || 'bg-gray-100 text-gray-700'
  }

  const getIconForResource = (resource: string) => {
    const resourceConfig = RESOURCES.find(r => r.value === resource)
    const Icon = resourceConfig?.icon || KeyIcon
    return Icon
  }

  const groupedPermissions = RESOURCES.map(resource => ({
    resource,
    permissions: filteredPermissions.filter(p => p.resource === resource.value)
  }))

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <KeyIcon className="w-6 h-6 text-green-600" />
            Permission Management
          </h2>
          <p className="text-gray-600 mt-1">Manage granular permissions for resources and actions</p>
        </div>

        {hasFullAccess && (
          <Dialog open={isCreateDialogOpen || !!editingPermission} onOpenChange={(open) => {
            if (!open) {
              setIsCreateDialogOpen(false)
              setEditingPermission(null)
              resetForm()
            }
          }}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <PlusIcon className="w-4 h-4" />
                Create Permission
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingPermission ? 'Edit Permission' : 'Create New Permission'}
                </DialogTitle>
                <DialogDescription>
                  {editingPermission
                    ? 'Update the permission details and access scope.'
                    : 'Create a new permission for specific resource and action combinations.'
                  }
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="resource">Resource</Label>
                  <Select
                    value={selectedResource}
                    onValueChange={(value) => {
                      setSelectedResource(value)
                      const permissionName = `${value}_${formData.action}`
                      setFormData({
                        ...formData,
                        resource: value,
                        name: formData.action ? permissionName : ''
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a resource" />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOURCES.map((resource) => (
                        <SelectItem key={resource.value} value={resource.value}>
                          <div className="flex items-center gap-2">
                            <resource.icon className="w-4 h-4" />
                            {resource.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="action">Action</Label>
                  <Select
                    value={formData.action}
                    onValueChange={(value) => {
                      const permissionName = `${selectedResource || 'resource'}_${value}`
                      setFormData({
                        ...formData,
                        action: value,
                        name: selectedResource ? permissionName : ''
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an action" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIONS.map((action) => (
                        <SelectItem key={action.value} value={action.value}>
                          {action.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="name">Permission Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., users_create"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this permission allows..."
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="scope">Scope</Label>
                  <Select
                    value={formData.scope}
                    onValueChange={(value: 'ALL' | 'TENANT' | 'OWN') =>
                      setFormData({ ...formData, scope: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OWN">Own Resources Only</SelectItem>
                      <SelectItem value="TENANT">Tenant Resources</SelectItem>
                      <SelectItem value="ALL">All Resources (System Admin)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* REMOVED: isActive checkbox - field not in Permission type */}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsCreateDialogOpen(false)
                  setEditingPermission(null)
                  resetForm()
                }}>
                  Cancel
                </Button>
                <Button onClick={editingPermission ? handleUpdatePermission : handleCreatePermission}>
                  {editingPermission ? 'Update Permission' : 'Create Permission'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search permissions by name, resource, or action..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Permission Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <KeyIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Permissions</p>
                <p className="text-2xl font-bold text-gray-900">{permissions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircleIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">
                  {permissions.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ShieldCheckIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Resources</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(permissions.map(p => p.resource)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <LockClosedIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">System Scope</p>
                <p className="text-2xl font-bold text-gray-900">
                  {permissions.filter(p => p.scope === 'ALL').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Permissions List Grouped by Resource */}
      <div className="space-y-6">
        {groupedPermissions.map(({ resource, permissions: resourcePermissions }) => (
          <Card key={resource.value} className="shadow-sm border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <resource.icon className="w-5 h-5 text-gray-600" />
                {resource.label} Permissions
                <Badge variant="outline" className="ml-2">
                  {resourcePermissions.length}
                </Badge>
              </CardTitle>
              <CardDescription>
                Manage access permissions for {resource.label.toLowerCase()} resources
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-0">
              {resourcePermissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <KeyIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No permissions found for {resource.label.toLowerCase()}</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {resourcePermissions.map((permission) => {
                    const ActionIcon = getIconForResource(permission.resource)
                    return (
                      <div
                        key={permission.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg border">
                            <ActionIcon className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900">{permission.name}</h4>
                              <Badge className={getActionColor(permission.action)} variant="secondary">
                                {permission.action}
                              </Badge>
                              <Badge className={getScopeColor(permission.scope)}>
                                {permission.scope}
                              </Badge>
                              {/* REMOVED: Inactive badge - isActive field not in Permission type */}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>{permission.resource}:{permission.action}</span>
                              {permission.description && (
                                <span>• {permission.description}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {hasFullAccess && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(permission)}
                            >
                              <PencilIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePermission(permission.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPermissions.length === 0 && (
        <div className="text-center py-12">
          <KeyIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No permissions found</p>
          <p className="text-gray-500 text-sm mt-1">
            {searchTerm ? 'Try a different search term' : 'Create your first permission to get started'}
          </p>
        </div>
      )}
    </div>
  )
}