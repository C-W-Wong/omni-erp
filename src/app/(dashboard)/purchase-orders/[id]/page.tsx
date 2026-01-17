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
import { ArrowLeft, CheckCircle, XCircle, Loader2, Trash2, Edit, Package } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useState } from 'react';

export default function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [confirmAction, setConfirmAction] = useState<'confirm' | 'cancel' | 'delete' | null>(null);

  const utils = trpc.useUtils();

  const { data: order, isLoading } = trpc.purchaseOrder.getById.useQuery(id);

  const confirmMutation = trpc.purchaseOrder.confirm.useMutation({
    onSuccess: () => {
      toast.success('Purchase order confirmed');
      utils.purchaseOrder.getById.invalidate(id);
      setConfirmAction(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const cancelMutation = trpc.purchaseOrder.cancel.useMutation({
    onSuccess: () => {
      toast.success('Purchase order cancelled');
      utils.purchaseOrder.getById.invalidate(id);
      setConfirmAction(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.purchaseOrder.delete.useMutation({
    onSuccess: () => {
      toast.success('Purchase order deleted');
      router.push('/purchase-orders');
    },
    onError: (error) => toast.error(error.message),
  });

  const handleConfirmAction = () => {
    switch (confirmAction) {
      case 'confirm':
        confirmMutation.mutate(id);
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
    confirmMutation.isPending || cancelMutation.isPending || deleteMutation.isPending;

  const getActionInfo = () => {
    switch (confirmAction) {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Purchase order not found</p>
        <Button asChild className="mt-4">
          <Link href="/purchase-orders">Back to Orders</Link>
        </Button>
      </div>
    );
  }

  const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    DRAFT: 'secondary',
    CONFIRMED: 'default',
    PARTIAL: 'outline',
    RECEIVED: 'default',
    CANCELLED: 'destructive',
  };

  const statusColors: Record<string, string> = {
    DRAFT: '',
    CONFIRMED: 'bg-blue-600',
    PARTIAL: 'text-amber-600 border-amber-300',
    RECEIVED: 'bg-green-600',
    CANCELLED: '',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/purchase-orders">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight font-mono">{order.orderNumber}</h1>
              <Badge variant={statusVariant[order.status]} className={statusColors[order.status]}>
                {order.status}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Created {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {order.status === 'DRAFT' && (
            <>
              <Button variant="outline" asChild>
                <Link href={`/purchase-orders/${id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setConfirmAction('delete')}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <Button onClick={() => setConfirmAction('confirm')}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirm Order
              </Button>
            </>
          )}
          {order.status === 'CONFIRMED' && (
            <>
              <Button variant="outline" onClick={() => setConfirmAction('cancel')}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button asChild>
                <Link href={`/purchase-orders/${id}/receive`}>
                  <Package className="mr-2 h-4 w-4" />
                  Receive Goods
                </Link>
              </Button>
            </>
          )}
          {order.status === 'PARTIAL' && (
            <>
              <Button variant="outline" onClick={() => setConfirmAction('cancel')}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button asChild>
                <Link href={`/purchase-orders/${id}/receive`}>
                  <Package className="mr-2 h-4 w-4" />
                  Receive More
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Order Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Supplier Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{order.supplier.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Code</span>
                <span className="font-mono">{order.supplier.code}</span>
              </div>
              {order.supplier.contactPerson && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contact</span>
                  <span>{order.supplier.contactPerson}</span>
                </div>
              )}
              {order.supplier.email && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span>{order.supplier.email}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Warehouse</span>
                <span className="font-medium">{order.warehouse.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Date</span>
                <span>{new Date(order.orderDate).toLocaleDateString()}</span>
              </div>
              {order.expectedDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected Date</span>
                  <span>{new Date(order.expectedDate).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Currency</span>
                <span>{order.currency}</span>
              </div>
              {order.confirmedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confirmed</span>
                  <span>{new Date(order.confirmedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                {(order.status === 'PARTIAL' || order.status === 'RECEIVED') && (
                  <TableHead className="text-right">Received</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-muted-foreground font-mono">{item.product.sku}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(item.quantity).toLocaleString()} {item.product.unit}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ${Number(item.unitPrice).toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    $
                    {Number(item.totalPrice).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </TableCell>
                  {(order.status === 'PARTIAL' || order.status === 'RECEIVED') && (
                    <TableCell className="text-right font-mono">
                      {Number(item.receivedQuantity).toLocaleString()} {item.product.unit}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Totals */}
          <div className="mt-6 flex justify-end border-t pt-4">
            <div className="w-[300px] space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">
                  ${Number(order.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              {Number(order.taxAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-mono">
                    $
                    {Number(order.taxAmount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total</span>
                <span className="font-mono">
                  {order.currency} $
                  {Number(order.totalAmount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {order.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* History */}
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
                  {new Date(order.createdAt).toLocaleString()} by{' '}
                  {order.createdBy?.name || 'Unknown'}
                </p>
              </div>
            </div>

            {order.confirmedAt && (
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 mt-2 rounded-full bg-blue-500" />
                <div>
                  <p className="font-medium">Confirmed</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.confirmedAt).toLocaleString()} by{' '}
                    {order.confirmedBy?.name || 'Unknown'}
                  </p>
                </div>
              </div>
            )}
          </div>
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
