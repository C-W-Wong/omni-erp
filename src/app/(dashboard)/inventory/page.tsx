'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { DataTable } from '@/components/tables/DataTable';
import { columns } from './columns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Package, AlertTriangle, Warehouse, DollarSign } from 'lucide-react';

export default function InventoryPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [productId, setProductId] = useState<string | undefined>(undefined);
  const [warehouseId, setWarehouseId] = useState<string | undefined>(undefined);
  const [lowStock, setLowStock] = useState(false);

  // Fetch inventory list
  const { data, isLoading } = trpc.inventory.list.useQuery({
    page,
    pageSize,
    productId,
    warehouseId,
    lowStock: lowStock || undefined,
  });

  // Fetch statistics
  const { data: stats } = trpc.inventory.stats.useQuery();

  // Fetch products and warehouses for filters
  const { data: products } = trpc.product.listActive.useQuery();
  const { data: warehouses } = trpc.warehouse.listActive.useQuery();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground mt-1">
          Track inventory levels across all warehouses and batches
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProducts ?? 0}</div>
            <p className="text-xs text-muted-foreground">Products in inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {(stats?.totalValue ?? 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground">Inventory value at cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats?.lowStockCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">Products below minimum</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warehouses</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.warehouses?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">Active locations</p>
          </CardContent>
        </Card>
      </div>

      {/* Warehouse Summary */}
      {stats?.warehouses && stats.warehouses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Inventory by Warehouse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              {stats.warehouses.map((wh) => (
                <div
                  key={wh.warehouse.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{wh.warehouse.name}</p>
                    <p className="text-sm text-muted-foreground">{wh.productCount} products</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-medium">
                      $
                      {wh.totalValue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-[200px]">
              <Label className="mb-2 block">Product</Label>
              <Select
                value={productId || 'all'}
                onValueChange={(value) => setProductId(value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.sku} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[200px]">
              <Label className="mb-2 block">Warehouse</Label>
              <Select
                value={warehouseId || 'all'}
                onValueChange={(value) => setWarehouseId(value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Warehouses</SelectItem>
                  {warehouses?.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.code} - {wh.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <Switch id="low-stock" checked={lowStock} onCheckedChange={setLowStock} />
              <Label htmlFor="low-stock">Low Stock Only</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={data?.items ?? []}
            isLoading={isLoading}
            serverPagination
            totalItems={data?.total ?? 0}
            currentPage={page}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
