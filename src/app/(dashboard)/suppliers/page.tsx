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
import { SupplierForm } from './SupplierForm';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Plus, Truck, Globe, Clock, Loader2, AlertTriangle, RefreshCcw } from 'lucide-react';
import type { Supplier } from '@prisma/client';

export default function SuppliersPage() {
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);

  const utils = trpc.useUtils();

  const {
    data: suppliersData,
    isLoading,
    isError,
    refetch,
  } = trpc.supplier.list.useQuery({
    page,
    pageSize: 20,
  });

  const deleteMutation = trpc.supplier.delete.useMutation({
    onSuccess: () => {
      toast.success('Supplier deleted successfully');
      utils.supplier.list.invalidate();
      setDeleteSupplier(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const stats = useMemo(() => {
    if (!suppliersData) {
      return { total: 0, active: 0, countries: 0 };
    }
    const countries = new Set(suppliersData.items.map((s) => s.country).filter(Boolean));
    return {
      total: suppliersData.total,
      active: suppliersData.items.filter((s) => s.isActive).length,
      countries: countries.size,
    };
  }, [suppliersData]);

  const columns = useMemo(
    () =>
      createColumns({
        onView: (supplier) => {
          console.log('View supplier:', supplier.id);
        },
        onEdit: (supplier) => {
          setEditSupplier(supplier);
          setFormOpen(true);
        },
        onDelete: (supplier) => {
          setDeleteSupplier(supplier);
        },
      }),
    []
  );

  const handleAddNew = () => {
    setEditSupplier(null);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditSupplier(null);
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteSupplier) {
      deleteMutation.mutate(deleteSupplier.id);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="page-header">
            <h1 className="page-title flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              Suppliers
            </h1>
            <p className="page-description">
              Manage your supplier database, trade terms, and contact information.
            </p>
          </div>
          <Button onClick={handleAddNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Supplier
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Suppliers
              </CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{isLoading ? '-' : stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">in database</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Suppliers
              </CardTitle>
              <Clock className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">
                {isLoading ? '-' : stats.active}
              </div>
              <p className="text-xs text-muted-foreground mt-1">available for orders</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Countries</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {isLoading ? '-' : stats.countries}
              </div>
              <p className="text-xs text-muted-foreground mt-1">sourcing regions</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Supplier Directory</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  A list of all suppliers in your system.
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
                <h3 className="text-lg font-semibold">Failed to load suppliers</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  There was an error loading the supplier list.
                </p>
                <Button onClick={() => refetch()} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={suppliersData?.items ?? []}
                isLoading={isLoading}
                searchPlaceholder="Search suppliers..."
                searchKey="name"
                serverPagination
                pageSize={20}
                totalItems={suppliersData?.total}
                currentPage={page}
                onPageChange={setPage}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <SupplierForm
        open={formOpen}
        onOpenChange={handleFormClose}
        supplier={editSupplier}
        onSuccess={() => {
          toast.success(
            editSupplier ? 'Supplier updated successfully' : 'Supplier created successfully'
          );
        }}
      />

      <Dialog open={!!deleteSupplier} onOpenChange={(open) => !open && setDeleteSupplier(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Supplier
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this supplier? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteSupplier && (
            <div className="rounded-lg border border-border bg-muted/50 p-4 my-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <Truck className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium">{deleteSupplier.name}</p>
                  <p className="text-sm text-muted-foreground font-mono">{deleteSupplier.code}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSupplier(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
