import api from '@/lib/api'
import { MenuItem } from '@/types'

export interface TenantSettings {
  theme?: string
  branding?: string
  dashboardLayout?: string
  defaultWidgets?: string[]
  customFeatures?: string[]
  primaryColor?: string
}

export interface MenuResponse {
  success: boolean
  message: string
  data: MenuItem[]
}

export interface MenuTreeResponse {
  success: boolean
  message: string
  data: MenuItem[]
}

export interface GetMenusParams {
  tenantId?: string
  location?: 'HEADER' | 'SIDEBAR' | 'FOOTER' | 'CUSTOM'
  isActive?: boolean
  parentId?: string | null
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

class MenuService {
  private baseUrl = '/menus'

  /**
   * Get public menus for header (landing page)
   */
  async getPublicHeaderMenus(): Promise<MenuItem[]> {
    try {
      const response = await api.get<MenuTreeResponse>('/menus/public/header')
      if (response.data?.success) {
        return response.data.data || []
      }
      return []
    } catch (error) {
      console.error('Error fetching public header menus:', error)
      return []
    }
  }

  /**
   * Get public menus for footer (landing page)
   */
  async getPublicFooterMenus(): Promise<MenuItem[]> {
    try {
      const response = await api.get<MenuTreeResponse>('/menus/public/footer')
      if (response.data?.success) {
        return response.data.data || []
      }
      return []
    } catch (error) {
      console.error('Error fetching public footer menus:', error)
      return []
    }
  }

  /**
   * Get sidebar menus for authenticated user
   */
  async getSidebarMenus(tenantId?: string): Promise<MenuItem[]> { console.log("?? [Menu Service] Fetching sidebar menus for tenant:", tenantId)
    try {
      const response = await api.get<MenuTreeResponse>(`${this.baseUrl}/tree`, {
        params: {
          location: 'SIDEBAR',
          tenantId,
          isActive: true
        }
      })

      if (response.data?.success) {
        return response.data.data || []
      }
      return []
    } catch (error) {
      console.error('Error fetching sidebar menus:', error)
      return []
    }
  }

  /**
   * Get menus for specific user
   */
  async getUserMenus(userId: string, tenantId?: string): Promise<MenuItem[]> {
    try {
      const response = await api.get<MenuTreeResponse>(`${this.baseUrl}/user/${userId}`, {
        params: {
          tenantId,
          parentId: null // Get root menus only
        }
      })

      if (response.data?.success) {
        return response.data.data || []
      }
      return []
    } catch (error) {
      console.error('Error fetching user menus:', error)
      return []
    }
  }

  /**
   * Get all menus (admin only)
   */
  async getAllMenus(params?: GetMenusParams): Promise<MenuItem[]> {
    try {
      const response = await api.get<MenuResponse>(`${this.baseUrl}`, {
        params
      })

      if (response.data?.success) {
        return response.data.data || []
      }
      return []
    } catch (error) {
      console.error('Error fetching all menus:', error)
      return []
    }
  }

  /**
   * Get menu by ID (admin only)
   */
  async getMenuById(id: string): Promise<MenuItem | null> {
    try {
      const response = await api.get<{ success: boolean; data: MenuItem }>(`${this.baseUrl}/${id}`)

      if (response.data?.success) {
        return response.data.data
      }
      return null
    } catch (error) {
      console.error('Error fetching menu by ID:', error)
      return null
    }
  }

  /**
   * Create new menu (admin only)
   */
  async createMenu(menuData: Partial<MenuItem>): Promise<MenuItem | null> {
    try {
      const response = await api.post<{ success: boolean; data: MenuItem }>(`${this.baseUrl}`, menuData)

      if (response.data?.success) {
        return response.data.data
      }
      return null
    } catch (error) {
      console.error('Error creating menu:', error)
      return null
    }
  }

  /**
   * Update menu (admin only)
   */
  async updateMenu(id: string, menuData: Partial<MenuItem>): Promise<MenuItem | null> {
    try {
      const response = await api.put<{ success: boolean; data: MenuItem }>(`${this.baseUrl}/${id}`, menuData)

      if (response.data?.success) {
        return response.data.data
      }
      return null
    } catch (error) {
      console.error('Error updating menu:', error)
      return null
    }
  }

  /**
   * Delete menu (admin only)
   */
  async deleteMenu(id: string, force: boolean = false): Promise<boolean> {
    try {
      const response = await api.delete<{ success: boolean }>(`${this.baseUrl}/${id}`, {
        params: { force: force.toString() }
      })

      return response.data?.success || false
    } catch (error) {
      console.error('Error deleting menu:', error)
      return false
    }
  }

  /**
   * Reorder menus (admin only)
   */
  async reorderMenus(menuOrders: { id: string; order: number; parentId?: string | null }[]): Promise<boolean> {
    try {
      const response = await api.post<{ success: boolean }>(`${this.baseUrl}/reorder`, {
        menuOrders
      })

      return response.data?.success || false
    } catch (error) {
      console.error('Error reordering menus:', error)
      return false
    }
  }

  /**
   * Duplicate menu (admin only)
   */
  async duplicateMenu(id: string, data?: { name?: string; label?: string; tenantId?: string }): Promise<MenuItem | null> {
    try {
      const response = await api.post<{ success: boolean; data: MenuItem }>(`${this.baseUrl}/${id}/duplicate`, data)

      if (response.data?.success) {
        return response.data.data
      }
      return null
    } catch (error) {
      console.error('Error duplicating menu:', error)
      return null
    }
  }

