'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  createBatchSchema,
  type CreateBatchFormInput,
  type CreateBatchInput,
} from '@/lib/validators/batch';
import { trpc } from '@/lib/trpc';
import type { Batch } from '@prisma/client';

interface BatchFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch?: Batch | null;
  onSuccess?: () => void;
}

export function BatchForm({ open, onOpenChange, batch, onSuccess }: BatchFormProps) {
  const utils = trpc.useUtils();

  const { data: products } = trpc.product.listActive.useQuery();
  const { data: suppliers } = trpc.supplier.listActive.useQuery();
  const { data: warehouses } = trpc.warehouse.listActive.useQuery();

  const form = useForm<CreateBatchFormInput>({
    resolver: zodResolver(createBatchSchema),
    defaultValues: {
      productId: '',
      supplierId: '',
      warehouseId: '',
      quantity: 0,
      unitPurchaseCost: 0,
      currency: 'USD',
      notes: '',
    },
  });

  useEffect(() => {
    if (batch) {
      form.reset({
        productId: batch.productId,
        supplierId: batch.supplierId || '',
        warehouseId: batch.warehouseId,
        quantity: Number(batch.quantity),
        unitPurchaseCost: Number(batch.unitPurchaseCost),
        currency: batch.currency,
        receivedDate: batch.receivedDate,
        notes: batch.notes || '',
      });
    } else {
      form.reset({
        productId: '',
        supplierId: '',
        warehouseId: '',
        quantity: 0,
        unitPurchaseCost: 0,
        currency: 'USD',
        notes: '',
      });
    }
  }, [batch, form]);

  const createMutation = trpc.batch.create.useMutation({
    onSuccess: () => {
      utils.batch.list.invalidate();
      utils.batch.stats.invalidate();
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    },
  });

  const updateMutation = trpc.batch.update.useMutation({
    onSuccess: () => {
      utils.batch.list.invalidate();
      utils.batch.getById.invalidate();
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (data: CreateBatchFormInput) => {
    const validatedData = data as CreateBatchInput;
    if (batch) {
      updateMutation.mutate({
        id: batch.id,
        ...validatedData,
        supplierId: validatedData.supplierId || null,
      });
    } else {
      createMutation.mutate(validatedData);
    }
  };

  const quantity = form.watch('quantity') || 0;
  const unitCost = form.watch('unitPurchaseCost') || 0;
  const totalPurchaseCost = quantity * unitCost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{batch ? 'Edit Batch' : 'Create New Batch'}</DialogTitle>
          <DialogDescription>
            {batch
              ? 'Update the batch details. Landed costs can be added after creation.'
              : 'Create a new batch to track landed costs for imported goods.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!batch}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <span className="font-mono text-xs mr-2">{product.sku}</span>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {suppliers?.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
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
                    <FormLabel>Warehouse</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select warehouse" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {warehouses?.map((warehouse) => (
                          <SelectItem key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.0001"
                        min="0"
                        className="font-mono"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unitPurchaseCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Cost</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.0001"
                        min="0"
                        className="font-mono"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
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
                        <SelectTrigger className="font-mono">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="CNY">CNY</SelectItem>
                        <SelectItem value="JPY">JPY</SelectItem>
                        <SelectItem value="TWD">TWD</SelectItem>
                        <SelectItem value="HKD">HKD</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Purchase Cost</span>
                <span className="font-mono font-semibold text-lg">
                  {form.watch('currency')}{' '}
                  {totalPurchaseCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this batch..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {batch ? 'Update Batch' : 'Create Batch'}
              </Button>
            </DialogFooter>

            {(createMutation.error || updateMutation.error) && (
              <p className="text-sm text-destructive text-center">
                {createMutation.error?.message || updateMutation.error?.message}
              </p>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
