export type LayoutVersion = 1 | 2

export interface LayoutConfig {
  version: LayoutVersion
  tenantType: 'CORE' | 'BUSINESS' | 'STARTUP' | 'ENTERPRISE' | 'RETAIL'
  features: {
    showStats: boolean
    showQuickActions: boolean
    showRecentActivity: boolean
    allowLayoutSwitching: boolean
  }
}

export const defaultLayoutConfigs: Record<string, LayoutConfig> = {
  CORE: {
    version: 1,
    tenantType: 'CORE',
    features: {
      showStats: true,
      showQuickActions: true,
      showRecentActivity: true,
      allowLayoutSwitching: true
    }
  },
  BUSINESS: {
    version: 2,
    tenantType: 'BUSINESS',
    features: {
      showStats: true,
      showQuickActions: true,
      showRecentActivity: false,
      allowLayoutSwitching: false
    }
  },
  STARTUP: {
    version: 2,
    tenantType: 'STARTUP',
    features: {
      showStats: true,
      showQuickActions: true,
      showRecentActivity: false,
      allowLayoutSwitching: false
    }
  },
  ENTERPRISE: {
    version: 1,
    tenantType: 'ENTERPRISE',
    features: {
      showStats: true,
      showQuickActions: true,
      showRecentActivity: true,
      allowLayoutSwitching: true
    }
  },
  RETAIL: {
    version: 2,
    tenantType: 'RETAIL',
    features: {
      showStats: true,
      showQuickActions: true,
      showRecentActivity: false,
      allowLayoutSwitching: false
    }
  }
}

export function getLayoutConfig(tenantType: string): LayoutConfig {
  return defaultLayoutConfigs[tenantType] || defaultLayoutConfigs.BUSINESS
}

export function getTenantLayoutPreference(tenantId: string): LayoutVersion {
  // Could be stored in user preferences or database
  const stored = localStorage.getItem(`layout-preference-${tenantId}`)
  return stored ? (parseInt(stored) as LayoutVersion) : 1
}

export function setTenantLayoutPreference(tenantId: string, version: LayoutVersion): void {
  localStorage.setItem(`layout-preference-${tenantId}`, version.toString())
}