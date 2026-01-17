'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, MoreHorizontal, Send, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type TransferItem = {
  id: string;
  transferNumber: string;
  status: 'DRAFT' | 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  notes: string | null;
  requestedAt: Date;
  sourceWarehouse: {
    id: string;
    code: string;
    name: string;
  };
  targetWarehouse: {
    id: string;
    code: string;
    name: string;
  };
  requestedBy: {
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
    batch: {
      id: string;
      batchNumber: string;
    };
  }>;
};

interface ColumnsProps {
  onSubmit: (id: string) => void;
  onApprove: (id: string) => void;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
}

export function createColumns({
  onSubmit,
  onApprove,
  onComplete,
  onCancel,
}: ColumnsProps): ColumnDef<TransferItem>[] {
  return [
    {
      accessorKey: 'transferNumber',
      header: 'Transfer #',
      cell: ({ row }) => (
        <Link
          href={`/transfers/${row.original.id}`}
          className="font-mono text-sm text-primary hover:underline"
        >
          {row.original.transferNumber}
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
          PENDING: 'outline',
          IN_TRANSIT: 'default',
          COMPLETED: 'default',
          CANCELLED: 'destructive',
        };
        const colors: Record<string, string> = {
          DRAFT: '',
          PENDING: 'text-amber-600 border-amber-300',
          IN_TRANSIT: 'bg-blue-600',
          COMPLETED: 'bg-green-600',
          CANCELLED: '',
        };
        return (
          <Badge variant={variants[status]} className={colors[status]}>
            {status.replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'sourceWarehouse.code',
      header: 'From',
      cell: ({ row }) => (
        <div>
          <Badge variant="outline" className="font-mono">
            {row.original.sourceWarehouse.code}
          </Badge>
          <p className="text-xs text-muted-foreground mt-1">{row.original.sourceWarehouse.name}</p>
        </div>
      ),
    },
    {
      accessorKey: 'targetWarehouse.code',
      header: 'To',
      cell: ({ row }) => (
        <div>
          <Badge variant="outline" className="font-mono">
            {row.original.targetWarehouse.code}
          </Badge>
          <p className="text-xs text-muted-foreground mt-1">{row.original.targetWarehouse.name}</p>
        </div>
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
            <p className="text-xs text-muted-foreground">{totalQty.toLocaleString()} units total</p>
          </div>
        );
      },
    },
    {
      accessorKey: 'requestedAt',
      header: 'Requested',
      cell: ({ row }) => {
        const date = new Date(row.original.requestedAt);
        return (
          <div className="text-sm">
            <p>{date.toLocaleDateString()}</p>
            <p className="text-xs text-muted-foreground">
              by {row.original.requestedBy?.name || 'Unknown'}
            </p>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const transfer = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/transfers/${transfer.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              {transfer.status === 'DRAFT' && (
                <DropdownMenuItem onClick={() => onSubmit(transfer.id)}>
                  <Send className="mr-2 h-4 w-4" />
                  Submit for Approval
                </DropdownMenuItem>
              )}
              {transfer.status === 'PENDING' && (
                <DropdownMenuItem onClick={() => onApprove(transfer.id)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve Transfer
                </DropdownMenuItem>
              )}
              {transfer.status === 'IN_TRANSIT' && (
                <DropdownMenuItem onClick={() => onComplete(transfer.id)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark as Completed
                </DropdownMenuItem>
              )}
              {(transfer.status === 'DRAFT' ||
                transfer.status === 'PENDING' ||
                transfer.status === 'IN_TRANSIT') && (
                <DropdownMenuItem
                  onClick={() => onCancel(transfer.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Transfer
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
