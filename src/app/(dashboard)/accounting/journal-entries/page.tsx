'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
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
import { Search, ArrowLeft, Eye, Plus } from 'lucide-react';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-800',
  POSTED: 'bg-green-100 text-green-800',
  VOIDED: 'bg-gray-100 text-gray-800',
};

export default function JournalEntriesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [referenceType, setReferenceType] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.accounting.getJournalEntries.useQuery({
    search: search || undefined,
    status: status !== 'all' ? (status as 'DRAFT' | 'POSTED' | 'VOIDED') : undefined,
    referenceType: referenceType !== 'all' ? referenceType : undefined,
    page,
    limit: 20,
  });

  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(typeof value === 'string' ? parseFloat(value) : value);
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
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Journal Entries</h1>
            <p className="text-gray-500 mt-1">View and manage accounting entries</p>
          </div>
        </div>
        <Link href="/accounting/journal-entries/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by entry number or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="POSTED">Posted</SelectItem>
            <SelectItem value="VOIDED">Voided</SelectItem>
          </SelectContent>
        </Select>
        <Select value={referenceType} onValueChange={setReferenceType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Reference Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Manual">Manual</SelectItem>
            <SelectItem value="SalesOrder">Sales Order</SelectItem>
            <SelectItem value="PurchaseOrder">Purchase Order</SelectItem>
            <SelectItem value="Payment">Payment</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entry #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created By</TableHead>
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
                    No journal entries found
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono">{entry.entryNumber}</TableCell>
                    <TableCell>{format(new Date(entry.entryDate), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.referenceType}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {entry.description || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(entry.totalDebit))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(entry.totalCredit))}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[entry.status]}>{entry.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {entry.createdBy?.name || entry.createdBy?.email || '-'}
                    </TableCell>
                    <TableCell>
                      <Link href={`/accounting/journal-entries/${entry.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
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
