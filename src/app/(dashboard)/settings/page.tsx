'use client';

import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, Package, AlertTriangle, DollarSign, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

const allocationMethods = [
  {
    value: 'FIFO',
    label: 'FIFO - First In, First Out',
    description: 'Oldest inventory is allocated first',
  },
  {
    value: 'LIFO',
    label: 'LIFO - Last In, First Out',
    description: 'Newest inventory is allocated first',
  },
  {
    value: 'WEIGHTED_AVG',
    label: 'Weighted Average',
    description: 'Average cost across all batches',
  },
];

const currencies = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'CNY', label: 'CNY - Chinese Yuan' },
  { value: 'HKD', label: 'HKD - Hong Kong Dollar' },
  { value: 'TWD', label: 'TWD - Taiwan Dollar' },
];

export default function SettingsPage() {
  const [allocationMethod, setAllocationMethod] = useState('FIFO');
  const [allowNegativeInventory, setAllowNegativeInventory] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [lowStockAlertEnabled, setLowStockAlertEnabled] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  const utils = trpc.useUtils();

  const { data: settings, isLoading } = trpc.inventory.getSettings.useQuery();

  const updateSettingMutation = trpc.inventory.updateSetting.useMutation({
    onSuccess: () => {
      utils.inventory.getSettings.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const seedSettingsMutation = trpc.inventory.seedSettings.useMutation({
    onSuccess: () => {
      toast.success('Default settings initialized');
      utils.inventory.getSettings.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Load settings into state
  useEffect(() => {
    if (settings) {
      setAllocationMethod(settings.ALLOCATION_METHOD || 'FIFO');
      setAllowNegativeInventory(settings.ALLOW_NEGATIVE_INVENTORY === 'true');
      setDefaultCurrency(settings.DEFAULT_CURRENCY || 'USD');
      setLowStockAlertEnabled(settings.LOW_STOCK_ALERT_ENABLED !== 'false');
      setHasChanges(false);
    }
  }, [settings]);

  const handleSave = async () => {
    const updates = [
      { key: 'ALLOCATION_METHOD', value: allocationMethod },
      { key: 'ALLOW_NEGATIVE_INVENTORY', value: allowNegativeInventory.toString() },
      { key: 'DEFAULT_CURRENCY', value: defaultCurrency },
      { key: 'LOW_STOCK_ALERT_ENABLED', value: lowStockAlertEnabled.toString() },
    ];

    try {
      for (const update of updates) {
        await updateSettingMutation.mutateAsync(update);
      }
      toast.success('Settings saved successfully');
      setHasChanges(false);
    } catch {
      // Error handled in mutation
    }
  };

  const handleChange = () => {
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground mt-1">Configure system-wide preferences</p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={updateSettingMutation.isPending}>
            {updateSettingMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>

      {/* Settings Sections */}
      <div className="grid gap-6">
        {/* Inventory Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Inventory Settings</CardTitle>
            </div>
            <CardDescription>Configure how inventory is managed and allocated</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Default Allocation Method</Label>
              <Select
                value={allocationMethod}
                onValueChange={(value) => {
                  setAllocationMethod(value);
                  handleChange();
                }}
              >
                <SelectTrigger className="w-[400px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allocationMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      <div>
                        <p>{method.label}</p>
                        <p className="text-xs text-muted-foreground">{method.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Determines how inventory batches are selected when fulfilling orders
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Negative Inventory</Label>
                <p className="text-sm text-muted-foreground">
                  Permit inventory quantities to go below zero
                </p>
              </div>
              <Switch
                checked={allowNegativeInventory}
                onCheckedChange={(checked) => {
                  setAllowNegativeInventory(checked);
                  handleChange();
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Alert Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle>Alert Settings</CardTitle>
            </div>
            <CardDescription>Configure notifications and alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Low Stock Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Show alerts when inventory falls below minimum stock levels
                </p>
              </div>
              <Switch
                checked={lowStockAlertEnabled}
                onCheckedChange={(checked) => {
                  setLowStockAlertEnabled(checked);
                  handleChange();
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Currency Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Currency Settings</CardTitle>
            </div>
            <CardDescription>Configure default currency for transactions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Select
                value={defaultCurrency}
                onValueChange={(value) => {
                  setDefaultCurrency(value);
                  handleChange();
                }}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Default currency used for new transactions and reports
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Additional Settings</CardTitle>
            </div>
            <CardDescription>Manage other system configurations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Link
                href="/settings/cost-types"
                className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Cost Item Types</p>
                  <p className="text-sm text-muted-foreground">Manage landed cost categories</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* System Maintenance */}
        <Card>
          <CardHeader>
            <CardTitle>System Maintenance</CardTitle>
            <CardDescription>Manage system data and initialization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Initialize Default Settings</p>
                <p className="text-sm text-muted-foreground">
                  Create default system settings if they don&apos;t exist
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => seedSettingsMutation.mutate()}
                disabled={seedSettingsMutation.isPending}
              >
                {seedSettingsMutation.isPending ? 'Initializing...' : 'Initialize'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
