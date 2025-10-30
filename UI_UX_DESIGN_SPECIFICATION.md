# UI/UX Design Specification - Multi-Tenant Service Management Platform

## Design Philosophy

**Modern, Clean, and Intelligent** - Platform yang tidak hanya fungsional tetapi juga menyenangkan digunakan dengan pengalaman user yang intuitif dan visual yang menarik.

## Design System Stack

### UI Framework & Components
```json
{
  "ui_library": "shadcn/ui + Radix UI",
  "styling": "Tailwind CSS + Tailwind Animate",
  "icons": "Lucide React + Heroicons",
  "charts": "Recharts + D3.js",
  "animations": "Framer Motion",
  "notifications": "React Hot Toast",
  "date_handling": "React DayPicker",
  "file_upload": "React Dropzone",
  "forms": "React Hook Form + Zod + AutoAnimate",
  "data_tables": "TanStack Table + React Virtual",
  "drag_drop": "@dnd-kit/core",
  "color_picker": "React Colorful",
  "markdown_editor": "@uiw/react-md-editor",
  "code_editor": "@monaco-editor/react"
}
```

### Enhanced Dependencies
```bash
# UI/UX Enhancements
npm install framer-motion @tanstack/react-table @tanstack/react-virtual
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install react-hot-toast react-dropzone react-day-picker
npm install react-colorful @uiw/react-md-editor @monaco-editor/react
npm install react-virtual react-intersection-observer
npm install react-syntax-highlighter recharts
npm install @headlessui/react @radix-ui/react-dialog
npm install cmdk react-circular-progress
npm install react-confetti react-spring
npm install date-fns clsx tailwind-merge
```

## Core Design Principles

### 1. **Visual Hierarchy**
- **Primary Actions**: Large, colorful buttons with animations
- **Secondary Actions**: Medium-sized buttons with subtle effects
- **Tertiary Actions**: Text-based with hover effects

### 2. **Micro-interactions**
- Button press effects (scale + ripple)
- Card hover effects (lift + shadow)
- Loading states with skeleton screens
- Smooth transitions between states
- Success/error feedback with animations

### 3. **Color System**
```typescript
const colors = {
  primary: {
    50: '#eff6ff',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    900: '#1e3a8a'
  },
  semantic: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4'
  },
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    500: '#64748b',
    900: '#0f172a'
  },
  gradients: {
    primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    success: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
    sunset: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    ocean: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
  }
}
```

## Component Architecture

### 1. **Enhanced Layout System**

#### Smart Header Component
```typescript
// src/components/layout/Header.tsx
import { motion } from 'framer-motion';
import { Bell, Search, Settings, HelpCircle, User } from 'lucide-react';
import { Command } from 'cmdk';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TenantSwitcher } from './TenantSwitcher';

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState(5);
  const { user, currentTenant } = useAuthStore();

  return (
    <motion.header
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      initial={{ y: -20 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="container mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo & Branding */}
        <motion.div
          className="flex items-center gap-3"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600" />
          <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Platform
          </span>
        </motion.div>

        {/* Search Command */}
        <div className="flex-1 max-w-md">
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="relative h-9 w-full justify-start text-sm text-muted-foreground/70 sm:pr-12 md:w-64 lg:w-80"
              >
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <span className="truncate">Search anything...</span>
                <kbd className="pointer-events-none absolute right-2 top-1/2 h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 flex">
                  <span className="text-xs">⌘</span>
                  <span>K</span>
                </kbd>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command className="rounded-lg border shadow-md">
                <CommandInput placeholder="Search anything..." />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup heading="Quick Actions">
                    <CommandItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Users</span>
                    </CommandItem>
                    <CommandItem>
                      <Building2 className="mr-2 h-4 w-4" />
                      <span>Tenants</span>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Tenant Switcher */}
          <TenantSwitcher />

          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <motion.div
                  animate={{ scale: notifications > 0 ? [1, 1.2, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Bell className="h-5 w-5" />
                  {notifications > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
                    >
                      {notifications}
                    </Badge>
                  )}
                </motion.div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Notifications</h3>
                <p className="text-sm text-muted-foreground">5 unread</p>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {/* Notification items */}
              </div>
            </PopoverContent>
          </Popover>

          {/* Help */}
          <Button variant="ghost" size="sm">
            <HelpCircle className="h-5 w-5" />
          </Button>

          {/* Settings */}
          <Button variant="ghost" size="sm">
            <Settings className="h-5 w-5" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                  <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard className="mr-2 h-4 w-4" />
                Billing
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.header>
  );
}
```

