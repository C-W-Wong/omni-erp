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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/tables/DataTable';
import { createColumns, type ProductWithCategory } from './columns';
import { ProductForm } from './ProductForm';
import { CategoryManager } from './CategoryManager';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  Plus,
  Package,
  CheckCircle2,
  FolderTree,
  Loader2,
  AlertTriangle,
  RefreshCcw,
} from 'lucide-react';

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductWithCategory | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<ProductWithCategory | null>(null);

  const utils = trpc.useUtils();

  // Fetch products with pagination
  const {
    data: productsData,
    isLoading,
    isError,
    refetch,
  } = trpc.product.list.useQuery({
    page,
    pageSize: 20,
    categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
  });

  // Fetch categories for filter
  const { data: categories } = trpc.product.listCategories.useQuery();

  // Delete mutation
  const deleteMutation = trpc.product.delete.useMutation({
    onSuccess: () => {
      toast.success('Product deleted successfully');
      utils.product.list.invalidate();
      setDeleteProduct(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Calculate statistics
  const stats = useMemo(() => {
    if (!productsData) {
      return { total: 0, active: 0, inactive: 0 };
    }
    return {
      total: productsData.total,
      active: productsData.items.filter((p) => p.isActive).length,
      inactive: productsData.items.filter((p) => !p.isActive).length,
    };
  }, [productsData]);

  // Column actions
  const columns = useMemo(
    () =>
      createColumns({
        onView: (product) => {
          // TODO: Navigate to product detail page
          console.log('View product:', product.id);
        },
        onEdit: (product) => {
          setEditProduct(product);
          setFormOpen(true);
        },
        onDelete: (product) => {
          setDeleteProduct(product);
        },
      }),
    []
  );

  const handleAddNew = () => {
    setEditProduct(null);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditProduct(null);
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteProduct) {
      deleteMutation.mutate(deleteProduct.id);
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
                <Package className="h-5 w-5 text-primary" />
              </div>
              Products
            </h1>
            <p className="page-description">
              Manage your product catalog, categories, and pricing information.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CategoryManager />
            <Button onClick={handleAddNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Products
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{isLoading ? '-' : stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">in catalog</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Products
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">
                {isLoading ? '-' : stats.active}
              </div>
              <p className="text-xs text-muted-foreground mt-1">available for sale</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Categories
              </CardTitle>
              <FolderTree className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{categories?.length ?? '-'}</div>
              <p className="text-xs text-muted-foreground mt-1">product categories</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Table */}
        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Product Catalog</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  A list of all products in your inventory system.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Categories" />
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
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => refetch()}
                  disabled={isLoading}
                >
                  <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isError ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-lg font-semibold">Failed to load products</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  There was an error loading the product list.
                </p>
                <Button onClick={() => refetch()} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={productsData?.items ?? []}
                isLoading={isLoading}
                searchPlaceholder="Search products..."
                searchKey="name"
                serverPagination
                pageSize={20}
                totalItems={productsData?.total}
                currentPage={page}
                onPageChange={setPage}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Product Form Dialog */}
      <ProductForm
        open={formOpen}
        onOpenChange={handleFormClose}
        product={editProduct}
        onSuccess={() => {
          toast.success(
            editProduct ? 'Product updated successfully' : 'Product created successfully'
          );
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteProduct} onOpenChange={(open) => !open && setDeleteProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Product
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteProduct && (
            <div className="rounded-lg border border-border bg-muted/50 p-4 my-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <Package className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium">{deleteProduct.name}</p>
                  <p className="text-sm text-muted-foreground font-mono">{deleteProduct.sku}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteProduct(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
