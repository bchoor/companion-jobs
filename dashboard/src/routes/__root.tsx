import { Outlet, createRootRoute } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StackProvider, StackClientApp } from '@stackframe/stack';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const stackApp = new StackClientApp({
  tokenStore: 'nextjs-cookie',
  projectId: import.meta.env.VITE_STACK_PROJECT_ID,
  publishableClientKey: import.meta.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY,
});

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <StackProvider app={stackApp}>
      <QueryClientProvider client={queryClient}>
        <Outlet />
      </QueryClientProvider>
    </StackProvider>
  );
}