#### Intelligent Sidebar Component
```typescript
// src/components/layout/Sidebar.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Home, Users, Building2, Settings, BarChart3 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { useSidebarStore } from '@/stores/sidebarStore';

interface MenuItem {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  href: string;
  badge?: number;
  children?: MenuItem[];
  isActive?: boolean;
  isExpanded?: boolean;
}

export function Sidebar() {
  const { isCollapsed, menuItems, toggleCollapse, toggleMenuItem } = useSidebarStore();
  const { hasPermission } = useAuthStore();

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isActive = item.isActive;
    const canAccess = hasPermission(item.permission);

    if (!canAccess) return null;

    return (
      <div key={item.id}>
        <Collapsible
          open={hasChildren ? item.isExpanded : true}
          onOpenChange={() => toggleMenuItem(item.id)}
        >
          <CollapsibleTrigger asChild>
            <motion.div
              className={cn(
                "group flex items-center w-full px-3 py-2 rounded-lg transition-all duration-200",
                "hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-primary text-primary-foreground",
                !isCollapsed && "mx-1"
              )}
              whileHover={{ x: isCollapsed ? 0 : 4 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="flex items-center flex-1 min-w-0">
                <motion.div
                  className={cn(
                    "flex-shrink-0 h-5 w-5",
                    isActive && "text-primary-foreground",
                    !isActive && "text-muted-foreground group-hover:text-accent-foreground"
                  )}
                  initial={{ rotate: 0 }}
                  animate={{ rotate: hasChildren && item.isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <item.icon />
                </motion.div>

                {!isCollapsed && (
                  <>
                    <span className="ml-3 text-sm truncate">{item.name}</span>
                    {item.badge && item.badge > 0 && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="ml-auto"
                      >
                        <Badge variant={isActive ? "secondary" : "destructive"} className="h-5 px-1.5 text-xs">
                          {item.badge}
                        </Badge>
                      </motion.div>
                    )}
                  </>
                )}
              </div>

              {!isCollapsed && hasChildren && (
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: item.isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className="h-4 w-4" />
                </motion.div>
              )}
            </motion.div>
          </CollapsibleTrigger>

          <AnimatePresence>
            {hasChildren && item.isExpanded && !isCollapsed && (
              <CollapsibleContent forceMount asChild>
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="ml-4 mt-1">
                    {item.children?.map((child) => renderMenuItem(child, level + 1))}
                  </div>
                </motion.div>
              </CollapsibleContent>
            )}
          </AnimatePresence>
        </Collapsible>
      </div>
    );
  };

  return (
    <motion.aside
      className={cn(
        "h-full bg-background border-r",
        isCollapsed ? "w-16" : "w-64",
        "transition-all duration-300 ease-in-out"
      )}
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex h-full flex-col">
        {/* Logo/Brand */}
        <div className="p-4 border-b">
          <motion.div
            className="flex items-center gap-3"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0" />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="font-bold text-lg"
                >
                  Platform
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <AnimatePresence mode="wait">
            {menuItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              >
                {renderMenuItem(item)}
              </motion.div>
            ))}
          </AnimatePresence>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t">
          <motion.div
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Version 1.0.0</p>
                <p className="text-xs text-muted-foreground">© 2025 Platform</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="h-8 w-8 p-0"
            >
              <motion.div
                animate={{ rotate: isCollapsed ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4" />
              </motion.div>
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.aside>
  );
}
```

### 2. **Advanced Data Tables**

