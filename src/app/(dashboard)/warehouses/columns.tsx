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
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2, Eye, Star, MapPin } from 'lucide-react';
import type { Warehouse } from '@prisma/client';

interface ColumnActions {
  onEdit: (warehouse: Warehouse) => void;
  onDelete: (warehouse: Warehouse) => void;
  onView: (warehouse: Warehouse) => void;
}

export function createColumns(actions: ColumnActions): ColumnDef<Warehouse>[] {
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
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium">{row.getValue('code')}</span>
          {row.original.isDefault && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
        </div>
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
          {row.original.manager && (
            <p className="text-xs text-muted-foreground truncate">
              Manager: {row.original.manager}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'address',
      header: 'Location',
      cell: ({ row }) => {
        const address = row.original.address;
        const city = row.original.city;
        const country = row.original.country;
        if (!address && !city && !country) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <div className="flex items-start gap-1 text-sm max-w-[250px]">
            <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
            <span className="truncate">
              {[city, country].filter(Boolean).join(', ') || address}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => {
        const phone = row.original.phone;
        return phone ? (
          <span className="text-sm font-mono">{phone}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      accessorKey: 'isDefault',
      header: 'Default',
      cell: ({ row }) => {
        const isDefault = row.getValue('isDefault');
        return isDefault ? (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
            Default
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
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
        const warehouse = row.original;

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
              <DropdownMenuItem onClick={() => actions.onView(warehouse)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onEdit(warehouse)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => actions.onDelete(warehouse)}
                className="text-destructive focus:text-destructive"
                disabled={warehouse.isDefault}
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
