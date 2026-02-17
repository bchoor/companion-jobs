import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useUser } from '@stackframe/stack';
import { AppShell } from '@/components/layout/AppShell';

export const Route = createFileRoute('/dashboard')({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const user = useUser({ or: 'redirect' });

  if (!user) {
    return null; // Will redirect via Stack Auth
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
