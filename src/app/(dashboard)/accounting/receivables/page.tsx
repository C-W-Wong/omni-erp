'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { Search, ArrowLeft, DollarSign, AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PARTIAL: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
  WRITTEN_OFF: 'bg-gray-100 text-gray-800',
};

export default function AccountsReceivablePage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.accounting.getAccountsReceivable.useQuery({
    search: search || undefined,
    status:
      status !== 'all'
        ? (status as 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'WRITTEN_OFF')
        : undefined,
    overdueOnly: overdueOnly || undefined,
    page,
    limit: 20,
  });

  const { data: aging } = trpc.accounting.getARAgingAnalysis.useQuery();

  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(typeof value === 'string' ? parseFloat(value) : value);
  };

  const isOverdue = (dueDate: Date) => {
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/accounting">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Accounts Receivable</h1>
            <p className="text-gray-500 mt-1">Track customer invoices and payments</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Current
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(aging?.current || 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              1-30 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-yellow-600">
              {formatCurrency(aging?.days1to30 || 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              31-90 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-orange-600">
              {formatCurrency((aging?.days31to60 || 0) + (aging?.days61to90 || 0))}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              90+ Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-red-600">
              {formatCurrency(aging?.days91plus || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by invoice or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PARTIAL">Partial</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
            <SelectItem value="WRITTEN_OFF">Written Off</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={overdueOnly ? 'default' : 'outline'}
          onClick={() => setOverdueOnly(!overdueOnly)}
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          Overdue Only
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Sales Order</TableHead>
                <TableHead>Invoice Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No receivables found
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((ar) => (
                  <TableRow key={ar.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{ar.customer.name}</p>
                        <p className="text-xs text-gray-500">{ar.customer.code}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/sales-orders/${ar.salesOrder.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {ar.salesOrder.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{format(new Date(ar.invoiceDate), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <span
                        className={
                          isOverdue(ar.dueDate) && ar.status !== 'PAID'
                            ? 'text-red-600 font-medium'
                            : ''
                        }
                      >
                        {format(new Date(ar.dueDate), 'MMM d, yyyy')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(ar.amount))}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(Number(ar.paidAmount))}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(ar.balance))}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[ar.status] || 'bg-gray-100 text-gray-800'}>
                        {ar.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/accounting/receivables/${ar.id}`}>
                        <Button variant="ghost" size="sm">
                          <DollarSign className="h-4 w-4 mr-1" />
                          Receive
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.pagination.total)} of{' '}
            {data.pagination.total} results
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
              disabled={page === data.pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
