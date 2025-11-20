'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { menuService } from '@/services/menu.service'
import { MenuItem } from '@/types'

interface HeaderNavigationProps {
  className?: string
}

export default function HeaderNavigation({ className = '' }: HeaderNavigationProps) {
  const [headerMenus, setHeaderMenus] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    const loadHeaderMenus = async () => {
      try {
        setLoading(true)
        const menus = await menuService.getPublicHeaderMenus()
        setHeaderMenus(menus.filter(menu => menu.isActive))
      } catch (error) {
        console.error('Error loading header menus:', error)
      } finally {
        setLoading(false)
      }
    }

    loadHeaderMenus()
  }, [])

  if (loading) {
    return (
      <nav className={`${className}`}>
        <div className="flex space-x-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-6 w-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </nav>
    )
  }

  const renderMenuItem = (menu: MenuItem) => {
    const isActive = pathname === menu.path

    if (menu.url && menu.url.startsWith('http')) {
      // External link
      return (
        <a
          key={menu.id}
          href={menu.url}
          target={menu.target || '_blank'}
          rel="noopener noreferrer"
          className={`
            text-sm font-medium transition-colors duration-200
            ${isActive
              ? 'text-primary'
              : 'text-gray-600 hover:text-gray-900'
            }
            ${menu.cssClass || ''}
          `}
          style={menu.cssStyle && typeof menu.cssStyle === 'object' ? { ...menu.cssStyle as any } : undefined}
          {...(menu.attributes && typeof menu.attributes === 'object' ? menu.attributes as any : {})}
        >
          <span className="flex items-center space-x-1">
            {menu.icon && <span>{menu.icon}</span>}
            <span>{menu.label}</span>
          </span>
        </a>
      )
    }

    // Internal link
    return (
      <Link
        key={menu.id}
        href={menu.path || '#'}
        className={`
          text-sm font-medium transition-colors duration-200
          ${isActive
            ? 'text-primary'
            : 'text-gray-600 hover:text-gray-900'
          }
          ${menu.cssClass || ''}
        `}
        style={menu.cssStyle && typeof menu.cssStyle === 'object' ? { ...menu.cssStyle as any } : undefined}
        {...(menu.attributes && typeof menu.attributes === 'object' ? menu.attributes as any : {})}
      >
        <span className="flex items-center space-x-1">
          {menu.icon && <span>{menu.icon}</span>}
          <span>{menu.label}</span>
        </span>
      </Link>
    )
  }

  return (
    <nav className={`${className}`}>
      <div className="flex items-center space-x-6">
        {headerMenus
          .sort((a, b) => a.order - b.order)
          .map(menu => renderMenuItem(menu))}
      </div>
    </nav>
  )
}