  /**
   * Get menu categories (admin only)
   */
  async getMenuCategories(): Promise<Array<{ value: string; label: string }>> {
    try {
      const response = await api.get<{ success: boolean; data: Array<{ value: string; label: string }> }>(`${this.baseUrl}/categories`)

      if (response.data?.success) {
        return response.data.data || []
      }
      return []
    } catch (error) {
      console.error('Error fetching menu categories:', error)
      return []
    }
  }

  /**
   * Convert menu item to navigation item format
   */
  menuToNavMenuItem(menu: MenuItem): any {
    return {
      id: menu.id,
      title: menu.label,
      icon: menu.icon,
      url: menu.path || menu.url,
      target: menu.target,
      badge: menu.metadata?.badge,
      isActive: menu.isActive,
      order: menu.order,
      children: menu.children?.map(child => this.menuToNavMenuItem(child)) || []
    }
  }

  /**
   * Build flat menu array from hierarchical structure
   */
  flattenMenus(menus: MenuItem[]): MenuItem[] {
    const flat: MenuItem[] = []

    const flatten = (items: MenuItem[]) => {
      items.forEach(item => {
        flat.push(item)
        if (item.children && item.children.length > 0) {
          flatten(item.children)
        }
      })
    }

    flatten(menus)
    return flat
  }

  /**
   * Find menu by path in hierarchical structure
   */
  findMenuByPath(menus: MenuItem[], path: string): MenuItem | null {
    for (const menu of menus) {
      if (menu.path === path || menu.url === path) {
        return menu
      }

      if (menu.children && menu.children.length > 0) {
        const found = this.findMenuByPath(menu.children, path)
        if (found) return found
      }
    }
    return null
  }

  /**
   * Get tenant settings and preferences
   */
  async getTenantSettings(tenantId: string): Promise<TenantSettings | null> {
    try {
      const response = await api.get(`/tenants/${tenantId}`)
      return response.data?.data?.settings || null
    } catch (error) {
      console.error('Error fetching tenant settings:', error)
      return null
    }
  }

  /**
   * Apply tenant theme and preferences
   */
  applyTenantPreferences(settings: TenantSettings) {
    if (!settings) return

    console.log('Applying tenant preferences:', settings)

    // Apply primary color with proper CSS variables
    if (settings.primaryColor) {
      // Convert hex to HSL for CSS variables
      const hsl = this.hexToHSL(settings.primaryColor)
      document.documentElement.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`)
      document.documentElement.style.setProperty('--ring', `${hsl.h} ${hsl.s}% ${hsl.l}%`)

      // Apply to all elements with primary color
      document.documentElement.style.setProperty('--tw-bg-opacity', '1')

      console.log('Applied primary color HSL:', `${hsl.h} ${hsl.s}% ${hsl.l}%`)

      // Force update Tailwind primary color
      const style = document.createElement('style')
      style.innerHTML = `
        .bg-primary { background-color: ${settings.primaryColor} !important; }
        .text-primary-foreground { color: white !important; }
        .border-primary { border-color: ${settings.primaryColor} !important; }
        .ring-primary { --tw-ring-color: ${settings.primaryColor} !important; }
      `
      document.head.appendChild(style)
    }

    // Apply theme class
    if (settings.theme) {
      document.body.className = document.body.className.replace(/theme-\w+/g, '')
      document.body.classList.add(`theme-${settings.theme}`)
      console.log('Applied theme class:', `theme-${settings.theme}`)
    }

    // Apply branding
    if (settings.branding) {
      document.title = `${settings.branding} - Service Hub`
      console.log('Applied branding:', settings.branding)
    }

    // Store in localStorage for persistence
    localStorage.setItem('tenantPreferences', JSON.stringify(settings))
    console.log('Stored tenant preferences in localStorage')
  }

  /**
   * Convert hex color to HSL
   */
  private hexToHSL(hex: string): { h: number; s: number; l: number } {
    // Remove # if present
    hex = hex.replace('#', '')

    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16) / 255
    const g = parseInt(hex.substr(2, 2), 16) / 255
    const b = parseInt(hex.substr(4, 2), 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
        case g: h = ((b - r) / d + 2) / 6; break
        case b: h = ((r - g) / d + 4) / 6; break
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    }
  }

  /**
   * Load and apply tenant-specific menus and preferences
   */
  async loadTenantSpecificExperience(tenantId: string) {
    try {
      // Load tenant settings
      const settings = await this.getTenantSettings(tenantId)
      if (settings) {
        this.applyTenantPreferences(settings)
      }

      // Load tenant menus
      const menus = await this.getSidebarMenus(tenantId)

      return {
        menus,
        settings
      }
    } catch (error) {
      console.error('Error loading tenant experience:', error)
      throw error
    }
  }

  /**
   * Clear tenant preferences
   */
  clearTenantPreferences() {
    localStorage.removeItem('tenantPreferences')
    document.documentElement.style.removeProperty('--primary-color')
    document.body.className = document.body.className.replace(/theme-\w+/g, '')
  }
}

export const menuService = new MenuService()
export default menuService
