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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  createWarehouseSchema,
  type CreateWarehouseInput,
  type CreateWarehouseFormInput,
} from '@/lib/validators/warehouse';
import { trpc } from '@/lib/trpc';
import type { Warehouse } from '@prisma/client';

interface WarehouseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse?: Warehouse | null;
  onSuccess?: () => void;
}

export function WarehouseForm({ open, onOpenChange, warehouse, onSuccess }: WarehouseFormProps) {
  const utils = trpc.useUtils();

  const form = useForm<CreateWarehouseFormInput>({
    resolver: zodResolver(createWarehouseSchema),
    defaultValues: {
      code: '',
      name: '',
      address: '',
      city: '',
      country: '',
      postalCode: '',
      phone: '',
      manager: '',
      isDefault: false,
    },
  });

  useEffect(() => {
    if (warehouse) {
      form.reset({
        code: warehouse.code,
        name: warehouse.name,
        address: warehouse.address || '',
        city: warehouse.city || '',
        country: warehouse.country || '',
        postalCode: warehouse.postalCode || '',
        phone: warehouse.phone || '',
        manager: warehouse.manager || '',
        isDefault: warehouse.isDefault,
      });
    } else {
      form.reset({
        code: '',
        name: '',
        address: '',
        city: '',
        country: '',
        postalCode: '',
        phone: '',
        manager: '',
        isDefault: false,
      });
    }
  }, [warehouse, form]);

  const createMutation = trpc.warehouse.create.useMutation({
    onSuccess: () => {
      utils.warehouse.list.invalidate();
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    },
  });

  const updateMutation = trpc.warehouse.update.useMutation({
    onSuccess: () => {
      utils.warehouse.list.invalidate();
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (data: CreateWarehouseFormInput) => {
    const validatedData = data as CreateWarehouseInput;
    if (warehouse) {
      updateMutation.mutate({ id: warehouse.id, ...validatedData });
    } else {
      createMutation.mutate(validatedData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{warehouse ? 'Edit Warehouse' : 'Add New Warehouse'}</DialogTitle>
          <DialogDescription>
            {warehouse
              ? 'Update the warehouse information below.'
              : 'Fill in the warehouse details to create a new warehouse.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warehouse Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="WH-MAIN"
                        className="font-mono"
                        {...field}
                        disabled={!!warehouse}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warehouse Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Main Warehouse" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Location</h4>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Industrial Ave" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Los Angeles" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="USA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input placeholder="90001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Management</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 234 567 8900" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="manager"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manager</FormLabel>
                      <FormControl>
                        <Input placeholder="John Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Default Warehouse</FormLabel>
                    <FormDescription>
                      Set as the default warehouse for new transactions
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {warehouse ? 'Update Warehouse' : 'Create Warehouse'}
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
