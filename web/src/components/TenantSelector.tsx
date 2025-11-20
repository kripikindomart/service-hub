'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { getAuthUser } from '@/lib/auth'
import {
  BuildingOfficeIcon,
  ChevronDownIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import { Badge } from '@/components/ui/badge'

export default function TenantSelector() {
  const { user, currentTenant, setCurrentTenant } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    }, [user, currentTenant, setCurrentTenant])

  const handleTenantChange = (tenant: any) => {
    setCurrentTenant(tenant)
    localStorage.setItem('currentTenant', JSON.stringify(tenant))
    setIsOpen(false)
    console.log('🏢 Tenant changed to:', tenant.name)

    // Trigger menu reload by dispatching custom event
    window.dispatchEvent(new CustomEvent('tenantChanged', { detail: tenant }))
  }

  const availableTenants = user?.userTenants?.map((ut: any) => ut.tenant) || []

  if (!currentTenant) {
    return null
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 hover:bg-white transition-colors"
      >
        <BuildingOfficeIcon className="w-4 h-4 text-gray-600" />
        <div className="text-left">
          <div className="text-sm font-medium text-gray-900">
            {currentTenant.name}
          </div>
          <div className="text-xs text-gray-500">
            {currentTenant.role}
          </div>
        </div>
        <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        <Badge variant="outline" className="text-xs">
          {currentTenant.type}
        </Badge>
      </button>

      {isOpen && availableTenants.length > 1 && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-1">
            {availableTenants.map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => handleTenantChange(tenant)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left hover:bg-gray-50 transition-colors ${
                  currentTenant.id === tenant.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                <div className="flex-1">
                  <div className="font-medium">{tenant.name}</div>
                  <div className="text-xs text-gray-500">{tenant.domain || tenant.slug}</div>
                </div>
                {currentTenant.id === tenant.id && (
                  <CheckIcon className="w-4 h-4 text-blue-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}