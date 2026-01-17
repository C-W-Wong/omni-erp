'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, MoreHorizontal, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type PurchaseOrderItem = {
  id: string;
  orderNumber: string;
  status: 'DRAFT' | 'CONFIRMED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';
  orderDate: Date;
  expectedDate: Date | null;
  currency: string;
  subtotal: unknown;
  totalAmount: unknown;
  notes: string | null;
  supplier: {
    id: string;
    code: string;
    name: string;
  };
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
  createdBy: {
    id: string;
    name: string | null;
  } | null;
  items: Array<{
    id: string;
    quantity: unknown;
    product: {
      id: string;
      sku: string;
      name: string;
      unit: string;
    };
  }>;
};

interface ColumnsProps {
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
}

export function createColumns({
  onConfirm,
  onCancel,
  onDelete,
}: ColumnsProps): ColumnDef<PurchaseOrderItem>[] {
  return [
    {
      accessorKey: 'orderNumber',
      header: 'Order #',
      cell: ({ row }) => (
        <Link
          href={`/purchase-orders/${row.original.id}`}
          className="font-mono text-sm text-primary hover:underline"
        >
          {row.original.orderNumber}
        </Link>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
          DRAFT: 'secondary',
          CONFIRMED: 'default',
          PARTIAL: 'outline',
          RECEIVED: 'default',
          CANCELLED: 'destructive',
        };
        const colors: Record<string, string> = {
          DRAFT: '',
          CONFIRMED: 'bg-blue-600',
          PARTIAL: 'text-amber-600 border-amber-300',
          RECEIVED: 'bg-green-600',
          CANCELLED: '',
        };
        return (
          <Badge variant={variants[status]} className={colors[status]}>
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'supplier.name',
      header: 'Supplier',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.supplier.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{row.original.supplier.code}</p>
        </div>
      ),
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
      id: 'itemCount',
      header: 'Items',
      cell: ({ row }) => {
        const items = row.original.items;
        const totalQty = items.reduce((sum, item) => sum + Number(item.quantity), 0);
        return (
          <div className="text-sm">
            <span className="font-medium">{items.length}</span> items
            <p className="text-xs text-muted-foreground">{totalQty.toLocaleString()} units</p>
          </div>
        );
      },
    },
    {
      accessorKey: 'totalAmount',
      header: 'Total',
      cell: ({ row }) => {
        const total = Number(row.original.totalAmount);
        return (
          <span className="font-mono">
            {row.original.currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      accessorKey: 'orderDate',
      header: 'Order Date',
      cell: ({ row }) => {
        const date = new Date(row.original.orderDate);
        return <span className="text-sm">{date.toLocaleDateString()}</span>;
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const order = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/purchase-orders/${order.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              {order.status === 'DRAFT' && (
                <>
                  <DropdownMenuItem onClick={() => onConfirm(order.id)}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirm Order
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(order.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
              {(order.status === 'DRAFT' ||
                order.status === 'CONFIRMED' ||
                order.status === 'PARTIAL') && (
                <DropdownMenuItem
                  onClick={() => onCancel(order.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Order
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