#### Enhanced Table Component
```typescript
// src/components/ui/data-table/DataTable.tsx
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronDown, MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TValue[];
  onRowAction?: (action: string, row: TValue) => void;
  loading?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowAction,
  loading = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Global Filter */}
          <Input
            placeholder="Filter users..."
            value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("email")?.setFilterValue(event.target.value)
            }
            className="h-9 w-[250px]"
          />

          {/* Column Visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto">
                View Columns
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuItem key={column.id} className="capitalize">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={column.getIsVisible()}
                          onChange={(e) =>
                            column.toggleVisibility(!!e.target.checked)
                          }
                        />
                        {column.id}
                      </label>
                    </DropdownMenuItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Bulk Actions */}
        {table.getFilteredSelectedRowModel().rows.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onRowAction?.('bulk-delete', table.getFilteredSelectedRowModel().rows)}
            >
              Delete Selected ({table.getFilteredSelectedRowModel().rows.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRowAction?.('bulk-activate', table.getFilteredSelectedRowModel().rows)}
            >
              Activate Selected
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(
                            header.column.getCanSort() && "cursor-pointer select-none hover:bg-accent",
                            "flex items-center justify-between px-4 py-3 font-medium"
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getCanSort() && (
                            <motion.div
                              animate={{
                                rotate: sorting.find(s => s.id === header.id)?.direction === 'asc' ? 180 : 0
                              }}
                              transition={{ duration: 0.2 }}
                            >
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                            </motion.div>
                          )}
                        </div>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              // Skeleton loading rows
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {columns.map((_, colIndex) => (
                    <TableCell key={colIndex}>
                      <div className="h-4 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <motion.tr
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-muted/50 transition-colors"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </motion.tr>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### 3. **Smart Forms with Real-time Validation**

#### Dynamic Form Component
```typescript
// src/components/forms/DynamicForm.tsx
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useFieldArray } from 'react-hook-form';
import { AutoAnimate } from '@formkit/auto-animate/react';
import { Eye, EyeOff, Plus, Trash2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DynamicFormProps {
  schema: FormSchema;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  submitText?: string;
}

interface FormField {
  name: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox' | 'switch' | 'array' | 'file';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  validation?: z.ZodSchema;
  description?: string;
  helpText?: string;
  conditional?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains';
    value: any;
  };
}

