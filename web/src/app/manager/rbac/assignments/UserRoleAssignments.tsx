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
import type { User, UserAssignment, Role } from '@/types'
import { formatAssignmentStatus } from '@/lib/rbac-utils'

interface AssignmentFormData {
  userId: string
  roleId: string
  tenantId?: string
  isPrimary: boolean
  expiresAt?: string
}

export function UserRoleAssignments({ hasFullAccess }: { hasFullAccess: boolean }) {
  const { user, currentTenant } = useAuthStore()
  const { toast } = useToast()
  const [assignments, setAssignments] = useState<UserAssignment[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<UserAssignment | null>(null)
  const [formData, setFormData] = useState<AssignmentFormData>({
    userId: '',
    roleId: '',
    tenantId: currentTenant?.id,
    isPrimary: false
  })

  const fetchAssignments = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/user-assignments')
      if (response.data?.success) {
        setAssignments(response.data.data)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch user assignments',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users')
      if (response.data?.success) {
        setUsers(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const fetchRoles = async () => {
    try {
      const response = await api.get('/admin/roles')
      if (response.data?.success) {
        setRoles(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error)
    }
  }

  useEffect(() => {
    fetchAssignments()
    fetchUsers()
    fetchRoles()
  }, [currentTenant])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const payload = {
        ...formData,
        tenantId: currentTenant?.id,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : null
      }

      if (editingAssignment) {
        await api.put(`/admin/user-assignments/${editingAssignment.id}`, payload)
        toast({
          title: 'Success',
          description: 'User assignment updated successfully'
        })
      } else {
        await api.post('/admin/user-assignments', payload)
        toast({
          title: 'Success',
          description: 'User assigned successfully'
        })
      }

      setIsDialogOpen(false)
      setEditingAssignment(null)
      resetForm()
      fetchAssignments()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save assignment',
        variant: 'destructive'
      })
    }
  }

  const handleEdit = (assignment: UserAssignment) => {
    setEditingAssignment(assignment)
    setFormData({
      userId: assignment.user?.id || '',
      roleId: assignment.role?.id || '',
      tenantId: assignment.tenant?.id,
      isPrimary: assignment.isPrimary,
      expiresAt: assignment.expiresAt ? new Date(assignment.expiresAt).toISOString().slice(0, 16) : ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return

    try {
      await api.delete(`/admin/user-assignments/${assignmentId}`)
      toast({
        title: 'Success',
        description: 'Assignment removed successfully'
      })
      fetchAssignments()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to remove assignment',
        variant: 'destructive'
      })
    }
  }

  const resetForm = () => {
    setFormData({
      userId: '',
      roleId: '',
      tenantId: currentTenant?.id,
      isPrimary: false
    })
  }

  const openDialog = () => {
    resetForm()
    setEditingAssignment(null)
    setIsDialogOpen(true)
  }

  const handleActivate = async (assignmentId: string) => {
    try {
      await api.patch(`/admin/user-assignments/${assignmentId}/activate`)
      toast({
        title: 'Success',
        description: 'Assignment activated successfully'
      })
      fetchAssignments()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to activate assignment',
        variant: 'destructive'
      })
    }
  }

  const handleSuspend = async (assignmentId: string) => {
    try {
      await api.patch(`/admin/user-assignments/${assignmentId}/suspend`)
      toast({
        title: 'Success',
        description: 'Assignment suspended successfully'
      })
      fetchAssignments()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to suspend assignment',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return <div>Loading user assignments...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Role Assignments</h2>
          <p className="text-muted-foreground">
            Manage user role assignments and permissions
          </p>
        </div>
        <Button onClick={openDialog}>
          Assign Role
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Assignments</CardTitle>
          <CardDescription>
            All user role assignments for {currentTenant?.name || 'System'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Primary</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{assignment.user?.name || 'Unknown User'}</div>
                      <div className="text-sm text-muted-foreground">{assignment.user?.email || 'No email'}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {assignment.role?.displayName || 'Unknown Role'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={assignment.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {formatAssignmentStatus(assignment.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {assignment.isPrimary && (
                      <Badge variant="default">Primary</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(assignment.assignedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {assignment.expiresAt
                      ? new Date(assignment.expiresAt).toLocaleDateString()
                      : 'Never'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(assignment)}
                      >
                        Edit
                      </Button>
                      {assignment.status === 'ACTIVE' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuspend(assignment.id)}
                        >
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivate(assignment.id)}
                        >
                          Activate
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(assignment.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingAssignment ? 'Edit Assignment' : 'Assign Role to User'}
            </DialogTitle>
            <DialogDescription>
              {editingAssignment
                ? 'Update the user role assignment details below.'
                : 'Assign a role to a user with specific permissions.'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId">User</Label>
              <Select
                value={formData.userId}
                onValueChange={(value) => setFormData({ ...formData, userId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roleId">Role</Label>
              <Select
                value={formData.roleId}
                onValueChange={(value) => setFormData({ ...formData, roleId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
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

            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expires At (Optional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPrimary"
                checked={formData.isPrimary}
                onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="isPrimary">Primary Assignment</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingAssignment ? 'Update' : 'Create'} Assignment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}