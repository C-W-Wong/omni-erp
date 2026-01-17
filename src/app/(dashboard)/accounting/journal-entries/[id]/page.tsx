'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { ArrowLeft, BookOpen, Calendar, User, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-800',
  POSTED: 'bg-green-100 text-green-800',
  VOIDED: 'bg-gray-100 text-gray-800',
};

export default function JournalEntryDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: entry, isLoading, refetch } = trpc.accounting.getJournalEntryById.useQuery(id);

  const postEntry = trpc.accounting.postJournalEntry.useMutation({
    onSuccess: () => {
      toast.success('Journal entry posted');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const voidEntry = trpc.accounting.voidJournalEntry.useMutation({
    onSuccess: () => {
      toast.success('Journal entry voided');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(typeof value === 'string' ? parseFloat(value) : value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Journal entry not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/accounting/journal-entries">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                {entry.entryNumber}
              </h1>
              <Badge className={statusColors[entry.status]}>{entry.status}</Badge>
            </div>
            <p className="text-gray-500 mt-1">{entry.description || 'No description'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {entry.status === 'DRAFT' && (
            <Button onClick={() => postEntry.mutate(entry.id)} disabled={postEntry.isPending}>
              <CheckCircle className="h-4 w-4 mr-2" />
              {postEntry.isPending ? 'Posting...' : 'Post Entry'}
            </Button>
          )}
          {entry.status !== 'VOIDED' && (
            <Button
              variant="destructive"
              onClick={() => voidEntry.mutate(entry.id)}
              disabled={voidEntry.isPending}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {voidEntry.isPending ? 'Voiding...' : 'Void Entry'}
            </Button>
          )}
        </div>
      </div>

      {/* Entry Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Entry Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">
              {format(new Date(entry.entryDate), 'MMMM d, yyyy')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Reference Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">{entry.referenceType}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <User className="h-4 w-4" />
              Created By
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">
              {entry.createdBy?.name || entry.createdBy?.email || '-'}
            </p>
            <p className="text-xs text-gray-500">
              {format(new Date(entry.createdAt), 'MMM d, yyyy h:mm a')}
            </p>
          </CardContent>
        </Card>
      </div>

      {entry.postedAt && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4 flex items-center gap-4">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Posted</p>
              <p className="text-sm text-green-600">
                By {entry.postedBy?.name || entry.postedBy?.email} on{' '}
                {format(new Date(entry.postedAt), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Journal Entry Lines */}
      <Card>
        <CardHeader>
          <CardTitle>Journal Entry Lines</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entry.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="font-mono">{line.account.accountCode}</TableCell>
                  <TableCell>{line.account.name}</TableCell>
                  <TableCell className="text-gray-500">{line.description || '-'}</TableCell>
                  <TableCell className="text-right">
                    {Number(line.debitAmount) > 0 ? formatCurrency(Number(line.debitAmount)) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(line.creditAmount) > 0
                      ? formatCurrency(Number(line.creditAmount))
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-gray-50 font-bold">
                <TableCell colSpan={3} className="text-right">
                  Totals:
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(Number(entry.totalDebit))}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(Number(entry.totalCredit))}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
