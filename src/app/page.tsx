'use client';

import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Boxes } from 'lucide-react';

const stats = [
  {
    title: 'Total Revenue',
    value: '$124,592.00',
    change: '+12.5%',
    trend: 'up',
    icon: DollarSign,
    description: 'vs last month',
  },
  {
    title: 'Purchase Orders',
    value: '23',
    change: '+4',
    trend: 'up',
    icon: Boxes,
    description: 'pending processing',
  },
  {
    title: 'Sales Orders',
    value: '47',
    change: '+8',
    trend: 'up',
    icon: FileText,
    description: 'this month',
  },
  {
    title: 'Low Stock Items',
    value: '12',
    change: '-3',
    trend: 'down',
    icon: AlertTriangle,
    description: 'need attention',
  },
];

const recentOrders = [
  {
    id: 'SO-2024-0047',
    customer: 'Acme Corporation',
    amount: '$12,450.00',
    status: 'confirmed',
    date: '2024-01-15',
  },
  {
    id: 'SO-2024-0046',
    customer: 'Global Industries',
    amount: '$8,320.00',
    status: 'processing',
    date: '2024-01-15',
  },
  {
    id: 'SO-2024-0045',
    customer: 'Tech Solutions Ltd',
    amount: '$15,780.00',
    status: 'shipped',
    date: '2024-01-14',
  },
  {
    id: 'SO-2024-0044',
    customer: 'Prime Retail Co.',
    amount: '$6,920.00',
    status: 'completed',
    date: '2024-01-14',
  },
  {
    id: 'PO-2024-0038',
    customer: 'Supplier XYZ',
    amount: '$24,100.00',
    status: 'received',
    date: '2024-01-13',
  },
];

const lowStockItems = [
  { sku: 'SKU-001', name: 'Widget Pro X', current: 5, minimum: 20, warehouse: 'Main' },
  { sku: 'SKU-024', name: 'Connector Type-C', current: 12, minimum: 50, warehouse: 'Main' },
  { sku: 'SKU-089', name: 'Power Adapter 65W', current: 3, minimum: 15, warehouse: 'Secondary' },
  { sku: 'SKU-156', name: 'USB Hub 7-Port', current: 8, minimum: 25, warehouse: 'Main' },
];

const statusColors: Record<string, string> = {
  confirmed: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  processing: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  shipped: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  completed: 'bg-green-500/10 text-green-600 dark:text-green-400',
  received: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-description">
            Welcome back! Here&apos;s an overview of your business.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="stat-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    {stat.trend === 'up' ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}>
                      {stat.change}
                    </span>
                    <span>{stat.description}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recent Orders
              </CardTitle>
              <CardDescription>Latest sales and purchase orders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">{order.id}</span>
                        <Badge variant="secondary" className={statusColors[order.status]}>
                          {order.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{order.customer}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{order.amount}</p>
                      <p className="text-xs text-muted-foreground font-mono">{order.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Low Stock Alert */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Boxes className="h-5 w-5" />
                Low Stock Alerts
              </CardTitle>
              <CardDescription>Items below minimum stock level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowStockItems.map((item) => (
                  <div
                    key={item.sku}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">{item.sku}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {item.warehouse}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.name}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-destructive">{item.current}</span>
                        <span className="text-xs text-muted-foreground">/ {item.minimum}</span>
                      </div>
                      <div className="w-24 h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-destructive rounded-full transition-all"
                          style={{ width: `${(item.current / item.minimum) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
