import Link from 'next/link'
import HeaderNavigation from '@/components/layout/HeaderNavigation'
import FooterNavigation from '@/components/layout/FooterNavigation'
import { Button } from '@/components/ui/button'
import {
  HomeIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 vibrant-gradient rounded-lg flex items-center justify-center">
                <ShieldCheckIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gradient">Service Hub</h1>
                <p className="text-xs text-gray-500">Multi-Tenant Platform</p>
              </div>
            </div>

            {/* Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <HeaderNavigation />
            </div>

            {/* Auth buttons */}
            <div className="flex items-center space-x-3">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                Multi-Tenant Platform for
                <span className="text-transparent bg-clip-text vibrant-gradient"> Modern Business</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Scale your business with our comprehensive multi-tenant platform featuring role-based access control,
                tenant management, and powerful administration tools.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register">
                  <Button size="lg" className="vibrant-gradient text-white px-8 py-3">
                    Start Free Trial
                    <ArrowRightIcon className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg" className="px-8 py-3">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Powerful Features for Your Business
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Everything you need to manage multiple tenants, users, and permissions in one place.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center p-6 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                <div className="w-12 h-12 vibrant-gradient rounded-lg flex items-center justify-center mx-auto mb-4">
                  <BuildingOfficeIcon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Multi-Tenant</h3>
                <p className="text-gray-600">
                  Manage multiple organizations with complete isolation and dedicated resources.
                </p>
              </div>

              <div className="text-center p-6 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                <div className="w-12 h-12 vibrant-gradient rounded-lg flex items-center justify-center mx-auto mb-4">
                  <ShieldCheckIcon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Role-Based Access</h3>
                <p className="text-gray-600">
                  Granular permissions and role management for complete security control.
                </p>
              </div>

              <div className="text-center p-6 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                <div className="w-12 h-12 vibrant-gradient rounded-lg flex items-center justify-center mx-auto mb-4">
                  <UserGroupIcon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">User Management</h3>
                <p className="text-gray-600">
                  Comprehensive user administration with activation workflows and bulk operations.
                </p>
              </div>

              <div className="text-center p-6 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                <div className="w-12 h-12 vibrant-gradient rounded-lg flex items-center justify-center mx-auto mb-4">
                  <HomeIcon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Dynamic Menus</h3>
                <p className="text-gray-600">
                  Flexible navigation system that adapts to user roles and permissions.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-blue-600 to-purple-600">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Transform Your Business?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join thousands of businesses already using our platform to scale their operations.
            </p>
            <Link href="/register">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3">
                Get Started Free
                <ArrowRightIcon className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <FooterNavigation showSocialLinks={true} />
        </div>
      </footer>
    </div>
  )
}