'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, ArrowRight, Send, CheckCircle, XCircle, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useState } from 'react';

export default function TransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [confirmAction, setConfirmAction] = useState<
    'submit' | 'approve' | 'complete' | 'cancel' | 'delete' | null
  >(null);

  const utils = trpc.useUtils();

  const { data: transfer, isLoading } = trpc.transfer.getById.useQuery(id);

  const submitMutation = trpc.transfer.submit.useMutation({
    onSuccess: () => {
      toast.success('Transfer submitted for approval');
      utils.transfer.getById.invalidate(id);
      setConfirmAction(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const approveMutation = trpc.transfer.approve.useMutation({
    onSuccess: () => {
      toast.success('Transfer approved');
      utils.transfer.getById.invalidate(id);
      setConfirmAction(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const completeMutation = trpc.transfer.complete.useMutation({
    onSuccess: () => {
      toast.success('Transfer completed');
      utils.transfer.getById.invalidate(id);
      setConfirmAction(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const cancelMutation = trpc.transfer.cancel.useMutation({
    onSuccess: () => {
      toast.success('Transfer cancelled');
      utils.transfer.getById.invalidate(id);
      setConfirmAction(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.transfer.delete.useMutation({
    onSuccess: () => {
      toast.success('Transfer deleted');
      router.push('/transfers');
    },
    onError: (error) => toast.error(error.message),
  });

  const handleConfirmAction = () => {
    switch (confirmAction) {
      case 'submit':
        submitMutation.mutate(id);
        break;
      case 'approve':
        approveMutation.mutate(id);
        break;
      case 'complete':
        completeMutation.mutate(id);
        break;
      case 'cancel':
        cancelMutation.mutate(id);
        break;
      case 'delete':
        deleteMutation.mutate(id);
        break;
    }
  };

  const isProcessing =
    submitMutation.isPending ||
    approveMutation.isPending ||
    completeMutation.isPending ||
    cancelMutation.isPending ||
    deleteMutation.isPending;

  const getActionInfo = () => {
    switch (confirmAction) {
      case 'submit':
        return {
          title: 'Submit Transfer',
          description: 'This will submit the transfer for approval. It can no longer be edited.',
        };
      case 'approve':
        return {
          title: 'Approve Transfer',
          description:
            'This will approve the transfer and reserve inventory at the source warehouse.',
        };
      case 'complete':
        return {
          title: 'Complete Transfer',
          description:
            'This will complete the transfer and move inventory to the target warehouse.',
        };
      case 'cancel':
        return {
          title: 'Cancel Transfer',
          description:
            'This will cancel the transfer. If inventory was reserved, it will be released.',
        };
      case 'delete':
        return {
          title: 'Delete Transfer',
          description: 'This will permanently delete the transfer. This action cannot be undone.',
        };
      default:
        return { title: '', description: '' };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Transfer not found</p>
        <Button asChild className="mt-4">
          <Link href="/transfers">Back to Transfers</Link>
        </Button>
      </div>
    );
  }

  const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    DRAFT: 'secondary',
    PENDING: 'outline',
    IN_TRANSIT: 'default',
    COMPLETED: 'default',
    CANCELLED: 'destructive',
  };

  const statusColors: Record<string, string> = {
    DRAFT: '',
    PENDING: 'text-amber-600 border-amber-300',
    IN_TRANSIT: 'bg-blue-600',
    COMPLETED: 'bg-green-600',
    CANCELLED: '',
  };

  const totalQuantity = transfer.items.reduce((sum, item) => sum + Number(item.quantity), 0);
  const totalValue = transfer.items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.batch.costPerUnit),
    0
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/transfers">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight font-mono">
                {transfer.transferNumber}
              </h1>
              <Badge
                variant={statusVariant[transfer.status]}
                className={statusColors[transfer.status]}
              >
                {transfer.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Created {new Date(transfer.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {transfer.status === 'DRAFT' && (
            <>
              <Button variant="outline" onClick={() => setConfirmAction('delete')}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <Button onClick={() => setConfirmAction('submit')}>
                <Send className="mr-2 h-4 w-4" />
                Submit for Approval
              </Button>
            </>
          )}
          {transfer.status === 'PENDING' && (
            <>
              <Button variant="outline" onClick={() => setConfirmAction('cancel')}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={() => setConfirmAction('approve')}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </>
          )}
          {transfer.status === 'IN_TRANSIT' && (
            <>
              <Button variant="outline" onClick={() => setConfirmAction('cancel')}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={() => setConfirmAction('complete')}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark Completed
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Transfer Route */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transfer Route</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">From</p>
              <Badge variant="outline" className="font-mono text-lg px-3 py-1">
                {transfer.sourceWarehouse.code}
              </Badge>
              <p className="text-sm mt-2">{transfer.sourceWarehouse.name}</p>
              <p className="text-xs text-muted-foreground">{transfer.sourceWarehouse.address}</p>
            </div>

            <div className="px-8">
              <ArrowRight className="h-8 w-8 text-muted-foreground" />
            </div>

            <div className="flex-1 text-right">
              <p className="text-sm text-muted-foreground mb-1">To</p>
              <Badge variant="outline" className="font-mono text-lg px-3 py-1">
                {transfer.targetWarehouse.code}
              </Badge>
              <p className="text-sm mt-2">{transfer.targetWarehouse.name}</p>
              <p className="text-xs text-muted-foreground">{transfer.targetWarehouse.address}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transfer.items.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Quantity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuantity.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transfer Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transfer Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfer.items.map((item) => {
                const qty = Number(item.quantity);
                const cost = Number(item.batch.costPerUnit);
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {item.product.sku}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{item.batch.batchNumber}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {qty.toLocaleString()} {item.product.unit}
                    </TableCell>
                    <TableCell className="text-right font-mono">${cost.toFixed(4)}</TableCell>
                    <TableCell className="text-right font-mono">
                      ${(qty * cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Status History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-2 h-2 mt-2 rounded-full bg-muted-foreground" />
              <div>
                <p className="font-medium">Created</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(transfer.requestedAt).toLocaleString()} by{' '}
                  {transfer.requestedBy?.name || 'Unknown'}
                </p>
              </div>
            </div>

            {transfer.approvedAt && (
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 mt-2 rounded-full bg-blue-500" />
                <div>
                  <p className="font-medium">Approved</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(transfer.approvedAt).toLocaleString()} by{' '}
                    {transfer.approvedBy?.name || 'Unknown'}
                  </p>
                </div>
              </div>
            )}

            {transfer.completedAt && (
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 mt-2 rounded-full bg-green-500" />
                <div>
                  <p className="font-medium">Completed</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(transfer.completedAt).toLocaleString()} by{' '}
                    {transfer.completedBy?.name || 'Unknown'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {transfer.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{transfer.notes}</p>
          </CardContent>
        </Card>
      )}

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
                confirmAction === 'cancel' || confirmAction === 'delete' ? 'destructive' : 'default'
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
