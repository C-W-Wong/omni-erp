'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import {
  FileText,
  CreditCard,
  Receipt,
  TrendingUp,
  BookOpen,
  ArrowRight,
  Clock,
  AlertCircle,
} from 'lucide-react';

export default function AccountingPage() {
  const { data: stats, isLoading: statsLoading } = trpc.accounting.getStats.useQuery();
  const { data: arAging, isLoading: arAgingLoading } =
    trpc.accounting.getARAgingAnalysis.useQuery();
  const { data: apAging, isLoading: apAgingLoading } =
    trpc.accounting.getAPAgingAnalysis.useQuery();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const isLoading = statsLoading || arAgingLoading || apAgingLoading;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Accounting</h1>
          <p className="text-gray-500 mt-1">Financial overview and management</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Total Receivables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {isLoading ? '...' : formatCurrency(stats?.totalReceivables || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Outstanding from customers</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Overdue AR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">
              {isLoading ? '...' : formatCurrency(stats?.overdueReceivables || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Past due date</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Total Payables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {isLoading ? '...' : formatCurrency(stats?.totalPayables || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Owed to suppliers</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Journal Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {isLoading ? '...' : stats?.journalEntriesThisMonth || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/accounting/receivables">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-600" />
                Accounts Receivable
              </CardTitle>
              <CardDescription>Track customer invoices and payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">View all</span>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/accounting/payables">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-red-600" />
                Accounts Payable
              </CardTitle>
              <CardDescription>Manage supplier invoices and payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">View all</span>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-red-600 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/accounting/journal-entries">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-green-600" />
                Journal Entries
              </CardTitle>
              <CardDescription>View and create journal entries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">View all</span>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-green-600 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/accounting/chart-of-accounts">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Chart of Accounts
              </CardTitle>
              <CardDescription>Manage account structure</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">View all</span>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* AR Aging Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              AR Aging Analysis
            </CardTitle>
            <CardDescription>Accounts Receivable aging breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {arAgingLoading ? (
              <p className="text-gray-500">Loading...</p>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-gray-600">Current</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(arAging?.current || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-gray-600">1-30 Days</span>
                  <span className="font-medium text-yellow-600">
                    {formatCurrency(arAging?.days1to30 || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-gray-600">31-60 Days</span>
                  <span className="font-medium text-orange-600">
                    {formatCurrency(arAging?.days31to60 || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-gray-600">61-90 Days</span>
                  <span className="font-medium text-red-500">
                    {formatCurrency(arAging?.days61to90 || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-gray-600">90+ Days</span>
                  <span className="font-medium text-red-700">
                    {formatCurrency(arAging?.days91plus || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 font-bold">
                  <span>Total Outstanding</span>
                  <span>{formatCurrency(arAging?.total || 0)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-red-600" />
              AP Aging Analysis
            </CardTitle>
            <CardDescription>Accounts Payable aging breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {apAgingLoading ? (
              <p className="text-gray-500">Loading...</p>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-gray-600">Current</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(apAging?.current || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-gray-600">1-30 Days</span>
                  <span className="font-medium text-yellow-600">
                    {formatCurrency(apAging?.days1to30 || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-gray-600">31-60 Days</span>
                  <span className="font-medium text-orange-600">
                    {formatCurrency(apAging?.days31to60 || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-gray-600">61-90 Days</span>
                  <span className="font-medium text-red-500">
                    {formatCurrency(apAging?.days61to90 || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-gray-600">90+ Days</span>
                  <span className="font-medium text-red-700">
                    {formatCurrency(apAging?.days91plus || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 font-bold">
                  <span>Total Outstanding</span>
                  <span>{formatCurrency(apAging?.total || 0)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
