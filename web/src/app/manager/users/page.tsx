'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { getAuthUser } from '@/lib/auth'
import { adminApi, tenantApi } from '@/lib/api'
import { User } from '@/types'
import toast from 'react-hot-toast'
import Swal from 'sweetalert2'
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  XMarkIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  ArchiveBoxIcon,
  ArrowUturnLeftIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { TrendingUp, TrendingDown, Users, Activity } from 'lucide-react'

type TabType = 'active' | 'deleted' | 'archived'

export default function UsersPage() {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshLoading, setRefreshLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [selectedUserDetail, setSelectedUserDetail] = useState<any>(null)
  const [showUserDetail, setShowUserDetail] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)
  const [showEditUser, setShowEditUser] = useState(false)
  const [selectedEditUser, setSelectedEditUser] = useState<any>(null)
  const [userStats, setUserStats] = useState<any>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('active')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const router = useRouter()

  const fetchUsers = async (page = 1, search = '', newPageSize = pageSize) => {
    try {
      setLoading(true)

      // Check if current user is super admin
      const currentUserRole = user?.userTenants?.find(ut => ut.isPrimary)?.role?.level
      const isSuperAdmin = currentUserRole === 'SUPER_ADMIN'

      let response
      switch (activeTab) {
        case 'deleted':
          response = await adminApi.getDeletedUsers({
            page,
            limit: newPageSize,
            search: search || undefined
          })
          break
        case 'archived':
          response = await adminApi.getArchivedUsers({
            page,
            limit: newPageSize,
            search: search || undefined
          })
          break
        case 'active':
        default:
          if (isSuperAdmin) {
            // Super admin can see all users
            response = await adminApi.getUsers({
              page,
              limit: newPageSize,
              search: search || undefined
            })
          } else {
            // Regular users can only see users from their tenant
            const currentTenantId = user?.userTenants?.find(ut => ut.isPrimary)?.tenantId
            response = await adminApi.getUsers({
              page,
              limit: newPageSize,
              search: search || undefined,
              tenantId: currentTenantId
            })
          }
          break
      }

      if (response.success && response.data && 'items' in response.data) {
        setUsers(response.data.items)
        setTotalPages(response.data.pagination.totalPages)
        setCurrentPage(response.data.pagination.page)
        setTotalUsers(response.data.pagination.total)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  // Refresh data function
  const refreshData = async () => {
    try {
      setRefreshLoading(true)
      await fetchUsers(currentPage, searchTerm, pageSize)
      await fetchUserStats()
      toast.success('Data refreshed successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to refresh data')
    } finally {
      setRefreshLoading(false)
    }
  }

  // Fetch user statistics
  const fetchUserStats = async () => {
    try {
      setStatsLoading(true)
      const response = await tenantApi.getDashboardStats()

      if (response.success) {
        setUserStats(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch user statistics:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    const authUser = getAuthUser()
    if (!authUser) {
      router.push('/login')
      return
    }
    setUser(authUser)
    fetchUsers()
    fetchTenants() // Fetch available tenants when component mounts
    fetchUserStats() // Fetch user statistics
  }, [router])

  useEffect(() => {
    // Reset pagination and fetch users when tab changes
    setCurrentPage(1)
    setSelectedUsers([])
    setShowBulkActions(false)
    fetchUsers(1, searchTerm, pageSize)
  }, [activeTab])

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    fetchUsers(1, term, pageSize)
  }

  const handleActivateUser = async (userId: string) => {
    const result = await Swal.fire({
      title: 'Activate User?',
      text: 'Are you sure you want to activate this user?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, activate!',
      cancelButtonText: 'Cancel'
    })

    if (!result.isConfirmed) {
      return
    }

    try {
      const response = await adminApi.activateUser(userId)
      if (response.success) {
        toast.success('User activated successfully')
        fetchUsers(currentPage, searchTerm)
        fetchUserStats()
      } else {
        throw new Error(response.message || 'Failed to activate user')
      }
    } catch (error: any) {
      console.error('Activate user error:', error)
      toast.error(error.response?.data?.message || error.message || 'Failed to activate user')
    }
  }

  const handleDeactivateUser = async (userId: string) => {
    const result = await Swal.fire({
      title: 'Deactivate User?',
      text: 'Are you sure you want to deactivate this user?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, deactivate!',
      cancelButtonText: 'Cancel'
    })

    if (!result.isConfirmed) {
      return
    }

    try {
      const response = await adminApi.deactivateUser(userId)
      if (response.success) {
        toast.success('User deactivated successfully')
        fetchUsers(currentPage, searchTerm)
        fetchUserStats()
      } else {
        throw new Error(response.message || 'Failed to deactivate user')
      }
    } catch (error: any) {
      console.error('Deactivate user error:', error)
      toast.error(error.response?.data?.message || error.message || 'Failed to deactivate user')
    }
  }

  const handleArchiveUser = async (userId: string) => {
    const result = await Swal.fire({
      title: 'Archive User?',
      text: 'Are you sure you want to archive this user? They can be restored later.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, archive!',
      cancelButtonText: 'Cancel'
    })

    if (!result.isConfirmed) {
      return
    }

    try {
      const response = await adminApi.archiveUser(userId)
      if (response.success) {
        toast.success('User archived successfully')
        fetchUsers(currentPage, searchTerm)
        fetchUserStats()
      } else {
        throw new Error(response.message || 'Failed to archive user')
      }
    } catch (error: any) {
      console.error('Archive user error:', error)
      toast.error(error.response?.data?.message || error.message || 'Failed to archive user')
    }
  }

  const handleUnarchiveUser = async (userId: string) => {
    const result = await Swal.fire({
      title: 'Restore User?',
      text: 'Are you sure you want to restore this user from archive?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, restore!',
      cancelButtonText: 'Cancel'
    })

    if (!result.isConfirmed) {
      return
    }

    try {
      const response = await adminApi.unarchiveUser(userId)
      if (response.success) {
        toast.success('User restored successfully')
        fetchUsers(currentPage, searchTerm)
        fetchUserStats()
      } else {
        throw new Error(response.message || 'Failed to restore user')
      }
    } catch (error: any) {
      console.error('Restore user error:', error)
      toast.error(error.response?.data?.message || error.message || 'Failed to restore user')
    }
  }

  const handleRestoreUser = async (userId: string) => {
    const result = await Swal.fire({
      title: 'Restore from Trash?',
      text: 'Are you sure you want to restore this user from trash?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, restore!',
      cancelButtonText: 'Cancel'
    })

    if (!result.isConfirmed) {
      return
    }

    try {
      const response = await adminApi.restoreUser(userId)
      if (response.success) {
        toast.success('User restored from trash successfully')
        fetchUsers(currentPage, searchTerm)
        fetchUserStats()
      } else {
        throw new Error(response.message || 'Failed to restore user')
      }
    } catch (error: any) {
      console.error('Restore user error:', error)
      toast.error(error.response?.data?.message || error.message || 'Failed to restore user')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    const isTrashTab = activeTab === 'deleted'
    const confirmText = isTrashTab
      ? "This will permanently delete the user and all their data. This action cannot be undone."
      : "This will move the user to trash. They can be restored from trash if needed."

    const confirmButtonText = isTrashTab ? 'Yes, delete permanently!' : 'Yes, move to trash!'
    const title = isTrashTab ? 'Permanently Delete User?' : 'Move User to Trash?'

    const result = await Swal.fire({
      title,
      text: confirmText,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText,
      cancelButtonText: 'Cancel'
    })

    if (!result.isConfirmed) {
      return
    }

    try {
      if (isTrashTab) {
        const response = await adminApi.permanentDeleteUser(userId)
        if (response.success) {
          toast.success('User permanently deleted')
        }
      } else {
        const response = await adminApi.deleteUser(userId)
        if (response.success) {
          toast.success('User moved to trash')
        }
      }

      fetchUsers(currentPage, searchTerm)
      fetchUserStats()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user')
    }
  }

  // Bulk actions handlers
  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSelectAllUsers = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(users.map(user => user.id))
    }
  }

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete' | 'archive' | 'unarchive' | 'restore' | 'permanent-delete') => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users first')
      return
    }

    let actionText = action
    let confirmTitle = ''
    let confirmMessage = ''
    let confirmColor = '#3b82f6'
    let confirmIcon = 'question'

    // Set action text and messages based on action type
    switch (action) {
      case 'activate':
        actionText = 'activate'
        confirmTitle = 'Bulk Activate?'
        confirmMessage = `Are you sure you want to activate ${selectedUsers.length} users?`
        break
      case 'deactivate':
        actionText = 'deactivate'
        confirmTitle = 'Bulk Deactivate?'
        confirmMessage = `Are you sure you want to deactivate ${selectedUsers.length} users?`
        break
      case 'archive':
        actionText = 'archive'
        confirmTitle = 'Bulk Archive?'
        confirmMessage = `Are you sure you want to archive ${selectedUsers.length} users?`
        confirmColor = '#f97316'
        break
      case 'delete':
        actionText = 'delete' as any
        confirmTitle = 'Bulk Move to Trash?'
        confirmMessage = `Are you sure you want to move ${selectedUsers.length} users to trash? Users can be restored from trash.`
        confirmColor = '#ef4444'
        confirmIcon = 'warning'
        break
      case 'unarchive':
        actionText = 'unarchive' as any
        confirmTitle = 'Bulk Restore from Archive?'
        confirmMessage = `Are you sure you want to restore ${selectedUsers.length} users from archive?`
        confirmColor = '#f97316'
        break
      case 'restore':
        actionText = 'restore' as any
        confirmTitle = 'Bulk Restore from Trash?'
        confirmMessage = `Are you sure you want to restore ${selectedUsers.length} users from trash?`
        confirmColor = '#10b981'
        break
      case 'permanent-delete':
        actionText = 'permanent-delete' as any
        confirmTitle = 'Bulk Permanent Delete?'
        confirmMessage = `Are you sure you want to permanently delete ${selectedUsers.length} users? This action cannot be undone and all data will be lost!`
        confirmColor = '#dc2626'
        confirmIcon = 'error'
        break
    }

    const result = await Swal.fire({
      title: confirmTitle,
      text: confirmMessage,
      icon: confirmIcon as any,
      showCancelButton: true,
      confirmButtonColor: confirmColor,
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${actionText} them!`,
      cancelButtonText: 'Cancel'
    })

    if (!result.isConfirmed) {
      return
    }

    try {
      setBulkLoading(true)

      // Handle different API calls based on action
      let response
      let successful = 0
      let failed = 0

      if (action === 'permanent-delete') {
        // Handle permanent delete - need to call multiple individual delete calls
        for (const userId of selectedUsers) {
          try {
            await adminApi.permanentDeleteUser(userId)
            successful++
          } catch (error) {
            failed++
          }
        }
        response = { success: true }
      } else if (action === 'unarchive') {
        // Handle unarchive - call individual unarchive calls
        for (const userId of selectedUsers) {
          try {
            await adminApi.unarchiveUser(userId)
            successful++
          } catch (error) {
            failed++
          }
        }
        response = { success: true }
      } else if (action === 'restore') {
        // Handle restore - call individual restore calls
        for (const userId of selectedUsers) {
          try {
            await adminApi.restoreUser(userId)
            successful++
          } catch (error) {
            failed++
          }
        }
        response = { success: true }
      } else {
        // Use bulk API for activate, deactivate, delete
        response = await adminApi.bulkActionUsers(action, selectedUsers)
        if (response.success) {
          successful = response.data.summary.successful
          failed = response.data.summary.failed
        }
      }

      if (response.success) {
        const successIcon = action === 'permanent-delete' ? 'error' : 'success'

        await Swal.fire({
          icon: successIcon,
          title: 'Action Completed',
          text: `Bulk ${actionText} completed: ${successful} successful, ${failed} failed`,
          confirmButtonColor: '#10b981',
        })

        // Refresh data
        await fetchUsers(currentPage, searchTerm)
        await fetchUserStats()
        setSelectedUsers([])
        setShowBulkActions(false)
      }
    } catch (error: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || `Failed to bulk ${action} users`,
        confirmButtonColor: '#ef4444',
      })
    } finally {
      setBulkLoading(false)
    }
  }

  // Duplicate user handler
  const handleDuplicateUser = async (userToDuplicate: any) => {
    // Check if user has tenants and roles
    const hasValidTenants = userToDuplicate.userTenants && userToDuplicate.userTenants.length > 0
    const hasValidRoles = hasValidTenants && userToDuplicate.userTenants.some((ut: any) => ut.roleId)

    if (!hasValidTenants || !hasValidRoles) {
      await Swal.fire({
        icon: 'warning',
        title: 'Cannot Duplicate User',
        html: `
          <div class="text-left">
            <p>This user cannot be duplicated because:</p>
            <ul class="text-sm text-gray-600 ml-4 mt-2">
              ${!hasValidTenants ? '<li>• User has no tenant assignments</li>' : ''}
              ${!hasValidRoles ? '<li>• User has no role assignments</li>' : ''}
            </ul>
            <p class="text-sm text-gray-600 mt-3">Please assign tenant and role to this user first.</p>
          </div>
        `,
        confirmButtonColor: '#6b7280',
      })
      return
    }

    const result = await Swal.fire({
      title: 'Duplicate User?',
      html: `
        <p>Are you sure you want to duplicate this user?</p>
        <div class="text-left mt-4">
          <p><strong>Name:</strong> ${userToDuplicate.name}</p>
          <p><strong>Email:</strong> ${userToDuplicate.email}</p>
          <p class="text-sm text-gray-600 mt-2">A new user will be created with:</p>
          <ul class="text-sm text-gray-600 ml-4">
            <li>• Same name with " (Copy)" suffix</li>
            <li>• New email address (you'll need to provide)</li>
            <li>• Same tenant and role assignments</li>
            <li>• Same settings and preferences</li>
          </ul>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#8b5cf6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, duplicate!',
      cancelButtonText: 'Cancel'
    })

    if (!result.isConfirmed) {
      return
    }

    // Open modal for entering new email
    const { value: newEmail } = await Swal.fire({
      title: 'Enter New Email',
      html: `
        <p>Please provide a unique email address for the duplicated user:</p>
        <input id="new-email" class="swal2-input" placeholder="user-copy@example.com" value="${userToDuplicate.email.replace('@', '-copy@')}">
      `,
      input: 'email',
      inputPlaceholder: 'user-copy@example.com',
      inputValue: `${userToDuplicate.email.replace('@', '-copy@')}`,
      showCancelButton: true,
      confirmButtonText: 'Create Duplicate',
      cancelButtonText: 'Cancel',
      preConfirm: (email) => {
        if (!email) {
          Swal.showValidationMessage('Email is required')
          return false
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          Swal.showValidationMessage('Please enter a valid email address')
          return false
        }
        return email
      }
    })

    if (newEmail) {
      try {
        // Get the primary tenant and role from the user being duplicated
        const primaryUserTenant = userToDuplicate.userTenants?.find((ut: any) => ut.isPrimary)
        const tenantId = primaryUserTenant?.tenantId || userToDuplicate.userTenants?.[0]?.tenantId
        const roleId = primaryUserTenant?.roleId || userToDuplicate.userTenants?.[0]?.roleId

        // Additional validation
        if (!tenantId || !roleId) {
          throw new Error('Cannot determine tenant and role for duplication')
        }

        // Call API to create duplicated user
        const response = await adminApi.createUser({
          name: `${userToDuplicate.name} (Copy)`,
          email: newEmail,
          phone: userToDuplicate.phone || undefined,
          timezone: userToDuplicate.timezone || 'UTC',
          language: userToDuplicate.language || 'en',
          status: 'PENDING', // Always start as PENDING for duplicated users
          tenantId,
          roleId,
          sendEmailInvite: true // Send invitation to new user
        })

        if (response.success) {
          toast.success('User duplicated successfully! Invitation email sent.')

          // Refresh data
          await fetchUsers(currentPage, searchTerm)
          await fetchUserStats()

          // Show success details
          await Swal.fire({
            icon: 'success',
            title: 'User Duplicated Successfully!',
            html: `
              <div class="text-left">
                <p><strong>New User:</strong> ${userToDuplicate.name} (Copy)</p>
                <p><strong>Email:</strong> ${newEmail}</p>
                <p class="text-sm text-gray-600 mt-2">The new user has been created with PENDING status and will receive an invitation email.</p>
              </div>
            `,
            confirmButtonColor: '#10b981',
          })
        } else {
          throw new Error(response.message || 'Failed to duplicate user')
        }

      } catch (error: any) {
        console.error('Duplicate user error:', error)

        let errorMessage = 'Failed to duplicate user'
        if (error.response?.data?.message) {
          const message = error.response.data.message.toLowerCase()
          if (message.includes('email already exists')) {
            errorMessage = 'A user with this email address already exists'
          } else if (message.includes('tenant')) {
            errorMessage = 'Unable to assign user to the specified tenant'
          } else if (message.includes('role')) {
            errorMessage = 'Unable to assign role to the new user'
          } else {
            errorMessage = error.response.data.message
          }
        } else if (error.message) {
          errorMessage = error.message
        }

        await Swal.fire({
          icon: 'error',
          title: 'Duplication Failed',
          text: errorMessage,
          confirmButtonColor: '#ef4444',
        })
      }
    }
  }

  // Export handlers
  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await adminApi.exportUsers({
        search: searchTerm || undefined,
        format
      })

      if (format === 'csv') {
        // Create download link for CSV
        const blob = new Blob([response], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `users-export-${Date.now()}.csv`
        link.click()
        window.URL.revokeObjectURL(url)
        toast.success('CSV exported successfully')
      } else {
        // For JSON, we can download or copy to clipboard
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `users-export-${Date.now()}.json`
        link.click()
        window.URL.revokeObjectURL(url)
        toast.success('JSON exported successfully')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to export users')
    }
  }

  // User detail handlers
  const handleViewUser = async (userId: string) => {
    try {
      const response = await adminApi.getUserById(userId)
      if (response.success) {
        setSelectedUserDetail(response.data)
        setShowUserDetail(true)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch user details')
    }
  }

  // Add user handlers
  const handleAddUser = () => {
    setShowAddUser(true)
  }

  // Add user form state
  const [addUserForm, setAddUserForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    timezone: 'UTC',
    language: 'en',
    status: 'PENDING',
    tenantId: '',
    roleId: '',
    sendEmailInvite: true
  })

  // Add user form validation errors
  const [addUserErrors, setAddUserErrors] = useState<any>({})

  // Add user loading state
  const [addUserLoading, setAddUserLoading] = useState(false)

  // Available roles state
  const [availableRoles, setAvailableRoles] = useState<any[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)

  // Available tenants state
  const [availableTenants, setAvailableTenants] = useState<any[]>([])
  const [tenantsLoading, setTenantsLoading] = useState(false)

  // Fetch roles for a specific tenant
  const fetchRolesForTenant = async (tenantId: string) => {
    if (!tenantId) {
      setAvailableRoles([])
      return
    }

    try {
      setRolesLoading(true)
      const response = await tenantApi.getTenantRoles(tenantId)

      if (response.success && response.data) {
        setAvailableRoles(response.data)
      } else {
        throw new Error(response.message || 'Failed to fetch roles')
      }
    } catch (error: any) {
      console.error('Failed to fetch roles:', error)
      toast.error(error.message || 'Failed to fetch roles for tenant')
      setAvailableRoles([])
    } finally {
      setRolesLoading(false)
    }
  }

  // Fetch available tenants
  const fetchTenants = async () => {
    try {
      setTenantsLoading(true)
      const response = await tenantApi.getTenants()

      if (response.success) {
        setAvailableTenants(response.data.items || response.data)
      } else {
        throw new Error(response.message || 'Failed to fetch tenants')
      }
    } catch (error: any) {
      console.error('Failed to fetch tenants:', error)
      toast.error(error.message || 'Failed to fetch tenants')
      setAvailableTenants([])
    } finally {
      setTenantsLoading(false)
    }
  }

  // Handle tenant selection change
  const handleTenantChange = (tenantId: string) => {
    handleAddUserFieldChange('tenantId', tenantId)
    setAddUserForm(prev => ({
      ...prev,
      roleId: '' // Reset role when tenant changes
    }))
    fetchRolesForTenant(tenantId)
  }

  // Edit user handlers
  const handleEditUser = async (userItem: any) => {
    setSelectedEditUser(userItem)
    setEditUserLoading(true)

    try {
      // First fetch all available tenants to ensure they are loaded before setting form data
      try {
        setTenantsLoading(true)
        const response = await tenantApi.getTenants()

        if (response.success) {
          setAvailableTenants(response.data.items || response.data)
        } else {
          throw new Error(response.message || 'Failed to fetch tenants')
        }
      } catch (error: any) {
        console.error('Failed to fetch tenants:', error)
        toast.error(error.message || 'Failed to fetch tenants')
        setAvailableTenants([])
      } finally {
        setTenantsLoading(false)
      }

      // Use home tenant as default, fallback to primary tenant if home tenant is not set
      console.log('User assignments:', userItem.userTenants)
      const primaryAssignment = userItem.userTenants?.find((ut: any) => ut.isPrimary)
      const firstAssignment = userItem.userTenants?.[0]

      // Try to get tenant ID from multiple sources
      let defaultTenantId = userItem.homeTenantId || ''

      if (primaryAssignment) {
        defaultTenantId = primaryAssignment.tenant?.id || primaryAssignment.tenantId || ''
      } else if (firstAssignment) {
        defaultTenantId = firstAssignment.tenant?.id || firstAssignment.tenantId || ''
      }

      const defaultRoleId = primaryAssignment?.roleId || firstAssignment?.roleId || ''

      console.log('Primary assignment:', primaryAssignment)
      console.log('First assignment:', firstAssignment)
      console.log('Final default tenant ID:', defaultTenantId)
      console.log('Final default role ID:', defaultRoleId)

      // First fetch roles for the user's home/primary tenant
      if (defaultTenantId) {
        await fetchEditRolesForTenant(defaultTenantId)
      }

      // Then set the form data with a delay to ensure both tenants and roles are loaded
      setTimeout(() => {
        // Debug: log the structures to understand the data
        console.log('User item:', userItem)
        console.log('Default tenant ID:', defaultTenantId)
        console.log('Available tenants:', availableTenants)
        console.log('Default role ID:', defaultRoleId)
        console.log('Available roles:', editAvailableRoles)

        // Find the tenant in availableTenants to get the correct ID
        const matchedTenant = availableTenants.find((t: any) => {
          // Try multiple ways to match the tenant
          return t.id === defaultTenantId
        })

        const finalTenantId = matchedTenant ? matchedTenant.id : defaultTenantId
        console.log('Matched tenant:', matchedTenant)
        console.log('Final tenant ID:', finalTenantId)

        setEditUserForm({
          name: userItem.name,
          email: userItem.email,
          password: '',
          phone: userItem.phone || '',
          timezone: userItem.timezone || 'UTC',
          language: userItem.language || 'en',
          status: userItem.status,
          tenantId: finalTenantId,
          roleId: defaultRoleId
        })
        setEditUserLoading(false)
        setShowEditUser(true)
      }, 500) // Increased delay to ensure both tenants and roles are loaded
    } catch (error) {
      console.error('Error preparing edit form:', error)
      setEditUserLoading(false)
      toast.error('Failed to prepare edit form')
    }
  }

  // Fetch roles for edit form
  const fetchEditRolesForTenant = async (tenantId: string) => {
    if (!tenantId) {
      setEditAvailableRoles([])
      return
    }

    try {
      setEditRolesLoading(true)
      const response = await tenantApi.getTenantRoles(tenantId)

      if (response.success && response.data) {
        setEditAvailableRoles(response.data)

        // Check if the current selected roleId exists in the loaded roles
        if (editUserForm.roleId) {
          const roleExists = response.data.some((role: any) => role.id === editUserForm.roleId)
          if (!roleExists && response.data.length > 0) {
            // If selected role doesn't exist, clear it or set to first available role
            setEditUserForm(prev => ({ ...prev, roleId: '' }))
          }
        }
      } else {
        throw new Error(response.message || 'Failed to fetch roles')
      }
    } catch (error: any) {
      console.error('Failed to fetch roles:', error)
      toast.error(error.message || 'Failed to fetch roles for tenant')
      setEditAvailableRoles([])
    } finally {
      setEditRolesLoading(false)
    }
  }

  // Handle tenant change in edit form
  const handleEditTenantChange = (tenantId: string) => {
    setEditUserForm({
      ...editUserForm,
      tenantId,
      roleId: '' // Reset role when tenant changes
    })
    fetchEditRolesForTenant(tenantId)

    // Clear error for tenant and role fields
    if (editUserErrors.tenantId || editUserErrors.roleId) {
      setEditUserErrors((prev: any) => {
        const newErrors = { ...prev }
        delete newErrors.tenantId
        delete newErrors.roleId
        return newErrors
      })
    }
  }

  // Handle edit form field changes with error clearing
  const handleEditUserFieldChange = (field: string, value: any) => {
    setEditUserForm(prev => ({ ...prev, [field]: value }))
    // Clear error for this field if it exists
    if (editUserErrors[field]) {
      setEditUserErrors((prev: any) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // Edit user form state
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    timezone: 'UTC',
    language: 'en',
    status: 'PENDING',
    tenantId: '',
    roleId: ''
  })

  // Edit user form validation errors
  const [editUserErrors, setEditUserErrors] = useState<any>({})

  // Edit user loading state
  const [editUserLoading, setEditUserLoading] = useState(false)

  // Edit form roles state
  const [editAvailableRoles, setEditAvailableRoles] = useState<any[]>([])
  const [editRolesLoading, setEditRolesLoading] = useState(false)

  // Validation functions
  const validateAddUserForm = () => {
    const errors: any = {}

    if (!addUserForm.name.trim()) {
      errors.name = 'Full name is required'
    } else if (addUserForm.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters'
    }

    if (!addUserForm.email.trim()) {
      errors.email = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addUserForm.email)) {
      errors.email = 'Please enter a valid email address'
    }

    if (!addUserForm.password.trim()) {
      errors.password = 'Password is required'
    } else if (addUserForm.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }

    if (!addUserForm.tenantId) {
      errors.tenantId = 'Please select a tenant'
    }

    if (!addUserForm.roleId) {
      errors.roleId = 'Please select a role'
    }

    if (addUserForm.phone && !/^[\d\s\-\+\(\)]+$/.test(addUserForm.phone)) {
      errors.phone = 'Please enter a valid phone number'
    }

    setAddUserErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateEditUserForm = () => {
    const errors: any = {}

    if (!editUserForm.name.trim()) {
      errors.name = 'Full name is required'
    } else if (editUserForm.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters'
    }

    if (!editUserForm.email.trim()) {
      errors.email = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editUserForm.email)) {
      errors.email = 'Please enter a valid email address'
    }

    if (!editUserForm.tenantId) {
      errors.tenantId = 'Please select a tenant'
    }

    if (!editUserForm.roleId) {
      errors.roleId = 'Please select a role'
    }

    if (editUserForm.phone && !/^[\d\s\-\+\(\)]+$/.test(editUserForm.phone)) {
      errors.phone = 'Please enter a valid phone number'
    }

    setEditUserErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Form field change handlers to clear errors
  const handleAddUserFieldChange = (field: string, value: any) => {
    setAddUserForm(prev => ({ ...prev, [field]: value }))
    // Clear error for this field if it exists
    if (addUserErrors[field]) {
      setAddUserErrors((prev: any) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // Form submission handlers
  const handleAddUserSubmit = async () => {
    if (!validateAddUserForm()) {
      return
    }

    setAddUserLoading(true)
    try {
      // Call actual API to create user
      const response = await adminApi.createUser({
        name: addUserForm.name.trim(),
        email: addUserForm.email.trim(),
        phone: addUserForm.phone.trim() || undefined,
        timezone: addUserForm.timezone,
        language: addUserForm.language,
        status: addUserForm.status,
        tenantId: addUserForm.tenantId,
        roleId: addUserForm.roleId,
        sendEmailInvite: addUserForm.sendEmailInvite
      })

      if (response.success) {
        toast.success('User created successfully!')

        // Reset form and close modal
        setAddUserForm({
          name: '',
          email: '',
          password: '',
          phone: '',
          timezone: 'UTC',
          language: 'en',
          status: 'PENDING',
          tenantId: '',
          roleId: '',
          sendEmailInvite: true
        })
        setAddUserErrors({})
        setShowAddUser(false)

        // Refresh only the table data and statistics
        await fetchUsers(currentPage, searchTerm)
        await fetchUserStats()
      } else {
        throw new Error(response.message || 'Failed to create user')
      }

    } catch (error: any) {
      console.error('Create user error:', error)

      // Parse different error response formats
      let errorMessage = 'Failed to create user'
      let fieldErrors: any = {}

      if (error.response?.data) {
        const errorData = error.response.data

        // Handle structured error responses
        if (errorData.errors && typeof errorData.errors === 'object') {
          // If backend returns field-specific errors
          fieldErrors = errorData.errors
        } else if (errorData.message) {
          // Handle specific error messages
          const message = errorData.message.toLowerCase()

          if (message.includes('email already exists') || message.includes('duplicate email')) {
            fieldErrors.email = 'A user with this email address already exists'
          } else if (message.includes('phone already exists')) {
            fieldErrors.phone = 'A user with this phone number already exists'
          } else if (message.includes('tenant')) {
            fieldErrors.tenantId = errorData.message
          } else if (message.includes('role')) {
            fieldErrors.roleId = errorData.message
          } else {
            errorMessage = errorData.message
          }
        }
      } else if (error.message) {
        errorMessage = error.message
      }

      // Update form errors if field-specific errors exist
      if (Object.keys(fieldErrors).length > 0) {
        setAddUserErrors((prevErrors: any) => ({ ...prevErrors, ...fieldErrors }))
      }

      // Show general error message
      toast.error(errorMessage)
    } finally {
      setAddUserLoading(false)
    }
  }

  const handleEditUserSubmit = async () => {
    if (!validateEditUserForm()) {
      return
    }

    if (!selectedEditUser) {
      toast.error('No user selected for editing')
      return
    }

    setEditUserLoading(true)
    try {
      // Call actual API to update user
      const updateData: any = {
        name: editUserForm.name.trim(),
        email: editUserForm.email.trim(),
        phone: editUserForm.phone.trim() || undefined,
        timezone: editUserForm.timezone,
        language: editUserForm.language,
        status: editUserForm.status,
        tenantId: editUserForm.tenantId,
        roleId: editUserForm.roleId
      }

  
      const response = await adminApi.updateUser(selectedEditUser.id, updateData)

      if (response.success) {
        toast.success('User updated successfully!')

        // Reset form and close modal
        setEditUserErrors({})
        setShowEditUser(false)
        setSelectedEditUser(null)

        // Refresh only the table data and statistics
        await fetchUsers(currentPage, searchTerm)
        await fetchUserStats()
      } else {
        throw new Error(response.message || 'Failed to update user')
      }

    } catch (error: any) {
      toast.error(error.message || 'Failed to update user')
    } finally {
      setEditUserLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 vibrant-gradient rounded-2xl shadow-lg mb-4">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    )
  }

  // Search is now handled by the API
  const displayUsers = users

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
      case 'INACTIVE':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Inactive</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      case 'PENDING':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />
      case 'INACTIVE':
        return <XMarkIcon className="w-5 h-5 text-red-500" />
      default:
        return null
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border border-white/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-black text-gradient mb-2 break-words">User Management</h1>
              <p className="text-gray-600 text-sm sm:text-lg">Manage platform users and permissions</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto border-gray-300 hover:bg-gray-50"
                onClick={refreshData}
                disabled={refreshLoading}
              >
                <ArrowPathIcon className={`w-4 h-4 mr-2 ${refreshLoading ? 'animate-spin' : ''}`} />
                {refreshLoading ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button className="btn-gradient w-full sm:w-auto" onClick={handleAddUser}>
                <PlusIcon className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </div>
          </div>
        </div>

        {/* User Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statsLoading ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-4"></div>
                <div className="h-12 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-4"></div>
                <div className="h-12 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-4"></div>
                <div className="h-12 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </>
          ) : (
            <>
              {/* Total Users Card */}
              <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-blue-100 text-sm">Total Users</span>
                  </div>
                  <div className="text-4xl font-bold mb-2">
                    {userStats?.overview?.totalUsers || 0}
                  </div>
                  <div className="text-blue-100 text-sm">
                    +{userStats?.activity?.newUsers || 0} new this month
                  </div>
                </CardContent>
              </Card>

              {/* Active Users Card */}
              <Card className="border-0 shadow-xl bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                      <CheckCircleIcon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-green-100 text-sm">Active</span>
                  </div>
                  <div className="text-4xl font-bold mb-2">
                    {userStats?.userStats?.byStatus?.find((s: any) => s.status === 'ACTIVE')?.count || 0}
                  </div>
                  <div className="text-green-100 text-sm">
                    {userStats?.overview?.totalUsers ?
                      Math.round(((userStats?.userStats?.byStatus?.find((s: any) => s.status === 'ACTIVE')?.count || 0) / userStats?.overview?.totalUsers) * 100)
                      : 0}% of total
                  </div>
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Info</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Pending</span>
                      <span className="text-sm font-medium text-yellow-600">
                        {userStats?.userStats?.byStatus?.find((s: any) => s.status === 'PENDING')?.count || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Inactive</span>
                      <span className="text-sm font-medium text-red-600">
                        {userStats?.userStats?.byStatus?.find((s: any) => s.status === 'INACTIVE')?.count || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Tenants</span>
                      <span className="text-sm font-medium text-purple-600">
                        {userStats?.overview?.totalTenants || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Search and Filters */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search users by name, email, or role..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 h-12 border-gray-200 focus:border-primary w-full"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="h-12">
                  Filter
                </Button>
                <Button
                  variant="outline"
                  className="h-12"
                  onClick={() => setShowBulkActions(!showBulkActions)}
                >
                  {showBulkActions ? 'Hide' : 'Show'} Bulk Actions ({selectedUsers.length})
                </Button>
                <Button variant="outline" className="h-12" onClick={() => handleExport('csv')}>
                  <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" className="h-12" onClick={() => handleExport('json')}>
                  <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                  Export JSON
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions Panel */}
        {showBulkActions && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Bulk Actions</h3>
                  <span className="text-sm text-gray-500">{selectedUsers.length} users selected</span>
                </div>

                <div className="flex flex-wrap gap-3">
                  {activeTab === 'active' && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleBulkAction('activate')}
                        disabled={bulkLoading || selectedUsers.length === 0}
                        className="flex items-center space-x-2"
                      >
                        <CheckCircleIcon className="w-4 h-4" />
                        <span>Activate Selected</span>
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => handleBulkAction('deactivate')}
                        disabled={bulkLoading || selectedUsers.length === 0}
                        className="flex items-center space-x-2"
                      >
                        <XCircleIcon className="w-4 h-4" />
                        <span>Deactivate Selected</span>
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => handleBulkAction('archive')}
                        disabled={bulkLoading || selectedUsers.length === 0}
                        className="flex items-center space-x-2 text-orange-600 hover:text-orange-700"
                      >
                        <ArchiveBoxIcon className="w-4 h-4" />
                        <span>Archive Selected</span>
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => handleBulkAction('delete')}
                        disabled={bulkLoading || selectedUsers.length === 0}
                        className="flex items-center space-x-2 text-yellow-600 hover:text-yellow-700"
                      >
                        <TrashIcon className="w-4 h-4" />
                        <span>Move to Trash</span>
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => handleBulkAction('permanent-delete')}
                        disabled={bulkLoading || selectedUsers.length === 0}
                        className="flex items-center space-x-2 text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="w-4 h-4" />
                        <span>Permanent Delete</span>
                      </Button>
                    </>
                  )}

                  {activeTab === 'archived' && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleBulkAction('unarchive')}
                        disabled={bulkLoading || selectedUsers.length === 0}
                        className="flex items-center space-x-2 text-orange-600 hover:text-orange-700"
                      >
                        <ArrowUturnLeftIcon className="w-4 h-4" />
                        <span>Restore from Archive</span>
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => handleBulkAction('delete')}
                        disabled={bulkLoading || selectedUsers.length === 0}
                        className="flex items-center space-x-2 text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="w-4 h-4" />
                        <span>Move to Trash</span>
                      </Button>
                    </>
                  )}

                  {activeTab === 'deleted' && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleBulkAction('restore')}
                        disabled={bulkLoading || selectedUsers.length === 0}
                        className="flex items-center space-x-2 text-green-600 hover:text-green-700"
                      >
                        <ArrowUturnLeftIcon className="w-4 h-4" />
                        <span>Restore from Trash</span>
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => handleBulkAction('permanent-delete')}
                        disabled={bulkLoading || selectedUsers.length === 0}
                        className="flex items-center space-x-2 text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="w-4 h-4" />
                        <span>Permanent Delete</span>
                      </Button>
                    </>
                  )}

                  <Button
                    variant="ghost"
                    onClick={() => setSelectedUsers([])}
                    disabled={selectedUsers.length === 0}
                    className="text-gray-500"
                  >
                    Clear Selection
                  </Button>
                </div>

                {selectedUsers.length > 0 && (
                  <div className="text-sm text-gray-600">
                    Selected: {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Users Table with Tabs */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  User Management
                </CardTitle>
                <CardDescription>
                  Manage user accounts, roles, and permissions
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  Total: {userStats?.overview?.totalUsers || 0} users
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 border-b border-gray-200 mt-4">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'active'
                    ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>List Users</span>
                  <Badge className={
                    activeTab === 'active'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600'
                  }>
                    {activeTab === 'active'
                      ? (totalUsers || 0)
                      : (userStats?.userStats?.byStatus?.find((s: any) => s.status === 'ACTIVE')?.count || 0)
                    }
                  </Badge>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('archived')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'archived'
                    ? 'text-orange-600 bg-orange-50 border-b-2 border-orange-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <ArchiveBoxIcon className="w-4 h-4" />
                  <span>Archived</span>
                  <Badge className={
                    activeTab === 'archived'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-gray-600'
                  }>
                    {activeTab === 'archived'
                      ? (totalUsers || 0)
                      : (userStats?.userStats?.byStatus?.find((s: any) => s.status === 'ARCHIVED')?.count || 0)
                    }
                  </Badge>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('deleted')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'deleted'
                    ? 'text-red-600 bg-red-50 border-b-2 border-red-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <TrashIcon className="w-4 h-4" />
                  <span>Trash</span>
                  <Badge className={
                    activeTab === 'deleted'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-600'
                  }>
                    {activeTab === 'deleted'
                      ? (totalUsers || 0)
                      : (userStats?.userStats?.byStatus?.find((s: any) => s.status === 'DELETED')?.count || 0)
                    }
                  </Badge>
                </div>
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-gray-600">Loading users...</span>
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-auto max-h-[70vh] min-w-[320px]">
                <table className="w-full min-w-[800px]">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700 w-8">No</th>
                      <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700 w-12">
                        <input
                          type="checkbox"
                          checked={selectedUsers.length === users.length && users.length > 0}
                          onChange={handleSelectAllUsers}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                      </th>
                      <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700 hidden sm:table-cell">User</th>
                      <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700">Tenant</th>
                      <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700">Role</th>
                      <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700 hidden lg:table-cell">Status</th>
                      {activeTab === 'deleted' && (
                        <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700 hidden md:table-cell">Deleted Date</th>
                      )}
                      {activeTab === 'archived' && (
                        <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700 hidden md:table-cell">Archived Date</th>
                      )}
                      <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700 hidden md:table-cell">Email</th>
                      <th className="text-center py-3 px-2 sm:px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayUsers.map((userItem, index) => (
                      <tr key={userItem.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${selectedUsers.includes(userItem.id) ? 'bg-blue-50' : ''}`}>
                        {/* Nomor Urut */}
                        <td className="py-3 px-2 sm:px-4 text-sm text-gray-600 font-medium">
                          {((currentPage - 1) * pageSize) + index + 1}
                        </td>
                        {/* Checkbox */}
                        <td className="py-3 px-2 sm:px-4">
                          {userItem.id !== user?.id && (
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(userItem.id)}
                              onChange={() => handleSelectUser(userItem.id)}
                              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                            />
                          )}
                        </td>
                        {/* User Info - Desktop */}
                        <td className="py-3 px-2 sm:px-4 hidden sm:table-cell">
                          <div>
                            <div className="font-semibold text-gray-900 text-sm truncate max-w-[200px]">{userItem.name}</div>
                            <div className="text-xs text-gray-500 truncate max-w-[200px]">{userItem.email}</div>
                          </div>
                        </td>
                        {/* Tenant */}
                        <td className="py-3 px-2 sm:px-4">
                          {userItem.userTenants && userItem.userTenants.length > 0 ? (
                            <div className="space-y-1">
                              {userItem.userTenants.map((ua, index) => (
                                <div key={index} className="flex items-center space-x-1">
                                  <Badge
                                    className={`${
                                      ua.tenant?.type === 'BUSINESS' ? 'bg-blue-100 text-blue-800' :
                                      ua.tenant?.type === 'CORE' ? 'bg-purple-100 text-purple-800' :
                                      'bg-green-100 text-green-800'
                                    } text-xs`}
                                  >
                                    {ua.tenant?.type}
                                  </Badge>
                                  <span className="text-xs text-gray-600 truncate max-w-[100px] font-medium">
                                    {ua.tenant?.name}
                                  </span>
                                  {ua.isPrimary && (
                                    <Badge className="bg-yellow-100 text-yellow-800 text-xs">Primary</Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">No tenant</span>
                          )}
                        </td>
                        {/* Role */}
                        <td className="py-3 px-2 sm:px-4">
                          {userItem.userTenants && userItem.userTenants.length > 0 ? (
                            <div className="space-y-1">
                              {userItem.userTenants.map((ua, index) => (
                                <div key={index} className="flex items-center space-x-1">
                                  <ShieldCheckIcon className="w-3 h-3 text-gray-400" />
                                  <Badge className="bg-gray-100 text-gray-700 text-xs">
                                    {ua.role?.name}
                                  </Badge>
                                  <Badge className="bg-blue-50 text-blue-700 text-xs">
                                    {ua.role?.level}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">No role</span>
                          )}
                        </td>
                        {/* Status - Desktop */}
                        <td className="py-3 px-2 sm:px-4 hidden lg:table-cell">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(userItem.status)}
                            {getStatusBadge(userItem.status)}
                          </div>
                        </td>
                        {/* Status/Date Info - Desktop */}
                        {(activeTab === 'deleted' || activeTab === 'archived') ? (
                          <td className="py-3 px-2 sm:px-4 hidden md:table-cell">
                            <div className="text-xs text-gray-600">
                              {activeTab === 'deleted' && userItem.deletedAt && (
                                <div>
                                  <div className="font-medium text-red-600">Deleted</div>
                                  <div>{new Date(userItem.deletedAt).toLocaleDateString()}</div>
                                  <div className="text-gray-400">{new Date(userItem.deletedAt).toLocaleTimeString()}</div>
                                </div>
                              )}
                              {activeTab === 'archived' && userItem.archivedAt && (
                                <div>
                                  <div className="font-medium text-orange-600">Archived</div>
                                  <div>{new Date(userItem.archivedAt).toLocaleDateString()}</div>
                                  <div className="text-gray-400">{new Date(userItem.archivedAt).toLocaleTimeString()}</div>
                                </div>
                              )}
                            </div>
                          </td>
                        ) : (
                          <td className="py-3 px-2 sm:px-4 hidden md:table-cell">
                            <div className="text-xs text-gray-600 truncate max-w-[150px]">
                              {userItem.email}
                            </div>
                            <Badge className={`mt-1 ${
                              userItem.emailVerified ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                            } text-xs`}>
                              {userItem.emailVerified ? "✓ Verified" : "○ Pending"}
                            </Badge>
                          </td>
                        )}
                        {/* Actions */}
                        <td className="py-3 px-2 sm:px-4">
                          <div className="flex items-center justify-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-blue-50"
                              onClick={() => handleViewUser(userItem.id)}
                              title="View Details"
                            >
                              <EyeIcon className="w-4 h-4 text-blue-600" />
                            </Button>

                            {activeTab === 'active' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-gray-50"
                                  onClick={() => handleEditUser(userItem)}
                                  title="Edit User"
                                >
                                  <PencilIcon className="w-4 h-4 text-gray-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-purple-50"
                                  onClick={() => handleDuplicateUser(userItem)}
                                  title="Duplicate User"
                                >
                                  <DocumentArrowDownIcon className="w-4 h-4 text-purple-600" />
                                </Button>
                                {(userItem.status === 'PENDING' || userItem.status === 'INACTIVE') ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-green-50"
                                    onClick={() => handleActivateUser(userItem.id)}
                                    disabled={userItem.id === user?.id}
                                    title={userItem.status === 'PENDING' ? 'Activate User' : 'Reactivate User'}
                                  >
                                    <CheckCircleIcon className="w-4 h-4 text-green-600" />
                                  </Button>
                                ) : userItem.status === 'ACTIVE' ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-red-50"
                                    onClick={() => handleDeactivateUser(userItem.id)}
                                    disabled={userItem.id === user?.id}
                                    title="Deactivate User"
                                  >
                                    <XCircleIcon className="w-4 h-4 text-red-600" />
                                  </Button>
                                ) : null}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-orange-50"
                                  onClick={() => handleArchiveUser(userItem.id)}
                                  disabled={userItem.id === user?.id}
                                  title="Archive User"
                                >
                                  <ArchiveBoxIcon className="w-4 h-4 text-orange-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-red-50"
                                  onClick={() => handleDeleteUser(userItem.id)}
                                  disabled={userItem.id === user?.id}
                                  title="Move to Trash"
                                >
                                  <TrashIcon className="w-4 h-4 text-red-600" />
                                </Button>
                              </>
                            )}

                            {activeTab === 'archived' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-green-50"
                                  onClick={() => handleUnarchiveUser(userItem.id)}
                                  title="Restore from Archive"
                                >
                                  <ArrowUturnLeftIcon className="w-4 h-4 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-red-50"
                                  onClick={() => handleDeleteUser(userItem.id)}
                                  disabled={userItem.id === user?.id}
                                  title="Move to Trash"
                                >
                                  <TrashIcon className="w-4 h-4 text-red-600" />
                                </Button>
                              </>
                            )}

                            {activeTab === 'deleted' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-green-50"
                                  onClick={() => handleRestoreUser(userItem.id)}
                                  title="Restore from Trash"
                                >
                                  <ArrowUturnLeftIcon className="w-4 h-4 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-red-50"
                                  onClick={() => handleDeleteUser(userItem.id)}
                                  disabled={userItem.id === user?.id}
                                  title="Permanently Delete"
                                >
                                  <TrashIcon className="w-4 h-4 text-red-600" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/* Empty State */}
                    {displayUsers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center">
                          <div className="flex flex-col items-center justify-center space-y-4">
                            {activeTab === 'active' && (
                              <>
                                <Users className="w-16 h-16 text-gray-300" />
                                <div>
                                  <h3 className="text-lg font-medium text-gray-900">No active users found</h3>
                                  <p className="mt-1 text-sm text-gray-500">
                                    {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first user'}
                                  </p>
                                </div>
                                {!searchTerm && (
                                  <Button
                                    onClick={() => setShowAddUser(true)}
                                    className="mt-4"
                                  >
                                    <PlusIcon className="w-4 h-4 mr-2" />
                                    Add User
                                  </Button>
                                )}
                              </>
                            )}
                            {activeTab === 'archived' && (
                              <>
                                <ArchiveBoxIcon className="w-16 h-16 text-orange-300" />
                                <div>
                                  <h3 className="text-lg font-medium text-gray-900">No archived users</h3>
                                  <p className="mt-1 text-sm text-gray-500">
                                    Users will appear here when they are archived from the active users list
                                  </p>
                                </div>
                              </>
                            )}
                            {activeTab === 'deleted' && (
                              <>
                                <TrashIcon className="w-16 h-16 text-red-300" />
                                <div>
                                  <h3 className="text-lg font-medium text-gray-900">Trash is empty</h3>
                                  <p className="mt-1 text-sm text-gray-500">
                                    Deleted users will appear here for 30 days before permanent removal
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {/* Always show page size controls and info */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-600">
                      Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, users.length)} of {users.length} users
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Show</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          const newSize = parseInt(e.target.value)
                          setPageSize(newSize)
                          setCurrentPage(1) // Reset to first page
                          fetchUsers(1, '', newSize)
                        }}
                        className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span className="text-sm text-gray-600">entries</span>
                    </div>
                  </div>
                  {/* Only show pagination buttons when there are multiple pages */}
                  {totalPages > 1 && (
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchUsers(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchUsers(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Detail Modal */}
        {showUserDetail && selectedUserDetail && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowUserDetail(false)}
          >
            <div
              className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">User Details</h2>
                <button
                  onClick={() => setShowUserDetail(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUserDetail.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUserDetail.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <Badge className={selectedUserDetail.status === 'ACTIVE' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {selectedUserDetail.status}
                    </Badge>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email Verified</label>
                    <Badge className={selectedUserDetail.emailVerified ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                      {selectedUserDetail.emailVerified ? "Verified" : "Pending"}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUserDetail.phone || 'Not set'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Timezone</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUserDetail.timezone || 'Not set'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Language</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUserDetail.language || 'Not set'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created At</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedUserDetail.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Login</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedUserDetail.lastLoginAt ? new Date(selectedUserDetail.lastLoginAt).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                </div>

                {selectedUserDetail.userTenants && selectedUserDetail.userTenants.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tenants</label>
                    <div className="space-y-2">
                      {selectedUserDetail.userTenants.map((ua: any, index: number) => (
                        <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                          <Badge className={`${
                            ua.tenant.type === 'BUSINESS' ? 'bg-blue-100 text-blue-800' :
                            ua.tenant.type === 'CORE' ? 'bg-purple-100 text-purple-800' :
                            'bg-green-100 text-green-800'
                          } text-xs`}>
                            {ua.tenant.type}
                          </Badge>
                          <span className="text-sm text-gray-600">{ua.tenant.name}</span>
                          {ua.isPrimary && (
                            <Badge className="bg-yellow-100 text-yellow-800 text-xs">Primary</Badge>
                          )}
                          <Badge className="bg-gray-100 text-gray-800 text-xs">
                            {ua.role?.displayName || ua.role?.name}
                          </Badge>
                        </div>
                      ))}
                      {selectedUserDetail.userTenants.length === 0 && (
                        <p className="text-sm text-gray-500">No tenant assignments</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <Button variant="outline" onClick={() => setShowUserDetail(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add User Modal */}
        {showAddUser && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowAddUser(false)}
          >
            <div
              className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Add New User</h2>
                <button
                  onClick={() => setShowAddUser(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <Input
                      placeholder="Enter user full name"
                      value={addUserForm.name}
                      onChange={(e) => handleAddUserFieldChange('name', e.target.value)}
                      className={addUserErrors.name ? 'border-red-500 focus:border-red-500' : ''}
                    />
                    {addUserErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{addUserErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                    <Input
                      type="email"
                      placeholder="user@example.com"
                      value={addUserForm.email}
                      onChange={(e) => handleAddUserFieldChange('email', e.target.value)}
                      className={addUserErrors.email ? 'border-red-500 focus:border-red-500' : ''}
                    />
                    {addUserErrors.email && (
                      <p className="mt-1 text-sm text-red-600">{addUserErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                    <Input
                      type="password"
                      placeholder="Enter password (min 6 characters)"
                      value={addUserForm.password}
                      onChange={(e) => handleAddUserFieldChange('password', e.target.value)}
                      className={addUserErrors.password ? 'border-red-500 focus:border-red-500' : ''}
                    />
                    {addUserErrors.password && (
                      <p className="mt-1 text-sm text-red-600">{addUserErrors.password}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <Input
                      placeholder="+62 812-3456-7890"
                      value={addUserForm.phone}
                      onChange={(e) => handleAddUserFieldChange('phone', e.target.value)}
                      className={addUserErrors.phone ? 'border-red-500 focus:border-red-500' : ''}
                    />
                    {addUserErrors.phone && (
                      <p className="mt-1 text-sm text-red-600">{addUserErrors.phone}</p>
                    )}
                  </div>
                </div>

                {/* Account Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Account Settings</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={addUserForm.status}
                      onChange={(e) => setAddUserForm({...addUserForm, status: e.target.value})}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={addUserForm.timezone}
                      onChange={(e) => setAddUserForm({...addUserForm, timezone: e.target.value})}
                    >
                      <option value="UTC">UTC</option>
                      <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                      <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                      <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                      <option value="Asia/Singapore">Asia/Singapore</option>
                      <option value="Asia/Bangkok">Asia/Bangkok</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="Europe/London">Europe/London</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={addUserForm.language}
                      onChange={(e) => setAddUserForm({...addUserForm, language: e.target.value})}
                    >
                      <option value="en">English</option>
                      <option value="id">Bahasa Indonesia</option>
                      <option value="zh">中文</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Tenant & Role Assignment */}
              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Tenant & Role Assignment</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tenant *</label>
                    <div className="relative">
                      <select
                        className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                          addUserErrors.tenantId ? 'border-red-500 focus:border-red-500' : 'border-gray-300'
                        }`}
                        value={addUserForm.tenantId}
                        onChange={(e) => handleTenantChange(e.target.value)}
                        disabled={tenantsLoading}
                      >
                        <option value="">
                          {tenantsLoading
                            ? 'Loading tenants...'
                            : 'Select a tenant'
                          }
                        </option>
                        {availableTenants.map((tenant: any) => (
                          <option key={tenant.id} value={tenant.id}>
                            {tenant.name} ({tenant.type})
                          </option>
                        ))}
                      </select>
                      {tenantsLoading && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {tenantsLoading
                        ? 'Loading available tenants...'
                        : availableTenants.length === 0
                        ? 'No tenants available'
                        : `Found ${availableTenants.length} available tenants`
                      }
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                    <div className="relative">
                      <select
                        className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                          addUserErrors.roleId ? 'border-red-500 focus:border-red-500' : 'border-gray-300'
                        }`}
                        value={addUserForm.roleId}
                        onChange={(e) => handleAddUserFieldChange('roleId', e.target.value)}
                        disabled={!addUserForm.tenantId || rolesLoading}
                      >
                        <option value="">
                          {!addUserForm.tenantId
                            ? 'Select tenant first'
                            : rolesLoading
                            ? 'Loading roles...'
                            : 'Select a role'
                          }
                        </option>
                        {availableRoles.map((role: any) => (
                          <option key={role.id} value={role.id}>
                            {role.displayName} ({role.level})
                          </option>
                        ))}
                      </select>
                      {rolesLoading && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    {addUserErrors.roleId && (
                      <p className="mt-1 text-sm text-red-600">{addUserErrors.roleId}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      {!addUserForm.tenantId
                        ? 'Please select a tenant first'
                        : availableRoles.length === 0 && !rolesLoading
                        ? 'No roles available for this tenant'
                        : `Found ${availableRoles.length} roles`
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Email Invitation */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="sendEmailInvite"
                    checked={addUserForm.sendEmailInvite}
                    onChange={(e) => setAddUserForm({...addUserForm, sendEmailInvite: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="sendEmailInvite" className="ml-2 text-sm text-gray-700">
                    Send email invitation to this user with login credentials
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddUser(false)
                    setAddUserForm({
                      name: '',
                      email: '',
                      password: '',
                      phone: '',
                      timezone: 'UTC',
                      language: 'en',
                      status: 'PENDING',
                      tenantId: '',
                      roleId: '',
                      sendEmailInvite: true
                    })
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddUserSubmit}
                  disabled={addUserLoading || !addUserForm.name || !addUserForm.email || !addUserForm.password || !addUserForm.tenantId || !addUserForm.roleId}
                >
                  {addUserLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Creating User...
                    </>
                  ) : (
                    'Create User'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditUser && selectedEditUser && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowEditUser(false)}
          >
            <div
              className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Edit User: {selectedEditUser.name}</h2>
                <button
                  onClick={() => setShowEditUser(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <Input
                      placeholder="Enter user full name"
                      value={editUserForm.name}
                      onChange={(e) => handleEditUserFieldChange('name', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                    <Input
                      type="email"
                      placeholder="user@example.com"
                      value={editUserForm.email}
                      onChange={(e) => handleEditUserFieldChange('email', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <Input
                      type="password"
                      placeholder="Leave empty to keep current password"
                      value={editUserForm.password || ''}
                      onChange={(e) => handleEditUserFieldChange('password', e.target.value)}
                    />
                    <p className="mt-1 text-xs text-gray-500">Leave empty to keep current password</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <Input
                      placeholder="+62 812-3456-7890"
                      value={editUserForm.phone}
                      onChange={(e) => handleEditUserFieldChange('phone', e.target.value)}
                    />
                  </div>
                </div>

                {/* Account Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Account Settings</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={editUserForm.status}
                      onChange={(e) => handleEditUserFieldChange('status', e.target.value)}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={editUserForm.timezone}
                      onChange={(e) => handleEditUserFieldChange('timezone', e.target.value)}
                    >
                      <option value="UTC">UTC</option>
                      <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                      <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                      <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                      <option value="Asia/Singapore">Asia/Singapore</option>
                      <option value="Asia/Bangkok">Asia/Bangkok</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="Europe/London">Europe/London</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={editUserForm.language}
                      onChange={(e) => handleEditUserFieldChange('language', e.target.value)}
                    >
                      <option value="en">English</option>
                      <option value="id">Bahasa Indonesia</option>
                      <option value="zh">中文</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Tenant & Role Assignment */}
              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Tenant & Role Assignment</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tenant *</label>
                    <div className="relative">
                      <select
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        value={editUserForm.tenantId}
                        onChange={(e) => handleEditTenantChange(e.target.value)}
                        disabled={tenantsLoading}
                      >
                        <option value="">
                          {tenantsLoading
                            ? 'Loading tenants...'
                            : 'Select a tenant'
                          }
                        </option>
                        {availableTenants.map((tenant: any) => (
                          <option key={tenant.id} value={tenant.id}>
                            {tenant.name} ({tenant.type})
                          </option>
                        ))}
                      </select>
                      {tenantsLoading && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {tenantsLoading
                        ? 'Loading available tenants...'
                        : availableTenants.length === 0
                        ? 'No tenants available'
                        : `Found ${availableTenants.length} available tenants`
                      }
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                    <div className="relative">
                      <select
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        value={editUserForm.roleId}
                        onChange={(e) => handleEditUserFieldChange('roleId', e.target.value)}
                        disabled={!editUserForm.tenantId || editRolesLoading}
                      >
                        <option value="">
                          {!editUserForm.tenantId
                            ? 'Select tenant first'
                            : editRolesLoading
                            ? 'Loading roles...'
                            : 'Select a role'
                          }
                        </option>
                        {editAvailableRoles.map((role: any) => (
                          <option key={role.id} value={role.id}>
                            {role.displayName} ({role.level})
                          </option>
                        ))}
                      </select>
                      {editRolesLoading && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {!editUserForm.tenantId
                        ? 'Please select a tenant first'
                        : editAvailableRoles.length === 0 && !editRolesLoading
                        ? 'No roles available for this tenant'
                        : `Found ${editAvailableRoles.length} roles`
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Actions */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Additional Actions</h4>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                    📧 Send Password Reset Email
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                    🔄 Reset User Session
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                    📋 View Login History
                  </button>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditUser(false)
                    setSelectedEditUser(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEditUserSubmit}
                  disabled={editUserLoading || !editUserForm.name || !editUserForm.email || !editUserForm.tenantId || !editUserForm.roleId}
                >
                  {editUserLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Saving Changes...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}