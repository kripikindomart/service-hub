'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { menuService } from '@/services/menu.service'

export default function TestMenuPage() {
  const { user, currentTenant } = useAuthStore()
  const [menus, setMenus] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    console.log('🧪 TestMenuPage mounted')
    console.log('🧪 Current user:', user)
    console.log('🧪 Current tenant:', currentTenant)

    const testMenuAPI = async () => {
      if (!currentTenant?.id) {
        console.log('🧪 No tenant ID, skipping menu test')
        setError('No tenant ID available')
        setLoading(false)
        return
      }

      try {
        console.log('🧪 Testing menu API with tenant:', currentTenant.id)
        setLoading(true)

        const result = await menuService.getSidebarMenus(currentTenant.id)
        console.log('🧪 Menu API result:', result)

        setMenus(result)
        setLoading(false)
      } catch (err: any) {
        console.error('🧪 Menu API error:', err)
        setError(err.message || 'API call failed')
        setLoading(false)
      }
    }

    testMenuAPI()
  }, [currentTenant])

  const handleForceTenant = () => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const userData = JSON.parse(userStr)
      console.log('🧪 User data from localStorage:', userData)

      if (userData.userTenants && userData.userTenants.length > 0) {
        const firstTenant = userData.userTenants[0].tenant
        console.log('🧪 Setting tenant to:', firstTenant)
        localStorage.setItem('currentTenant', JSON.stringify(firstTenant))

        // Trigger re-render
        window.location.reload()
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🧪 Menu API Test Page</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          <div className="space-y-2">
            <p><strong>User:</strong> {user?.email || 'Not logged in'}</p>
            <p><strong>Tenant ID:</strong> {currentTenant?.id || 'No tenant'}</p>
            <p><strong>Tenant Name:</strong> {currentTenant?.name || 'No tenant'}</p>
          </div>

          {!currentTenant?.id && (
            <button
              onClick={handleForceTenant}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Force Set Tenant
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Menu Test Results</h2>

          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4">Loading menus...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              <p className="font-bold">Error:</p>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div>
              <p className="mb-4"><strong>Menu Count:</strong> {menus.length} items</p>

              {menus.length > 0 ? (
                <div className="space-y-2">
                  {menus.map((menu, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded border">
                      <p><strong>Name:</strong> {menu.name}</p>
                      <p><strong>Label:</strong> {menu.label}</p>
                      <p><strong>Path:</strong> {menu.path || menu.url}</p>
                      <p><strong>Order:</strong> {menu.order}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
                  No menus found
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Debug Info</h2>
          <div className="text-sm space-y-2">
            <p><strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005'}</p>
            <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
          </div>
        </div>
      </div>
    </div>
  )
}