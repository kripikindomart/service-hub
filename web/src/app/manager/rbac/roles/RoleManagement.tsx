'use client'

import { useState, useEffect } from 'react'
import { roleService } from '@/services/role.service'
import { tenantService, type Tenant } from '@/services/tenant.service'
import { Role } from '@/types'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ShieldCheckIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  ArchiveBoxIcon,
  MinusCircleIcon,
  InformationCircleIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  SparklesIcon,
  DocumentDuplicateIcon,
  PowerIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface CreateRoleData {
  name: string
  displayName: string
  description: string
  type: 'SYSTEM' | 'TENANT' | 'CUSTOM'
  level: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER' | 'GUEST'
  tenantId?: string
  isActive: boolean
}

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText: string
  cancelText: string
  type: 'delete' | 'restore' | 'warning'
  icon?: React.ReactNode
}

export function RoleManagement({ hasFullAccess }: { hasFullAccess?: boolean }) {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [formData, setFormData] = useState<CreateRoleData>({
    name: '',
    displayName: '',
    description: '',
    type: 'TENANT',
    level: 'USER',
    tenantId: undefined,
    isActive: true
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [isAllSelected, setIsAllSelected] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active')
  const [deletedRoles, setDeletedRoles] = useState<Role[]>([])
  const [deletedRolesLoading, setDeletedRolesLoading] = useState(false)
  const [selectedDeletedRoles, setSelectedDeletedRoles] = useState<string[]>([])
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean
    onConfirm: () => void
    title: string
    description: string
    confirmText: string
    cancelText: string
    type: 'delete' | 'restore' | 'warning'
  }>({
    isOpen: false,
    onConfirm: () => {},
    title: '',
    description: '',
    confirmText: '',
    cancelText: 'Cancel',
    type: 'warning'
  })

  // Tenant management for super admin
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loadingTenants, setLoadingTenants] = useState(false)

  // Duplicate role dialog state
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false)
  const [duplicatingRole, setDuplicatingRole] = useState<Role | null>(null)
  const [duplicateFormData, setDuplicateFormData] = useState({
    displayName: '',
    name: '',
    description: '',
    level: 'USER' as Role['level']
  })

  // Filter state for super admin
  const [filterTenantId, setFilterTenantId] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')

  const { currentTenant } = useAuthStore()

  useEffect(() => {
    loadRoles()
    if (activeTab === 'trash') {
      loadDeletedRoles()
    }
  }, [currentTenant])

  useEffect(() => {
    if (activeTab === 'trash') {
      loadDeletedRoles()
    }
  }, [activeTab])

  // Load tenants for super admin
  useEffect(() => {
    if (hasFullAccess) {
      loadTenants()
    }
  }, [hasFullAccess])

  const loadTenants = async () => {
    try {
      setLoadingTenants(true)
      const tenantsData = await tenantService.getTenants()
      setTenants(tenantsData)
    } catch (error) {
      console.error('Error loading tenants:', error)
      toast.error('Failed to load tenants')
    } finally {
      setLoadingTenants(false)
    }
  }

  const loadRoles = async () => {
    try {
      setLoading(true)
      const rolesData = await roleService.getRoles({})
      setRoles(rolesData)
    } catch (error: any) {
      console.error('Error loading roles:', error)
      setRoles([])
    } finally {
      setLoading(false)
    }
  }

  const loadDeletedRoles = async () => {
    try {
      setDeletedRolesLoading(true)
      const deletedRolesData = await roleService.getDeletedRoles({})
      setDeletedRoles(deletedRolesData)
    } catch (error: any) {
      console.error('Error loading deleted roles:', error)
      setDeletedRoles([])
    } finally {
      setDeletedRolesLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      displayName: '',
      description: '',
      type: 'TENANT',
      level: 'USER',
      tenantId: undefined,
      isActive: true
    })
  }

  const filteredRoles = roles.filter(role => {
    // Search filter
    const matchesSearch =
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description?.toLowerCase().includes(searchTerm.toLowerCase())

    // Tenant filter (only for super admin)
    const matchesTenant = !hasFullAccess || !filterTenantId || role.tenantId === filterTenantId

    // Status filter
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && role.isActive) ||
      (filterStatus === 'inactive' && !role.isActive)

    return matchesSearch && matchesTenant && matchesStatus
  })

  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRoles = filteredRoles.slice(startIndex, endIndex)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectableRoles = paginatedRoles.filter(role => role.type !== 'SYSTEM')
      setSelectedRoles(selectableRoles.map(role => role.id))
      setIsAllSelected(selectableRoles.length === paginatedRoles.filter(role => role.type !== 'SYSTEM').length)
    } else {
      setSelectedRoles([])
      setIsAllSelected(false)
    }
  }

  const handleBulkSoftDelete = () => {
    if (selectedRoles.length === 0) return

    setConfirmationDialog({
      isOpen: true,
      onConfirm: async () => {
        setConfirmationDialog(prev => ({ ...prev, isOpen: false }))
        try {
          await Promise.all(selectedRoles.map(id => roleService.deleteRole(id)))
          toast.success(`${selectedRoles.length} role(s) moved to trash`)
          setSelectedRoles([])
          loadRoles()
          loadDeletedRoles()
        } catch (error: any) {
          console.error('Error bulk soft deleting roles:', error)
          toast.error('Error deleting roles: ' + error.message)
        }
      },
      title: 'Move Roles to Trash',
      description: `Are you sure you want to move ${selectedRoles.length} role(s) to trash? You can restore them later if needed.`,
      confirmText: 'Move to Trash',
      cancelText: 'Cancel',
      type: 'warning'
    })
  }

  const handleSelectRole = (roleId: string, checked: boolean) => {
    if (checked) {
      const newSelection = [...selectedRoles, roleId]
      setSelectedRoles(newSelection)
      const selectableRoles = paginatedRoles.filter(role => role.type !== 'SYSTEM')
      setIsAllSelected(newSelection.length === selectableRoles.length)
    } else {
      const newSelection = selectedRoles.filter(id => id !== roleId)
      setSelectedRoles(newSelection)
      setIsAllSelected(false)
    }
  }

  const handleCreateRole = async () => {
    try {
      let roleData = {
        ...formData,
      }

      // Smart tenant assignment based on role type and user permissions
      if (formData.type === 'SYSTEM') {
        // System roles tidak punya tenant (global)
        roleData.tenantId = undefined
      } else if (hasFullAccess && formData.tenantId) {
        // Super admin bisa assign ke tenant tertentu
        roleData.tenantId = formData.tenantId
      } else {
        // Auto assign ke current tenant untuk user biasa
        roleData.tenantId = currentTenant?.id
      }

      const result = await roleService.createRole(roleData)
      if (result) {
        setIsCreateDialogOpen(false)
        resetForm()
        loadRoles()
        toast.success('Role created successfully')
      }
    } catch (error: any) {
      console.error('Error creating role:', error)
      toast.error('Error creating role: ' + error.message)
    }
  }

  const handleUpdateRole = async () => {
    if (!editingRole) return

    try {
      let updateData = {
        ...formData,
      }

      // Smart tenant assignment for updates
      if (formData.type === 'SYSTEM') {
        // System roles tidak punya tenant
        updateData.tenantId = undefined
      } else if (hasFullAccess && formData.tenantId) {
        // Super admin bisa assign ke tenant tertentu
        updateData.tenantId = formData.tenantId
      } else {
        // Auto assign ke current tenant untuk user biasa
        updateData.tenantId = currentTenant?.id
      }

      const result = await roleService.updateRole(editingRole.id, updateData)
      if (result) {
        setIsCreateDialogOpen(false)
        setEditingRole(null)
        resetForm()
        loadRoles()
        toast.success('Role updated successfully')
      }
    } catch (error: any) {
      console.error('Error updating role:', error)
      toast.error('Error updating role: ' + error.message)
    }
  }

  const handleDeleteRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId)
    setConfirmationDialog({
      isOpen: true,
      onConfirm: async () => {
        setConfirmationDialog(prev => ({ ...prev, isOpen: false }))
        try {
          await roleService.deleteRole(roleId)
          toast.success('Role moved to trash successfully')
          loadRoles()
          loadDeletedRoles()
        } catch (error: any) {
          console.error('Error deleting role:', error)
          toast.error('Error deleting role: ' + error.message)
        }
      },
      title: 'Move Role to Trash',
      description: `Are you sure you want to move "${role?.displayName}" to trash? The role will be inactive but can be restored later if needed.`,
      confirmText: 'Move to Trash',
      cancelText: 'Cancel',
      type: 'warning'
    })
  }

  const handleRestoreRole = async (roleId: string) => {
    try {
      const success = await roleService.restoreRole(roleId)
      if (success) {
        toast.success('Role restored successfully')
        loadDeletedRoles()
        loadRoles()
      }
    } catch (error: any) {
      console.error('Error restoring role:', error)
      toast.error('Error restoring role: ' + error.message)
    }
  }

  const handleHardDeleteRole = (roleId: string) => {
    const role = deletedRoles.find(r => r.id === roleId)
    setConfirmationDialog({
      isOpen: true,
      onConfirm: async () => {
        setConfirmationDialog(prev => ({ ...prev, isOpen: false }))
        try {
          await roleService.hardDeleteRole(roleId)
          toast.success('Role permanently deleted')
          loadDeletedRoles()
        } catch (error: any) {
          console.error('Error hard deleting role:', error)
          toast.error('Error deleting role: ' + error.message)
        }
      },
      title: 'Delete Role Permanently',
      description: `Are you sure you want to permanently delete "${role?.displayName}"? This action cannot be undone and will remove all role data from the system.`,
      confirmText: 'Delete Permanently',
      cancelText: 'Cancel',
      type: 'delete'
    })
  }

  const handleBulkHardDelete = () => {
    if (selectedDeletedRoles.length === 0) return

    setConfirmationDialog({
      isOpen: true,
      onConfirm: async () => {
        setConfirmationDialog(prev => ({ ...prev, isOpen: false }))
        try {
          await Promise.all(selectedDeletedRoles.map(id => roleService.hardDeleteRole(id)))
          toast.success(`${selectedDeletedRoles.length} role(s) permanently deleted`)
          setSelectedDeletedRoles([])
          loadDeletedRoles()
        } catch (error: any) {
          console.error('Error bulk hard deleting roles:', error)
          toast.error('Error deleting roles: ' + error.message)
        }
      },
      title: 'Delete Multiple Roles',
      description: `Are you sure you want to permanently delete ${selectedDeletedRoles.length} role(s)? This action cannot be undone and will remove all selected role data from the system.`,
      confirmText: 'Delete All',
      cancelText: 'Cancel',
      type: 'delete'
    })
  }

  const handleDuplicateRole = (role: Role) => {
    setDuplicatingRole(role)
    setDuplicateFormData({
      displayName: `${role.displayName} (Copy)`,
      name: `${role.name}_copy`,
      description: role.description ? `${role.description} (Copy)` : `Copy of ${role.displayName}`,
      level: role.level // Keep original level as default
    })
    setIsDuplicateDialogOpen(true)
  }

  const handleCreateDuplicate = async () => {
    if (!duplicatingRole) return

    try {
      const result = await roleService.duplicateRole(duplicatingRole.id, duplicateFormData)
      if (result) {
        toast.success('Role duplicated successfully')
        setIsDuplicateDialogOpen(false)
        setDuplicatingRole(null)
        setDuplicateFormData({ displayName: '', name: '', description: '', level: 'USER' })
        loadRoles()
      }
    } catch (error: any) {
      console.error('Error duplicating role:', error)
      toast.error('Error duplicating role: ' + error.message)
    }
  }

  const handleToggleRoleStatus = async (roleId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus
      const success = await roleService.toggleRoleStatus(roleId, newStatus)
      if (success) {
        toast.success(`Role ${newStatus ? 'activated' : 'deactivated'} successfully`)
        loadRoles()
      }
    } catch (error: any) {
      console.error('Error toggling role status:', error)
      toast.error('Error updating role status: ' + error.message)
    }
  }

  const handleSelectDeletedRole = (roleId: string, checked: boolean) => {
    if (checked) {
      setSelectedDeletedRoles(prev => [...prev, roleId])
    } else {
      setSelectedDeletedRoles(prev => prev.filter(id => id !== roleId))
    }
  }

  const handleSelectAllDeletedRoles = (checked: boolean) => {
    if (checked) {
      setSelectedDeletedRoles(deletedRoles.map(role => role.id))
    } else {
      setSelectedDeletedRoles([])
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'SYSTEM': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'TENANT': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'CUSTOM': return 'bg-green-100 text-green-700 border-green-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'SUPER_ADMIN': return 'bg-red-100 text-red-700 border-red-200'
      case 'ADMIN': return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'MANAGER': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'USER': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'GUEST': return 'bg-gray-100 text-gray-700 border-gray-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const startEdit = (role: Role) => {
    setEditingRole(role)
    setFormData({
      name: role.name,
      displayName: role.displayName,
      description: role.description || '',
      type: role.type,
      level: role.level,
      tenantId: role.tenantId || undefined,
      isActive: role.isActive
    })
    setIsCreateDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheckIcon className="w-6 h-6 text-blue-600" />
            Role Management
          </h2>
          <p className="text-gray-600 mt-1">Manage system and custom roles with permissions</p>
        </div>

        {hasFullAccess && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Role
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Roles</p>
                <p className="text-2xl font-bold text-gray-900">{roles.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">
                  {roles.filter(r => r.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrashIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">In Trash</p>
                <p className="text-2xl font-bold text-gray-900">{deletedRoles.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ArchiveBoxIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">System</p>
                <p className="text-2xl font-bold text-gray-900">
                  {roles.filter(r => r.type === 'SYSTEM').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Card with Tabs Inside */}
      <Card className="bg-white border-gray-200">
        <CardContent className="p-0">
          {/* Tabs */}
          <div className="flex space-x-1 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'active'
                  ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-2">
                <ShieldCheckIcon className="w-4 h-4" />
                <span>Active Roles</span>
                <Badge className={
                  activeTab === 'active'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600'
                }>
                  {roles.length}
                </Badge>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('trash')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'trash'
                  ? 'text-red-600 bg-red-50 border-b-2 border-red-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-2">
                <TrashIcon className="w-4 h-4" />
                <span>Trash</span>
                <Badge className={
                  activeTab === 'trash'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-600'
                }>
                  {deletedRoles.length}
                </Badge>
              </div>
            </button>
          </div>

          {/* Active Roles Tab */}
          {activeTab === 'active' && (
            <div className="p-6">
              <div className="space-y-6">
                {/* Bulk Actions */}
                {selectedRoles.length > 0 && hasFullAccess && (
                  <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <ShieldCheckIcon className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">
                        {selectedRoles.length} role(s) selected
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkSoftDelete()}
                        className="text-yellow-600 hover:text-yellow-700 border-yellow-300"
                      >
                        <TrashIcon className="w-4 h-4 mr-2" />
                        Move to Trash
                      </Button>
                    </div>
                  </div>
                )}

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Search */}
                  <div className="relative max-w-sm">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search roles..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Tenant Filter - Only for Super Admin */}
                  {hasFullAccess && (
                    <Select value={filterTenantId || 'all'} onValueChange={(value) => setFilterTenantId(value === 'all' ? '' : value)}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="All Tenants" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          <div className="flex items-center gap-2">
                            <BuildingOfficeIcon className="w-4 h-4 text-gray-500" />
                            All Tenants
                          </div>
                        </SelectItem>
                        {tenants
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map(tenant => (
                            <SelectItem key={tenant.id} value={tenant.id}>
                              <div className="flex items-center gap-2">
                                <BuildingOfficeIcon className="w-4 h-4 text-gray-500" />
                                <span>{tenant.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Status Filter */}
                  <Select value={filterStatus} onValueChange={(value: 'all' | 'active' | 'inactive') => setFilterStatus(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <CheckCircleIcon className="w-4 h-4 text-gray-500" />
                          All Status
                        </div>
                      </SelectItem>
                      <SelectItem value="active">
                        <div className="flex items-center gap-2">
                          <CheckCircleIcon className="w-4 h-4 text-green-500" />
                          Active
                        </div>
                      </SelectItem>
                      <SelectItem value="inactive">
                        <div className="flex items-center gap-2">
                          <XCircleIcon className="w-4 h-4 text-red-500" />
                          Inactive
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Clear Filters */}
                  {(filterTenantId || filterStatus !== 'all' || searchTerm) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFilterTenantId('')
                        setFilterStatus('all')
                        setSearchTerm('')
                        setCurrentPage(1)
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>

                {/* Roles Table */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {loading ? (
                    <div className="p-8 text-center bg-white">
                      <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading roles...</p>
                    </div>
                  ) : paginatedRoles.length === 0 ? (
                    <div className="p-8 text-center bg-white">
                      <ShieldCheckIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No roles found</h3>
                      <p className="text-gray-600">
                        {searchTerm ? 'Try adjusting your search terms.' : 'Create your first role to get started.'}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">
                              {hasFullAccess && paginatedRoles.some(role => role.type !== 'SYSTEM') && (
                                <Checkbox
                                  checked={isAllSelected}
                                  onCheckedChange={handleSelectAll}
                                />
                              )}
                            </TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Level</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Permissions</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedRoles.map((role) => (
                            <TableRow key={role.id} className="hover:bg-gray-50">
                              <TableCell>
                                {hasFullAccess && role.type !== 'SYSTEM' && (
                                  <Checkbox
                                    checked={selectedRoles.includes(role.id)}
                                    onCheckedChange={(checked: boolean) => handleSelectRole(role.id, checked)}
                                  />
                                )}
                              </TableCell>
                              <TableCell className="font-medium">{role.displayName}</TableCell>
                              <TableCell>
                                <Badge className={getTypeColor(role.type)}>
                                  {role.type}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={getLevelColor(role.level)}>
                                  {role.level}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={role.isActive ? 'default' : 'secondary'}>
                                  {role.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm text-gray-600">
                                  {role.permissions?.length || 0}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {/* Status Toggle */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleToggleRoleStatus(role.id, role.isActive)}
                                    disabled={role.type === 'SYSTEM'}
                                    className={`p-1.5 ${
                                      role.isActive
                                        ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                                    title={role.isActive ? 'Deactivate role' : 'Activate role'}
                                  >
                                    <PowerIcon className="w-4 h-4" />
                                  </Button>

                                  {/* Edit */}
                                  {hasFullAccess && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => startEdit(role)}
                                      disabled={role.type === 'SYSTEM'}
                                    >
                                      <PencilIcon className="w-3 h-3" />
                                    </Button>
                                  )}

                                  {/* Duplicate */}
                                  {hasFullAccess && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDuplicateRole(role)}
                                      disabled={role.type === 'SYSTEM'}
                                      className="text-blue-600 hover:text-blue-700"
                                      title="Duplicate role"
                                    >
                                      <DocumentDuplicateIcon className="w-3 h-3" />
                                    </Button>
                                  )}

                                  {/* Delete */}
                                  {hasFullAccess && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDeleteRole(role.id)}
                                      disabled={role.type === 'SYSTEM'}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <TrashIcon className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Trash Tab */}
          {activeTab === 'trash' && (
            <div className="p-6">
              <div className="space-y-6">
                {/* Bulk Actions */}
                {selectedDeletedRoles.length > 0 && hasFullAccess && (
                  <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrashIcon className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-medium text-red-800">
                        {selectedDeletedRoles.length} role(s) selected
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkHardDelete()}
                        className="text-red-600 hover:text-red-700 border-red-300"
                      >
                        <MinusCircleIcon className="w-4 h-4 mr-2" />
                        Delete Permanently
                      </Button>
                    </div>
                  </div>
                )}

                {deletedRolesLoading ? (
                  <div className="p-8 text-center bg-white">
                    <div className="animate-spin w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading trash...</p>
                  </div>
                ) : deletedRoles.length === 0 ? (
                  <div className="p-8 text-center bg-white">
                    <TrashIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No roles in trash</h3>
                    <p className="text-gray-600">
                      Deleted roles will appear here for restoration.
                    </p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-white">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">
                              <Checkbox
                                checked={selectedDeletedRoles.length === deletedRoles.length && deletedRoles.length > 0}
                                onCheckedChange={handleSelectAllDeletedRoles}
                              />
                            </TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Level</TableHead>
                            <TableHead>Deleted At</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {deletedRoles.map((role) => (
                            <TableRow key={role.id} className="hover:bg-gray-50">
                              <TableCell>
                                <Checkbox
                                  checked={selectedDeletedRoles.includes(role.id) || false}
                                  onCheckedChange={(checked: boolean) => handleSelectDeletedRole(role.id, checked)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{role.displayName}</TableCell>
                              <TableCell>
                                <Badge className={getTypeColor(role.type)}>
                                  {role.type}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={getLevelColor(role.level)}>
                                  {role.level}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm text-gray-600">
                                  {new Date(role.deletedAt || '').toLocaleDateString()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {hasFullAccess && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRestoreRole(role.id)}
                                        className="text-green-600 hover:text-green-700"
                                      >
                                        <ArchiveBoxIcon className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleHardDeleteRole(role.id)}
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <MinusCircleIcon className="w-3 h-3" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || !!editingRole} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false)
          setEditingRole(null)
          resetForm()
        } else {
          setIsCreateDialogOpen(true)
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? 'Edit Role' : 'Create New Role'}
            </DialogTitle>
            <DialogDescription>
              {editingRole ? 'Update the role details and permissions.' : 'Create a new role with specific permissions and access levels.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="e.g., Content Manager"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Role Name (Internal)</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., content_manager"
                disabled={!!editingRole}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the role responsibilities and access level"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Role Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'SYSTEM' | 'TENANT' | 'CUSTOM') => {
                    setFormData({ ...formData, type: value, tenantId: value === 'SYSTEM' ? '' : formData.tenantId })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hasFullAccess && (
                      <SelectItem value="SYSTEM">
                        <div className="flex items-center gap-2">
                          <GlobeAltIcon className="w-4 h-4 text-purple-600" />
                          System Role (Global)
                        </div>
                      </SelectItem>
                    )}
                    <SelectItem value="TENANT">
                      <div className="flex items-center gap-2">
                        <BuildingOfficeIcon className="w-4 h-4 text-blue-600" />
                        Tenant Role
                      </div>
                    </SelectItem>
                    <SelectItem value="CUSTOM">
                      <div className="flex items-center gap-2">
                        <ShieldCheckIcon className="w-4 h-4 text-green-600" />
                        Custom Role
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tenant Selection - Only show for non-system roles and super admin */}
              {formData.type !== 'SYSTEM' && hasFullAccess && (
                <div className="grid gap-2">
                  <Label htmlFor="tenant">Tenant Assignment</Label>
                  <Select
                    value={formData.tenantId || 'auto'}
                    onValueChange={(value) => setFormData({ ...formData, tenantId: value === 'auto' ? undefined : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tenant (auto-assigned if not selected)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">
                        <div className="flex items-center gap-2">
                          <BuildingOfficeIcon className="w-4 h-4 text-gray-500" />
                          Auto-assign to Current Tenant
                        </div>
                      </SelectItem>

                      {/* Current Tenant */}
                      {currentTenant && (
                        <SelectItem value={currentTenant.id}>
                          <div className="flex items-center gap-2">
                            <BuildingOfficeIcon className="w-4 h-4 text-blue-600" />
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{currentTenant.name}</span>
                              <span className="text-xs text-blue-600">Current Tenant</span>
                            </div>
                          </div>
                        </SelectItem>
                      )}

                      {/* Other Tenants */}
                      {tenants
                        .filter(tenant => tenant.id !== currentTenant?.id)
                        .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically
                        .map(tenant => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            <div className="flex items-center gap-2">
                              <BuildingOfficeIcon className="w-4 h-4 text-gray-600" />
                              <div className="flex flex-col items-start">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{tenant.name}</span>
                                  {tenant.type === 'SYSTEM' && (
                                    <SparklesIcon className="w-3 h-3 text-purple-500" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <Badge
                                    variant="outline"
                                    className={`text-xs px-1 py-0 ${
                                      tenant.type === 'SYSTEM'
                                        ? 'border-purple-200 text-purple-600'
                                        : tenant.type === 'BUSINESS'
                                        ? 'border-blue-200 text-blue-600'
                                        : 'border-gray-200 text-gray-600'
                                    }`}
                                  >
                                    {tenant.type}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs px-1 py-0 ${
                                      tenant.tier === 'ENTERPRISE'
                                        ? 'border-orange-200 text-orange-600'
                                        : tenant.tier === 'PRO'
                                        ? 'border-green-200 text-green-600'
                                        : 'border-gray-200 text-gray-600'
                                    }`}
                                  >
                                    {tenant.tier}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs px-1 py-0 ${
                                      tenant.status === 'ACTIVE'
                                        ? 'border-green-200 text-green-600'
                                        : 'border-red-200 text-red-600'
                                    }`}
                                  >
                                    {tenant.status}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      }

                      {/* Loading state */}
                      {loadingTenants && tenants.length === 0 && (
                        <div className="px-2 py-1 text-sm text-gray-500 text-center">
                          Loading tenants...
                        </div>
                      )}

                      {/* No tenants state */}
                      {!loadingTenants && tenants.length === 0 && (
                        <div className="px-2 py-1 text-sm text-gray-500 text-center">
                          No tenants available
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Select a specific tenant or auto-assign to your current tenant
                  </p>
                </div>
              )}

              {/* Tenant Info for non-super admin */}
              {formData.type !== 'SYSTEM' && !hasFullAccess && (
                <div className="grid gap-2">
                  <Label>Tenant Assignment</Label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                    <BuildingOfficeIcon className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">
                      {currentTenant?.name} (Auto-assigned)
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    This role will be assigned to your current tenant
                  </p>
                </div>
              )}

              {/* System Role Info */}
              {formData.type === 'SYSTEM' && (
                <div className="grid gap-2">
                  <Label>Tenant Assignment</Label>
                  <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <GlobeAltIcon className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-purple-700">
                      Global System Role (No Tenant)
                    </span>
                  </div>
                  <p className="text-xs text-purple-600">
                    System roles are global and not tied to any specific tenant
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="level">Access Level</Label>
              <Select
                value={formData.level}
                onValueChange={(value: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER' | 'GUEST') =>
                  setFormData({ ...formData, level: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GUEST">Guest</SelectItem>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  {hasFullAccess && (
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false)
              setEditingRole(null)
              resetForm()
            }}>
              Cancel
            </Button>
            <Button onClick={editingRole ? handleUpdateRole : handleCreateRole}>
              {editingRole ? 'Update Role' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmationDialog.isOpen} onOpenChange={(open) =>
        setConfirmationDialog(prev => ({ ...prev, isOpen: open }))
      }>
        <DialogContent className="sm:max-w-[425px]">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${
              confirmationDialog.type === 'delete'
                ? 'bg-red-100'
                : confirmationDialog.type === 'restore'
                ? 'bg-green-100'
                : 'bg-yellow-100'
            }`}>
              {confirmationDialog.type === 'delete' ? (
                <MinusCircleIcon className="w-6 h-6 text-red-600" />
              ) : confirmationDialog.type === 'restore' ? (
                <ArchiveBoxIcon className="w-6 h-6 text-green-600" />
              ) : (
                <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />
              )}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {confirmationDialog.title}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-gray-600">
                {confirmationDialog.description}
              </DialogDescription>
            </div>
          </div>

          <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-start gap-3">
              <InformationCircleIcon className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-900">Important:</p>
                <p className="mt-1">
                  {confirmationDialog.type === 'delete'
                    ? 'This action is permanent and cannot be undone. All associated data will be removed from the system.'
                    : 'This action will restore the role and make it active again in the system.'
                  }
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setConfirmationDialog(prev => ({ ...prev, isOpen: false }))}
            >
              {confirmationDialog.cancelText}
            </Button>
            <Button
              onClick={() => confirmationDialog.onConfirm()}
              className={
                confirmationDialog.type === 'delete'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : confirmationDialog.type === 'restore'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white'
              }
            >
              {confirmationDialog.confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Role Dialog */}
      <Dialog open={isDuplicateDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsDuplicateDialogOpen(false)
          setDuplicatingRole(null)
          setDuplicateFormData({ displayName: '', name: '', description: '', level: 'USER' })
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Duplicate Role</DialogTitle>
            <DialogDescription>
              Create a copy of "{duplicatingRole?.displayName}" with new name and description.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="duplicateDisplayName">Display Name</Label>
              <Input
                id="duplicateDisplayName"
                value={duplicateFormData.displayName}
                onChange={(e) => setDuplicateFormData({ ...duplicateFormData, displayName: e.target.value })}
                placeholder="e.g., Content Manager (Copy)"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="duplicateName">Role Name (Internal)</Label>
              <Input
                id="duplicateName"
                value={duplicateFormData.name}
                onChange={(e) => setDuplicateFormData({ ...duplicateFormData, name: e.target.value })}
                placeholder="e.g., content_manager_copy"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="duplicateDescription">Description</Label>
              <Textarea
                id="duplicateDescription"
                value={duplicateFormData.description}
                onChange={(e) => setDuplicateFormData({ ...duplicateFormData, description: e.target.value })}
                placeholder="Describe the copied role"
                rows={3}
              />
            </div>

            {/* Access Level */}
            <div className="grid gap-2">
              <Label htmlFor="duplicateLevel">Access Level</Label>
              <Select
                value={duplicateFormData.level}
                onValueChange={(value: Role['level']) => setDuplicateFormData({ ...duplicateFormData, level: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GUEST">Guest</SelectItem>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  {hasFullAccess && (
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Original Role Info */}
            {duplicatingRole && (
              <div className="p-3 bg-gray-50 rounded-lg border">
                <div className="text-sm text-gray-600">
                  <p className="font-medium text-gray-900 mb-1">Original Role:</p>
                  <div className="space-y-1">
                    <p>Name: {duplicatingRole.displayName}</p>
                    <p>Type: <Badge className={getTypeColor(duplicatingRole.type)}>{duplicatingRole.type}</Badge></p>
                    <p>Level: <Badge className={getLevelColor(duplicatingRole.level)}>{duplicatingRole.level}</Badge></p>
                    <p>Permissions: {duplicatingRole.permissions?.length || 0} permissions</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDuplicateDialogOpen(false)
              setDuplicatingRole(null)
              setDuplicateFormData({ displayName: '', name: '', description: '', level: 'USER' })
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateDuplicate}>
              Duplicate Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}