'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { menuService } from '@/services/menu.service'
import { MenuItem } from '@/types'

interface FooterNavigationProps {
  className?: string
  showSocialLinks?: boolean
}

export default function FooterNavigation({
  className = '',
  showSocialLinks = true
}: FooterNavigationProps) {
  const [footerMenus, setFooterMenus] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    const loadFooterMenus = async () => {
      try {
        setLoading(true)
        const menus = await menuService.getPublicFooterMenus()
        setFooterMenus(menus.filter(menu => menu.isActive))
      } catch (error) {
        console.error('Error loading footer menus:', error)
      } finally {
        setLoading(false)
      }
    }

    loadFooterMenus()
  }, [])

  if (loading) {
    return (
      <footer className={`${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
              <div className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-3 bg-gray-200 rounded w-32"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </footer>
    )
  }

  // Group menus by category
  const groupedMenus = footerMenus.reduce((acc, menu) => {
    const category = menu.category || 'GENERAL'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(menu)
    return acc
  }, {} as Record<string, MenuItem[]>)

  const categoryLabels: Record<string, string> = {
    'COMPANY': 'Company',
    'LEGAL': 'Legal',
    'SUPPORT': 'Support',
    'SOCIAL': 'Follow Us',
    'GENERAL': 'General'
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
            text-sm transition-colors duration-200 flex items-center space-x-1
            ${isActive
              ? 'text-primary font-medium'
              : 'text-gray-600 hover:text-gray-900'
            }
            ${menu.cssClass || ''}
          `}
          style={menu.cssStyle && typeof menu.cssStyle === 'object' ? { ...menu.cssStyle as any } : undefined}
          {...(menu.attributes && typeof menu.attributes === 'object' ? menu.attributes as any : {})}
        >
          {menu.icon && <span className="text-base">{menu.icon}</span>}
          <span>{menu.label}</span>
        </a>
      )
    }

    // Internal link
    return (
      <Link
        key={menu.id}
        href={menu.path || '#'}
        className={`
          text-sm transition-colors duration-200 flex items-center space-x-1
          ${isActive
            ? 'text-primary font-medium'
            : 'text-gray-600 hover:text-gray-900'
          }
          ${menu.cssClass || ''}
        `}
        style={menu.cssStyle && typeof menu.cssStyle === 'object' ? { ...menu.cssStyle as any } : undefined}
        {...(menu.attributes && typeof menu.attributes === 'object' ? menu.attributes as any : {})}
      >
        {menu.icon && <span className="text-base">{menu.icon}</span>}
        <span>{menu.label}</span>
      </Link>
    )
  }

  return (
    <footer className={`${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {Object.entries(groupedMenus).map(([category, menus]) => (
          <div key={category} className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              {categoryLabels[category] || category}
            </h3>
            <ul className="space-y-3">
              {menus
                .sort((a, b) => a.order - b.order)
                .map(menu => (
                  <li key={menu.id}>
                    {renderMenuItem(menu)}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom section */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-sm text-gray-600">
            © {new Date().getFullYear()} Service Hub. All rights reserved.
          </div>

          {showSocialLinks && groupedMenus.SOCIAL && (
            <div className="flex space-x-6">
              {groupedMenus.SOCIAL
                .sort((a, b) => a.order - b.order)
                .map(menu => renderMenuItem(menu))}
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}