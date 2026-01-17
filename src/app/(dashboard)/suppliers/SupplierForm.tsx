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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  createSupplierSchema,
  type CreateSupplierInput,
  type CreateSupplierFormInput,
} from '@/lib/validators/supplier';
import { trpc } from '@/lib/trpc';
import type { Supplier } from '@prisma/client';

interface SupplierFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
  onSuccess?: () => void;
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CNY', 'JPY', 'TWD', 'HKD'];

export function SupplierForm({ open, onOpenChange, supplier, onSuccess }: SupplierFormProps) {
  const utils = trpc.useUtils();

  const form = useForm<CreateSupplierFormInput>({
    resolver: zodResolver(createSupplierSchema),
    defaultValues: {
      code: '',
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      fax: '',
      address: '',
      city: '',
      country: '',
      postalCode: '',
      taxId: '',
      paymentTerms: 30,
      currency: 'USD',
      leadTimeDays: 14,
      notes: '',
    },
  });

  useEffect(() => {
    if (supplier) {
      form.reset({
        code: supplier.code,
        name: supplier.name,
        contactPerson: supplier.contactPerson || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        fax: supplier.fax || '',
        address: supplier.address || '',
        city: supplier.city || '',
        country: supplier.country || '',
        postalCode: supplier.postalCode || '',
        taxId: supplier.taxId || '',
        paymentTerms: supplier.paymentTerms,
        currency: supplier.currency,
        leadTimeDays: supplier.leadTimeDays,
        notes: supplier.notes || '',
      });
    } else {
      form.reset({
        code: '',
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        fax: '',
        address: '',
        city: '',
        country: '',
        postalCode: '',
        taxId: '',
        paymentTerms: 30,
        currency: 'USD',
        leadTimeDays: 14,
        notes: '',
      });
    }
  }, [supplier, form]);

  const createMutation = trpc.supplier.create.useMutation({
    onSuccess: () => {
      utils.supplier.list.invalidate();
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    },
  });

  const updateMutation = trpc.supplier.update.useMutation({
    onSuccess: () => {
      utils.supplier.list.invalidate();
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (data: CreateSupplierFormInput) => {
    const validatedData = data as CreateSupplierInput;
    if (supplier) {
      updateMutation.mutate({ id: supplier.id, ...validatedData });
    } else {
      createMutation.mutate(validatedData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{supplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
          <DialogDescription>
            {supplier
              ? 'Update the supplier information below.'
              : 'Fill in the supplier details to create a new supplier.'}
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
                    <FormLabel>Supplier Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="SUP-001"
                        className="font-mono"
                        {...field}
                        disabled={!!supplier}
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
                    <FormLabel>Supplier Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Company Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Contact Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="contact@supplier.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                  name="fax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fax</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 234 567 8901" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Address</h4>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main Street" {...field} />
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
                        <Input placeholder="Shanghai" {...field} />
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
                        <Input placeholder="China" {...field} />
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
                        <Input placeholder="200000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Trade Information</h4>
              <div className="grid grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CURRENCIES.map((curr) => (
                            <SelectItem key={curr} value={curr}>
                              {curr}
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
                  name="leadTimeDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Time</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="365"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>Days</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Terms</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="365"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>Days</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax ID</FormLabel>
                      <FormControl>
                        <Input placeholder="XX-XXXXXXX" {...field} />
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input placeholder="Additional notes..." {...field} />
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
                {supplier ? 'Update Supplier' : 'Create Supplier'}
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
