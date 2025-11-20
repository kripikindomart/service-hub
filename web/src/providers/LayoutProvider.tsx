'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { AdminLayoutV1 } from '@/components/layout/AdminLayoutV1'
import { AdminLayoutV2 } from '@/components/layout/AdminLayoutV2'
import { useAuth } from '@/hooks/useAuth'
import { getLayoutConfig, getTenantLayoutPreference, setTenantLayoutPreference, LayoutConfig, LayoutVersion } from '@/lib/layout-config'
import { menuService } from '@/services/menu.service'
import { HomeIcon, Building2Icon, UsersIcon, BarChart3Icon, SettingsIcon } from 'lucide-react'

interface LayoutContextType {
  layoutVersion: LayoutVersion
  setLayoutVersion: (version: LayoutVersion) => void
  layoutConfig: LayoutConfig
  switchLayout: () => void
  isLayoutSwitchingAllowed: boolean
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined)

interface LayoutProviderProps {
  children: ReactNode
  title: string
  subtitle?: string
  forcedLayout?: LayoutVersion // Override auto-selection
  allowLayoutSwitching?: boolean // Override config-based switching
}

export function useLayout() {
  const context = useContext(LayoutContext)
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider')
  }
  return context
}

export function LayoutProvider({
  children,
  title,
  subtitle,
  forcedLayout,
  allowLayoutSwitching
}: LayoutProviderProps) {
  const { currentTenant } = useAuth()
  const [layoutVersion, setLayoutVersion] = useState<LayoutVersion>(1)
  const [tenantMenus, setTenantMenus] = useState<any[]>([])
  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''

  // Determine layout configuration based on tenant
  const layoutConfig: LayoutConfig = currentTenant
    ? getLayoutConfig(currentTenant.type)
    : {
        version: 1,
        tenantType: 'CORE',
        features: {
          showStats: true,
          showQuickActions: true,
          showRecentActivity: true,
          allowLayoutSwitching: true
        }
      }

  // Check if layout switching is allowed (from config or prop override)
  const isLayoutSwitchingAllowed = allowLayoutSwitching ?? layoutConfig.features.allowLayoutSwitching

  // Load tenant-specific menus
  useEffect(() => {
    const loadTenantMenus = async () => {
      if (currentTenant && currentTenant.type !== 'CORE') {
        try {
          const menus = await menuService.getSidebarMenus(currentTenant.id)
          setTenantMenus(menus)
        } catch (error) {
          console.error('Error loading tenant menus:', error)
          setTenantMenus([])
        }
      } else {
        setTenantMenus([])
      }
    }

    loadTenantMenus()
  }, [currentTenant])

  // Auto-select layout based on tenant configuration
  useEffect(() => {
    if (!forcedLayout && currentTenant) {
      // Try user preference first, then fall back to config
      const userPreference = getTenantLayoutPreference(currentTenant.id)
      const configVersion = layoutConfig.version

      const preferredVersion = userPreference || configVersion
      if (preferredVersion !== layoutVersion) {
        setLayoutVersion(preferredVersion)
      }
    }
  }, [currentTenant, forcedLayout, layoutConfig.version, layoutVersion])

  // Save layout preference when changed
  useEffect(() => {
    if (currentTenant && !forcedLayout) {
      setTenantLayoutPreference(currentTenant.id, layoutVersion)
    }
  }, [currentTenant, layoutVersion, forcedLayout])

  // Get the appropriate layout component
  const LayoutComponent = forcedLayout
    ? (forcedLayout === 1 ? AdminLayoutV1 : AdminLayoutV2)
    : (layoutVersion === 1 ? AdminLayoutV1 : AdminLayoutV2)

  // Switch layout function
  const switchLayout = () => {
    const newVersion = layoutVersion === 1 ? 2 : 1
    setLayoutVersion(newVersion)

    // Save preference if allowed
    if (currentTenant && isLayoutSwitchingAllowed) {
      setTenantLayoutPreference(currentTenant.id, newVersion)
    }
  }

  const value: LayoutContextType = {
    layoutVersion,
    setLayoutVersion,
    layoutConfig,
    switchLayout,
    isLayoutSwitchingAllowed
  }

  // Get tenant-specific navigation if available
  const getTenantNavigation = () => {
    if (currentTenant && currentTenant.type !== 'CORE' && tenantMenus.length > 0) {
      // Convert tenant menus to navigation format
      return tenantMenus.map((menu: any) => ({
        name: menu.label,
        href: `/${currentTenant.slug}${menu.path}`,
        icon: menu.icon === 'HomeIcon' ? HomeIcon :
               menu.icon === 'Building2Icon' ? Building2Icon :
               menu.icon === 'UsersIcon' ? UsersIcon :
               menu.icon === 'BarChart3Icon' ? BarChart3Icon :
               menu.icon === 'SettingsIcon' ? SettingsIcon :
               Building2Icon, // Default icon
        current: pathname === `/${currentTenant.slug}${menu.path}` ||
                pathname === menu.path // Also check exact match
      }))
    }
    return null // Use default navigation for CORE tenant or when no tenant menus exist
  }

  return (
    <LayoutContext.Provider value={value}>
      <LayoutComponent
        title={title}
        subtitle={subtitle}
        navigation={getTenantNavigation()}
      >
        {children}
      </LayoutComponent>
    </LayoutContext.Provider>
  )
}