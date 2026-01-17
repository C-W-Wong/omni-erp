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
import { CostItemTypeForm } from './CostItemTypeForm';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  Plus,
  DollarSign,
  Lock,
  Layers,
  Loader2,
  AlertTriangle,
  RefreshCcw,
  Sparkles,
} from 'lucide-react';
import type { CostItemType } from '@prisma/client';

export default function CostTypesPage() {
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editCostType, setEditCostType] = useState<CostItemType | null>(null);
  const [deleteCostType, setDeleteCostType] = useState<CostItemType | null>(null);

  const utils = trpc.useUtils();

  const {
    data: costTypesData,
    isLoading,
    isError,
    refetch,
  } = trpc.costItemType.list.useQuery({
    page,
    pageSize: 20,
    includeInactive: true,
  });

  const deleteMutation = trpc.costItemType.delete.useMutation({
    onSuccess: () => {
      toast.success('Cost type deleted successfully');
      utils.costItemType.list.invalidate();
      utils.costItemType.listActive.invalidate();
      setDeleteCostType(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const seedMutation = trpc.costItemType.seedDefaults.useMutation({
    onSuccess: (results) => {
      const created = results.filter((r) => r.action === 'created').length;
      if (created > 0) {
        toast.success(`Created ${created} default cost types`);
      } else {
        toast.info('All default cost types already exist');
      }
      utils.costItemType.list.invalidate();
      utils.costItemType.listActive.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const stats = useMemo(() => {
    if (!costTypesData) {
      return { total: 0, system: 0, custom: 0 };
    }
    return {
      total: costTypesData.total,
      system: costTypesData.items.filter((t) => t.isSystem).length,
      custom: costTypesData.items.filter((t) => !t.isSystem).length,
    };
  }, [costTypesData]);

  const columns = useMemo(
    () =>
      createColumns({
        onEdit: (costType) => {
          setEditCostType(costType);
          setFormOpen(true);
        },
        onDelete: (costType) => {
          setDeleteCostType(costType);
        },
      }),
    []
  );

  const handleAddNew = () => {
    setEditCostType(null);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditCostType(null);
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteCostType) {
      deleteMutation.mutate(deleteCostType.id);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="page-header">
            <h1 className="page-title flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              Cost Types
            </h1>
            <p className="page-description">
              Manage cost item types for landed cost tracking (freight, duties, etc.).
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="gap-2"
            >
              {seedMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Seed Defaults
            </Button>
            <Button onClick={handleAddNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Cost Type
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Types
              </CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{isLoading ? '-' : stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">cost categories</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                System Types
              </CardTitle>
              <Lock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                {isLoading ? '-' : stats.system}
              </div>
              <p className="text-xs text-muted-foreground mt-1">protected from deletion</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Custom Types
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">
                {isLoading ? '-' : stats.custom}
              </div>
              <p className="text-xs text-muted-foreground mt-1">user defined</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Cost Type Catalog</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Types of costs that can be added to batches for landed cost calculation.
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
                <h3 className="text-lg font-semibold">Failed to load cost types</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  There was an error loading the cost type list.
                </p>
                <Button onClick={() => refetch()} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={costTypesData?.items ?? []}
                isLoading={isLoading}
                searchPlaceholder="Search cost types..."
                searchKey="name"
                serverPagination
                pageSize={20}
                totalItems={costTypesData?.total}
                currentPage={page}
                onPageChange={setPage}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <CostItemTypeForm
        open={formOpen}
        onOpenChange={handleFormClose}
        costItemType={editCostType}
        onSuccess={() => {
          toast.success(
            editCostType ? 'Cost type updated successfully' : 'Cost type created successfully'
          );
        }}
      />

      <Dialog open={!!deleteCostType} onOpenChange={(open) => !open && setDeleteCostType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Cost Type
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this cost type? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteCostType && (
            <div className="rounded-lg border border-border bg-muted/50 p-4 my-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <DollarSign className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium">{deleteCostType.name}</p>
                  <p className="text-sm text-muted-foreground font-mono">{deleteCostType.code}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCostType(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending || deleteCostType?.isSystem}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Cost Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
