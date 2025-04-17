import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AddManagerModal } from "@/components/modals/add-manager-modal";
import { DeleteUserModal } from "@/components/modals/delete-user-modal";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, UserRole } from "@shared/schema";
import { UserCog, Users, HelpCircle, Eye, Trash2, Plus, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showAddManagerModal, setShowAddManagerModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedManager, setSelectedManager] = useState<User | null>(null);

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

  // Mock statistics for the dashboard
  const stats = {
    managers: managers?.length || 0,
    agents: allAgents?.length || 0, // Use actual count from API instead of hardcoded value
    helpRequests: pendingHelpRequests?.length || 0, // Use actual count from API
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

  if (!user || user.role !== UserRole.ADMIN) {
    return null;
  }

  // Example data for charts
  const data = [
    {
      name: "Jan",
      total: Math.floor(Math.random() * 5000) + 1000,
    },
    {
      name: "Feb",
      total: Math.floor(Math.random() * 5000) + 1000,
    },
    {
      name: "Mar",
      total: Math.floor(Math.random() * 5000) + 1000,
    },
    {
      name: "Apr",
      total: Math.floor(Math.random() * 5000) + 1000,
    },
    {
      name: "May",
      total: Math.floor(Math.random() * 5000) + 1000,
    },
    {
      name: "Jun",
      total: Math.floor(Math.random() * 5000) + 1000,
    },
    {
      name: "Jul",
      total: Math.floor(Math.random() * 5000) + 1000,
    },
    {
      name: "Aug",
      total: Math.floor(Math.random() * 5000) + 1000,
    },
    {
      name: "Sep",
      total: Math.floor(Math.random() * 5000) + 1000,
    },
    {
      name: "Oct",
      total: Math.floor(Math.random() * 5000) + 1000,
    },
    {
      name: "Nov",
      total: Math.floor(Math.random() * 5000) + 1000,
    },
    {
      name: "Dec",
      total: Math.floor(Math.random() * 5000) + 1000,
    },
  ];

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
              +{stats.managers - (managers?.length || 0)} from last month
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
              +{stats.agents - (allAgents?.length || 0)} from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Reports</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">32</div>
            <p className="text-xs text-muted-foreground">
              +12 from last month
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
              -{stats.helpRequests - (pendingHelpRequests?.length || 0)} from last month
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 mt-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-7 lg:col-span-4">
          <CardHeader>
            <CardTitle>Monthly Overview</CardTitle>
          </CardHeader>
          <CardContent className="px-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
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
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Bar
                    dataKey="total"
                    fill="#4f46e5"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
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
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <p className="text-sm">New manager John Doe added</p>
                <span className="ml-auto text-xs text-muted-foreground">Just now</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                <p className="text-sm">5 new agents registered</p>
                <span className="ml-auto text-xs text-muted-foreground">2h ago</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                <p className="text-sm">System update completed</p>
                <span className="ml-auto text-xs text-muted-foreground">1d ago</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                <p className="text-sm">3 help requests resolved</p>
                <span className="ml-auto text-xs text-muted-foreground">2d ago</span>
              </div>
            </div>
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
