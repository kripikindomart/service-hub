import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { BuildingOfficeIcon, TrashIcon, CheckCircleIcon, UsersIcon, CogIcon, ServerIcon, GlobeAltIcon, PencilIcon, EyeIcon } from '@heroicons/react/24/outline'
import { FormError } from './FormError'
import { Dispatch, SetStateAction } from 'react'

interface Tenant {
  id: string
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
  databasePort?: number
  primaryColor: string
  logoUrl?: string
  faviconUrl?: string
  customDomain?: string
  settings?: any
  featureFlags?: any
  integrations?: any
  createdAt: string
  updatedAt: string
  userCount?: number
  serviceCount?: number
  storageUsed?: number
  lastActivity?: string
}

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

interface TenantModalsProps {
  showAddModal: boolean
  setShowAddModal: (show: boolean) => void
  showEditModal: boolean
  setShowEditModal: (show: boolean) => void
  showDeleteModal: boolean
  setShowDeleteModal: (show: boolean) => void
  showViewModal: boolean
  setShowViewModal: (show: boolean) => void
  showDuplicateModal: boolean
  setShowDuplicateModal: (show: boolean) => void
  currentTenant: Tenant | null
  formData: TenantFormData
  setFormData: Dispatch<SetStateAction<TenantFormData>>
  duplicateData: { name: string; slug: string }
  setDuplicateData: Dispatch<SetStateAction<{ name: string; slug: string }>>
  actionLoading: boolean
  formErrors: Record<string, string[]>
  handleSubmitAdd: () => void
  handleSubmitEdit: () => void
  handleConfirmDelete: () => void
  handleDuplicate: () => void
  handleNameChange: (value: string) => void
  resetForm: () => void
  getTypeColor: (type: string) => string
  getTierColor: (tier: string) => string
  getStatusBadge: (status: string) => React.ReactNode
  getTypeIcon: (type: string) => React.ReactNode
}

