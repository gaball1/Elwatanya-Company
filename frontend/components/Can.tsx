import { ReactNode, useSyncExternalStore } from 'react';
import { useHasPermission, useHasAllPermissions } from '@/hooks/usePermissions';

interface CanProps {
  permission: string;
  fallback?: ReactNode;
  children: ReactNode;
}

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function useMountedSync() {
  return useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
}

export function Can({ permission, fallback = null, children }: CanProps) {
  const hasPermission = useHasPermission(permission);
  const mounted = useMountedSync();
  if (!mounted) return <>{fallback}</>;
  if (!hasPermission) return <>{fallback}</>;
  return <>{children}</>;
}

export function CanAll({ permissions, fallback = null, children }: { permissions: string[]; fallback?: ReactNode; children: ReactNode }) {
  const hasAll = useHasAllPermissions(...permissions);
  const mounted = useMountedSync();
  if (!mounted) return <>{fallback}</>;
  if (!hasAll) return <>{fallback}</>;
  return <>{children}</>;
}
