'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FolderTree,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  FolderOpen,
  AlertTriangle,
  Package,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { createCategorySchema, type CreateCategoryInput } from '@/lib/validators/product';
import type { ProductCategory } from '@prisma/client';

type CategoryWithCount = ProductCategory & {
  parent: ProductCategory | null;
  _count: { products: number; children: number };
};

export function CategoryManager() {
  const [open, setOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<CategoryWithCount | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<CategoryWithCount | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const utils = trpc.useUtils();

  const { data: categories, isLoading } = trpc.product.listCategories.useQuery(
    { includeInactive: true },
    { enabled: open }
  );

  const createMutation = trpc.product.createCategory.useMutation({
    onSuccess: () => {
      toast.success('Category created successfully');
      utils.product.listCategories.invalidate();
      setFormOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.product.updateCategory.useMutation({
    onSuccess: () => {
      toast.success('Category updated successfully');
      utils.product.listCategories.invalidate();
      setFormOpen(false);
      setEditCategory(null);
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.product.deleteCategory.useMutation({
    onSuccess: () => {
      toast.success('Category deleted successfully');
      utils.product.listCategories.invalidate();
      setDeleteCategory(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: '',
      description: '',
      parentId: undefined,
    },
  });

  const handleEdit = (category: CategoryWithCount) => {
    setEditCategory(category);
    form.reset({
      name: category.name,
      description: category.description || '',
      parentId: category.parentId || undefined,
    });
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditCategory(null);
    form.reset({
      name: '',
      description: '',
      parentId: undefined,
    });
    setFormOpen(true);
  };

  const onSubmit = (data: CreateCategoryInput) => {
    if (editCategory) {
      updateMutation.mutate({ id: editCategory.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <FolderTree className="h-4 w-4" />
            Manage Categories
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Product Categories
            </SheetTitle>
            <SheetDescription>
              Organize your products into categories for better management.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">{categories?.length ?? 0} categories</p>
              <Button size="sm" onClick={handleAdd} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Category
              </Button>
            </div>

            <ScrollArea className="h-[calc(100vh-220px)]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : categories?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No categories yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    Create your first category to organize products.
                  </p>
                  <Button size="sm" onClick={handleAdd}>
                    Create Category
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {categories?.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                          <FolderTree className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{category.name}</p>
                            {!category.isActive && (
                              <Badge variant="secondary" className="text-[10px]">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {category._count.products} products
                            </span>
                            {category.parent && (
                              <span className="truncate">in {category.parent.name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteCategory(category)}
                          disabled={category._count.products > 0 || category._count.children > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* Category Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
            <DialogDescription>
              {editCategory ? 'Update the category information.' : 'Create a new product category.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Electronics" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None (top-level)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None (top-level)</SelectItem>
                        {categories
                          ?.filter((c) => c.id !== editCategory?.id)
                          .map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editCategory ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteCategory} onOpenChange={(open) => !open && setDeleteCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Category
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this category? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteCategory && (
            <div className="rounded-lg border border-border bg-muted/50 p-4 my-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <FolderTree className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium">{deleteCategory.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {deleteCategory._count.products} products
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCategory(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteCategory && deleteMutation.mutate(deleteCategory.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
