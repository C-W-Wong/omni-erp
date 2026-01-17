'use client';

import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataTable } from '@/components/tables/DataTable';
import { createColumns } from './columns';
import { CustomerForm } from './CustomerForm';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  Plus,
  Users,
  UserCheck,
  DollarSign,
  Loader2,
  AlertTriangle,
  RefreshCcw,
} from 'lucide-react';
import type { Customer } from '@prisma/client';

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);

  const utils = trpc.useUtils();

  const {
    data: customersData,
    isLoading,
    isError,
    refetch,
  } = trpc.customer.list.useQuery({
    page,
    pageSize: 20,
  });

  const deleteMutation = trpc.customer.delete.useMutation({
    onSuccess: () => {
      toast.success('Customer deleted successfully');
      utils.customer.list.invalidate();
      setDeleteCustomer(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const stats = useMemo(() => {
    if (!customersData) {
      return { total: 0, active: 0, totalCredit: 0 };
    }
    return {
      total: customersData.total,
      active: customersData.items.filter((c) => c.isActive).length,
      totalCredit: customersData.items.reduce((sum, c) => sum + Number(c.creditLimit), 0),
    };
  }, [customersData]);

  const columns = useMemo(
    () =>
      createColumns({
        onView: (customer) => {
          console.log('View customer:', customer.id);
        },
        onEdit: (customer) => {
          setEditCustomer(customer);
          setFormOpen(true);
        },
        onDelete: (customer) => {
          setDeleteCustomer(customer);
        },
      }),
    []
  );

  const handleAddNew = () => {
    setEditCustomer(null);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditCustomer(null);
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteCustomer) {
      deleteMutation.mutate(deleteCustomer.id);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div className="page-header">
            <h1 className="page-title flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              Customers
            </h1>
            <p className="page-description">
              Manage your customer database, contact information, and credit terms.
            </p>
          </div>
          <Button onClick={handleAddNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Customers
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{isLoading ? '-' : stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">in database</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Customers
              </CardTitle>
              <UserCheck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">
                {isLoading ? '-' : stats.active}
              </div>
              <p className="text-xs text-muted-foreground mt-1">available for orders</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Credit Limit
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {isLoading
                  ? '-'
                  : new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      maximumFractionDigits: 0,
                    }).format(stats.totalCredit)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">combined credit</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Customer Directory</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  A list of all customers in your system.
                </p>
              </div>
              <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isError ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-lg font-semibold">Failed to load customers</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  There was an error loading the customer list.
                </p>
                <Button onClick={() => refetch()} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={customersData?.items ?? []}
                isLoading={isLoading}
                searchPlaceholder="Search customers..."
                searchKey="name"
                serverPagination
                pageSize={20}
                totalItems={customersData?.total}
                currentPage={page}
                onPageChange={setPage}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customer Form Dialog */}
      <CustomerForm
        open={formOpen}
        onOpenChange={handleFormClose}
        customer={editCustomer}
        onSuccess={() => {
          toast.success(
            editCustomer ? 'Customer updated successfully' : 'Customer created successfully'
          );
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteCustomer} onOpenChange={(open) => !open && setDeleteCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Customer
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this customer? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteCustomer && (
            <div className="rounded-lg border border-border bg-muted/50 p-4 my-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <Users className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium">{deleteCustomer.name}</p>
                  <p className="text-sm text-muted-foreground font-mono">{deleteCustomer.code}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCustomer(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
