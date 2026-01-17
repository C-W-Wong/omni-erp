'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  Users,
  Truck,
  Warehouse,
  ShoppingCart,
  FileText,
  Boxes,
  Layers,
  Calculator,
  Settings,
  ChevronLeft,
  LayoutDashboard,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { type: 'separator', label: 'MASTER DATA' },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Suppliers', href: '/suppliers', icon: Truck },
  { name: 'Warehouses', href: '/warehouses', icon: Warehouse },
  { type: 'separator', label: 'TRANSACTIONS' },
  { name: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart },
  { name: 'Sales Orders', href: '/sales-orders', icon: FileText },
  { type: 'separator', label: 'INVENTORY' },
  { name: 'Inventory', href: '/inventory', icon: Boxes },
  { name: 'Batches', href: '/batches', icon: Layers },
  { type: 'separator', label: 'FINANCE' },
  { name: 'Accounting', href: '/accounting', icon: Calculator },
  { type: 'separator', label: 'SYSTEM' },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300 ease-in-out',
        collapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]'
      )}
    >
      {/* Logo */}
      <div className="flex h-[var(--header-height)] items-center justify-between px-4 border-b border-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Boxes className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">Import ERP</span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                Trading System
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="h-[calc(100vh-var(--header-height)-60px)]">
        <nav className="p-3 space-y-1">
          {navigation.map((item, index) => {
            if (item.type === 'separator') {
              return (
                <div key={index} className="pt-4 pb-2">
                  {!collapsed && (
                    <span className="px-3 text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-widest">
                      {item.label}
                    </span>
                  )}
                  {collapsed && <Separator className="my-2" />}
                </div>
              );
            }

            const Icon = item.icon!;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href!}
                className={cn(
                  'sidebar-item',
                  isActive && 'active',
                  collapsed && 'justify-center px-0'
                )}
                title={collapsed ? item.name : undefined}
              >
                <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Collapse Toggle */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border bg-card">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn('w-full justify-center', !collapsed && 'justify-start')}
        >
          <ChevronLeft
            className={cn('h-4 w-4 transition-transform duration-300', collapsed && 'rotate-180')}
          />
          {!collapsed && <span className="ml-2">Collapse</span>}
        </Button>
      </div>
    </aside>
  );
}
