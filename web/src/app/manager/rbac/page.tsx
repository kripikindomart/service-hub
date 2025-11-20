'use client'

import React, { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RoleManagement } from './roles/RoleManagement'
import { PermissionManagement } from './permissions/PermissionManagement'
import { UserAssignment } from './assignments/UserAssignment'
import { RolePermissionAssignment } from './assignments/RolePermissionAssignment'
import { useAuthStore } from '@/stores/authStore'
import { hasSystemAccess } from '@/lib/rbac-utils'
import {
  ShieldCheckIcon,
  UserGroupIcon,
  KeyIcon,
  ChartBarIcon,
  PlusIcon,
  CogIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline'

export default function RBACPage() {
  const { user, currentTenant } = useAuthStore()
  const [hasFullAccess, setHasFullAccess] = useState(false)

  useEffect(() => {
    // Check if user has full system access
    const canAccessAll = hasSystemAccess(user, currentTenant)
    setHasFullAccess(canAccessAll)

    // Debug log
    console.log('🔍 RBAC Debug:', {
      user: user?.name,
      userLevel: user?.userAssignments?.map(ua => ({
        role: ua.role?.name,
        type: ua.role?.type,
        level: ua.role?.level
      })),
      tenant: currentTenant?.name,
      tenantType: currentTenant?.type,
      hasFullAccess: canAccessAll
    })

    // TEMPORARY: Force full access for Super Admin testing
    if (user?.email === 'superadmin@system.com') {
      console.log('🚀 FORCING FULL ACCESS FOR SUPER ADMIN')
      setHasFullAccess(true)
      return
    }
  }, [user, currentTenant])

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
              RBAC Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive role-based access control system for your organization
            </p>
            <div className="flex items-center gap-3 mt-3">
              <Badge variant={hasFullAccess ? "default" : "secondary"} className="flex items-center gap-1">
                <LockClosedIcon className="w-3 h-3" />
                {hasFullAccess ? "System Admin - Full Access" : "Limited Access"}
              </Badge>
              {currentTenant && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <CogIcon className="w-3 h-3" />
                  {currentTenant.name}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm">
              <ChartBarIcon className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
            {hasFullAccess && (
              <Button size="sm">
                <PlusIcon className="w-4 h-4 mr-2" />
                Quick Setup
              </Button>
            )}
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Roles</p>
                  <p className="text-2xl font-bold text-gray-900">12</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ShieldCheckIcon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">2 system, 10 custom</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Permissions</p>
                  <p className="text-2xl font-bold text-gray-900">48</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <KeyIcon className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Across 8 modules</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">User Assignments</p>
                  <p className="text-2xl font-bold text-gray-900">156</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <UserGroupIcon className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Active this month</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Security Score</p>
                  <p className="text-2xl font-bold text-gray-900">92%</p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <ShieldCheckIcon className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Excellent compliance</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="roles" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 h-12">
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <ShieldCheckIcon className="w-4 h-4" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <KeyIcon className="w-4 h-4" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="user-assignments" className="flex items-center gap-2">
              <UserGroupIcon className="w-4 h-4" />
              User Assignments
            </TabsTrigger>
            <TabsTrigger value="role-permissions" className="flex items-center gap-2">
              <CogIcon className="w-4 h-4" />
              Role Permissions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="space-y-4">
            <RoleManagement hasFullAccess={hasFullAccess} />
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <PermissionManagement hasFullAccess={hasFullAccess} />
          </TabsContent>

          <TabsContent value="user-assignments" className="space-y-4">
            <UserAssignment hasFullAccess={hasFullAccess} />
          </TabsContent>

          <TabsContent value="role-permissions" className="space-y-4">
            <RolePermissionAssignment hasFullAccess={hasFullAccess} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}