import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { UserRole } from "@shared/schema";

export function ProtectedRoute({
  path,
  component: Component,
  requiredRole,
}: {
  path: string;
  component: () => React.JSX.Element;
  requiredRole?: string[];
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  if (requiredRole && !requiredRole.includes(user.role)) {
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}

export function AdminRoute({ path, component }: { path: string; component: () => React.JSX.Element }) {
  return <ProtectedRoute path={path} component={component} requiredRole={[UserRole.ADMIN]} />;
}

export function ManagerRoute({ path, component }: { path: string; component: () => React.JSX.Element }) {
  return <ProtectedRoute path={path} component={component} requiredRole={[UserRole.MANAGER]} />;
}

export function AgentRoute({ path, component }: { path: string; component: () => React.JSX.Element }) {
  return <ProtectedRoute path={path} component={component} requiredRole={[UserRole.AGENT]} />;
}
