'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Package, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import Decimal from 'decimal.js';

const receiveFormSchema = z.object({
  items: z.array(
    z.object({
      purchaseOrderItemId: z.string(),
      productName: z.string(),
      productSku: z.string(),
      orderedQty: z.number(),
      receivedQty: z.number(),
      remainingQty: z.number(),
      unit: z.string(),
      quantityReceived: z.number().min(0, 'Cannot be negative'),
    })
  ),
  notes: z.string().max(1000).optional(),
});

type ReceiveFormData = z.infer<typeof receiveFormSchema>;

export default function ReceiveGoodsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdBatches, setCreatedBatches] = useState<
    Array<{ batchId: string; batchNumber: string; productName: string; quantity: number }>
  >([]);

  const { data: order, isLoading } = trpc.purchaseOrder.getById.useQuery(id);

  const form = useForm<ReceiveFormData>({
    resolver: zodResolver(receiveFormSchema),
    defaultValues: {
      items: [],
      notes: '',
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  // Initialize form with order items when data loads
  const items = order?.items.map((item) => {
    const orderedQty = Number(item.quantity);
    const receivedQty = Number(item.receivedQuantity);
    const remainingQty = new Decimal(orderedQty).minus(receivedQty).toNumber();

    return {
      purchaseOrderItemId: item.id,
      productName: item.product.name,
      productSku: item.product.sku,
      orderedQty,
      receivedQty,
      remainingQty,
      unit: item.product.unit,
      quantityReceived: remainingQty, // Default to remaining quantity
    };
  });

  // Reset form when items change
  if (items && fields.length === 0 && items.length > 0) {
    form.reset({ items, notes: '' });
  }

  const receiveMutation = trpc.purchaseOrder.receive.useMutation({
    onSuccess: (result) => {
      setCreatedBatches(result.batches);
      setShowSuccess(true);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: ReceiveFormData) => {
    // Filter items with quantity > 0
    const itemsToReceive = data.items
      .filter((item) => item.quantityReceived > 0)
      .map((item) => ({
        purchaseOrderItemId: item.purchaseOrderItemId,
        quantityReceived: item.quantityReceived,
      }));

    if (itemsToReceive.length === 0) {
      toast.error('Please enter quantity for at least one item');
      return;
    }

    receiveMutation.mutate({
      purchaseOrderId: id,
      items: itemsToReceive,
      notes: data.notes,
    });
  };

  const handleReceiveAll = () => {
    const currentItems = form.getValues('items');
    const updatedItems = currentItems.map((item) => ({
      ...item,
      quantityReceived: item.remainingQty,
    }));
    form.setValue('items', updatedItems);
  };

  const handleClearAll = () => {
    const currentItems = form.getValues('items');
    const updatedItems = currentItems.map((item) => ({
      ...item,
      quantityReceived: 0,
    }));
    form.setValue('items', updatedItems);
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

  if (order.status !== 'CONFIRMED' && order.status !== 'PARTIAL') {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Only confirmed or partial orders can receive goods</p>
        <Button asChild className="mt-4">
          <Link href={`/purchase-orders/${id}`}>Back to Order</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/purchase-orders/${id}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Receive Goods</h1>
            <Badge variant="outline" className="font-mono">
              {order.orderNumber}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {order.supplier.name} - {order.warehouse.name}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Items to Receive */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Items to Receive
              </CardTitle>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleReceiveAll}>
                  Receive All
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={handleClearAll}>
                  Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right w-[150px]">Receive Now</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{field.productName}</p>
                          <p className="text-sm text-muted-foreground font-mono">
                            {field.productSku}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {field.orderedQty.toLocaleString()} {field.unit}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {field.receivedQty.toLocaleString()} {field.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={field.remainingQty > 0 ? 'outline' : 'default'}
                          className={
                            field.remainingQty > 0
                              ? 'text-amber-600 border-amber-300'
                              : 'bg-green-600'
                          }
                        >
                          {field.remainingQty.toLocaleString()} {field.unit}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {field.remainingQty > 0 ? (
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantityReceived`}
                            render={({ field: inputField }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.0001"
                                    min="0"
                                    max={field.remainingQty}
                                    className="w-[120px] text-right font-mono"
                                    {...inputField}
                                    onChange={(e) =>
                                      inputField.onChange(parseFloat(e.target.value) || 0)
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : (
                          <span className="text-muted-foreground">Fully received</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Receiving Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any notes about this receiving..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href={`/purchase-orders/${id}`}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={receiveMutation.isPending}>
              {receiveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm Receipt
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Goods Received Successfully
            </DialogTitle>
            <DialogDescription>The following batches have been created:</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {createdBatches.map((batch) => (
              <div
                key={batch.batchId}
                className="flex justify-between items-center p-2 bg-muted rounded"
              >
                <div>
                  <p className="font-mono text-sm">{batch.batchNumber}</p>
                  <p className="text-sm text-muted-foreground">{batch.productName}</p>
                </div>
                <Badge variant="outline">{batch.quantity.toLocaleString()} units</Badge>
              </div>
            ))}
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/purchase-orders/${id}`)}>
              Back to Order
            </Button>
            <Button onClick={() => router.push('/batches')}>View Batches</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
