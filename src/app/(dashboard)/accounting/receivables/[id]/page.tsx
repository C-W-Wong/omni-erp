'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { ArrowLeft, DollarSign, Receipt, User, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PARTIAL: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
  WRITTEN_OFF: 'bg-gray-100 text-gray-800',
};

export default function ReceivePaymentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [amount, setAmount] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const { data: ar, isLoading } = trpc.accounting.getARById.useQuery(id);
  const receivePayment = trpc.accounting.receivePayment.useMutation({
    onSuccess: () => {
      toast.success('Payment recorded successfully');
      router.push('/accounting/receivables');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    receivePayment.mutate({
      accountReceivableId: id,
      amount: parseFloat(amount),
      referenceNumber: referenceNumber || undefined,
      notes: notes || undefined,
    });
  };

  const handlePayFull = () => {
    if (ar) {
      setAmount(ar.balance.toString());
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!ar) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Receivable not found</p>
      </div>
    );
  }

  const isOverdue = new Date(ar.dueDate) < new Date() && ar.status !== 'PAID';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/accounting/receivables">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Receive Payment</h1>
          <p className="text-gray-500 mt-1">Record payment for invoice</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              Invoice Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-500">Status</span>
              <Badge className={statusColors[ar.status]}>{ar.status}</Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-500 flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer
              </span>
              <span className="font-medium">{ar.customer.name}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-500 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Sales Order
              </span>
              <Link
                href={`/sales-orders/${ar.salesOrder.id}`}
                className="text-blue-600 hover:underline"
              >
                {ar.salesOrder.orderNumber}
              </Link>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-500 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Invoice Date
              </span>
              <span>{format(new Date(ar.invoiceDate), 'MMM d, yyyy')}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-500 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Due Date
              </span>
              <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                {format(new Date(ar.dueDate), 'MMM d, yyyy')}
                {isOverdue && ' (OVERDUE)'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Payment Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-500">Invoice Amount</span>
              <span className="font-medium">{formatCurrency(Number(ar.amount))}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-500">Paid Amount</span>
              <span className="text-green-600">{formatCurrency(Number(ar.paidAmount))}</span>
            </div>
            <div className="flex justify-between items-center py-2 text-lg font-bold">
              <span>Balance Due</span>
              <span className="text-red-600">{formatCurrency(Number(ar.balance))}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Form */}
      {ar.status !== 'PAID' && (
        <Card>
          <CardHeader>
            <CardTitle>Record Payment</CardTitle>
            <CardDescription>Enter payment details below</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Payment Amount *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      max={parseFloat(ar.balance.toString())}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" onClick={handlePayFull}>
                      Pay Full
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referenceNumber">Reference Number</Label>
                  <Input
                    id="referenceNumber"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Check number, wire reference, etc."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional payment notes..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Link href="/accounting/receivables">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={receivePayment.isPending}>
                  {receivePayment.isPending ? 'Recording...' : 'Record Payment'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {ar.status === 'PAID' && (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="text-green-600 text-lg font-medium">
              This invoice has been fully paid.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