export function DynamicForm({ schema, onSubmit, initialData, submitText = "Submit" }: DynamicFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Build zod schema dynamically
  const buildZodSchema = (fields: FormField[]): z.ZodObject<any> => {
    const schemaFields: Record<string, z.ZodSchema> = {};

    fields.forEach((field) => {
      let fieldSchema: z.ZodSchema = z.string();

      switch (field.type) {
        case 'email':
          fieldSchema = z.string().email();
          break;
        case 'number':
          fieldSchema = z.number();
          break;
        case 'checkbox':
          fieldSchema = z.boolean();
          break;
        case 'array':
          fieldSchema = z.array(z.string());
          break;
      }

      if (field.validation) {
        fieldSchema = field.validation;
      }

      if (!field.required) {
        fieldSchema = fieldSchema.optional();
      }

      schemaFields[field.name] = fieldSchema;
    });

    return z.object(schemaFields);
  };

  const formSchema = buildZodSchema(schema.fields);
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {},
    mode: 'onChange'
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'dynamicArray'
  });

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    watch,
    setValue,
    setError,
    clearErrors
  } = form;

  const watchedValues = watch();

  // Real-time validation
  useEffect(() => {
    const newErrors: Record<string, string[]> = {};

    schema.fields.forEach((field) => {
      const value = watchedValues[field.name];
      const fieldErrors: string[] = [];

      // Required validation
      if (field.required && (!value || value === '')) {
        fieldErrors.push(`${field.label} is required`);
      }

      // Custom validation
      if (field.validation && value) {
        try {
          field.validation.parse(value);
        } catch (error) {
          if (error instanceof z.ZodError) {
            fieldErrors.push(...error.errors.map(e => e.message));
          }
        }
      }

      if (fieldErrors.length > 0) {
        newErrors[field.name] = fieldErrors;
      }
    });

    setFieldErrors(newErrors);
  }, [watchedValues, schema.fields]);

  const onSubmitForm = async (data: any) => {
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      await onSubmit(data);
      setSubmitStatus('success');

      // Reset form after successful submission
      setTimeout(() => {
        form.reset();
        setSubmitStatus('idle');
      }, 2000);

    } catch (error) {
      setSubmitStatus('error');
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormField, index?: number) => {
    const fieldError = fieldErrors[field.name];
    const isConditionalField = field.conditional;
    const shouldShow = !isConditionalField ||
      watchedValues[isConditionalField.field] === isConditionalField.value;

    if (!shouldShow) return null;

    switch (field.type) {
      case 'text':
        return (
          <div key={field.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {fieldError && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1 text-xs text-red-500"
                >
                  <AlertCircle className="h-3 w-3" />
                  {fieldError[0]}
                </motion.div>
              )}
            </div>
            <Controller
              name={field.name}
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder={field.placeholder}
                  className={cn(fieldError && "border-red-500")}
                />
              )}
            />
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            {field.helpText && (
              <p className="text-xs text-muted-foreground">{field.helpText}</p>
            )}
          </div>
        );

      case 'email':
        return (
          <div key={field.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {fieldError && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1 text-xs text-red-500"
                >
                  <AlertCircle className="h-3 w-3" />
                  {fieldError[0]}
                </motion.div>
              )}
            </div>
            <Controller
              name={field.name}
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="email"
                  placeholder={field.placeholder}
                  className={cn(fieldError && "border-red-500")}
                />
              )}
            />
          </div>
        );

      case 'password':
        return (
          <div key={field.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {fieldError && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1 text-xs text-red-500"
                >
                  <AlertCircle className="h-3 w-3" />
                  {fieldError[0]}
                </motion.div>
              )}
            </div>
            <Controller
              name={field.name}
              control={control}
              render={({ field }) => (
                <div className="relative">
                  <Input
                    {...field}
                    type={showPassword ? "text" : "password"}
                    placeholder={field.placeholder}
                    className={cn(fieldError && "border-red-500", "pr-10")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {fieldError && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1 text-xs text-red-500"
                >
                  <AlertCircle className="h-3 w-3" />
                  {fieldError[0]}
                </motion.div>
              )}
            </div>
            <Controller
              name={field.name}
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger className={cn(fieldError && "border-red-500")}>
                    <SelectValue placeholder={field.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {fieldError && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1 text-xs text-red-500"
                >
                  <AlertCircle className="h-3 w-3" />
                  {fieldError[0]}
                </motion.div>
              )}
            </div>
            <Controller
              name={field.name}
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  placeholder={field.placeholder}
                  rows={3}
                  className={cn(fieldError && "border-red-500")}
                />
              )}
            />
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.name} className="space-y-2">
            <Controller
              name={field.name}
              control={control}
              render={({ field }) => (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={field.name}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <label htmlFor={field.name} className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                </div>
              )}
            />
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        );

      case 'switch':
        return (
          <div key={field.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{field.label}</label>
              {fieldError && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1 text-xs text-red-500"
                >
                  <AlertCircle className="h-3 w-3" />
                  {fieldError[0]}
                </motion.div>
              )}
            </div>
            <Controller
              name={field.name}
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
        );

      case 'array':
        return (
          <div key={field.name} className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{field.label}</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append('')}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </div>

            <AutoAnimate>
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <Controller
                    name={`dynamicArray.${index}.value`}
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder={field.placeholder}
                      />
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </AutoAnimate>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          {schema.title || 'Dynamic Form'}
        </CardTitle>
        {schema.description && (
          <p className="text-muted-foreground">{schema.description}</p>
        )}
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {schema.fields.map((field, index) => renderField(field, index))}
            </AnimatePresence>
          </div>

          {/* Submit Status */}
          <AnimatePresence mode="wait">
            {submitStatus === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg"
              >
                <Check className="h-5 w-5 text-green-600" />
                <span className="text-green-800 font-medium">Form submitted successfully!</span>
              </motion.div>
            )}

            {submitStatus === 'error' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg"
              >
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-800 font-medium">Error submitting form. Please try again.</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !isValid || !isDirty}
            size="lg"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Submitting...
              </div>
            ) : (
              submitText
            )}
          </Button>

          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Form Progress</span>
              <span>{Math.round((Object.keys(errors).length / schema.fields.length) * 100)}% Complete</span>
            </div>
            <Progress
              value={100 - (Object.keys(errors).length / schema.fields.length) * 100}
              className="w-full h-2"
            />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

