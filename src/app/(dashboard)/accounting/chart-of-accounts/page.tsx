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
import { Search, ArrowLeft } from 'lucide-react';

const categoryColors: Record<string, string> = {
  '1': 'bg-blue-100 text-blue-800',
  '2': 'bg-red-100 text-red-800',
  '3': 'bg-purple-100 text-purple-800',
  '4': 'bg-green-100 text-green-800',
  '5': 'bg-orange-100 text-orange-800',
};

export default function ChartOfAccountsPage() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('all');

  const { data: categories } = trpc.accounting.getCategories.useQuery();
  const { data: accounts, isLoading } = trpc.accounting.getAccounts.useQuery({
    search: search || undefined,
    categoryId: categoryId !== 'all' ? categoryId : undefined,
  });

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
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Chart of Accounts</h1>
            <p className="text-gray-500 mt-1">Manage your account structure</p>
          </div>
        </div>
      </div>

      {/* Category Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {categories?.map((category) => (
          <Card
            key={category.id}
            className={`cursor-pointer hover:shadow-md transition-shadow ${
              categoryId === category.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setCategoryId(categoryId === category.id ? 'all' : category.id)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{category.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge className={categoryColors[category.code] || 'bg-gray-100 text-gray-800'}>
                  {category.normalBalance}
                </Badge>
                <span className="text-sm text-gray-500">{category._count.accounts} accounts</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : accounts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No accounts found
                  </TableCell>
                </TableRow>
              ) : (
                accounts?.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono font-medium">
                      <div className="flex items-center gap-1">
                        {account.level > 1 && (
                          <span className="text-gray-300">{'─'.repeat(account.level - 1)}</span>
                        )}
                        {account.accountCode}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span style={{ paddingLeft: `${(account.level - 1) * 16}px` }}>
                        {account.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          categoryColors[account.category.code] || 'bg-gray-100 text-gray-800'
                        }
                      >
                        {account.category.name}
                      </Badge>
                    </TableCell>
                    <TableCell>{account.level}</TableCell>
                    <TableCell>
                      <Badge variant={account.isDetail ? 'default' : 'outline'}>
                        {account.isDetail ? 'Detail' : 'Summary'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500 max-w-[200px] truncate">
                      {account.description || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
