'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { BatchForm } from './BatchForm';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  Plus,
  Package,
  FileCheck,
  Clock,
  DollarSign,
  Loader2,
  AlertTriangle,
  RefreshCcw,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { Batch, Product, Supplier, Warehouse } from '@prisma/client';

type BatchWithRelations = Batch & {
  product: Pick<Product, 'id' | 'sku' | 'name' | 'unit'>;
  supplier: Pick<Supplier, 'id' | 'code' | 'name'> | null;
  warehouse: Pick<Warehouse, 'id' | 'code' | 'name'>;
  _count: { landedCostItems: number };
};

export default function BatchesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editBatch, setEditBatch] = useState<Batch | null>(null);
  const [deleteBatch, setDeleteBatch] = useState<BatchWithRelations | null>(null);
  const [confirmBatch, setConfirmBatch] = useState<BatchWithRelations | null>(null);
  const [cancelBatch, setCancelBatch] = useState<BatchWithRelations | null>(null);

  const utils = trpc.useUtils();

  const {
    data: batchesData,
    isLoading,
    isError,
    refetch,
  } = trpc.batch.list.useQuery({
    page,
    pageSize: 20,
  });

  const { data: stats } = trpc.batch.stats.useQuery();

  const deleteMutation = trpc.batch.delete.useMutation({
    onSuccess: () => {
      toast.success('Batch deleted successfully');
      utils.batch.list.invalidate();
      utils.batch.stats.invalidate();
      setDeleteBatch(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const confirmMutation = trpc.batch.confirm.useMutation({
    onSuccess: () => {
      toast.success('Batch costs confirmed and locked');
      utils.batch.list.invalidate();
      utils.batch.stats.invalidate();
      setConfirmBatch(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const cancelMutation = trpc.batch.cancel.useMutation({
    onSuccess: () => {
      toast.success('Batch cancelled');
      utils.batch.list.invalidate();
      utils.batch.stats.invalidate();
      setCancelBatch(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const columns = useMemo(
    () =>
      createColumns({
        onView: (batch) => {
          router.push(`/batches/${batch.id}`);
        },
        onEdit: (batch) => {
          setEditBatch(batch as unknown as Batch);
          setFormOpen(true);
        },
        onDelete: (batch) => {
          setDeleteBatch(batch);
        },
        onConfirm: (batch) => {
          setConfirmBatch(batch);
        },
        onCancel: (batch) => {
          setCancelBatch(batch);
        },
      }),
    [router]
  );

  const handleAddNew = () => {
    setEditBatch(null);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditBatch(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="page-header">
            <h1 className="page-title flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              Batches
            </h1>
            <p className="page-description">
              Track product batches with landed cost calculation for accurate inventory costing.
            </p>
          </div>
          <Button onClick={handleAddNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Batch
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Batches
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{stats?.total ?? '-'}</div>
              <p className="text-xs text-muted-foreground mt-1">in system</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Draft</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-yellow-600 dark:text-yellow-400">
                {stats?.draft ?? '-'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">pending confirmation</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Confirmed</CardTitle>
              <FileCheck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">
                {stats?.confirmed ?? '-'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">costs locked</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Confirmed Value
              </CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {stats
                  ? `$${stats.totalConfirmedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  : '-'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">total inventory cost</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Batch List</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  All batches with their landed costs and status.
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
                <h3 className="text-lg font-semibold">Failed to load batches</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  There was an error loading the batch list.
                </p>
                <Button onClick={() => refetch()} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={batchesData?.items ?? []}
                isLoading={isLoading}
                searchPlaceholder="Search batches..."
                searchKey="batchNumber"
                serverPagination
                pageSize={20}
                totalItems={batchesData?.total}
                currentPage={page}
                onPageChange={setPage}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <BatchForm
        open={formOpen}
        onOpenChange={handleFormClose}
        batch={editBatch}
        onSuccess={() => {
          toast.success(editBatch ? 'Batch updated successfully' : 'Batch created successfully');
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteBatch} onOpenChange={(open) => !open && setDeleteBatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Batch
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this batch? This will also remove all associated
              landed cost items. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteBatch && (
            <div className="rounded-lg border border-border bg-muted/50 p-4 my-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <Package className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium">{deleteBatch.product.name}</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {deleteBatch.batchNumber}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteBatch(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteBatch && deleteMutation.mutate(deleteBatch.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Costs Dialog */}
      <Dialog open={!!confirmBatch} onOpenChange={(open) => !open && setConfirmBatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Confirm Batch Costs
            </DialogTitle>
            <DialogDescription>
              Once confirmed, the costs for this batch will be locked and cannot be modified. Make
              sure all landed costs have been entered correctly.
            </DialogDescription>
          </DialogHeader>

          {confirmBatch && (
            <div className="rounded-lg border border-border bg-muted/50 p-4 my-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Batch</span>
                  <span className="font-mono font-medium">{confirmBatch.batchNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Product</span>
                  <span className="font-medium">{confirmBatch.product.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Cost</span>
                  <span className="font-mono font-semibold">
                    {confirmBatch.currency}{' '}
                    {Number(confirmBatch.totalCost).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Cost Per Unit</span>
                  <span className="font-mono">
                    {confirmBatch.currency} {Number(confirmBatch.costPerUnit).toFixed(4)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Cost Items</span>
                  <span className="font-mono">{confirmBatch._count.landedCostItems}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmBatch(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => confirmBatch && confirmMutation.mutate(confirmBatch.id)}
              disabled={confirmMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {confirmMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm & Lock Costs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Batch Dialog */}
      <Dialog open={!!cancelBatch} onOpenChange={(open) => !open && setCancelBatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <XCircle className="h-5 w-5" />
              Cancel Batch
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this batch? Cancelled batches cannot be edited or
              confirmed.
            </DialogDescription>
          </DialogHeader>

          {cancelBatch && (
            <div className="rounded-lg border border-border bg-muted/50 p-4 my-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                  <Package className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium">{cancelBatch.product.name}</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {cancelBatch.batchNumber}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelBatch(null)}>
              Go Back
            </Button>
            <Button
              variant="outline"
              className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
              onClick={() => cancelBatch && cancelMutation.mutate(cancelBatch.id)}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