### 4. **Interactive Dashboard Components**

#### Statistics Cards with Animations
```typescript
// src/components/dashboard/StatCard.tsx
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    period: string;
  };
  icon: React.ComponentType<any>;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  change,
  icon: Icon,
  color = 'primary',
  loading = false
}: StatCardProps) {
  const colorClasses = {
    primary: 'text-blue-600 bg-blue-50 border-blue-200',
    success: 'text-green-600 bg-green-50 border-green-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    danger: 'text-red-600 bg-red-50 border-red-200'
  };

  const getTrendIcon = () => {
    if (!change) return <Minus className="h-4 w-4" />;
    if (change.value > 0) return <TrendingUp className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (!change) return 'text-muted-foreground';
    if (change.value > 0) return 'text-green-600';
    return 'text-red-600';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <Card className={cn(
        "relative overflow-hidden transition-all duration-300",
        "hover:shadow-lg cursor-pointer",
        colorClasses[color]
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Icon className="h-5 w-5" />
          </motion.div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-2xl font-bold"
            >
              {loading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              ) : (
                value
              )}
            </motion.div>

            {change && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col items-end"
              >
                <div className={cn("flex items-center gap-1", getTrendColor())}>
                  {getTrendIcon()}
                  <span className="text-xs font-medium">
                    {Math.abs(change.value)}%
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {change.period}
                </span>
              </motion.div>
            )}
          </div>
        </CardContent>

        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <motion.div
            className="absolute -top-2 -right-2 h-16 w-16 rounded-full bg-gradient-to-br from-white to-transparent"
            animate={{
              x: [0, 100, 0],
              y: [0, 50, 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity
            }}
          />
          <motion.div
            className="absolute -bottom-2 -left-2 h-12 w-12 rounded-full bg-gradient-to-tr from-white to-transparent"
            animate={{
              x: [0, -100, 0],
              y: [0, -50, 0]
            }}
            transition={{
              duration: 4,
              repeat: Infinity
            }}
          />
        </div>
      </Card>
    </motion.div>
  );
}
```

### 5. **Advanced Bulk Actions Panel**