export function TenantModals({
  showAddModal,
  setShowAddModal,
  showEditModal,
  setShowEditModal,
  showDeleteModal,
  setShowDeleteModal,
  showViewModal,
  setShowViewModal,
  showDuplicateModal,
  setShowDuplicateModal,
  currentTenant,
  formData,
  setFormData,
  duplicateData,
  setDuplicateData,
  actionLoading,
  formErrors,
  handleSubmitAdd,
  handleSubmitEdit,
  handleConfirmDelete,
  handleDuplicate,
  handleNameChange,
  resetForm,
  getTypeColor,
  getTierColor,
  getStatusBadge,
  getTypeIcon,
}: TenantModalsProps) {
  return (
    <>
      {/* Add Tenant Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Tenant</DialogTitle>
            <DialogDescription>
              Create a new organizational unit with custom configuration
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Edit Tenant Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>
              Update tenant configuration and settings
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="edit-name">Tenant Name *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Enter tenant name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-slug">Slug *</Label>
                  <Input
                    id="edit-slug"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="tenant-slug"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-domain">Domain</Label>
                  <Input
                    id="edit-domain"
                    value={formData.domain}
                    onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                    placeholder="tenant.example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-customDomain">Custom Domain</Label>
                  <Input
                    id="edit-customDomain"
                    value={formData.customDomain}
                    onChange={(e) => setFormData(prev => ({ ...prev, customDomain: e.target.value }))}
                    placeholder="custom-domain.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="edit-type">Type *</Label>
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
                    <Label htmlFor="edit-tier">Tier *</Label>
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
                  <Label htmlFor="edit-status">Status *</Label>
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
                  <Label htmlFor="edit-maxUsers">Max Users</Label>
                  <Input
                    id="edit-maxUsers"
                    type="number"
                    value={formData.maxUsers}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxUsers: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-maxServices">Max Services</Label>
                  <Input
                    id="edit-maxServices"
                    type="number"
                    value={formData.maxServices}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxServices: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-storageLimitMb">Storage Limit (MB)</Label>
                  <Input
                    id="edit-storageLimitMb"
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
                  <Label htmlFor="edit-databaseName">Database Name *</Label>
                  <Input
                    id="edit-databaseName"
                    value={formData.databaseName}
                    onChange={(e) => setFormData(prev => ({ ...prev, databaseName: e.target.value }))}
                    placeholder="tenant_db"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-databaseHost">Database Host</Label>
                  <Input
                    id="edit-databaseHost"
                    value={formData.databaseHost}
                    onChange={(e) => setFormData(prev => ({ ...prev, databaseHost: e.target.value }))}
                    placeholder="localhost"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-databasePort">Database Port</Label>
                  <Input
                    id="edit-databasePort"
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
                  <Label htmlFor="edit-primaryColor">Primary Color</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="edit-primaryColor"
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
                  <Label htmlFor="edit-logoUrl">Logo URL</Label>
                  <Input
                    id="edit-logoUrl"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-faviconUrl">Favicon URL</Label>
                  <Input
                    id="edit-faviconUrl"
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-settings">Settings (JSON)</Label>
                  <Textarea
                    id="edit-settings"
                    value={formData.settings}
                    onChange={(e) => setFormData(prev => ({ ...prev, settings: e.target.value }))}
                    placeholder='{"key": "value"}'
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-featureFlags">Feature Flags (JSON)</Label>
                  <Textarea
                    id="edit-featureFlags"
                    value={formData.featureFlags}
                    onChange={(e) => setFormData(prev => ({ ...prev, featureFlags: e.target.value }))}
                    placeholder='{"feature": true}'
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-integrations">Integrations (JSON)</Label>
                  <Textarea
                    id="edit-integrations"
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
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitEdit} disabled={actionLoading}>
              {actionLoading ? 'Updating...' : 'Update Tenant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Tenant Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tenant Details</DialogTitle>
            <DialogDescription>
              Complete information about {currentTenant?.name}
            </DialogDescription>
          </DialogHeader>

          {currentTenant && (
            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    {getTypeIcon(currentTenant.type)}
                    <div>
                      <div className="font-medium text-gray-900">{currentTenant.name}</div>
                      <div className="text-sm text-gray-500">@{currentTenant.slug}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Type:</span>
                      <Badge className={getTypeColor(currentTenant.type)}>
                        {currentTenant.type}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Tier:</span>
                      <Badge className={getTierColor(currentTenant.tier)}>
                        {currentTenant.tier}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      {getStatusBadge(currentTenant.status)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Domains */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Domains</h3>
                <div className="space-y-2">
                  {currentTenant.domain && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Domain:</span>
                      <span className="font-medium">{currentTenant.domain}</span>
                    </div>
                  )}
                  {currentTenant.customDomain && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Custom Domain:</span>
                      <span className="font-medium">{currentTenant.customDomain}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Resource Usage */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Resource Usage</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <UsersIcon className="w-8 h-8 text-blue-600" />
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {currentTenant.userCount || 0}/{currentTenant.maxUsers}
                        </div>
                        <div className="text-sm text-blue-700">Users</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <CogIcon className="w-8 h-8 text-green-600" />
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {currentTenant.serviceCount || 0}/{currentTenant.maxServices}
                        </div>
                        <div className="text-sm text-green-700">Services</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <ServerIcon className="w-8 h-8 text-purple-600" />
                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-600">
                          {Math.round((currentTenant.storageUsed || 0) / 1024)}GB
                        </div>
                        <div className="text-sm text-purple-700">
                          of {Math.round(currentTenant.storageLimitMb / 1024)}GB
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Database Configuration */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Configuration</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Database Name:</span>
                    <span className="font-medium">{currentTenant.databaseName}</span>
                  </div>
                  {currentTenant.databaseHost && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Database Host:</span>
                      <span className="font-medium">{currentTenant.databaseHost}:{currentTenant.databasePort}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Branding */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Branding</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-lg border-2 border-gray-200"
                         style={{ backgroundColor: currentTenant.primaryColor }}>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Primary Color</div>
                      <div className="text-sm text-gray-500">{currentTenant.primaryColor}</div>
                    </div>
                  </div>
                  {currentTenant.logoUrl && (
                    <div className="flex items-center space-x-4">
                      <img
                        src={currentTenant.logoUrl}
                        alt="Logo"
                        className="w-16 h-16 object-contain rounded-lg border-2 border-gray-200"
                      />
                      <div>
                        <div className="font-medium text-gray-900">Logo</div>
                        <div className="text-sm text-gray-500">{currentTenant.logoUrl}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Advanced Settings */}
              {(currentTenant.settings || currentTenant.featureFlags || currentTenant.integrations) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Settings</h3>
                  <div className="space-y-4">
                    {currentTenant.settings && (
                      <div>
                        <div className="font-medium text-gray-900 mb-2">Settings:</div>
                        <pre className="p-3 bg-gray-50 rounded-lg text-sm overflow-x-auto">
                          {JSON.stringify(currentTenant.settings, null, 2)}
                        </pre>
                      </div>
                    )}
                    {currentTenant.featureFlags && (
                      <div>
                        <div className="font-medium text-gray-900 mb-2">Feature Flags:</div>
                        <pre className="p-3 bg-gray-50 rounded-lg text-sm overflow-x-auto">
                          {JSON.stringify(currentTenant.featureFlags, null, 2)}
                        </pre>
                      </div>
                    )}
                    {currentTenant.integrations && (
                      <div>
                        <div className="font-medium text-gray-900 mb-2">Integrations:</div>
                        <pre className="p-3 bg-gray-50 rounded-lg text-sm overflow-x-auto">
                          {JSON.stringify(currentTenant.integrations, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Created:</span>
                    <span className="font-medium">
                      {new Date(currentTenant.createdAt).toLocaleDateString()} at {new Date(currentTenant.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Last Updated:</span>
                    <span className="font-medium">
                      {new Date(currentTenant.updatedAt).toLocaleDateString()} at {new Date(currentTenant.updatedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  {currentTenant.lastActivity && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Last Activity:</span>
                      <span className="font-medium">{currentTenant.lastActivity}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewModal(false)}>
              Close
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowViewModal(false)
                setShowEditModal(true)
              }}
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              Edit Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Tenant</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this tenant? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {currentTenant && (
            <div className="py-4">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <TrashIcon className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <div className="font-medium text-red-900">{currentTenant.name}</div>
                    <div className="text-sm text-red-700">@{currentTenant.slug}</div>
                  </div>
                </div>
                <div className="mt-3 text-sm text-red-700">
                  <p className="font-medium mb-1">Warning: This will permanently delete:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>All tenant data and configurations</li>
                    <li>User assignments and permissions</li>
                    <li>Custom settings and integrations</li>
                    <li>Database and storage data</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={actionLoading}
            >
              {actionLoading ? 'Deleting...' : 'Delete Tenant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Tenant Modal */}
      <Dialog open={showDuplicateModal} onOpenChange={setShowDuplicateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicate Tenant</DialogTitle>
            <DialogDescription>
              Create a copy of "{currentTenant?.name}" with new name and slug
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="duplicate-name">New Tenant Name *</Label>
              <Input
                id="duplicate-name"
                value={duplicateData.name}
                onChange={(e) => setDuplicateData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter new tenant name"
              />
            </div>
            <div>
              <Label htmlFor="duplicate-slug">New Slug *</Label>
              <Input
                id="duplicate-slug"
                value={duplicateData.slug}
                onChange={(e) => setDuplicateData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="new-tenant-slug"
              />
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                This will copy all settings, configurations, and permissions from "{currentTenant?.name}" to the new tenant.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleDuplicate} disabled={actionLoading}>
              {actionLoading ? 'Duplicating...' : 'Duplicate Tenant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}