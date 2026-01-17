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
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2, Eye, Globe, Clock } from 'lucide-react';
import type { Supplier } from '@prisma/client';

interface ColumnActions {
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
  onView: (supplier: Supplier) => void;
}

export function createColumns(actions: ColumnActions): ColumnDef<Supplier>[] {
  return [
    {
      accessorKey: 'code',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Code
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium">{row.getValue('code')}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="max-w-[250px]">
          <p className="font-medium truncate">{row.getValue('name')}</p>
          {row.original.contactPerson && (
            <p className="text-xs text-muted-foreground truncate">{row.original.contactPerson}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'country',
      header: 'Location',
      cell: ({ row }) => {
        const city = row.original.city;
        const country = row.original.country;
        if (!city && !country) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="flex items-center gap-1 text-sm">
            <Globe className="h-3 w-3 text-muted-foreground" />
            <span>{[city, country].filter(Boolean).join(', ')}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'currency',
      header: 'Currency',
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono">
          {row.getValue('currency')}
        </Badge>
      ),
    },
    {
      accessorKey: 'leadTimeDays',
      header: 'Lead Time',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="font-mono">{row.getValue('leadTimeDays')} days</span>
        </div>
      ),
    },
    {
      accessorKey: 'paymentTerms',
      header: 'Terms',
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-mono">
          Net {row.getValue('paymentTerms')}
        </Badge>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.getValue('isActive');
        return (
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const supplier = row.original;

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
              <DropdownMenuItem onClick={() => actions.onView(supplier)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onEdit(supplier)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => actions.onDelete(supplier)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