#### Bulk Actions with Progress Tracking
```typescript
// src/components/bulk-actions/BulkActionPanel.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, XCircle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBulkActionsStore } from '@/stores/bulkActionsStore';
import { cn } from '@/lib/utils';

export function BulkActionPanel() {
  const {
    currentAction,
    isLoading,
    createBulkAction,
    cancelBulkAction,
    refreshCurrentAction
  } = useBulkActionsStore();

  const [actionType, setActionType] = useState('activate');
  const [reason, setReason] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Auto-refresh current action status
  useEffect(() => {
    if (currentAction && currentAction.status === 'IN_PROGRESS') {
      const interval = setInterval(refreshCurrentAction, 2000);
      return () => clearInterval(interval);
    }
  }, [currentAction, refreshCurrentAction]);

  const executeAction = async () => {
    try {
      await createBulkAction({
        actionType,
        entityType: 'users',
        entityIds: ['sample-ids'], // Would come from selection
        reason: reason || undefined
      });

      setShowConfirmDialog(false);
      setReason('');
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'IN_PROGRESS':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'CANCELLED':
        return <Square className="h-5 w-5 text-gray-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'FAILED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Action Status */}
      <AnimatePresence>
        {currentAction && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(currentAction.status)}
                    <span>Bulk Action: {currentAction.actionType.replace('_', ' ').toUpperCase()}</span>
                  </CardTitle>
                  <Badge className={getStatusColor(currentAction.status)}>
                    {currentAction.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Progress Overview */}
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{currentAction.totalEntities}</div>
                    <div className="text-muted-foreground">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {currentAction.successfulEntities}
                    </div>
                    <div className="text-muted-foreground">Success</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {currentAction.failedEntities}
                    </div>
                    <div className="text-muted-foreground">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {Math.round((currentAction.processedEntities / currentAction.totalEntities) * 100)}%
                    </div>
                    <div className="text-muted-foreground">Progress</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing Progress</span>
                    <span>{currentAction.processedEntities}/{currentAction.totalEntities}</span>
                  </div>
                  <Progress
                    value={(currentAction.processedEntities / currentAction.totalEntities) * 100}
                    className="w-full"
                  />
                </div>

                {/* Status Messages */}
                {currentAction.errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <div className="flex items-center gap-2 text-red-800">
                      <XCircle className="h-5 w-5" />
                      <span className="font-medium">Error: {currentAction.errorMessage}</span>
                    </div>
                  </motion.div>
                )}

                {/* Action Controls */}
                {currentAction.status === 'IN_PROGRESS' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cancelBulkAction(currentAction.id)}
                    disabled={isLoading}
                  >
                    Cancel Action
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configure Bulk Action</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Action Type Selection */}
          <div className="grid grid-cols-4 gap-2">
            {['activate', 'deactivate', 'suspend', 'soft_delete'].map((action) => (
              <motion.div
                key={action}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant={actionType === action ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActionType(action)}
                  className={cn(
                    "w-full text-xs",
                    action === 'soft_delete' && "bg-red-600 hover:bg-red-700 text-white"
                  )}
                >
                  {action.replace('_', ' ').toUpperCase()}
                </Button>
              </motion.div>
            ))}
          </div>

          {/* Reason Input */}
          {(actionType === 'suspend' || actionType === 'soft_delete') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Reason {actionType === 'soft_delete' ? '(Optional)' : '(Required)'}
                </label>
                <textarea
                  className="w-full p-2 border rounded-md text-sm resize-none"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for this action..."
                  required={actionType === 'suspend'}
                />
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={isLoading}
              className={cn(
                "flex items-center gap-2",
                actionType === 'soft_delete' && "bg-red-600 hover:bg-red-700"
              )}
            >
              <Play className="h-4 w-4" />
              Execute {actionType.replace('_', ' ').toUpperCase()}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowConfirmDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Confirm Bulk Action</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p>
                    Are you sure you want to <strong>{actionType.replace('_', ' ').toUpperCase()}</strong> the selected items?
                  </p>

                  {reason && (
                    <div className="p-3 bg-muted rounded-lg">
                      <strong>Reason:</strong> {reason}
                    </div>
                  )}

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowConfirmDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={executeAction}
                      disabled={isLoading}
                      className={cn(
                        actionType === 'soft_delete' && "bg-red-600 hover:bg-red-700"
                      )}
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Processing...
                        </div>
                      ) : (
                        'Confirm'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

## Theme & Customization

### 1. **Light/Dark Mode Support**
```typescript
// src/components/theme-provider.tsx
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
}

export const ThemeProvider = ({ children, defaultTheme = 'system' }: ThemeProviderProps) => {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('ui-theme') as Theme) || defaultTheme
  )

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }

    localStorage.setItem('ui-theme', theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      setTheme(theme)
    },
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
```

### 2. **Responsive Design**
```css
/* Tailwind CSS Custom Configuration */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 210 40% 98%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 98%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 215.4 16.3% 46.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 84% 4.9%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
  }
}

