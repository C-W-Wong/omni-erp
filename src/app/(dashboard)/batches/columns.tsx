'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { Batch, Product, Supplier, Warehouse } from '@prisma/client';

type BatchWithRelations = Batch & {
  product: Pick<Product, 'id' | 'sku' | 'name' | 'unit'>;
  supplier: Pick<Supplier, 'id' | 'code' | 'name'> | null;
  warehouse: Pick<Warehouse, 'id' | 'code' | 'name'>;
  _count: { landedCostItems: number };
};

interface ColumnActions {
  onView: (batch: BatchWithRelations) => void;
  onEdit: (batch: BatchWithRelations) => void;
  onDelete: (batch: BatchWithRelations) => void;
  onConfirm: (batch: BatchWithRelations) => void;
  onCancel: (batch: BatchWithRelations) => void;
}

const statusColors = {
  DRAFT:
    'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  CONFIRMED:
    'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
  CANCELLED: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800',
};

export function createColumns(actions: ColumnActions): ColumnDef<BatchWithRelations>[] {
  return [
    {
      accessorKey: 'batchNumber',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Batch #
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium">{row.getValue('batchNumber')}</span>
      ),
    },
    {
      accessorKey: 'product',
      header: 'Product',
      cell: ({ row }) => {
        const product = row.original.product;
        return (
          <div className="max-w-[200px]">
            <p className="font-medium truncate">{product.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
          </div>
        );
      },
    },
    {
      accessorKey: 'quantity',
      header: 'Quantity',
      cell: ({ row }) => {
        const quantity = Number(row.original.quantity);
        const unit = row.original.product.unit;
        return (
          <span className="font-mono text-sm">
            {quantity.toLocaleString()} {unit}
          </span>
        );
      },
    },
    {
      accessorKey: 'costPerUnit',
      header: 'Unit Cost',
      cell: ({ row }) => {
        const costPerUnit = Number(row.original.costPerUnit);
        const currency = row.original.currency;
        return (
          <span className="font-mono text-sm">
            {currency} {costPerUnit.toFixed(4)}
          </span>
        );
      },
    },
    {
      accessorKey: 'totalCost',
      header: 'Total Cost',
      cell: ({ row }) => {
        const totalCost = Number(row.original.totalCost);
        const currency = row.original.currency;
        return (
          <span className="font-mono text-sm font-medium">
            {currency} {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      accessorKey: 'warehouse',
      header: 'Warehouse',
      cell: ({ row }) => {
        const warehouse = row.original.warehouse;
        return <span className="text-sm">{warehouse.name}</span>;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge className={statusColors[status]}>
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const batch = row.original;
        const isDraft = batch.status === 'DRAFT';
        const isConfirmed = batch.status === 'CONFIRMED';

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => actions.onView(batch)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {isDraft && (
                <>
                  <DropdownMenuItem onClick={() => actions.onEdit(batch)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => actions.onConfirm(batch)}>
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Confirm Costs
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => actions.onCancel(batch)}
                    className="text-amber-600 focus:text-amber-600"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel Batch
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => actions.onDelete(batch)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
              {isConfirmed && (
                <DropdownMenuItem
                  onClick={() => actions.onCancel(batch)}
                  className="text-amber-600 focus:text-amber-600"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Batch
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
