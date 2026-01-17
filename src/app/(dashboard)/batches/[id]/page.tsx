'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createLandedCostItemSchema,
  type CreateLandedCostItemFormInput,
  type CreateLandedCostItemInput,
} from '@/lib/validators/batch';
import {
  ArrowLeft,
  Package,
  Plus,
  Trash2,
  Pencil,
  CheckCircle,
  Loader2,
  AlertTriangle,
  DollarSign,
  Building2,
  Truck,
  Calendar,
  FileText,
  Lock,
} from 'lucide-react';
import type { LandedCostItem, CostItemType } from '@prisma/client';

type LandedCostItemWithType = LandedCostItem & { costType: CostItemType };

const statusColors = {
  DRAFT:
    'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  CONFIRMED:
    'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
  CANCELLED: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800',
};

export default function BatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.id as string;

  const [costItemFormOpen, setCostItemFormOpen] = useState(false);
  const [editCostItem, setEditCostItem] = useState<LandedCostItemWithType | null>(null);
  const [deleteCostItem, setDeleteCostItem] = useState<LandedCostItemWithType | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const utils = trpc.useUtils();

  const { data: batch, isLoading, isError } = trpc.batch.getById.useQuery(batchId);
  const { data: costTypes } = trpc.costItemType.listActive.useQuery();

  const confirmMutation = trpc.batch.confirm.useMutation({
    onSuccess: () => {
      toast.success('Batch costs confirmed and locked');
      utils.batch.getById.invalidate(batchId);
      utils.batch.list.invalidate();
      utils.batch.stats.invalidate();
      setConfirmDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addCostItemMutation = trpc.batch.addCostItem.useMutation({
    onSuccess: () => {
      toast.success('Cost item added');
      utils.batch.getById.invalidate(batchId);
      setCostItemFormOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateCostItemMutation = trpc.batch.updateCostItem.useMutation({
    onSuccess: () => {
      toast.success('Cost item updated');
      utils.batch.getById.invalidate(batchId);
      setEditCostItem(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeCostItemMutation = trpc.batch.removeCostItem.useMutation({
    onSuccess: () => {
      toast.success('Cost item removed');
      utils.batch.getById.invalidate(batchId);
      setDeleteCostItem(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const costItemForm = useForm<CreateLandedCostItemFormInput>({
    resolver: zodResolver(createLandedCostItemSchema),
    defaultValues: {
      batchId,
      costTypeId: '',
      amount: 0,
      currency: 'USD',
      exchangeRate: 1,
      description: '',
      referenceNumber: '',
    },
  });

  const handleAddCostItem = (data: CreateLandedCostItemFormInput) => {
    addCostItemMutation.mutate(data as CreateLandedCostItemInput);
  };

  const handleEditCostItem = (item: LandedCostItemWithType) => {
    setEditCostItem(item);
    costItemForm.reset({
      batchId,
      costTypeId: item.costTypeId,
      amount: Number(item.amount),
      currency: item.currency,
      exchangeRate: Number(item.exchangeRate),
      description: item.description || '',
      referenceNumber: item.referenceNumber || '',
    });
  };

  const handleUpdateCostItem = (data: CreateLandedCostItemFormInput) => {
    if (!editCostItem) return;
    updateCostItemMutation.mutate({
      id: editCostItem.id,
      amount: data.amount,
      currency: data.currency,
      exchangeRate: data.exchangeRate,
      description: data.description,
      referenceNumber: data.referenceNumber,
    });
  };

  const openAddCostItemForm = () => {
    setEditCostItem(null);
    costItemForm.reset({
      batchId,
      costTypeId: '',
      amount: 0,
      currency: batch?.currency || 'USD',
      exchangeRate: 1,
      description: '',
      referenceNumber: '',
    });
    setCostItemFormOpen(true);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !batch) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-96">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold">Batch not found</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            The batch you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
          <Button onClick={() => router.push('/batches')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Batches
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isDraft = batch.status === 'DRAFT';
  const isConfirmed = batch.status === 'CONFIRMED';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/batches')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">{batch.batchNumber}</h1>
                <Badge className={statusColors[batch.status]}>
                  {batch.status.charAt(0) + batch.status.slice(1).toLowerCase()}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">{batch.product.name}</p>
            </div>
          </div>
          {isDraft && (
            <Button
              onClick={() => setConfirmDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700 gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Confirm Costs
            </Button>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                Product
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{batch.product.name}</p>
              <p className="text-sm text-muted-foreground font-mono">{batch.product.sku}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Supplier
              </CardTitle>
            </CardHeader>
            <CardContent>
              {batch.supplier ? (
                <>
                  <p className="font-medium">{batch.supplier.name}</p>
                  <p className="text-sm text-muted-foreground font-mono">{batch.supplier.code}</p>
                </>
              ) : (
                <p className="text-muted-foreground">Not specified</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Warehouse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{batch.warehouse.name}</p>
              <p className="text-sm text-muted-foreground font-mono">{batch.warehouse.code}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Received Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{new Date(batch.receivedDate).toLocaleDateString()}</p>
              {batch.confirmedAt && (
                <p className="text-sm text-muted-foreground">
                  Confirmed: {new Date(batch.confirmedAt).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cost Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cost Summary
              {isConfirmed && (
                <Badge variant="outline" className="ml-2">
                  <Lock className="h-3 w-3 mr-1" />
                  Locked
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Quantity</p>
                <p className="text-2xl font-bold font-mono">
                  {Number(batch.quantity).toLocaleString()} {batch.product.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Purchase Cost</p>
                <p className="text-2xl font-bold font-mono">
                  {batch.currency}{' '}
                  {Number(batch.totalPurchaseCost).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  @ {batch.currency} {Number(batch.unitPurchaseCost).toFixed(4)} per unit
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Landed Costs</p>
                <p className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                  {batch.currency}{' '}
                  {Number(batch.totalLandedCost).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {batch.landedCostItems.length} item(s)
                </p>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="grid gap-6 md:grid-cols-2">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-3xl font-bold font-mono">
                  {batch.currency}{' '}
                  {Number(batch.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/10">
                <p className="text-sm text-muted-foreground">Cost Per Unit</p>
                <p className="text-3xl font-bold font-mono text-green-600 dark:text-green-400">
                  {batch.currency} {Number(batch.costPerUnit).toFixed(4)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Landed Cost Items */}
        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Landed Cost Items</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Individual cost components added to this batch.
                </p>
              </div>
              {isDraft && (
                <Button onClick={openAddCostItemForm} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Cost
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {batch.landedCostItems.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold">No landed costs added</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  {isDraft
                    ? 'Add cost items like freight, duties, and insurance to calculate the true landed cost.'
                    : 'This batch has no additional landed costs.'}
                </p>
                {isDraft && (
                  <Button onClick={openAddCostItemForm} variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add First Cost Item
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">In {batch.currency}</TableHead>
                    {isDraft && <TableHead className="w-[100px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batch.landedCostItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.costType.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {item.costType.code}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {item.description || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.referenceNumber || '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.currency}{' '}
                        {Number(item.amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                        {Number(item.exchangeRate) !== 1 && (
                          <span className="text-xs text-muted-foreground block">
                            @ {Number(item.exchangeRate).toFixed(4)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {batch.currency}{' '}
                        {Number(item.amountInBatchCurrency).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      {isDraft && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditCostItem(item as LandedCostItemWithType)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteCostItem(item as LandedCostItemWithType)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={isDraft ? 4 : 3}>Total Landed Costs</TableCell>
                    <TableCell className="text-right font-mono">
                      {batch.currency}{' '}
                      {Number(batch.totalLandedCost).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    {isDraft && <TableCell />}
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {batch.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{batch.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add/Edit Cost Item Dialog */}
      <Dialog
        open={costItemFormOpen || !!editCostItem}
        onOpenChange={(open) => {
          if (!open) {
            setCostItemFormOpen(false);
            setEditCostItem(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editCostItem ? 'Edit Cost Item' : 'Add Cost Item'}</DialogTitle>
            <DialogDescription>
              {editCostItem
                ? 'Update the cost item details.'
                : 'Add a new landed cost to this batch.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...costItemForm}>
            <form
              onSubmit={costItemForm.handleSubmit(
                editCostItem ? handleUpdateCostItem : handleAddCostItem
              )}
              className="space-y-4"
            >
              {!editCostItem && (
                <FormField
                  control={costItemForm.control}
                  name="costTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a cost type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {costTypes?.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={costItemForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
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
                  control={costItemForm.control}
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

                <FormField
                  control={costItemForm.control}
                  name="exchangeRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exchange Rate</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.0001"
                          min="0"
                          className="font-mono"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={costItemForm.control}
                name="referenceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Invoice or receipt number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={costItemForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes..."
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCostItemFormOpen(false);
                    setEditCostItem(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addCostItemMutation.isPending || updateCostItemMutation.isPending}
                >
                  {(addCostItemMutation.isPending || updateCostItemMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editCostItem ? 'Update' : 'Add Cost'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Cost Item Dialog */}
      <Dialog open={!!deleteCostItem} onOpenChange={(open) => !open && setDeleteCostItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Remove Cost Item
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this cost item? The batch totals will be recalculated.
            </DialogDescription>
          </DialogHeader>

          {deleteCostItem && (
            <div className="rounded-lg border border-border bg-muted/50 p-4 my-2">
              <div className="space-y-1">
                <p className="font-medium">{deleteCostItem.costType.name}</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {batch.currency}{' '}
                  {Number(deleteCostItem.amountInBatchCurrency).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCostItem(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteCostItem && removeCostItemMutation.mutate(deleteCostItem.id)}
              disabled={removeCostItemMutation.isPending}
            >
              {removeCostItemMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Costs Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Confirm Batch Costs
            </DialogTitle>
            <DialogDescription>
              Once confirmed, the costs for this batch will be locked and cannot be modified. Make
              sure all landed costs have been entered correctly.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-border bg-muted/50 p-4 my-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Cost</span>
                <span className="font-mono font-semibold">
                  {batch.currency}{' '}
                  {Number(batch.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cost Per Unit</span>
                <span className="font-mono font-semibold text-green-600">
                  {batch.currency} {Number(batch.costPerUnit).toFixed(4)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cost Items</span>
                <span className="font-mono">{batch.landedCostItems.length}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => confirmMutation.mutate(batchId)}
              disabled={confirmMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {confirmMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm & Lock Costs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
