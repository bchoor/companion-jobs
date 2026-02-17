import { createFileRoute, Link } from '@tanstack/react-router';
import { useUser } from '@stackframe/stack';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const user = useUser();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Companion Jobs</CardTitle>
          <CardDescription>Web scraper orchestration dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user ? (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">
                Welcome back, {user.displayName || user.primaryEmail}
              </p>
              <Link to="/dashboard">
                <Button className="w-full" size="lg">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">
                Sign in to access your scraper jobs and run history
              </p>
              <Link to="/dashboard">
                <Button className="w-full" size="lg">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
