'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTransferSchema, type CreateTransferFormInput } from '@/lib/validators/inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { ArrowLeft, Plus, Trash2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function NewTransferPage() {
  const router = useRouter();
  const [selectedSourceWarehouse, setSelectedSourceWarehouse] = useState<string | null>(null);

  const { data: warehouses } = trpc.warehouse.listActive.useQuery();

  // Fetch inventory for selected source warehouse
  const { data: availableInventory } = trpc.inventory.list.useQuery(
    { warehouseId: selectedSourceWarehouse ?? undefined, pageSize: 1000 },
    { enabled: !!selectedSourceWarehouse }
  );

  const form = useForm<CreateTransferFormInput>({
    resolver: zodResolver(createTransferSchema),
    defaultValues: {
      sourceWarehouseId: '',
      targetWarehouseId: '',
      notes: '',
      items: [{ productId: '', batchId: '', quantity: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const createMutation = trpc.transfer.create.useMutation({
    onSuccess: (data) => {
      toast.success('Transfer created successfully');
      router.push(`/transfers/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: CreateTransferFormInput) => {
    createMutation.mutate(data);
  };

  const sourceWarehouseId = form.watch('sourceWarehouseId');
  const targetWarehouseId = form.watch('targetWarehouseId');

  // Update selected source warehouse when form changes
  if (sourceWarehouseId && sourceWarehouseId !== selectedSourceWarehouse) {
    setSelectedSourceWarehouse(sourceWarehouseId);
  }

  // Get unique product/batch combinations from available inventory
  const inventoryOptions =
    availableInventory?.items.map((inv) => ({
      productId: inv.product.id,
      batchId: inv.batch.id,
      label: `${inv.product.sku} - ${inv.product.name} (Batch: ${inv.batch.batchNumber})`,
      available: Number(inv.quantity) - Number(inv.reservedQuantity),
      unit: inv.product.unit,
    })) ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/transfers">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Transfer</h1>
          <p className="text-muted-foreground mt-1">
            Create a new inventory transfer between warehouses
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Warehouse Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transfer Route</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name="sourceWarehouseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source Warehouse</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select source warehouse" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {warehouses
                              ?.filter((wh) => wh.id !== targetWarehouseId)
                              .map((wh) => (
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
                </div>

                <div className="flex items-center justify-center pt-6">
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                </div>

                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name="targetWarehouseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Warehouse</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select target warehouse" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {warehouses
                              ?.filter((wh) => wh.id !== sourceWarehouseId)
                              .map((wh) => (
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
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transfer Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Transfer Items</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ productId: '', batchId: '', quantity: 0 })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              {!sourceWarehouseId ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Please select a source warehouse first
                </p>
              ) : inventoryOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No inventory available in the selected warehouse
                </p>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => {
                    const selectedOption = inventoryOptions.find(
                      (opt) =>
                        opt.productId === form.watch(`items.${index}.productId`) &&
                        opt.batchId === form.watch(`items.${index}.batchId`)
                    );

                    return (
                      <div key={field.id} className="flex items-end gap-4 p-4 border rounded-lg">
                        <div className="flex-1">
                          <FormField
                            control={form.control}
                            name={`items.${index}.productId`}
                            render={({ field: productField }) => (
                              <FormItem>
                                <FormLabel>Product / Batch</FormLabel>
                                <Select
                                  onValueChange={(value) => {
                                    const option = inventoryOptions.find(
                                      (opt) => `${opt.productId}|${opt.batchId}` === value
                                    );
                                    if (option) {
                                      productField.onChange(option.productId);
                                      form.setValue(`items.${index}.batchId`, option.batchId);
                                    }
                                  }}
                                  value={
                                    productField.value && form.watch(`items.${index}.batchId`)
                                      ? `${productField.value}|${form.watch(`items.${index}.batchId`)}`
                                      : ''
                                  }
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select product and batch" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {inventoryOptions.map((opt) => (
                                      <SelectItem
                                        key={`${opt.productId}|${opt.batchId}`}
                                        value={`${opt.productId}|${opt.batchId}`}
                                      >
                                        {opt.label} - {opt.available.toLocaleString()} {opt.unit}{' '}
                                        available
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="w-[150px]">
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
                                    max={selectedOption?.available ?? 0}
                                    {...qtyField}
                                    onChange={(e) =>
                                      qtyField.onChange(parseFloat(e.target.value) || 0)
                                    }
                                  />
                                </FormControl>
                                {selectedOption && (
                                  <p className="text-xs text-muted-foreground">
                                    Max: {selectedOption.available.toLocaleString()}{' '}
                                    {selectedOption.unit}
                                  </p>
                                )}
                                <FormMessage />
                              </FormItem>
                            )}
                          />
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
              )}
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
                        placeholder="Add any notes about this transfer..."
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
              <Link href="/transfers">Cancel</Link>
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Transfer'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
