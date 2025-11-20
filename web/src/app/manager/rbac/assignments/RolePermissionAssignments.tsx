'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/stores/authStore'
import api from '@/lib/api'
import type { Role, Permission, RolePermission } from '@/types'
import { formatPermissionScope } from '@/lib/rbac-utils'

interface RolePermissionFormData {
  roleId: string
  permissionId: string
}

export function RolePermissionAssignments({ hasFullAccess }: { hasFullAccess: boolean }) {
  const { user, currentTenant } = useAuthStore()
  const { toast } = useToast()
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [formData, setFormData] = useState<RolePermissionFormData>({
    roleId: '',
    permissionId: ''
  })

  const fetchRolePermissions = async () => {
    if (!selectedRole) return

    try {
      setLoading(true)
      const response = await api.get(`/admin/roles/${selectedRole.id}/permissions`)
      setRolePermissions(response.data)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch role permissions',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const response = await api.get('/admin/roles')
      setRoles(response.data)
      if (response.data.length > 0 && !selectedRole) {
        setSelectedRole(response.data[0])
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error)
    }
  }

  const fetchPermissions = async () => {
    try {
      const response = await api.get('/admin/permissions')
      setPermissions(response.data)
    } catch (error) {
      console.error('Failed to fetch permissions:', error)
    }
  }

  useEffect(() => {
    fetchRoles()
    fetchPermissions()
  }, [currentTenant])

  useEffect(() => {
    if (selectedRole) {
      fetchRolePermissions()
      setFormData({ ...formData, roleId: selectedRole.id })
    }
  }, [selectedRole])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await api.post('/admin/role-permissions', formData)
      toast({
        title: 'Success',
        description: 'Permission assigned to role successfully'
      })

      setIsDialogOpen(false)
      resetForm()
      fetchRolePermissions()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to assign permission',
        variant: 'destructive'
      })
    }
  }

  const handleRemove = async (rolePermissionId: string) => {
    if (!confirm('Are you sure you want to remove this permission from the role?')) return

    try {
      await api.delete(`/admin/role-permissions/${rolePermissionId}`)
      toast({
        title: 'Success',
        description: 'Permission removed from role successfully'
      })
      fetchRolePermissions()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to remove permission',
        variant: 'destructive'
      })
    }
  }

  const resetForm = () => {
    setFormData({
      roleId: selectedRole?.id || '',
      permissionId: ''
    })
  }

  const openDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const getAvailablePermissions = () => {
    if (!selectedRole) return []

    const assignedPermissionIds = rolePermissions.map(rp => rp.permission?.id).filter(Boolean) as string[]
    return permissions.filter(p => !assignedPermissionIds.includes(p.id))
  }

  const handleRoleChange = (roleId: string) => {
    const role = roles.find(r => r.id === roleId)
    setSelectedRole(role || null)
  }

  if (loading && !selectedRole) {
    return <div>Loading role permissions...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Role Permissions</h2>
          <p className="text-muted-foreground">
            Manage permissions assigned to roles
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-sm">
          <Label htmlFor="roleSelect">Select Role</Label>
          <Select
            value={selectedRole?.id || ''}
            onValueChange={handleRoleChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role to manage permissions" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openDialog} disabled={!selectedRole}>
          Add Permission
        </Button>
      </div>

      {selectedRole && (
        <Card>
          <CardHeader>
            <CardTitle>Permissions for {selectedRole.displayName}</CardTitle>
            <CardDescription>
              Current permissions assigned to this role
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading permissions...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permission</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>System</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rolePermissions.map((rolePermission) => (
                    <TableRow key={rolePermission.id}>
                      <TableCell className="font-medium">
                        {rolePermission.permission?.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {rolePermission.permission?.resource}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {rolePermission.permission?.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          rolePermission.permission?.scope === 'ALL' ? 'destructive' : 'default'
                        }>
                          {formatPermissionScope(rolePermission.permission?.scope || 'TENANT')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {rolePermission.permission?.category ? (
                          <Badge variant="secondary">
                            {rolePermission.permission.category}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          rolePermission.permission?.isSystemPermission ? 'destructive' : 'default'
                        }>
                          {rolePermission.permission?.isSystemPermission ? 'System' : 'Custom'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemove(rolePermission.id)}
                          disabled={
                            !hasFullAccess ||
                            rolePermission.permission?.isSystemPermission
                          }
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              Add Permission to Role
            </DialogTitle>
            <DialogDescription>
              Assign a new permission to the selected role.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="permissionId">Permission</Label>
              <Select
                value={formData.permissionId}
                onValueChange={(value) => setFormData({ ...formData, permissionId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select permission" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailablePermissions().map((permission) => (
                    <SelectItem key={permission.id} value={permission.id}>
                      {permission.name} - {permission.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getAvailablePermissions().length === 0 && (
                <p className="text-sm text-muted-foreground">
                  All available permissions are already assigned to this role.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!formData.permissionId}>
                Assign Permission
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}