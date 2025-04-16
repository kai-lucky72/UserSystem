import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Attendance, Client, UserRole } from "@shared/schema";
import { BarChart3, Users, CheckCircle2, UserCog } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatDate } from "@/utils/date-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Reports() {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));

  // Get all managers
  const { data: managers, isLoading: loadingManagers } = useQuery<User[]>({
    queryKey: ["/api/managers"],
  });

  // Get attendance report for the selected date
  const { data: attendanceData, isLoading: loadingAttendance } = useQuery<Attendance[]>({
    queryKey: ["/api/reports/attendance", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/reports/attendance?date=${selectedDate}`);
      if (!res.ok) throw new Error("Failed to fetch attendance data");
      return res.json();
    },
  });

  // Get all clients for report
  const { data: clients, isLoading: loadingClients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const res = await fetch("/api/clients");
      if (!res.ok) throw new Error("Failed to fetch clients");
      return res.json();
    },
  });

  // Format attendance data for chart
  const formatAttendanceData = () => {
    if (!attendanceData || !managers) return [];
    
    // Group by manager
    const managerAttendance: Record<number, { onTime: number, total: number, manager: string }> = {};
    
    // Initialize with manager names
    managers.forEach(manager => {
      managerAttendance[manager.id] = {
        onTime: 0,
        total: 0,
        manager: `${manager.firstName} ${manager.lastName}`
      };
    });
    
    attendanceData.forEach(record => {
      const user = managers.find(m => m.id === record.userId);
      if (user && user.managerId && managerAttendance[user.managerId]) {
        managerAttendance[user.managerId].total += 1;
        
        // Check if on time (before 9 AM)
        const recordTime = new Date(record.date);
        if (recordTime.getHours() < 9) {
          managerAttendance[user.managerId].onTime += 1;
        }
      }
    });
    
    return Object.values(managerAttendance).map(data => ({
      manager: data.manager,
      onTime: data.onTime,
      late: data.total - data.onTime,
      attendanceRate: data.total > 0 ? Math.round((data.onTime / data.total) * 100) : 0
    }));
  };

  // Format client acquisition data for chart
  const formatClientData = () => {
    if (!clients || !managers) return [];
    
    // Group by manager
    const managerClients: Record<number, { count: number, manager: string }> = {};
    
    // Initialize with manager names
    managers.forEach(manager => {
      managerClients[manager.id] = {
        count: 0,
        manager: `${manager.firstName} ${manager.lastName}`
      };
    });
    
    clients.forEach(client => {
      const agent = managers.find(m => m.id === client.agentId);
      if (agent && agent.managerId && managerClients[agent.managerId]) {
        managerClients[agent.managerId].count += 1;
      }
    });
    
    return Object.values(managerClients);
  };

  const chartData = formatAttendanceData();
  const clientData = formatClientData();
  
  // Calculate overall statistics
  const stats = {
    totalManagers: managers?.length || 0,
    totalClients: clients?.length || 0,
    attendanceRate: chartData.length > 0
      ? Math.round(chartData.reduce((acc, item) => acc + item.attendanceRate, 0) / chartData.length)
      : 0,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <Sidebar />
        </div>
      </div>

      {/* Mobile sidebar */}
      {showMobileSidebar && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setShowMobileSidebar(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-gray-800">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <Button
                variant="ghost"
                size="icon"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setShowMobileSidebar(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
            <Sidebar />
          </div>
          <div className="flex-shrink-0 w-14"></div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top header */}
        <Header onToggleSidebar={() => setShowMobileSidebar(!showMobileSidebar)} title="Reports" />

        {/* Main content scrollable area */}
        <main className="flex-1 overflow-y-auto">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <h1 className="text-2xl font-semibold text-gray-900">Performance Reports</h1>
              <p className="mt-1 text-sm text-gray-500">
                View performance metrics across the organization.
              </p>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
              {/* Stats overview */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
                <Card>
                  <CardContent className="pt-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <UserCog className="h-8 w-8 text-blue-500" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Managers</dt>
                          <dd className="text-lg font-medium text-gray-900">{stats.totalManagers}</dd>
                        </dl>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Users className="h-8 w-8 text-green-500" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Clients</dt>
                          <dd className="text-lg font-medium text-gray-900">{stats.totalClients}</dd>
                        </dl>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <CheckCircle2 className="h-8 w-8 text-purple-500" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Average Attendance Rate</dt>
                          <dd className="text-lg font-medium text-gray-900">{stats.attendanceRate}%</dd>
                        </dl>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="attendance" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="attendance">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Attendance Reports</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="clients">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>Client Acquisition</span>
                    </div>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="attendance" className="mt-6">
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>Team Attendance</CardTitle>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">Date:</span>
                          <input
                            type="date"
                            className="border rounded px-3 py-1 text-sm"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {loadingAttendance || loadingManagers ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={400}>
                          <BarChart
                            data={chartData}
                            margin={{
                              top: 20,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="manager" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="onTime" name="On Time" fill="#10b981" />
                            <Bar dataKey="late" name="Late" fill="#f97316" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center py-8">
                          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No attendance data available</h3>
                          <p className="mt-1 text-sm text-gray-500">Try selecting a different date.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="clients" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Client Acquisition by Team</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loadingClients || loadingManagers ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : clientData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={400}>
                          <BarChart
                            data={clientData}
                            margin={{
                              top: 20,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="manager" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" name="Clients" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center py-8">
                          <Users className="h-12 w-12 text-gray-400 mx-auto" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No client data available</h3>
                          <p className="mt-1 text-sm text-gray-500">Clients added by agents will appear here.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}