/* Custom Animations */
@keyframes slideInFromTop {
  from {
    transform: translateY(-10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideInFromBottom {
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideInFromLeft {
  from {
    transform: translateX(-10px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideInFromRight {
  from {
    transform: translateX(10px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-slide-in-top {
  animation: slideInFromTop 0.3s ease-out;
}

.animate-slide-in-bottom {
  animation: slideInFromBottom 0.3s ease-out;
}

.animate-slide-in-left {
  animation: slideInFromLeft 0.3s ease-out;
}

.animate-slide-in-right {
  animation: slideInFromRight 0.3s ease-out;
}

.animate-scale-in {
  animation: scaleIn 0.3s ease-out;
}

/* Responsive Grid System */
.container {
  @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8;
}

.grid-auto-fit {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.grid-auto-fill {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

/* Glass Morphism Effects */
.glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.dark .glass {
  background: rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Gradient Text */
.gradient-text {
  background: linear-gradient(to right, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Hover Effects */
.hover-lift {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

/* Custom Scrollbar */
.custom-scrollbar {
  scrollbar-width: 6px;
  scrollbar-height: 6px;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.dark .custom-scrollbar::-webkit-scrollbar-track {
  background: #2d2d2d;
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #4a4a4a;
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #6a6a6a;
}
```

## Integration Points

### 1. **Module Interconnection**
```typescript
// Module 1: User Management connects to Module 2: Permissions
// Module 2: Permissions connects to Module 3: Service Registry
// Module 3: Service Registry connects to Module 4: Forms
// Module 4: Forms connects to Module 5: Bulk Actions
```

### 2. **State Management Integration**
```typescript
// Global store that combines all modules
interface GlobalStore {
  auth: AuthStore;
  tenant: TenantStore;
  permissions: PermissionStore;
  services: ServiceStore;
  bulkActions: BulkActionsStore;
  ui: UIStore;
}
```

### 3. **Real-time Updates**
```typescript
// WebSocket connection for real-time updates
// Shows progress of bulk actions
// Updates user status changes
// Notifies of service health changes
```

---

## Design Guidelines

### 1. **Consistency**
- Use consistent spacing (4px base unit)
- Maintain consistent color palette
- Use consistent typography scale
- Follow consistent interaction patterns

### 2. **Accessibility**
- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader friendly
- High contrast mode support

### 3. **Performance**
- Optimize bundle size
- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Use lazy loading for non-critical components

### 4. **Responsive Design**
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Touch-friendly interaction zones
- Adaptive layouts

---

## Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Setup Tailwind CSS with custom configuration
- [ ] Configure shadcn/ui components
- [ ] Setup Framer Motion
- [ ] Create basic layout components
- [ ] Setup theme provider

### Phase 2: Core Components (Week 2-3)
- [ ] Header with search and notifications
- [ ] Intelligent sidebar with animations
- [ ] Enhanced data tables
- [ ] Smart form components
- [ ] Dashboard statistics cards

### Phase 3: Advanced Features (Week 4-5)
- [ ] Bulk actions panel with progress tracking
- [ ] Interactive dashboard with real-time updates
- [ ] Advanced form validation and conditional logic
- [ ] Module interconnection with state management
- [ ] Real-time notifications system

### Phase 4: Polish & Optimization (Week 6)
- [ ] Micro-interactions and animations
- [ ] Loading states and skeleton screens
- [ ] Error handling with user-friendly messages
- [ ] Performance optimization
- [ ] Accessibility improvements

---

## Next Steps

1. **Install Dependencies**
   ```bash
   npm install framer-motion @tanstack/react-table @dnd-kit/core
   npm install react-hot-toast react-dropzone react-day-picker
   npm install @uiw/react-md-editor @monaco-editor/react
   ```

2. **Create Component Library**
   - Setup component directory structure
   - Create reusable UI components
   - Implement design system tokens
   - Build interactive examples

3. **Implement Dashboard**
   - Create dashboard layout
   - Implement real-time updates
   - Add interactive features
   - Optimize for performance

4. **Add Advanced Features**
   - Implement bulk actions with progress tracking
   - Add real-time notifications
   - Create module interconnections
   - Add customization options

---

**Result**: Modern, interactive, and user-friendly interface that's not only functional but also enjoyable to use with intelligent features and beautiful design.