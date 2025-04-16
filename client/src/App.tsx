import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute, AdminRoute, ManagerRoute, AgentRoute } from "@/lib/protected-route";

import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";

// Admin pages
import AdminDashboard from "@/pages/admin/dashboard";
import ManageManagers from "@/pages/admin/managers";
import AllUsers from "@/pages/admin/users";
import Reports from "@/pages/admin/reports";
import HelpRequests from "@/pages/admin/help-requests";

// Manager and agent pages
import ManagerDashboard from "@/pages/manager/dashboard";
import AgentDashboard from "@/pages/agent/dashboard";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      
      {/* Admin Routes */}
      <AdminRoute path="/admin/dashboard" component={AdminDashboard} />
      <AdminRoute path="/admin/managers" component={ManageManagers} />
      <AdminRoute path="/admin/users" component={AllUsers} />
      <AdminRoute path="/admin/reports" component={Reports} />
      <AdminRoute path="/admin/help-requests" component={HelpRequests} />
      
      {/* Manager Routes */}
      <ManagerRoute path="/manager/dashboard" component={ManagerDashboard} />
      
      {/* Agent Routes */}
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
