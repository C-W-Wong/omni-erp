'use client';

import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataTable } from '@/components/tables/DataTable';
import { createColumns } from './columns';
import { WarehouseForm } from './WarehouseForm';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  Plus,
  Warehouse as WarehouseIcon,
  Star,
  MapPin,
  Loader2,
  AlertTriangle,
  RefreshCcw,
} from 'lucide-react';
import type { Warehouse } from '@prisma/client';

export default function WarehousesPage() {
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editWarehouse, setEditWarehouse] = useState<Warehouse | null>(null);
  const [deleteWarehouse, setDeleteWarehouse] = useState<Warehouse | null>(null);

  const utils = trpc.useUtils();

  const {
    data: warehousesData,
    isLoading,
    isError,
    refetch,
  } = trpc.warehouse.list.useQuery({
    page,
    pageSize: 20,
  });

  const deleteMutation = trpc.warehouse.delete.useMutation({
    onSuccess: () => {
      toast.success('Warehouse deleted successfully');
      utils.warehouse.list.invalidate();
      setDeleteWarehouse(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const stats = useMemo(() => {
    if (!warehousesData) {
      return { total: 0, active: 0, hasDefault: false };
    }
    return {
      total: warehousesData.total,
      active: warehousesData.items.filter((w) => w.isActive).length,
      hasDefault: warehousesData.items.some((w) => w.isDefault),
    };
  }, [warehousesData]);

  const columns = useMemo(
    () =>
      createColumns({
        onView: (warehouse) => {
          console.log('View warehouse:', warehouse.id);
        },
        onEdit: (warehouse) => {
          setEditWarehouse(warehouse);
          setFormOpen(true);
        },
        onDelete: (warehouse) => {
          setDeleteWarehouse(warehouse);
        },
      }),
    []
  );

  const handleAddNew = () => {
    setEditWarehouse(null);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditWarehouse(null);
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteWarehouse) {
      deleteMutation.mutate(deleteWarehouse.id);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="page-header">
            <h1 className="page-title flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <WarehouseIcon className="h-5 w-5 text-primary" />
              </div>
              Warehouses
            </h1>
            <p className="page-description">
              Manage your warehouse locations and storage facilities.
            </p>
          </div>
          <Button onClick={handleAddNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Warehouse
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Warehouses
              </CardTitle>
              <WarehouseIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{isLoading ? '-' : stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">storage locations</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Warehouses
              </CardTitle>
              <MapPin className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">
                {isLoading ? '-' : stats.active}
              </div>
              <p className="text-xs text-muted-foreground mt-1">operational</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Default Warehouse
              </CardTitle>
              <Star className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {isLoading ? '-' : stats.hasDefault ? 'Set' : 'Not Set'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">for new transactions</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Warehouse Locations</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  A list of all warehouses in your system.
                </p>
              </div>
              <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isError ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-lg font-semibold">Failed to load warehouses</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  There was an error loading the warehouse list.
                </p>
                <Button onClick={() => refetch()} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={warehousesData?.items ?? []}
                isLoading={isLoading}
                searchPlaceholder="Search warehouses..."
                searchKey="name"
                serverPagination
                pageSize={20}
                totalItems={warehousesData?.total}
                currentPage={page}
                onPageChange={setPage}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <WarehouseForm
        open={formOpen}
        onOpenChange={handleFormClose}
        warehouse={editWarehouse}
        onSuccess={() => {
          toast.success(
            editWarehouse ? 'Warehouse updated successfully' : 'Warehouse created successfully'
          );
        }}
      />

      <Dialog open={!!deleteWarehouse} onOpenChange={(open) => !open && setDeleteWarehouse(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Warehouse
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this warehouse? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteWarehouse && (
            <div className="rounded-lg border border-border bg-muted/50 p-4 my-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <WarehouseIcon className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium">{deleteWarehouse.name}</p>
                  <p className="text-sm text-muted-foreground font-mono">{deleteWarehouse.code}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteWarehouse(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending || deleteWarehouse?.isDefault}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Warehouse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
