/**
 * Error parsing utilities for better user notifications
 */

export interface ParsedError {
  message: string
  type: 'validation' | 'permission' | 'notfound' | 'conflict' | 'server' | 'network' | 'unknown'
  originalMessage?: string
  status?: number
}

/**
 * Parse different types of errors and return user-friendly messages
 */
export function parseError(error: any): ParsedError {
  // Handle network errors
  if (!error.response) {
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
      return {
        message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
        type: 'network',
        originalMessage: error.message
      }
    }

    return {
      message: 'Terjadi kesalahan jaringan. Silakan coba lagi.',
      type: 'network',
      originalMessage: error.message
    }
  }

  const status = error.response?.status
  const data = error.response?.data
  const originalMessage = data?.message || error.message

  // Handle HTTP status codes
  switch (status) {
    case 400:
      return {
        message: parseValidationError(originalMessage),
        type: 'validation',
        originalMessage,
        status
      }

    case 401:
      return {
        message: 'Sesi Anda telah berakhir. Silakan login kembali.',
        type: 'permission',
        originalMessage,
        status
      }

    case 403:
      return {
        message: 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
        type: 'permission',
        originalMessage,
        status
      }

    case 404:
      return {
        message: 'Data yang Anda cari tidak ditemukan.',
        type: 'notfound',
        originalMessage,
        status
      }

    case 409:
      return {
        message: parseConflictError(originalMessage),
        type: 'conflict',
        originalMessage,
        status
      }

    case 422:
      return {
        message: parseValidationError(originalMessage),
        type: 'validation',
        originalMessage,
        status
      }

    case 429:
      return {
        message: 'Terlalu banyak permintaan. Silakan coba lagi dalam beberapa saat.',
        type: 'server',
        originalMessage,
        status
      }

    case 500:
    case 502:
    case 503:
    case 504:
      return {
        message: 'Terjadi kesalahan pada server. Silakan coba lagi nanti.',
        type: 'server',
        originalMessage,
        status
      }

    default:
      return {
        message: parseUnknownError(originalMessage),
        type: 'unknown',
        originalMessage,
        status
      }
  }
}

/**
 * Parse validation errors into user-friendly messages
 */
function parseValidationError(message: string): string {
  const lowerMessage = message.toLowerCase()

  // Tenant-specific validation errors
  if (lowerMessage.includes('tenant must be archived')) {
    return 'Tenant harus dalam status arsip sebelum dapat dipulihkan.'
  }

  if (lowerMessage.includes('tenant must be deleted')) {
    return 'Tenant harus dalam status terhapus sebelum dapat dihapus permanen.'
  }

  if (lowerMessage.includes('cannot archive core tenant')) {
    return 'Tenant CORE tidak dapat diarsipkan.'
  }

  if (lowerMessage.includes('cannot permanently delete core tenant')) {
    return 'Tenant CORE tidak dapat dihapus permanen.'
  }

  if (lowerMessage.includes('status')) {
    if (lowerMessage.includes('deleted')) {
      return 'Tidak dapat memulihkan tenant yang sudah dihapus. Gunakan tombol Restore di tab Trash.'
    }
    if (lowerMessage.includes('archived')) {
      return 'Tidak dapat mengarsipkan tenant yang sudah diarsipkan.'
    }
    if (lowerMessage.includes('active')) {
      return 'Tenant sudah dalam status aktif.'
    }
  }

  // Common validation patterns
  if (lowerMessage.includes('required')) {
    if (lowerMessage.includes('name')) return 'Nama tenant wajib diisi.'
    if (lowerMessage.includes('slug')) return 'Slug tenant wajib diisi.'
    if (lowerMessage.includes('email')) return 'Email wajib diisi.'
    if (lowerMessage.includes('password')) return 'Password wajib diisi.'
    return 'Harap lengkapi semua field yang wajib diisi.'
  }

  if (lowerMessage.includes('already exists') || lowerMessage.includes('duplicate')) {
    if (lowerMessage.includes('slug')) return 'Slug tenant sudah digunakan. Gunakan slug lain.'
    if (lowerMessage.includes('email')) return 'Email sudah terdaftar.'
    if (lowerMessage.includes('name')) return 'Nama tenant sudah digunakan.'
    return 'Data sudah ada. Gunakan data yang berbeda.'
  }

  if (lowerMessage.includes('invalid')) {
    if (lowerMessage.includes('email')) return 'Format email tidak valid.'
    if (lowerMessage.includes('password')) return 'Password tidak memenuhi syarat.'
    return 'Format data tidak valid.'
  }

  // Return original message if no specific pattern matches
  return message || 'Data yang Anda masukkan tidak valid.'
}

/**
 * Parse conflict errors into user-friendly messages
 */
function parseConflictError(message: string): string {
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('tenant') && lowerMessage.includes('conflict')) {
    return 'Tenant sedang digunakan oleh pengguna lain. Silakan coba lagi.'
  }

  if (lowerMessage.includes('resource') && lowerMessage.includes('locked')) {
    return 'Data sedang dalam proses perubahan. Silakan tunggu beberapa saat.'
  }

  return 'Terjadi konflik data. Silakan refresh halaman dan coba lagi.'
}

/**
 * Parse unknown errors into user-friendly messages
 */
function parseUnknownError(message: string): string {
  const lowerMessage = message.toLowerCase()

  // Check for common error patterns
  if (lowerMessage.includes('timeout')) {
    return 'Permintaan terlalu lama. Silakan coba lagi.'
  }

  if (lowerMessage.includes('connection')) {
    return 'Masalah koneksi ke server. Silakan periksa internet Anda.'
  }

  if (lowerMessage.includes('permission')) {
    return 'Anda tidak memiliki izin untuk melakukan tindakan ini.'
  }

  if (lowerMessage.includes('token') || lowerMessage.includes('unauthorized')) {
    return 'Sesi Anda telah berakhir. Silakan login kembali.'
  }

  // Generic fallback
  return message || 'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.'
}

/**
 * Show toast notification with parsed error
 */
export function showErrorToast(error: any, toast: any) {
  const parsed = parseError(error)

  switch (parsed.type) {
    case 'validation':
      toast.error(parsed.message, {
        description: 'Periksa kembali data yang Anda masukkan',
        duration: 5000
      })
      break

    case 'permission':
      toast.error(parsed.message, {
        description: 'Hubungi administrator jika Anda memerlukan akses',
        duration: 6000
      })
      break

    case 'network':
      toast.error(parsed.message, {
        description: 'Periksa koneksi internet Anda',
        action: {
          label: 'Coba Lagi',
          onClick: () => window.location.reload()
        },
        duration: 7000
      })
      break

    case 'server':
      toast.error(parsed.message, {
        description: 'Server sedang bermasalah. Coba lagi nanti',
        duration: 6000
      })
      break

    default:
      toast.error(parsed.message, {
        duration: 5000
      })
  }

  // Log original error for debugging
  console.error('Original error:', error)
  console.error('Parsed error:', parsed)
}