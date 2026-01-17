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
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
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
import { ArrowLeft, Truck, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import Decimal from 'decimal.js';

const shipFormSchema = z.object({
  items: z.array(
    z.object({
      salesOrderItemId: z.string(),
      productName: z.string(),
      productSku: z.string(),
      orderedQty: z.number(),
      shippedQty: z.number(),
      remainingQty: z.number(),
      unit: z.string(),
      quantityShipped: z.number().min(0, 'Cannot be negative'),
    })
  ),
  trackingNumber: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

type ShipFormData = z.infer<typeof shipFormSchema>;

export default function ShipGoodsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [showSuccess, setShowSuccess] = useState(false);

  const { data: order, isLoading } = trpc.salesOrder.getById.useQuery(id);

  const form = useForm<ShipFormData>({
    resolver: zodResolver(shipFormSchema),
    defaultValues: {
      items: [],
      trackingNumber: '',
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
    const shippedQty = Number(item.shippedQuantity);
    const remainingQty = new Decimal(orderedQty).minus(shippedQty).toNumber();

    return {
      salesOrderItemId: item.id,
      productName: item.product.name,
      productSku: item.product.sku,
      orderedQty,
      shippedQty,
      remainingQty,
      unit: item.product.unit,
      quantityShipped: remainingQty, // Default to remaining quantity
    };
  });

  // Reset form when items change
  if (items && fields.length === 0 && items.length > 0) {
    form.reset({ items, trackingNumber: '', notes: '' });
  }

  const shipMutation = trpc.salesOrder.ship.useMutation({
    onSuccess: () => {
      setShowSuccess(true);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: ShipFormData) => {
    // Filter items with quantity > 0
    const itemsToShip = data.items
      .filter((item) => item.quantityShipped > 0)
      .map((item) => ({
        salesOrderItemId: item.salesOrderItemId,
        quantityShipped: item.quantityShipped,
      }));

    if (itemsToShip.length === 0) {
      toast.error('Please enter quantity for at least one item');
      return;
    }

    shipMutation.mutate({
      salesOrderId: id,
      items: itemsToShip,
      trackingNumber: data.trackingNumber,
      notes: data.notes,
    });
  };

  const handleShipAll = () => {
    const currentItems = form.getValues('items');
    const updatedItems = currentItems.map((item) => ({
      ...item,
      quantityShipped: item.remainingQty,
    }));
    form.setValue('items', updatedItems);
  };

  const handleClearAll = () => {
    const currentItems = form.getValues('items');
    const updatedItems = currentItems.map((item) => ({
      ...item,
      quantityShipped: 0,
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
        <p className="text-muted-foreground">Sales order not found</p>
        <Button asChild className="mt-4">
          <Link href="/sales-orders">Back to Orders</Link>
        </Button>
      </div>
    );
  }

  if (order.status !== 'CONFIRMED' && order.status !== 'PROCESSING') {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Only confirmed or processing orders can ship goods</p>
        <Button asChild className="mt-4">
          <Link href={`/sales-orders/${id}`}>Back to Order</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/sales-orders/${id}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Ship Goods</h1>
            <Badge variant="outline" className="font-mono">
              {order.orderNumber}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {order.customer.name} - {order.warehouse.name}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Items to Ship */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Items to Ship
              </CardTitle>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleShipAll}>
                  Ship All
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
                    <TableHead className="text-right">Shipped</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right w-[150px]">Ship Now</TableHead>
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
                        {field.shippedQty.toLocaleString()} {field.unit}
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
                            name={`items.${index}.quantityShipped`}
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
                          <span className="text-muted-foreground">Fully shipped</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Shipping Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Shipping Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="trackingNumber"
                render={({ field }) => (
                  <FormItem>
                    <label className="text-sm font-medium">Tracking Number (Optional)</label>
                    <FormControl>
                      <Input placeholder="Enter tracking number..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <label className="text-sm font-medium">Notes (Optional)</label>
                    <FormControl>
                      <Textarea
                        placeholder="Add any notes about this shipment..."
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
              <Link href={`/sales-orders/${id}`}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={shipMutation.isPending}>
              {shipMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Truck className="mr-2 h-4 w-4" />
                  Confirm Shipment
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
              Shipment Confirmed
            </DialogTitle>
            <DialogDescription>The goods have been shipped successfully.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/sales-orders/${id}`)}>
              Back to Order
            </Button>
            <Button onClick={() => router.push('/sales-orders')}>View All Orders</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
