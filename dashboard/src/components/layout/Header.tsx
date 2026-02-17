import { useRouterState } from '@tanstack/react-router';
import { Home, ChevronRight } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ThemeToggle } from '@/components/theme-toggle';

export function Header() {
  const router = useRouterState();
  const pathname = router.location.pathname;

  // Generate breadcrumbs from pathname
  const getBreadcrumbs = () => {
    if (pathname === '/') {
      return [{ label: 'Dashboard', href: '/', isLast: true }];
    }

    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Dashboard', href: '/', isLast: false }];

    segments.forEach((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/');
      const isLast = index === segments.length - 1;

      // Capitalize and format segment
      let label = segment.charAt(0).toUpperCase() + segment.slice(1);

      // Handle special cases
      if (segment === 'jobs') label = 'Jobs';
      if (segment.match(/^\d+$/)) label = `#${segment}`;

      breadcrumbs.push({ label, href, isLast });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 lg:px-6">
        <div className="flex flex-1 items-center">
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.href} className="flex items-center">
                  {index > 0 && (
                    <BreadcrumbSeparator>
                      <ChevronRight className="h-4 w-4" />
                    </BreadcrumbSeparator>
                  )}
                  <BreadcrumbItem>
                    {crumb.isLast ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={crumb.href}>
                        {index === 0 && <Home className="h-4 w-4" />}
                        {index > 0 && crumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="hidden sm:block text-sm font-medium">Companion Jobs</div>
        </div>
      </div>
    </header>
  );
}
