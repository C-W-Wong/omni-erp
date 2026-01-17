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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  createCostItemTypeSchema,
  type CreateCostItemTypeInput,
  type CreateCostItemTypeFormInput,
} from '@/lib/validators/costItemType';
import { trpc } from '@/lib/trpc';
import type { CostItemType } from '@prisma/client';

interface CostItemTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costItemType?: CostItemType | null;
  onSuccess?: () => void;
}

export function CostItemTypeForm({
  open,
  onOpenChange,
  costItemType,
  onSuccess,
}: CostItemTypeFormProps) {
  const utils = trpc.useUtils();

  const form = useForm<CreateCostItemTypeFormInput>({
    resolver: zodResolver(createCostItemTypeSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      sortOrder: 0,
    },
  });

  useEffect(() => {
    if (costItemType) {
      form.reset({
        code: costItemType.code,
        name: costItemType.name,
        description: costItemType.description || '',
        sortOrder: costItemType.sortOrder,
      });
    } else {
      form.reset({
        code: '',
        name: '',
        description: '',
        sortOrder: 0,
      });
    }
  }, [costItemType, form]);

  const createMutation = trpc.costItemType.create.useMutation({
    onSuccess: () => {
      utils.costItemType.list.invalidate();
      utils.costItemType.listActive.invalidate();
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    },
  });

  const updateMutation = trpc.costItemType.update.useMutation({
    onSuccess: () => {
      utils.costItemType.list.invalidate();
      utils.costItemType.listActive.invalidate();
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (data: CreateCostItemTypeFormInput) => {
    const validatedData = data as CreateCostItemTypeInput;
    if (costItemType) {
      updateMutation.mutate({
        id: costItemType.id,
        ...validatedData,
        isActive: costItemType.isActive,
      });
    } else {
      createMutation.mutate(validatedData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{costItemType ? 'Edit Cost Type' : 'Add Cost Type'}</DialogTitle>
          <DialogDescription>
            {costItemType
              ? 'Update the cost item type details.'
              : 'Create a new cost item type for landed cost tracking.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="FREIGHT"
                      className="font-mono uppercase"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      disabled={costItemType?.isSystem}
                    />
                  </FormControl>
                  <FormDescription>
                    Unique identifier (uppercase letters, numbers, hyphens)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Freight / Shipping" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Description of this cost type..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort Order</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      className="font-mono w-24"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>Lower numbers appear first in lists</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {costItemType && (
              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Active Status</p>
                  <p className="text-xs text-muted-foreground">
                    Inactive types won&apos;t appear in dropdowns
                  </p>
                </div>
                <Switch
                  checked={costItemType.isActive}
                  onCheckedChange={(checked) => {
                    updateMutation.mutate({
                      id: costItemType.id,
                      isActive: checked,
                    });
                  }}
                  disabled={updateMutation.isPending}
                />
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {costItemType ? 'Update' : 'Create'}
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
