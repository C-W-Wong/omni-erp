'use client';

import { useSession } from 'next-auth/react';
import type { Role } from '@prisma/client';

const roleHierarchy: Record<Role, number> = {
  ADMIN: 100,
  ACCOUNTING: 40,
  PURCHASING: 30,
  WAREHOUSE: 20,
  SALES: 10,
};

export function useAuth() {
  const { data: session, status } = useSession();

  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';
  const user = session?.user;

  const hasRole = (role: Role): boolean => {
    if (!user?.role) return false;
    return user.role === role;
  };

  const hasAnyRole = (roles: Role[]): boolean => {
    if (!user?.role) return false;
    return roles.includes(user.role);
  };

  const hasMinRole = (minRole: Role): boolean => {
    if (!user?.role) return false;
    return roleHierarchy[user.role] >= roleHierarchy[minRole];
  };

  const isAdmin = hasRole('ADMIN');
  const isSales = hasRole('SALES');
  const isWarehouse = hasRole('WAREHOUSE');
  const isPurchasing = hasRole('PURCHASING');
  const isAccounting = hasRole('ACCOUNTING');

  return {
    user,
    isLoading,
    isAuthenticated,
    hasRole,
    hasAnyRole,
    hasMinRole,
    isAdmin,
    isSales,
    isWarehouse,
    isPurchasing,
    isAccounting,
  };
}
