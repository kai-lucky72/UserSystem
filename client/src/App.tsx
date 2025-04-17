import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
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
import ManagerAgents from "@/pages/manager/agents";
import ManagerAttendance from "@/pages/manager/attendance";
import ManagerReports from "@/pages/manager/reports";
import ManagerLeader from "@/pages/manager/leader";
import ManagerSettings from "@/pages/manager/settings";
import ManagerDailyReports from "@/pages/manager/daily-reports";
import AgentDashboard from "@/pages/agent/dashboard";
import AgentAttendance from "@/pages/agent/attendance";
import AgentClients from "@/pages/agent/clients";
import AgentPerformance from "@/pages/agent/performance";
import DailyReportPage from "@/pages/agent/daily-report";

// WebSocket connection component
function WebSocketConnection() {
  // This hook will handle the WebSocket connection when user is authenticated
  useWebSocket();
  return null;
}

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
      <ManagerRoute path="/manager/agents" component={ManagerAgents} />
      <ManagerRoute path="/manager/attendance" component={ManagerAttendance} />
      <ManagerRoute path="/manager/reports" component={ManagerReports} />
      <ManagerRoute path="/manager/leader" component={ManagerLeader} />
      <ManagerRoute path="/manager/settings" component={ManagerSettings} />
      <ManagerRoute path="/manager/daily-reports" component={ManagerDailyReports} />
      
      {/* Agent Routes */}
      <AgentRoute path="/agent/dashboard" component={AgentDashboard} />
      <AgentRoute path="/agent/attendance" component={AgentAttendance} />
      <AgentRoute path="/agent/clients" component={AgentClients} />
      <AgentRoute path="/agent/performance" component={AgentPerformance} />
      <AgentRoute path="/agent/daily-report" component={DailyReportPage} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Add viewport meta tag for proper mobile rendering
  useEffect(() => {
    // Ensure the viewport meta tag exists with proper settings
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.setAttribute('name', 'viewport');
      document.head.appendChild(viewportMeta);
    }
    viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover');
    
    // Add theme-color meta for mobile browsers
    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.setAttribute('name', 'theme-color');
      document.head.appendChild(themeColorMeta);
    }
    themeColorMeta.setAttribute('content', '#4f46e5'); // Primary color
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="mobile-no-overflow">
          <Router />
          <WebSocketConnection />
          <Toaster />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
