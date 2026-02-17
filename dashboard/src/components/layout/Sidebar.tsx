import { Link, useRouterState } from '@tanstack/react-router';
import { useUser } from '@stackframe/stack';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Jobs', href: '/jobs', icon: '⚙️' },
];

export function Sidebar() {
  const user = useUser();
  const router = useRouterState();
  const currentPath = router.location.pathname;

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-card border-r">
      <div className="flex flex-col h-full">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold">Companion Jobs</h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = currentPath.startsWith(item.href);
            return (
              <Link key={item.href} to={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn('w-full justify-start', isActive && 'bg-secondary')}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          {user && (
            <div className="space-y-2">
              <p className="text-sm font-medium truncate">{user.displayName || user.primaryEmail}</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  // Sign out via Stack Auth
                  window.location.href = '/handler/sign-out';
                }}
              >
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
