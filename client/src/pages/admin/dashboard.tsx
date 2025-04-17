import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AddManagerModal } from "@/components/modals/add-manager-modal";
import { DeleteUserModal } from "@/components/modals/delete-user-modal";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, UserRole } from "@shared/schema";
import { UserCog, Users, HelpCircle, Eye, Trash2, Plus, BarChart3, FileText, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showAddManagerModal, setShowAddManagerModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedManager, setSelectedManager] = useState<User | null>(null);

  // Get all managers
  const { data: managers, isLoading } = useQuery<User[]>({
    queryKey: ["/api/managers"],
  });

  // Get agents count for each manager
  const { data: allAgents } = useQuery<User[]>({
    queryKey: ["/api/agents", "all"],
    queryFn: async () => {
      const res = await fetch("/api/agents?all=true");
      if (!res.ok) throw new Error("Failed to fetch all agents");
      return res.json();
    },
  });

  // Get pending help requests
  const { data: pendingHelpRequests } = useQuery({
    queryKey: ["/api/help-requests", false],
    queryFn: async () => {
      const res = await fetch("/api/help-requests?resolved=false");
      if (!res.ok) throw new Error("Failed to fetch help requests");
      return res.json();
    },
  });

  // Get active reports count
  const { data: activeReports, isLoading: isLoadingReports } = useQuery({
    queryKey: ["/api/reports/active"],
    queryFn: async () => {
      const res = await fetch("/api/reports/active");
      if (!res.ok) throw new Error("Failed to fetch active reports");
      return res.json();
    },
  });

  // Get monthly performance data for the performance chart
  const { data: monthlyData, isLoading: isLoadingMonthlyData } = useQuery({
    queryKey: ["/api/analytics/monthly"],
    queryFn: async () => {
      // Get the last 12 months of data
      const res = await fetch("/api/analytics/monthly?months=12");
      if (!res.ok) throw new Error("Failed to fetch monthly analytics");
      return res.json();
    },
  });

  // Get activity feed
  const { data: activityFeed, isLoading: isLoadingActivityFeed } = useQuery({
    queryKey: ["/api/activity-feed"],
    queryFn: async () => {
      const res = await fetch("/api/activity-feed?limit=4");
      if (!res.ok) throw new Error("Failed to fetch activity feed");
      return res.json();
    },
  });

  // Get stats from previous month for comparison
  const { data: previousMonthStats } = useQuery({
    queryKey: ["/api/analytics/previous-month"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/previous-month");
      if (!res.ok) throw new Error("Failed to fetch previous month stats");
      return res.json();
    },
  });

  // Prepare chart data based on real data or fallback to sensible defaults
  const getPerformanceData = () => {
    if (monthlyData && monthlyData.length > 0) {
      return monthlyData.map((item: any) => ({
        name: item.month,
        value: item.totalInteractions || 0,
        agents: item.activeAgents || 0,
        clients: item.newClients || 0
      }));
    }

    // Fallback to structured placeholder data if real data isn't available
    return Array.from({ length: 12 }).map((_, i) => {
      const month = format(subMonths(new Date(), 11 - i), 'MMM');
      return {
        name: month,
        value: 0,
        agents: 0,
        clients: 0
      };
    });
  };

  // Stats for the dashboard
  const stats = {
    managers: managers?.length || 0,
    agents: allAgents?.length || 0,
    reports: activeReports?.count || 0,
    helpRequests: pendingHelpRequests?.length || 0,
  };

  // Calculate changes from previous month
  const getChange = (current: number, key: string) => {
    if (!previousMonthStats) return 0;
    const previous = previousMonthStats[key] || 0;
    return current - previous;
  };

  // Count agents per manager
  const getAgentCountForManager = (managerId: number): number => {
    if (!allAgents) return 0;
    return allAgents.filter(agent => agent.managerId === managerId).length;
  };

  const handleDeleteManager = (manager: User) => {
    setSelectedManager(manager);
    setShowDeleteModal(true);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  // Format activity feed data
  const formatActivity = (activities: any[] = []) => {
    if (!activities || activities.length === 0) {
      return [{
        id: 1,
        message: "No recent activities",
        timestamp: new Date().toISOString(),
        type: "info"
      }];
    }
    return activities;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "manager_added":
        return <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>;
      case "agent_added":
        return <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>;
      case "system_update":
        return <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>;
      case "help_request_resolved":
        return <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>;
      default:
        return <div className="w-2 h-2 bg-gray-500 rounded-full mr-2"></div>;
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  if (!user || user.role !== UserRole.ADMIN) {
    return null;
  }

  const performanceData = getPerformanceData();

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Managers
            </CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.managers}</div>
            <p className="text-xs text-muted-foreground">
              {getChange(stats.managers, 'managers') > 0 ? '+' : ''}
              {getChange(stats.managers, 'managers')} from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Agents
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.agents}</div>
            <p className="text-xs text-muted-foreground">
              {getChange(stats.agents, 'agents') > 0 ? '+' : ''}
              {getChange(stats.agents, 'agents')} from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.reports}</div>
            <p className="text-xs text-muted-foreground">
              {getChange(stats.reports, 'reports') > 0 ? '+' : ''}
              {getChange(stats.reports, 'reports')} from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Help Requests
            </CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.helpRequests}</div>
            <p className="text-xs text-muted-foreground">
              {getChange(stats.helpRequests, 'helpRequests') > 0 ? '+' : ''}
              {getChange(stats.helpRequests, 'helpRequests')} from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 mt-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-7 lg:col-span-4">
          <CardHeader>
            <CardTitle>Monthly Performance Overview</CardTitle>
            <CardDescription>
              Total interactions, agent activity and new clients over the past 12 months
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2">
            {isLoadingMonthlyData ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData}>
                    <XAxis
                      dataKey="name"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                      formatter={(value: number) => [`${value}`, '']}
                    />
                    <Bar
                      name="Total Interactions"
                      dataKey="value"
                      fill="#4f46e5"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      name="Active Agents"
                      dataKey="agents"
                      fill="#84cc16"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      name="New Clients"
                      dataKey="clients"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-7 lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>
              Latest changes in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingActivityFeed ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {formatActivity(activityFeed).map((activity) => (
                  <div key={activity.id} className="flex items-center">
                    {getActivityIcon(activity.type)}
                    <p className="text-sm flex-1">{activity.message}</p>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <AddManagerModal 
        open={showAddManagerModal} 
        onOpenChange={setShowAddManagerModal} 
      />

      <DeleteUserModal 
        open={showDeleteModal} 
        onOpenChange={setShowDeleteModal} 
        user={selectedManager}
      />
    </DashboardLayout>
  );
}
