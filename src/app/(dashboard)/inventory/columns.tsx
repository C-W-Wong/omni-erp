'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

// Use unknown for Decimal fields since Prisma returns Decimal objects
// We convert them with Number() in the cell renderers
type InventoryItem = {
  id: string;
  quantity: unknown;
  reservedQuantity: unknown;
  product: {
    id: string;
    sku: string;
    name: string;
    unit: string;
    minStockLevel: number;
  };
  batch: {
    id: string;
    batchNumber: string;
    costPerUnit: unknown;
    status: string;
  };
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
};

export const columns: ColumnDef<InventoryItem>[] = [
  {
    accessorKey: 'product.sku',
    header: 'SKU',
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.product.sku}</span>,
  },
  {
    accessorKey: 'product.name',
    header: 'Product',
    cell: ({ row }) => {
      const available = Number(row.original.quantity) - Number(row.original.reservedQuantity);
      const isLowStock = available <= row.original.product.minStockLevel;
      return (
        <div className="flex items-center gap-2">
          <span>{row.original.product.name}</span>
          {isLowStock && (
            <span title="Low Stock">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'batch.batchNumber',
    header: 'Batch',
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.batch.batchNumber}</span>,
  },
  {
    accessorKey: 'warehouse.code',
    header: 'Warehouse',
    cell: ({ row }) => (
      <Badge variant="outline" className="font-mono">
        {row.original.warehouse.code}
      </Badge>
    ),
  },
  {
    accessorKey: 'quantity',
    header: 'Quantity',
    cell: ({ row }) => {
      const qty = Number(row.original.quantity);
      return (
        <span className="font-mono">
          {qty.toLocaleString()} {row.original.product.unit}
        </span>
      );
    },
  },
  {
    accessorKey: 'reservedQuantity',
    header: 'Reserved',
    cell: ({ row }) => {
      const reserved = Number(row.original.reservedQuantity);
      return (
        <span className={`font-mono ${reserved > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
          {reserved.toLocaleString()}
        </span>
      );
    },
  },
  {
    id: 'available',
    header: 'Available',
    cell: ({ row }) => {
      const available = Number(row.original.quantity) - Number(row.original.reservedQuantity);
      const isLowStock = available <= row.original.product.minStockLevel;
      return (
        <span
          className={`font-mono font-medium ${isLowStock ? 'text-amber-600' : 'text-green-600'}`}
        >
          {available.toLocaleString()}
        </span>
      );
    },
  },
  {
    accessorKey: 'batch.costPerUnit',
    header: 'Unit Cost',
    cell: ({ row }) => {
      const cost = Number(row.original.batch.costPerUnit);
      return <span className="font-mono">${cost.toFixed(4)}</span>;
    },
  },
  {
    id: 'totalValue',
    header: 'Total Value',
    cell: ({ row }) => {
      const qty = Number(row.original.quantity);
      const cost = Number(row.original.batch.costPerUnit);
      const value = qty * cost;
      return (
        <span className="font-mono">
          ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      );
    },
  },
  {
    accessorKey: 'batch.status',
    header: 'Batch Status',
    cell: ({ row }) => {
      const status = row.original.batch.status;
      const variant =
        status === 'CONFIRMED' ? 'default' : status === 'DRAFT' ? 'secondary' : 'destructive';
      return <Badge variant={variant}>{status}</Badge>;
    },
  },
];
