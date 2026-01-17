'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Boxes, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password. Please try again.');
        setIsLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md relative z-10 shadow-2xl border-border/50 backdrop-blur-sm bg-card/95">
      <CardHeader className="space-y-4 pb-6">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
              <Boxes className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-semibold tracking-tight">Import ERP</span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">
                Trading System
              </span>
            </div>
          </div>
        </div>

        <div className="text-center space-y-1 pt-2">
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Enter your credentials to access the system</CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-11 pr-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full h-11 font-medium" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-center text-xs text-muted-foreground">
            <span className="font-mono">v1.0.0</span>
            <span className="mx-2">·</span>
            Enterprise Resource Planning
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function LoginFormFallback() {
  return (
    <Card className="w-full max-w-md relative z-10 shadow-2xl border-border/50 backdrop-blur-sm bg-card/95">
      <CardHeader className="space-y-4 pb-6">
        <div className="flex justify-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
              <Boxes className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-semibold tracking-tight">Import ERP</span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">
                Trading System
              </span>
            </div>
          </div>
        </div>
        <div className="text-center space-y-1 pt-2">
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 grid-pattern opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />

      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      {/* Login Card */}
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>

      {/* System Status Indicator */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        <span className="font-mono">System Online</span>
      </div>
    </div>
  );
}
