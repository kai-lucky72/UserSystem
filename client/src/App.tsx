import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute, AdminRoute, ManagerRoute, AgentRoute } from "@/lib/protected-route";

import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import AdminDashboard from "@/pages/admin/dashboard";
import ManagerDashboard from "@/pages/manager/dashboard";
import AgentDashboard from "@/pages/agent/dashboard";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <AdminRoute path="/admin/dashboard" component={AdminDashboard} />
      <ManagerRoute path="/manager/dashboard" component={ManagerDashboard} />
      <AgentRoute path="/agent/dashboard" component={AgentDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
