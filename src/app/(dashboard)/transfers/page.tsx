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
import { Plus, FileText, Clock, Truck, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function TransfersPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'submit' | 'approve' | 'complete' | 'cancel';
    id: string;
  } | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.transfer.list.useQuery({
    page,
    pageSize,
    status: status as 'DRAFT' | 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED' | undefined,
  });

  const submitMutation = trpc.transfer.submit.useMutation({
    onSuccess: () => {
      toast.success('Transfer submitted for approval');
      utils.transfer.list.invalidate();
      setConfirmAction(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const approveMutation = trpc.transfer.approve.useMutation({
    onSuccess: () => {
      toast.success('Transfer approved');
      utils.transfer.list.invalidate();
      setConfirmAction(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const completeMutation = trpc.transfer.complete.useMutation({
    onSuccess: () => {
      toast.success('Transfer completed');
      utils.transfer.list.invalidate();
      setConfirmAction(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const cancelMutation = trpc.transfer.cancel.useMutation({
    onSuccess: () => {
      toast.success('Transfer cancelled');
      utils.transfer.list.invalidate();
      setConfirmAction(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleConfirmAction = () => {
    if (!confirmAction) return;

    switch (confirmAction.type) {
      case 'submit':
        submitMutation.mutate(confirmAction.id);
        break;
      case 'approve':
        approveMutation.mutate(confirmAction.id);
        break;
      case 'complete':
        completeMutation.mutate(confirmAction.id);
        break;
      case 'cancel':
        cancelMutation.mutate(confirmAction.id);
        break;
    }
  };

  const isProcessing =
    submitMutation.isPending ||
    approveMutation.isPending ||
    completeMutation.isPending ||
    cancelMutation.isPending;

  const columns = createColumns({
    onSubmit: (id) => setConfirmAction({ type: 'submit', id }),
    onApprove: (id) => setConfirmAction({ type: 'approve', id }),
    onComplete: (id) => setConfirmAction({ type: 'complete', id }),
    onCancel: (id) => setConfirmAction({ type: 'cancel', id }),
  });

  // Calculate stats
  const stats = {
    draft: data?.items.filter((t) => t.status === 'DRAFT').length ?? 0,
    pending: data?.items.filter((t) => t.status === 'PENDING').length ?? 0,
    inTransit: data?.items.filter((t) => t.status === 'IN_TRANSIT').length ?? 0,
    completed: data?.items.filter((t) => t.status === 'COMPLETED').length ?? 0,
  };

  const getActionTitle = () => {
    switch (confirmAction?.type) {
      case 'submit':
        return 'Submit Transfer';
      case 'approve':
        return 'Approve Transfer';
      case 'complete':
        return 'Complete Transfer';
      case 'cancel':
        return 'Cancel Transfer';
      default:
        return '';
    }
  };

  const getActionDescription = () => {
    switch (confirmAction?.type) {
      case 'submit':
        return 'This will submit the transfer for approval. It can no longer be edited.';
      case 'approve':
        return 'This will approve the transfer and reserve inventory at the source warehouse.';
      case 'complete':
        return 'This will complete the transfer and move inventory to the target warehouse.';
      case 'cancel':
        return 'This will cancel the transfer. If inventory was reserved, it will be released.';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Transfers</h1>
          <p className="text-muted-foreground mt-1">Move inventory between warehouses</p>
        </div>
        <Button asChild>
          <Link href="/transfers/new">
            <Plus className="mr-2 h-4 w-4" />
            New Transfer
          </Link>
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
            <p className="text-xs text-muted-foreground">Awaiting submission</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inTransit}</div>
            <p className="text-xs text-muted-foreground">Being transferred</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Successfully transferred</p>
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
            <DialogTitle>{getActionTitle()}</DialogTitle>
            <DialogDescription>{getActionDescription()}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAction}
              disabled={isProcessing}
              variant={confirmAction?.type === 'cancel' ? 'destructive' : 'default'}
            >
              {isProcessing ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
