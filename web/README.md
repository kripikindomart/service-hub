# Frontend - Multi-Tenant Platform

Next.js 16 frontend application for the Multi-Tenant Platform with TypeScript and Tailwind CSS.

## Features

- **Modern React Architecture**: Built with Next.js 16 and TypeScript
- **Authentication System**: JWT-based login/logout with automatic token refresh
- **Admin Dashboard**: Complete admin interface with user management
- **Advanced Filtering**: Search and filter users by status, email verification, and more
- **Pagination**: Server-side pagination for large datasets
- **Permission Management**: Create and manage system permissions
- **Responsive Design**: Mobile-friendly UI with Tailwind CSS
- **Toast Notifications**: User-friendly feedback with react-hot-toast
- **Form Handling**: Form validation with React Hook Form

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios with interceptors
- **Forms**: React Hook Form
- **Notifications**: React Hot Toast
- **Icons**: Heroicons
- **UI Components**: Headless UI

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Navigate to the web directory**
   ```bash
   cd web
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3001`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Environment Variables

Create a `.env.local` file in the root of the `web` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Application Structure

```
web/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── dashboard/         # Dashboard pages
│   │   │   ├── page.tsx       # Main dashboard
│   │   │   ├── users/         # User management
│   │   │   └── permissions/   # Permission management
│   │   ├── login/             # Login page
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page (redirects to login)
│   ├── components/            # React components
│   │   ├── layout/            # Layout components
│   │   │   └── DashboardLayout.tsx
│   │   └── ui/                # UI components
│   │       ├── Table.tsx
│   │       └── Pagination.tsx
│   ├── lib/                   # Utility libraries
│   │   ├── api.ts             # API client with Axios
│   │   └── auth.ts            # Authentication utilities
│   └── types/                 # TypeScript type definitions
│       └── index.ts
├── public/                    # Static assets
├── tailwind.config.js         # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Dependencies and scripts
```

## Features Overview

### Authentication

- JWT-based authentication with access and refresh tokens
- Automatic token refresh on expiration
- Protected routes that redirect to login if not authenticated
- Secure storage of tokens in localStorage

### Dashboard

- Overview statistics for users (total, active, pending, inactive)
- Quick access to user management and permission management
- Responsive sidebar navigation
- User profile display with logout functionality

### User Management

- Complete user listing with server-side pagination
- Advanced filtering options:
  - Search by name or email
  - Filter by status (Active, Inactive, Pending)
  - Filter by email verification status
  - Sort by various fields (creation date, name, email)
- User activation/deactivation actions
- Real-time status updates

### Permission Management

- View all system permissions
- Create new permissions with:
  - Name, resource, action
  - Scope (Own, Tenant, All)
  - Category and description
- Filter permissions by resource, action, or scope
- Visual indicators for permission scopes and system permissions

## Default Login Credentials

Use the following credentials to access the admin panel:

- **Email**: `superadmin@system.com`
- **Password**: `SuperAdmin123!`

## API Integration

The frontend is fully integrated with the backend API:

- Base URL configured via environment variables
- Automatic inclusion of JWT tokens in API requests
- Comprehensive error handling with user-friendly messages
- Request/response interceptors for authentication

## Development Notes

- The application uses Next.js 16 with the App Router
- All components are client-side rendered (`'use client'`)
- TypeScript is used throughout for type safety
- Tailwind CSS provides consistent styling
- The API client handles authentication automatically

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Follow the existing code style
2. Use TypeScript for all new code
3. Add proper error handling
4. Test with different screen sizes
5. Ensure accessibility standards are met