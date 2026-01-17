'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { DataTable } from '@/components/tables/DataTable';
import { createColumns } from './columns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, FileText, Clock, Package, CheckCircle, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function PurchaseOrdersPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'confirm' | 'cancel' | 'delete';
    id: string;
  } | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.purchaseOrder.list.useQuery({
    page,
    pageSize,
    status: status as 'DRAFT' | 'CONFIRMED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED' | undefined,
  });

  const { data: stats } = trpc.purchaseOrder.stats.useQuery();

  const confirmMutation = trpc.purchaseOrder.confirm.useMutation({
    onSuccess: () => {
      toast.success('Purchase order confirmed');
      utils.purchaseOrder.list.invalidate();
      utils.purchaseOrder.stats.invalidate();
      setConfirmAction(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const cancelMutation = trpc.purchaseOrder.cancel.useMutation({
    onSuccess: () => {
      toast.success('Purchase order cancelled');
      utils.purchaseOrder.list.invalidate();
      utils.purchaseOrder.stats.invalidate();
      setConfirmAction(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.purchaseOrder.delete.useMutation({
    onSuccess: () => {
      toast.success('Purchase order deleted');
      utils.purchaseOrder.list.invalidate();
      utils.purchaseOrder.stats.invalidate();
      setConfirmAction(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const handleConfirmAction = () => {
    if (!confirmAction) return;

    switch (confirmAction.type) {
      case 'confirm':
        confirmMutation.mutate(confirmAction.id);
        break;
      case 'cancel':
        cancelMutation.mutate(confirmAction.id);
        break;
      case 'delete':
        deleteMutation.mutate(confirmAction.id);
        break;
    }
  };

  const isProcessing =
    confirmMutation.isPending || cancelMutation.isPending || deleteMutation.isPending;

  const columns = createColumns({
    onConfirm: (id) => setConfirmAction({ type: 'confirm', id }),
    onCancel: (id) => setConfirmAction({ type: 'cancel', id }),
    onDelete: (id) => setConfirmAction({ type: 'delete', id }),
  });

  const getActionInfo = () => {
    switch (confirmAction?.type) {
      case 'confirm':
        return {
          title: 'Confirm Order',
          description: 'This will confirm the purchase order. It can no longer be edited.',
        };
      case 'cancel':
        return {
          title: 'Cancel Order',
          description: 'This will cancel the purchase order.',
        };
      case 'delete':
        return {
          title: 'Delete Order',
          description:
            'This will permanently delete the purchase order. This action cannot be undone.',
        };
      default:
        return { title: '', description: '' };
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground mt-1">Manage supplier purchase orders</p>
        </div>
        <Button asChild>
          <Link href="/purchase-orders/new">
            <Plus className="mr-2 h-4 w-4" />
            New Order
          </Link>
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.draft ?? 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.confirmed ?? 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting delivery</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partial</CardTitle>
            <Package className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats?.partial ?? 0}</div>
            <p className="text-xs text-muted-foreground">Partially received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Received</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.received ?? 0}</div>
            <p className="text-xs text-muted-foreground">Fully received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats?.pendingValue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Outstanding orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-[200px]">
              <Label className="mb-2 block">Status</Label>
              <Select
                value={status || 'all'}
                onValueChange={(value) => setStatus(value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getActionInfo().title}</DialogTitle>
            <DialogDescription>{getActionInfo().description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAction}
              disabled={isProcessing}
              variant={
                confirmAction?.type === 'cancel' || confirmAction?.type === 'delete'
                  ? 'destructive'
                  : 'default'
              }
            >
              {isProcessing ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
