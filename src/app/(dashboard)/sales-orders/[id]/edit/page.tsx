'use client';

import { use, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import Decimal from 'decimal.js';

const editFormSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  currency: z.string(),
  expectedShipDate: z.date().nullable().optional(),
  shippingAddress: z.string().max(500).nullable().optional(),
  taxRate: z.number().min(0).max(1),
  shippingFee: z.number().min(0),
  notes: z.string().max(1000).nullable().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product is required'),
        quantity: z.number().positive('Quantity must be positive'),
        unitPrice: z.number().min(0, 'Unit price cannot be negative'),
        notes: z.string().max(500).optional(),
      })
    )
    .min(1, 'At least one item is required'),
});

type EditFormData = z.infer<typeof editFormSchema>;

export default function EditSalesOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: order, isLoading: orderLoading } = trpc.salesOrder.getById.useQuery(id);
  const { data: customers } = trpc.customer.listActive.useQuery();
  const { data: warehouses } = trpc.warehouse.listActive.useQuery();
  const { data: products } = trpc.product.listActive.useQuery();

  const form = useForm<EditFormData>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      customerId: '',
      warehouseId: '',
      currency: 'USD',
      taxRate: 0,
      shippingFee: 0,
      notes: '',
      items: [{ productId: '', quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  // Populate form with existing order data
  useEffect(() => {
    if (order) {
      form.reset({
        customerId: order.customerId,
        warehouseId: order.warehouseId,
        currency: order.currency,
        expectedShipDate: order.expectedShipDate ? new Date(order.expectedShipDate) : null,
        shippingAddress: order.shippingAddress || '',
        taxRate: Number(order.taxRate),
        shippingFee: Number(order.shippingFee),
        notes: order.notes || '',
        items: order.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          notes: item.notes || '',
        })),
      });
    }
  }, [order, form]);

  const updateMutation = trpc.salesOrder.update.useMutation({
    onSuccess: () => {
      toast.success('Sales order updated successfully');
      router.push(`/sales-orders/${id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: EditFormData) => {
    updateMutation.mutate({
      id,
      data: {
        customerId: data.customerId,
        warehouseId: data.warehouseId,
        currency: data.currency,
        expectedShipDate: data.expectedShipDate,
        shippingAddress: data.shippingAddress,
        taxRate: data.taxRate,
        shippingFee: data.shippingFee,
        notes: data.notes,
        items: data.items,
      },
    });
  };

  // Calculate totals for display
  const watchedItems = form.watch('items');
  const watchedTaxRate = form.watch('taxRate') || 0;
  const watchedShippingFee = form.watch('shippingFee') || 0;

  const subtotal = watchedItems.reduce((sum, item) => {
    if (item.quantity && item.unitPrice) {
      return sum.plus(new Decimal(item.quantity).times(item.unitPrice));
    }
    return sum;
  }, new Decimal(0));

  const taxAmount = subtotal.times(watchedTaxRate);
  const totalAmount = subtotal.plus(taxAmount).plus(watchedShippingFee);

  if (orderLoading) {
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

  if (order.status !== 'DRAFT') {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Only draft orders can be edited</p>
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
            <h1 className="text-3xl font-bold tracking-tight">Edit Sales Order</h1>
            <Badge variant="outline" className="font-mono">
              {order.orderNumber}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">Update your sales order details</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers?.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.code} - {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="warehouseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shipping Warehouse</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select warehouse" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {warehouses?.map((wh) => (
                            <SelectItem key={wh.id} value={wh.id}>
                              {wh.code} - {wh.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                          <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                          <SelectItem value="HKD">HKD - Hong Kong Dollar</SelectItem>
                          <SelectItem value="TWD">TWD - Taiwan Dollar</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expectedShipDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected Ship Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={
                            field.value instanceof Date
                              ? field.value.toISOString().split('T')[0]
                              : ''
                          }
                          onChange={(e) =>
                            field.onChange(e.target.value ? new Date(e.target.value) : null)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shippingAddress"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Shipping Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter shipping address..."
                          className="min-h-[80px]"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Order Items</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ productId: '', quantity: 1, unitPrice: 0 })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fields.map((field, index) => {
                  const qty = Number(form.watch(`items.${index}.quantity`) || 0);
                  const price = Number(form.watch(`items.${index}.unitPrice`) || 0);
                  const lineTotal = qty * price;

                  return (
                    <div key={field.id} className="flex items-end gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <FormField
                          control={form.control}
                          name={`items.${index}.productId`}
                          render={({ field: productField }) => (
                            <FormItem>
                              <FormLabel>Product</FormLabel>
                              <Select
                                onValueChange={productField.onChange}
                                value={productField.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select product" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {products?.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.sku} - {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="w-[120px]">
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field: qtyField }) => (
                            <FormItem>
                              <FormLabel>Quantity</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.0001"
                                  min="0"
                                  {...qtyField}
                                  onChange={(e) =>
                                    qtyField.onChange(parseFloat(e.target.value) || 0)
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="w-[120px]">
                        <FormField
                          control={form.control}
                          name={`items.${index}.unitPrice`}
                          render={({ field: priceField }) => (
                            <FormItem>
                              <FormLabel>Unit Price</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  {...priceField}
                                  onChange={(e) =>
                                    priceField.onChange(parseFloat(e.target.value) || 0)
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="w-[120px]">
                        <p className="text-sm font-medium mb-2">Total</p>
                        <p className="h-10 flex items-center font-mono">
                          ${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="taxRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Rate (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="e.g., 5 for 5%"
                          value={(Number(field.value) * 100).toString()}
                          onChange={(e) => field.onChange((parseFloat(e.target.value) || 0) / 100)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shippingFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shipping Fee</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Totals */}
              <div className="mt-6 flex justify-end border-t pt-4">
                <div className="w-[300px] space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-mono">
                      $
                      {subtotal
                        .toDecimalPlaces(2)
                        .toNumber()
                        .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Tax ({(watchedTaxRate * 100).toFixed(0)}%)
                    </span>
                    <span className="font-mono">
                      $
                      {taxAmount
                        .toDecimalPlaces(2)
                        .toNumber()
                        .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-mono">
                      $
                      {Number(watchedShippingFee).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total</span>
                    <span className="font-mono">
                      $
                      {totalAmount
                        .toDecimalPlaces(2)
                        .toNumber()
                        .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Add any notes about this order..."
                        className="min-h-[100px]"
                        {...field}
                        value={field.value || ''}
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
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
