export interface MenuItem {
  id: string
  name: string
  label: string
  icon?: string
  path?: string
  component?: string
  url?: string
  target?: string
  parentId?: string | null
  tenantId?: string | null
  category?: string
  location?: 'HEADER' | 'SIDEBAR' | 'FOOTER' | 'CUSTOM'
  isActive: boolean
  isPublic: boolean
  order: number
  description?: string
  cssClass?: string
  cssStyle?: string
  attributes?: any
  metadata?: any
  createdAt: Date
  updatedAt: Date
  parent?: MenuItem | null
  children: MenuItem[]
  permissions: MenuItemPermission[]
}

export interface MenuItemPermission {
  id: string
  name: string
  resource: string
  action: string
  scope: string
}

export interface CreateMenuData {
  name: string
  label: string
  icon?: string
  path?: string
  component?: string
  url?: string
  target?: string
  parentId?: string | null
  tenantId?: string | null
  category?: string
  location?: 'HEADER' | 'SIDEBAR' | 'FOOTER' | 'CUSTOM'
  isActive?: boolean
  isPublic?: boolean
  order?: number
  description?: string
  cssClass?: string
  cssStyle?: string
  attributes?: any
  metadata?: any
}

export interface UpdateMenuData {
  name?: string
  label?: string
  icon?: string
  path?: string
  component?: string
  url?: string
  target?: string
  parentId?: string | null
  category?: string
  location?: 'HEADER' | 'SIDEBAR' | 'FOOTER' | 'CUSTOM'
  isActive?: boolean
  isPublic?: boolean
  order?: number
  description?: string
  cssClass?: string
  cssStyle?: string
  attributes?: any
  metadata?: any
}

export interface MenuQuery {
  parentId?: string | null
  isActive?: boolean
  category?: string
  tenantId?: string
  location?: 'HEADER' | 'SIDEBAR' | 'FOOTER' | 'CUSTOM'
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface MenuReorderRequest {
  menuOrders: {
    id: string
    order: number
    parentId?: string | null
  }[]
}

export interface MenuDuplicateRequest {
  name?: string
  label?: string
  tenantId?: string
}