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
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2, Eye, Mail, Phone } from 'lucide-react';
import type { Customer } from '@prisma/client';

interface ColumnActions {
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onView: (customer: Customer) => void;
}

export function createColumns(actions: ColumnActions): ColumnDef<Customer>[] {
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
      accessorKey: 'email',
      header: 'Contact',
      cell: ({ row }) => {
        const email = row.original.email;
        const phone = row.original.phone;
        return (
          <div className="space-y-1">
            {email && (
              <div className="flex items-center gap-1 text-sm">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <span className="truncate max-w-[180px]">{email}</span>
              </div>
            )}
            {phone && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{phone}</span>
              </div>
            )}
            {!email && !phone && <span className="text-muted-foreground">-</span>}
          </div>
        );
      },
    },
    {
      accessorKey: 'city',
      header: 'Location',
      cell: ({ row }) => {
        const city = row.original.city;
        const country = row.original.country;
        if (!city && !country) return <span className="text-muted-foreground">-</span>;
        return <span className="text-sm">{[city, country].filter(Boolean).join(', ')}</span>;
      },
    },
    {
      accessorKey: 'paymentTerms',
      header: 'Terms',
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono">
          Net {row.getValue('paymentTerms')}
        </Badge>
      ),
    },
    {
      accessorKey: 'creditLimit',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Credit Limit
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const limit = parseFloat(row.getValue('creditLimit'));
        const formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0,
        }).format(limit);
        return <span className="font-mono">{formatted}</span>;
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
        const customer = row.original;

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
              <DropdownMenuItem onClick={() => actions.onView(customer)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onEdit(customer)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => actions.onDelete(customer)}
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
