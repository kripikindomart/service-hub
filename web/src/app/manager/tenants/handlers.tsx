// Handler functions for tenant management page

export const createHandlers = (
  setCurrentTenant: any,
  setFormData: any,
  setShowEditModal: any,
  setShowDeleteModal: any,
  setShowArchiveModal: any,
  setShowUnarchiveModal: any,
  setShowPermanentDeleteModal: any,
  setDuplicateData: any,
  setShowDuplicateModal: any,
  setActionLoading: any,
  setShowAddModal: any,
  resetForm: any,
  fetchTenants: any,
  setSelectedTenants: any,
  toast: any
) => {

  const openViewModal = (tenant: any) => {
    setCurrentTenant(tenant)
    setShowViewModal(true)
  }

  const openEditModal = (tenant: any) => {
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
      settings: typeof tenant.settings === 'string' ? tenant.settings : JSON.stringify(tenant.settings || {}),
      featureFlags: typeof tenant.featureFlags === 'string' ? tenant.featureFlags : JSON.stringify(tenant.featureFlags || {}),
      integrations: typeof tenant.integrations === 'string' ? tenant.integrations : JSON.stringify(tenant.integrations || {}),
    })
    setCurrentTenant(tenant)
    setShowEditModal(true)
  }

  const openDeleteModal = (tenant: any) => {
    setCurrentTenant(tenant)
    setShowDeleteModal(true)
  }

  const openArchiveModal = (tenant: any) => {
    setCurrentTenant(tenant)
    setShowArchiveModal(true)
  }

  const openUnarchiveModal = (tenant: any) => {
    setCurrentTenant(tenant)
    setShowUnarchiveModal(true)
  }

  const openPermanentDeleteModal = (tenant: any) => {
    setCurrentTenant(tenant)
    setShowPermanentDeleteModal(true)
  }

  const openDuplicateModal = (tenant: any) => {
    setCurrentTenant(tenant)
    setDuplicateData({
      name: `${tenant.name} (Copy)`,
      slug: `${tenant.slug}-copy`
    })
    setShowDuplicateModal(true)
  }

  const handleSubmitAdd = async (formData: any) => {
    try {
      setActionLoading(true)

      if (!formData.name || !formData.slug || !formData.databaseName) {
        toast.error('Please fill in all required fields')
        return
      }

      const tenantData = {
        name: formData.name,
        slug: formData.slug,
        type: formData.type,
        domain: formData.domain,
        tier: formData.tier,
        status: formData.status,
        primaryColor: formData.primaryColor,
        logoUrl: formData.logoUrl,
        maxUsers: formData.maxUsers,
        maxServices: formData.maxServices,
        storageLimitMb: formData.storageLimitMb,
        databaseName: formData.databaseName,
        databaseHost: formData.databaseHost,
        databasePort: formData.databasePort,
        customDomain: formData.customDomain,
        settings: formData.settings ? JSON.parse(formData.settings) : {},
        featureFlags: formData.featureFlags ? JSON.parse(formData.featureFlags) : {},
        integrations: formData.integrations ? JSON.parse(formData.integrations) : {},
      }

      const { tenantApi } = await import('@/lib/api')
      const response = await tenantApi.createTenant(tenantData)

      if (response.success) {
        toast.success('Tenant created successfully')
        setShowAddModal(false)
        resetForm()
        fetchTenants()
      } else {
        toast.error(response.message || 'Failed to create tenant')
      }
    } catch (error: any) {
      console.error('Error creating tenant:', error)
      toast.error(error.response?.data?.message || 'Failed to create tenant')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSubmitEdit = async (currentTenant: any, formData: any) => {
    if (!currentTenant) return

    try {
      setActionLoading(true)

      if (!formData.name || !formData.slug || !formData.databaseName) {
        toast.error('Please fill in all required fields')
        return
      }

      const tenantData = {
        name: formData.name,
        slug: formData.slug,
        domain: formData.domain,
        type: formData.type,
        tier: formData.tier,
        status: formData.status,
        maxUsers: formData.maxUsers,
        maxServices: formData.maxServices,
        storageLimitMb: formData.storageLimitMb,
        databaseName: formData.databaseName,
        databaseHost: formData.databaseHost,
        databasePort: formData.databasePort,
        primaryColor: formData.primaryColor,
        logoUrl: formData.logoUrl,
        faviconUrl: formData.faviconUrl,
        customDomain: formData.customDomain,
        settings: formData.settings ? JSON.parse(formData.settings) : {},
        featureFlags: formData.featureFlags ? JSON.parse(formData.featureFlags) : {},
        integrations: formData.integrations ? JSON.parse(formData.integrations) : {},
      }

      const { tenantApi } = await import('@/lib/api')
      const response = await tenantApi.updateTenant(currentTenant.id, tenantData)

      if (response.success) {
        toast.success('Tenant updated successfully')
        setShowEditModal(false)
        fetchTenants()
      } else {
        toast.error(response.message || 'Failed to update tenant')
      }
    } catch (error: any) {
      console.error('Error updating tenant:', error)
      toast.error(error.response?.data?.message || 'Failed to update tenant')
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmDelete = async (currentTenant: any) => {
    if (!currentTenant) return

    try {
      setActionLoading(true)

      const { tenantApi } = await import('@/lib/api')
      const response = await tenantApi.deleteTenant(currentTenant.id)

      if (response.success) {
        toast.success('Tenant deleted successfully')
        setShowDeleteModal(false)
        fetchTenants()
      } else {
        toast.error(response.message || 'Failed to delete tenant')
      }
    } catch (error: any) {
      console.error('Error deleting tenant:', error)
      toast.error(error.response?.data?.message || 'Failed to delete tenant')
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmArchive = async (currentTenant: any) => {
    if (!currentTenant) return

    try {
      setActionLoading(true)

      const { tenantApi } = await import('@/lib/api')
      const response = await tenantApi.archiveTenant(currentTenant.id)

      if (response.success) {
        toast.success('Tenant archived successfully')
        setShowArchiveModal(false)
        fetchTenants()
      } else {
        toast.error(response.message || 'Failed to archive tenant')
      }
    } catch (error: any) {
      console.error('Error archiving tenant:', error)
      toast.error(error.response?.data?.message || 'Failed to archive tenant')
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmUnarchive = async (currentTenant: any) => {
    if (!currentTenant) return

    try {
      setActionLoading(true)

      const { tenantApi } = await import('@/lib/api')
      const response = await tenantApi.unarchiveTenant(currentTenant.id)

      if (response.success) {
        toast.success('Tenant restored successfully')
        setShowUnarchiveModal(false)
        fetchTenants()
      } else {
        toast.error(response.message || 'Failed to restore tenant')
      }
    } catch (error: any) {
      console.error('Error restoring tenant:', error)
      toast.error(error.response?.data?.message || 'Failed to restore tenant')
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmPermanentDelete = async (currentTenant: any) => {
    if (!currentTenant) return

    try {
      setActionLoading(true)

      const { tenantApi } = await import('@/lib/api')
      const response = await tenantApi.deleteTenant(currentTenant.id)

      if (response.success) {
        toast.success('Tenant permanently deleted')
        setShowPermanentDeleteModal(false)
        fetchTenants()
      } else {
        toast.error(response.message || 'Failed to delete tenant')
      }
    } catch (error: any) {
      console.error('Error deleting tenant:', error)
      toast.error(error.response?.data?.message || 'Failed to delete tenant')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDuplicate = async (currentTenant: any, duplicateData: any) => {
    if (!currentTenant || !duplicateData.name || !duplicateData.slug) return

    try {
      setActionLoading(true)

      const { tenantApi } = await import('@/lib/api')

      const newTenantData = {
        name: duplicateData.name,
        slug: duplicateData.slug,
        type: currentTenant.type,
        tier: currentTenant.tier,
        status: 'PENDING',
        primaryColor: currentTenant.primaryColor,
        logoUrl: currentTenant.logoUrl,
        maxUsers: currentTenant.maxUsers,
        maxServices: currentTenant.maxServices,
        storageLimitMb: currentTenant.storageLimitMb,
        databaseName: `${duplicateData.slug}_db`,
        databaseHost: currentTenant.databaseHost,
        databasePort: currentTenant.databasePort,
        customDomain: '',
        settings: currentTenant.settings,
        featureFlags: currentTenant.featureFlags,
        integrations: currentTenant.integrations,
      }

      const response = await tenantApi.createTenant(newTenantData)

      if (response.success) {
        toast.success('Tenant duplicated successfully')
        setShowDuplicateModal(false)
        fetchTenants()
      } else {
        toast.error(response.message || 'Failed to duplicate tenant')
      }
    } catch (error: any) {
      console.error('Error duplicating tenant:', error)
      toast.error(error.response?.data?.message || 'Failed to duplicate tenant')
    } finally {
      setActionLoading(false)
    }
  }

  const handleBulkAction = async (action: string, selectedTenants: string[]) => {
    if (selectedTenants.length === 0) return

    try {
      setActionLoading(true)

      const { tenantApi } = await import('@/lib/api')
      const promises = selectedTenants.map(tenantId => {
        switch (action) {
          case 'activate':
            return tenantApi.updateTenant(tenantId, { status: 'ACTIVE' })
          case 'deactivate':
            return tenantApi.updateTenant(tenantId, { status: 'INACTIVE' })
          case 'archive':
            return tenantApi.archiveTenant(tenantId)
          case 'unarchive':
            return tenantApi.unarchiveTenant(tenantId)
          case 'delete':
            return tenantApi.deleteTenant(tenantId)
          case 'permanent delete':
            return tenantApi.deleteTenant(tenantId)
          case 'restore':
            return tenantApi.unarchiveTenant(tenantId)
          default:
            return Promise.resolve({ success: false, message: 'Unknown action' })
        }
      })

      const results = await Promise.allSettled(promises)
      const successful = results.filter(result => result.status === 'fulfilled').length
      const failed = results.filter(result => result.status === 'rejected').length

      if (successful > 0) {
        toast.success(`${action} completed for ${successful} tenant${successful > 1 ? 's' : ''}`)
        setSelectedTenants([])
        fetchTenants()
      }

      if (failed > 0) {
        toast.error(`Failed to ${action.toLowerCase()} ${failed} tenant${failed > 1 ? 's' : ''}`)
      }
    } catch (error: any) {
      console.error(`Error during bulk ${action}:`, error)
      toast.error(`Failed to ${action.toLowerCase()} tenants`)
    } finally {
      setActionLoading(false)
    }
  }

  return {
    openViewModal,
    openEditModal,
    openDeleteModal,
    openArchiveModal,
    openUnarchiveModal,
    openPermanentDeleteModal,
    openDuplicateModal,
    handleSubmitAdd,
    handleSubmitEdit,
    handleConfirmDelete,
    handleConfirmArchive,
    handleConfirmUnarchive,
    handleConfirmPermanentDelete,
    handleDuplicate,
    handleBulkAction,
  }
}