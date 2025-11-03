'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { authApi } from '@/lib/api'
import { setAuthData } from '@/lib/auth'
import { LoginRequest } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff, Lock, Mail, Shield, User, Zap, Copy } from 'lucide-react'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LoginRequest>()

  // Demo credentials
  const demoCredentials = {
    email: 'superadmin@system.com',
    password: 'SuperAdmin123!'
  }

  // Function to fill demo credentials
  const fillDemoCredentials = () => {
    setValue('email', demoCredentials.email)
    setValue('password', demoCredentials.password)
    setShowPassword(true)
    toast.success('Demo credentials filled!')
  }

  // Function for quick demo login
  const quickDemoLogin = async () => {
    setIsLoading(true)
    setValue('email', demoCredentials.email)
    setValue('password', demoCredentials.password)

    try {
      const response = await authApi.login(demoCredentials)
      if (response.success && response.data) {
        setAuthData(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken,
          response.data.user
        )
        toast.success('Welcome! Demo login successful!')
        router.push('/dashboard')
      } else {
        toast.error(response.message || 'Demo login failed')
      }
    } catch (error: any) {
      console.error('Demo login error:', error)
      toast.error(error.response?.data?.message || 'Demo login failed')
    } finally {
      setIsLoading(false)
    }
  }

  // Function to copy credentials to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard!`)
  }

  const onSubmit = async (data: LoginRequest) => {
    setIsLoading(true)
    console.log('Login attempt with:', data)
    try {
      console.log('Calling authApi.login...')
      const response = await authApi.login(data)
      console.log('Login response:', response)
      if (response.success && response.data) {
        setAuthData(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken,
          response.data.user
        )
        toast.success('Welcome back! Login successful!')
        router.push('/dashboard')
      } else {
        toast.error(response.message || 'Login failed')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.response?.data?.message || 'Invalid credentials')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-pink-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 vibrant-gradient rounded-3xl shadow-2xl mb-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            <Shield className="w-10 h-10 text-white relative z-10" />
          </div>
          <h1 className="text-4xl font-black text-gradient mb-2">Multi-Tenant Platform</h1>
          <p className="text-gray-600 font-medium">Admin Dashboard Access</p>
        </div>

        {/* Login Card */}
        <Card className="glass-effect shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Welcome back</CardTitle>
            <CardDescription className="text-center">
              Sign in to access your admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <Input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                  type="email"
                  id="email"
                  placeholder="admin@company.com"
                  className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password
                </label>
                <div className="relative">
                  <Input
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters',
                      },
                    })}
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    placeholder="Enter your password"
                    className={`pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember Me */}
              <div className="flex items-center space-x-2">
                <input
                  id="remember"
                  type="checkbox"
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="remember" className="text-sm text-gray-600">
                  Remember me for 30 days
                </label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-bold btn-gradient rounded-xl hover:scale-[1.02] transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Sign In to Dashboard
                  </div>
                )}
              </Button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-6 p-5 purple-gradient rounded-xl border border-purple-200/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-8"></div>
              <div className="absolute bottom-0 left-0 w-12 h-12 bg-white/10 rounded-full -ml-6 -mb-6"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Demo Access Credentials
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={fillDemoCredentials}
                      className="h-7 px-3 text-xs bg-white/20 hover:bg-white/30 text-white border-white/30"
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      Auto-Fill
                    </Button>
                    <Button
                      size="sm"
                      onClick={quickDemoLogin}
                      disabled={isLoading}
                      className="h-7 px-3 text-xs bg-white text-purple-600 hover:bg-white/90 font-bold"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                          Login...
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          Quick Login
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-white/90">
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3" />
                      <span className="truncate"><strong>Email:</strong> superadmin@system.com</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(demoCredentials.email, 'Email')}
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-white/20"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3 h-3" />
                      <span className="truncate"><strong>Password:</strong> SuperAdmin123!</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(demoCredentials.password, 'Password')}
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-white/20"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/20">
                  <p className="text-xs text-white/80 text-center">
                    💡 <strong>Quick Login:</strong> Instant demo access | <strong>Auto-Fill:</strong> Fill form manually
                  </p>
                  <p className="text-xs text-white/60 text-center mt-1">
                    🖱️ Hover over credentials to copy them individually
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Secure authentication powered by JWT</p>
          <p className="mt-1">© 2024 Multi-Tenant Platform. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}