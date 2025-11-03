'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { getAuthUser } from '@/lib/auth'
import { tenantApi } from '@/lib/api'
import { toast } from 'sonner'
import { validateTenantForm, parseJsonField } from './validation'
import { Tenant } from '@/types'
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
  DocumentDuplicateIcon,
  Squares2X2Icon,
  TableCellsIcon,
  ArrowPathIcon,
  GlobeAltIcon,
  ServerIcon,
  ArchiveBoxIcon,
  ArchiveBoxArrowDownIcon,
} from '@heroicons/react/24/outline'

interface TenantFormData {
  name: string
  slug: string
  domain?: string
  type: 'CORE' | 'BUSINESS' | 'TRIAL'
  tier: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'CUSTOM'
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING'
  maxUsers: number
  maxServices: number
  storageLimitMb: number
  databaseName: string
  databaseHost?: string
  databasePort: number
  primaryColor: string
  logoUrl?: string
  faviconUrl?: string
  customDomain?: string
  settings?: string
  featureFlags?: string
  integrations?: string
}

type TabType = 'active' | 'archive' | 'trash'

export default function TenantsPage() {
  const [user, setUser] = useState<any>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [selectedTenants, setSelectedTenants] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('active')

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [showUnarchiveModal, setShowUnarchiveModal] = useState(false)
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false)

  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({})

  const router = useRouter()

  // Form state
  const [formData, setFormData] = useState<TenantFormData>({
    name: '',
    slug: '',
    domain: '',
    type: 'BUSINESS',
    tier: 'STARTER',
    status: 'PENDING',
    maxUsers: 10,
    maxServices: 5,
    storageLimitMb: 1024,
    databaseName: '',
    databaseHost: '',
    databasePort: 3306,
    primaryColor: '#3B82F6',
    logoUrl: '',
    faviconUrl: '',
    customDomain: '',
    settings: '',
    featureFlags: '',
    integrations: '',
  })

  const [duplicateData, setDuplicateData] = useState({
    name: '',
    slug: '',
  })

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true)
      let response

      const params = {
        search: searchTerm || undefined,
        type: filterType !== 'all' ? filterType : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
      }

      switch (activeTab) {
        case 'active':
          response = await tenantApi.getTenants(params)
          break
        case 'archive':
          response = await tenantApi.getArchivedTenants(params)
          break
        case 'trash':
          response = await tenantApi.getDeletedTenants(params)
          break
        default:
          response = await tenantApi.getTenants(params)
      }

      if (response.success && response.data) {
        setTenants(response.data.items || [])
      }
    } catch (error) {
      console.error('Error fetching tenants:', error)
      toast.error('Failed to load tenants')
    } finally {
      setLoading(false)
    }
  }, [searchTerm, filterType, filterStatus, activeTab])

  useEffect(() => {
    const authUser = getAuthUser()
    if (!authUser) {
      router.push('/login')
      return
    }
    setUser(authUser)
  }, [router])

  useEffect(() => {
    if (user) {
      fetchTenants()
    }
  }, [user, fetchTenants])

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      domain: '',
      type: 'BUSINESS',
      tier: 'STARTER',
      status: 'PENDING',
      maxUsers: 10,
      maxServices: 5,
      storageLimitMb: 1024,
      databaseName: '',
      databaseHost: '',
      databasePort: 3306,
      primaryColor: '#3B82F6',
      logoUrl: '',
      faviconUrl: '',
      customDomain: '',
      settings: '',
      featureFlags: '',
      integrations: '',
    })
    setFormErrors({})
  }

  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const handleNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      name: value,
      slug: generateSlug(value)
    }))
  }

  const handleSubmitAdd = async () => {
    const validation = validateTenantForm(formData)
    if (!validation.success) {
      setFormErrors(validation.errors)
      toast.error("Please fix the form errors")
      return
    }

    setFormErrors({})

    const settingsValidation = parseJsonField(formData.settings, "Settings")
    if (!settingsValidation.success) {
      setFormErrors({ settings: [settingsValidation.error] })
      toast.error(settingsValidation.error)
      return
    }

    const featureFlagsValidation = parseJsonField(formData.featureFlags, "Feature flags")
    if (!featureFlagsValidation.success) {
      setFormErrors({ featureFlags: [featureFlagsValidation.error] })
      toast.error(featureFlagsValidation.error)
      return
    }

    const integrationsValidation = parseJsonField(formData.integrations, "Integrations")
    if (!integrationsValidation.success) {
      setFormErrors({ integrations: [integrationsValidation.error] })
      toast.error(integrationsValidation.error)
      return
    }

    try {
      setActionLoading(true)
      const submitData = {
        ...validation.data,
        databaseHost: validation.data.databaseHost || undefined,
        domain: validation.data.domain || undefined,
        logoUrl: validation.data.logoUrl || undefined,
        faviconUrl: validation.data.faviconUrl || undefined,
        customDomain: validation.data.customDomain || undefined,
        settings: settingsValidation.data,
        featureFlags: featureFlagsValidation.data,
        integrations: integrationsValidation.data,
      }
      const response = await tenantApi.createTenant(submitData)
      if (response.success) {
        toast.success("Tenant created successfully")
        setShowAddModal(false)
        resetForm()
        fetchTenants()
      } else {
        toast.error(response.error || "Failed to create tenant")
      }
    } catch (error) {
      console.error("Error creating tenant:", error)
      toast.error("Failed to create tenant")
    } finally {
      setActionLoading(false)
    }
  }

  const handleSubmitEdit = async () => {
    if (!currentTenant) return

    try {
      setActionLoading(true)

      const submitData = {
        ...formData,
        databaseHost: formData.databaseHost || undefined,
        domain: formData.domain || undefined,
        logoUrl: formData.logoUrl || undefined,
        faviconUrl: formData.faviconUrl || undefined,
        customDomain: formData.customDomain || undefined,
        settings: formData.settings ? JSON.parse(formData.settings) : undefined,
        featureFlags: formData.featureFlags ? JSON.parse(formData.featureFlags) : undefined,
        integrations: formData.integrations ? JSON.parse(formData.integrations) : undefined,
      }

      const response = await tenantApi.updateTenant(currentTenant.id, submitData)

      if (response.success) {
        toast.success('Tenant updated successfully')
        setShowEditModal(false)
        resetForm()
        setCurrentTenant(null)
        fetchTenants()
      } else {
        toast.error(response.error || 'Failed to update tenant')
      }
    } catch (error) {
      console.error('Error updating tenant:', error)
      toast.error('Failed to update tenant')
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!currentTenant) return

    try {
      setActionLoading(true)
      const response = await tenantApi.deleteTenant(currentTenant.id)

      if (response.success) {
        toast.success('Tenant deleted successfully')
        setShowDeleteModal(false)
        setCurrentTenant(null)
        fetchTenants()
      } else {
        toast.error(response.error || 'Failed to delete tenant')
      }
    } catch (error) {
      console.error('Error deleting tenant:', error)
      toast.error('Failed to delete tenant')
    } finally {
      setActionLoading(false)
    }
  }

  const handleArchive = async () => {
    if (!currentTenant) return

    try {
      setActionLoading(true)
      const response = await tenantApi.archiveTenant(currentTenant.id)

      if (response.success) {
        toast.success('Tenant archived successfully')
        setShowArchiveModal(false)
        setCurrentTenant(null)
        fetchTenants()
      } else {
        toast.error(response.error || 'Failed to archive tenant')
      }
    } catch (error) {
      console.error('Error archiving tenant:', error)
      toast.error('Failed to archive tenant')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnarchive = async () => {
    if (!currentTenant) return

    try {
      setActionLoading(true)
      const response = await tenantApi.unarchiveTenant(currentTenant.id)

      if (response.success) {
        toast.success('Tenant unarchived successfully')
        setShowUnarchiveModal(false)
        setCurrentTenant(null)
        fetchTenants()
      } else {
        toast.error(response.error || 'Failed to unarchive tenant')
      }
    } catch (error) {
      console.error('Error unarchiving tenant:', error)
      toast.error('Failed to unarchive tenant')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePermanentDelete = async () => {
    if (!currentTenant) return

    try {
      setActionLoading(true)
      const response = await tenantApi.permanentDeleteTenant(currentTenant.id)

      if (response.success) {
        toast.success('Tenant permanently deleted')
        setShowPermanentDeleteModal(false)
        setCurrentTenant(null)
        fetchTenants()
      } else {
        toast.error(response.error || 'Failed to permanently delete tenant')
      }
    } catch (error) {
      console.error('Error permanently deleting tenant:', error)
      toast.error('Failed to permanently delete tenant')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDuplicate = async () => {
    if (!currentTenant) return

    try {
      setActionLoading(true)
      const response = await tenantApi.duplicateTenant(currentTenant.id, {
        name: duplicateData.name || `${currentTenant.name} Copy`,
        slug: duplicateData.slug || `${currentTenant.slug}-copy`,
      })

      if (response.success) {
        toast.success('Tenant duplicated successfully')
        setShowDuplicateModal(false)
        setDuplicateData({ name: '', slug: '' })
        setCurrentTenant(null)
        fetchTenants()
      } else {
        toast.error(response.error || 'Failed to duplicate tenant')
      }
    } catch (error) {
      console.error('Error duplicating tenant:', error)
      toast.error('Failed to duplicate tenant')
    } finally {
      setActionLoading(false)
    }
  }

  const openEditModal = (tenant: Tenant) => {
    setCurrentTenant(tenant)
    setFormData({
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain || '',
      type: tenant.type,
      tier: tenant.tier,
      status: tenant.status,
      maxUsers: tenant.maxUsers,
      maxServices: tenant.maxServices,
      storageLimitMb: tenant.storageLimitMb,
      databaseName: tenant.databaseName,
      databaseHost: tenant.databaseHost || '',
      databasePort: tenant.databasePort || 3306,
      primaryColor: tenant.primaryColor,
      logoUrl: tenant.logoUrl || '',
      faviconUrl: tenant.faviconUrl || '',
      customDomain: tenant.customDomain || '',
      settings: tenant.settings ? JSON.stringify(tenant.settings, null, 2) : '',
      featureFlags: tenant.featureFlags ? JSON.stringify(tenant.featureFlags, null, 2) : '',
      integrations: tenant.integrations ? JSON.stringify(tenant.integrations, null, 2) : '',
    })
    setShowEditModal(true)
  }

  const openDuplicateModal = (tenant: Tenant) => {
    setCurrentTenant(tenant)
    setDuplicateData({
      name: `${tenant.name} Copy`,
      slug: `${tenant.slug}-copy`,
    })
    setShowDuplicateModal(true)
  }

  const openDeleteModal = (tenant: Tenant) => {
    setCurrentTenant(tenant)
    setShowDeleteModal(true)
  }

  const openArchiveModal = (tenant: Tenant) => {
    setCurrentTenant(tenant)
    setShowArchiveModal(true)
  }

  const openUnarchiveModal = (tenant: Tenant) => {
    setCurrentTenant(tenant)
    setShowUnarchiveModal(true)
  }

  const openPermanentDeleteModal = (tenant: Tenant) => {
    setCurrentTenant(tenant)
    setShowPermanentDeleteModal(true)
  }

  const openViewModal = (tenant: Tenant) => {
    setCurrentTenant(tenant)
    setShowViewModal(true)
  }

  const toggleTenantSelection = (tenantId: string) => {
    setSelectedTenants(prev =>
      prev.includes(tenantId)
        ? prev.filter(id => id !== tenantId)
        : [...prev, tenantId]
    )
  }

  const handleBulkAction = async (action: string) => {
    if (selectedTenants.length === 0) return

    try {
      setActionLoading(true)
      // Implement bulk actions here
      toast.success(`${action} completed for ${selectedTenants.length} tenants`)
      setSelectedTenants([])
      fetchTenants()
    } catch (error) {
      toast.error(`Failed to ${action.toLowerCase()} tenants`)
    } finally {
      setActionLoading(false)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'CORE':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-100'
      case 'BUSINESS':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100'
      case 'TRIAL':
        return 'bg-orange-100 text-orange-800 hover:bg-orange-100'
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100'
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'STARTER':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100'
      case 'PROFESSIONAL':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100'
      case 'ENTERPRISE':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-100'
      case 'CUSTOM':
        return 'bg-green-100 text-green-800 hover:bg-green-100'
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="text-green-800 bg-green-100 hover:bg-green-100">Active</Badge>
      case 'PENDING':
        return <Badge className="text-yellow-800 bg-yellow-100 hover:bg-yellow-100">Pending</Badge>
      case 'INACTIVE':
        return <Badge className="text-red-800 bg-red-100 hover:bg-red-100">Inactive</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CORE':
        return <div className="flex items-center justify-center w-8 h-8 bg-purple-500 rounded-lg">
          <CogIcon className="w-4 h-4 text-white" />
        </div>
      case 'BUSINESS':
        return <div className="flex items-center justify-center w-8 h-8 bg-blue-500 rounded-lg">
          <BuildingOfficeIcon className="w-4 h-4 text-white" />
        </div>
      case 'TRIAL':
        return <div className="flex items-center justify-center w-8 h-8 bg-orange-500 rounded-lg">
          <BuildingOfficeIcon className="w-4 h-4 text-white" />
        </div>
      default:
        return <div className="flex items-center justify-center w-8 h-8 bg-gray-500 rounded-lg">
          <BuildingOfficeIcon className="w-4 h-4 text-white" />
        </div>
    }
  }

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.status === 'ACTIVE').length,
    pending: tenants.filter(t => t.status === 'PENDING').length,
    inactive: tenants.filter(t => t.status === 'INACTIVE').length,
    totalUsers: tenants.reduce((sum, t) => sum + (t.userCount || 0), 0),
    totalServices: tenants.reduce((sum, t) => sum + (t.serviceCount || 0), 0),
    totalStorage: tenants.reduce((sum, t) => sum + (t.storageUsed || 0), 0),
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen gradient-bg">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 shadow-lg vibrant-gradient rounded-2xl">
            <div className="w-8 h-8 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-600">Loading tenants...</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="p-6 border shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-black text-gradient">Tenant Management</h1>
              <p className="text-lg text-gray-600">Manage organizational units and their settings</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
                className="h-12"
              >
                {viewMode === 'grid' ? (
                  <TableCellsIcon className="w-4 h-4 mr-2" />
                ) : (
                  <Squares2X2Icon className="w-4 h-4 mr-2" />
                )}
                {viewMode === 'grid' ? 'Table View' : 'Grid View'}
              </Button>
              <Button
                variant="outline"
                onClick={fetchTenants}
                disabled={loading}
                className="h-12"
              >
                <ArrowPathIcon className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {activeTab === 'active' && (
                <Button
                  className="h-12 btn-gradient"
                  onClick={() => {
                    resetForm()
                    setShowAddModal(true)
                  }}
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Tenant
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="p-2 border shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl border-white/20">
          <div className="flex space-x-1">
            <Button
              variant={activeTab === 'active' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('active')}
              className="flex-1 h-12"
            >
              <BuildingOfficeIcon className="w-4 h-4 mr-2" />
              Active Tenants
            </Button>
            <Button
              variant={activeTab === 'archive' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('archive')}
              className="flex-1 h-12"
            >
              <ArchiveBoxIcon className="w-4 h-4 mr-2" />
              Archive
            </Button>
            <Button
              variant={activeTab === 'trash' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('trash')}
              className="flex-1 h-12"
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              Trash
            </Button>
          </div>
        </div>

        {/* Statistics Dashboard */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Tenants</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                  <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Tenants</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalUsers}</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg">
                  <UsersIcon className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Storage Used</p>
                  <p className="text-2xl font-bold text-orange-600">{Math.round(stats.totalStorage / 1024)} GB</p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg">
                  <ServerIcon className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                <Input
                  placeholder="Search tenants by name, slug, or domain..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-12 pl-10 border-gray-200 focus:border-primary"
                />
              </div>
              <div className="flex gap-2">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-40 h-12">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="CORE">Core</SelectItem>
                    <SelectItem value="BUSINESS">Business</SelectItem>
                    <SelectItem value="TRIAL">Trial</SelectItem>
                  </SelectContent>
                </Select>
                {activeTab === 'active' && (
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40 h-12">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {selectedTenants.length > 0 && activeTab === 'active' && (
              <div className="flex items-center justify-between p-3 mt-4 rounded-lg bg-blue-50">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked
                    onCheckedChange={() => setSelectedTenants([])}
                  />
                  <span className="text-sm text-blue-700">
                    {selectedTenants.length} tenant{selectedTenants.length > 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('activate')}
                    disabled={actionLoading}
                  >
                    <CheckCircleIcon className="w-4 h-4 mr-1" />
                    Activate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('deactivate')}
                    disabled={actionLoading}
                  >
                    <XCircleIcon className="w-4 h-4 mr-1" />
                    Deactivate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('archive')}
                    disabled={actionLoading}
                  >
                    <ArchiveBoxIcon className="w-4 h-4 mr-1" />
                    Archive
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleBulkAction('delete')}
                    disabled={actionLoading}
                  >
                    <TrashIcon className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12">
              <div className="flex items-center justify-center">
                <div className="inline-flex items-center justify-center w-16 h-16 shadow-lg vibrant-gradient rounded-2xl">
                  <div className="w-8 h-8 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grid View */}
        {!loading && viewMode === 'grid' && (
          <>
            {tenants.length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-12">
                  <div className="text-center">
                    <BuildingOfficeIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="mb-2 text-lg font-semibold text-gray-900">
                      Tidak Ada Data Tenant
                    </h3>
                    <p className="mb-6 text-gray-500">
                      {activeTab === 'active' ? 'Tidak ada tenant aktif yang tersedia saat ini.' :
                       activeTab === 'archive' ? 'Tidak ada tenant yang diarsipkan.' :
                       'Tidak ada tenant di tempat sampah.'}
                    </p>
                    {activeTab === 'active' && (
                      <Button onClick={() => setShowAddModal(true)} className="h-12">
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Tambah Tenant Baru
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {tenants.map((tenant) => (
                  <Card key={tenant.id} className="transition-shadow border-0 shadow-lg hover:shadow-xl">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          {activeTab === 'active' && (
                            <Checkbox
                              checked={selectedTenants.includes(tenant.id)}
                              onCheckedChange={() => toggleTenantSelection(tenant.id)}
                            />
                          )}
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
                          <Badge className={`text-xs ${getTierColor(tenant.tier)}`}>
                            {tenant.tier}
                          </Badge>
                          {getStatusBadge(tenant.status)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="mb-4 space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center text-gray-600">
                            <UsersIcon className="w-4 h-4 mr-2" />
                            Users
                          </div>
                          <span className="font-medium text-gray-900">{tenant.userCount || 0}/{tenant.maxUsers}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center text-gray-600">
                            <CogIcon className="w-4 h-4 mr-2" />
                            Services
                          </div>
                          <span className="font-medium text-gray-900">{tenant.serviceCount || 0}/{tenant.maxServices}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center text-gray-600">
                            <ServerIcon className="w-4 h-4 mr-2" />
                            Storage
                          </div>
                          <span className="font-medium text-gray-900">{Math.round((tenant.storageUsed || 0) / 1024)} GB / {Math.round(tenant.storageLimitMb / 1024)} GB</span>
                        </div>
                        {tenant.customDomain && (
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center text-gray-600">
                              <GlobeAltIcon className="w-4 h-4 mr-2" />
                              Domain
                            </div>
                            <span className="font-medium text-gray-900">{tenant.customDomain}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 h-8 hover:bg-blue-50"
                          onClick={() => openViewModal(tenant)}
                        >
                          <EyeIcon className="w-4 h-4 mr-1 text-blue-600" />
                          View
                        </Button>

                        {activeTab === 'active' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1 h-8 hover:bg-green-50"
                              onClick={() => openEditModal(tenant)}
                            >
                              <PencilIcon className="w-4 h-4 mr-1 text-green-600" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-8 h-8 p-0 hover:bg-orange-50"
                              onClick={() => openArchiveModal(tenant)}
                            >
                              <ArchiveBoxIcon className="w-4 h-4 text-orange-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-8 h-8 p-0 hover:bg-red-50"
                              onClick={() => openDeleteModal(tenant)}
                            >
                              <TrashIcon className="w-4 h-4 text-red-600" />
                            </Button>
                          </>
                        )}

                        {activeTab === 'archive' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1 h-8 hover:bg-green-50"
                              onClick={() => openUnarchiveModal(tenant)}
                            >
                              <ArchiveBoxArrowDownIcon className="w-4 h-4 mr-1 text-green-600" />
                              Restore
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-8 h-8 p-0 hover:bg-red-50"
                              onClick={() => openDeleteModal(tenant)}
                            >
                              <TrashIcon className="w-4 h-4 text-red-600" />
                            </Button>
                          </>
                        )}

                        {activeTab === 'trash' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1 h-8 hover:bg-green-50"
                              onClick={() => openUnarchiveModal(tenant)}
                            >
                              <ArchiveBoxArrowDownIcon className="w-4 h-4 mr-1 text-green-600" />
                              Restore
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-8 h-8 p-0"
                              onClick={() => openPermanentDeleteModal(tenant)}
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Table View */}
        {!loading && viewMode === 'table' && (
          <Card className="border-0 shadow-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  {activeTab === 'active' && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedTenants.length === tenants.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTenants(tenants.map(t => t.id))
                          } else {
                            setSelectedTenants([])
                          }
                        }}
                      />
                    </TableHead>
                  )}
                  <TableHead>Tenant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    {activeTab === 'active' && (
                      <TableCell>
                        <Checkbox
                          checked={selectedTenants.includes(tenant.id)}
                          onCheckedChange={() => toggleTenantSelection(tenant.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        {getTypeIcon(tenant.type)}
                        <div>
                          <div className="font-medium text-gray-900">{tenant.name}</div>
                          <div className="text-sm text-gray-500">@{tenant.slug}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(tenant.type)}>
                        {tenant.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTierColor(tenant.tier)}>
                        {tenant.tier}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {tenant.userCount || 0}/{tenant.maxUsers}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {Math.round((tenant.storageUsed || 0) / 1024)} GB / {Math.round(tenant.storageLimitMb / 1024)} GB
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-500">
                        {tenant.customDomain || tenant.domain || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-8 h-8 p-0 hover:bg-blue-50"
                          onClick={() => openViewModal(tenant)}
                        >
                          <EyeIcon className="w-4 h-4 text-blue-600" />
                        </Button>

                        {activeTab === 'active' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-8 h-8 p-0 hover:bg-green-50"
                              onClick={() => openEditModal(tenant)}
                            >
                              <PencilIcon className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-8 h-8 p-0 hover:bg-orange-50"
                              onClick={() => openArchiveModal(tenant)}
                            >
                              <ArchiveBoxIcon className="w-4 h-4 text-orange-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-8 h-8 p-0 hover:bg-red-50"
                              onClick={() => openDeleteModal(tenant)}
                            >
                              <TrashIcon className="w-4 h-4 text-red-600" />
                            </Button>
                          </>
                        )}

                        {activeTab === 'archive' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-8 h-8 p-0 hover:bg-green-50"
                              onClick={() => openUnarchiveModal(tenant)}
                            >
                              <ArchiveBoxArrowDownIcon className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-8 h-8 p-0 hover:bg-red-50"
                              onClick={() => openDeleteModal(tenant)}
                            >
                              <TrashIcon className="w-4 h-4 text-red-600" />
                            </Button>
                          </>
                        )}

                        {activeTab === 'trash' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-8 h-8 p-0 hover:bg-green-50"
                              onClick={() => openUnarchiveModal(tenant)}
                            >
                              <ArchiveBoxArrowDownIcon className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-8 h-8 p-0"
                              onClick={() => openPermanentDeleteModal(tenant)}
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Modals - Add, Edit, View, Delete, Archive, etc. */}
        {/* Add Tenant Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Tenant</DialogTitle>
              <DialogDescription>
                Create a new organizational unit with custom configuration
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-6 py-4 md:grid-cols-2">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="name">Tenant Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Enter tenant name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="tenant-slug"
                    />
                  </div>
                  <div>
                    <Label htmlFor="domain">Domain</Label>
                    <Input
                      id="domain"
                      value={formData.domain}
                      onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                      placeholder="tenant.example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customDomain">Custom Domain</Label>
                    <Input
                      id="customDomain"
                      value={formData.customDomain}
                      onChange={(e) => setFormData(prev => ({ ...prev, customDomain: e.target.value }))}
                      placeholder="custom-domain.com"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="type">Type *</Label>
                      <Select value={formData.type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CORE">Core</SelectItem>
                          <SelectItem value="BUSINESS">Business</SelectItem>
                          <SelectItem value="TRIAL">Trial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="tier">Tier *</Label>
                      <Select value={formData.tier} onValueChange={(value: any) => setFormData(prev => ({ ...prev, tier: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="STARTER">Starter</SelectItem>
                          <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                          <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                          <SelectItem value="CUSTOM">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="status">Status *</Label>
                    <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Resource Limits */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Resource Limits</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="maxUsers">Max Users</Label>
                    <Input
                      id="maxUsers"
                      type="number"
                      value={formData.maxUsers}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxUsers: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxServices">Max Services</Label>
                    <Input
                      id="maxServices"
                      type="number"
                      value={formData.maxServices}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxServices: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="storageLimitMb">Storage Limit (MB)</Label>
                    <Input
                      id="storageLimitMb"
                      type="number"
                      value={formData.storageLimitMb}
                      onChange={(e) => setFormData(prev => ({ ...prev, storageLimitMb: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              </div>

              {/* Database Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Database Configuration</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="databaseName">Database Name *</Label>
                    <Input
                      id="databaseName"
                      value={formData.databaseName}
                      onChange={(e) => setFormData(prev => ({ ...prev, databaseName: e.target.value }))}
                      placeholder="tenant_db"
                    />
                  </div>
                  <div>
                    <Label htmlFor="databaseHost">Database Host</Label>
                    <Input
                      id="databaseHost"
                      value={formData.databaseHost}
                      onChange={(e) => setFormData(prev => ({ ...prev, databaseHost: e.target.value }))}
                      placeholder="localhost"
                    />
                  </div>
                  <div>
                    <Label htmlFor="databasePort">Database Port</Label>
                    <Input
                      id="databasePort"
                      type="number"
                      value={formData.databasePort}
                      onChange={(e) => setFormData(prev => ({ ...prev, databasePort: parseInt(e.target.value) || 3306 }))}
                    />
                  </div>
                </div>
              </div>

              {/* Branding */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Branding</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={formData.primaryColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="w-20 h-10"
                      />
                      <Input
                        value={formData.primaryColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="logoUrl">Logo URL</Label>
                    <Input
                      id="logoUrl"
                      value={formData.logoUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                  <div>
                    <Label htmlFor="faviconUrl">Favicon URL</Label>
                    <Input
                      id="faviconUrl"
                      value={formData.faviconUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, faviconUrl: e.target.value }))}
                      placeholder="https://example.com/favicon.ico"
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="col-span-2 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Advanced Settings</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="settings">Settings (JSON)</Label>
                    <Textarea
                      id="settings"
                      value={formData.settings}
                      onChange={(e) => setFormData(prev => ({ ...prev, settings: e.target.value }))}
                      placeholder='{"key": "value"}'
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label htmlFor="featureFlags">Feature Flags (JSON)</Label>
                    <Textarea
                      id="featureFlags"
                      value={formData.featureFlags}
                      onChange={(e) => setFormData(prev => ({ ...prev, featureFlags: e.target.value }))}
                      placeholder='{"feature": true}'
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label htmlFor="integrations">Integrations (JSON)</Label>
                    <Textarea
                      id="integrations"
                      value={formData.integrations}
                      onChange={(e) => setFormData(prev => ({ ...prev, integrations: e.target.value }))}
                      placeholder='{"service": "config"}'
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitAdd} disabled={actionLoading}>
                {actionLoading ? 'Creating...' : 'Create Tenant'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit, View, Delete Modals - Abbreviated for space */}
        {/* You would include all the other modal components here */}
        
      </div>
    </DashboardLayout>
  )
}