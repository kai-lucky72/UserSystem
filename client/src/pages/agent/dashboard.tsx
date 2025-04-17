import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AddClientModal } from "@/components/modals/add-client-modal";
import { MarkAttendanceModal } from "@/components/modals/mark-attendance-modal";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Client, Attendance } from "@shared/schema";
import { Check, Clock, UserPlus, Eye, PenSquare, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate, formatTime, isAttendanceTimeValid } from "@/utils/date-utils";

// Define interfaces for API responses
interface AttendanceStatus {
  marked: boolean;
  time?: string;
  attendance?: Attendance;
}

interface AttendanceTimeFrame {
  startTime: string;
  endTime: string;
  id?: number;
  managerId?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface PerformanceReport {
  totalClients: number;
  recentClients: Client[];
  attendanceRate: string;
  averageResponseTime: string;
  clientsThisMonth: number;
}

export default function AgentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  
  // Clear cache when user changes
  useEffect(() => {
    if (user) {
      // Reset all queries in the cache to ensure data is not leaked between users
      queryClient.invalidateQueries();
    }
  }, [user?.id]);
  
  // Get current attendance status
  const { data: attendanceStatus, isLoading: isLoadingAttendance } = useQuery<AttendanceStatus>({
    queryKey: ["/api/attendance/status", user?.id],
    enabled: !!user,
  });

  // Get attendance timeframe set by the manager
  const { data: timeFrame, isLoading: isLoadingTimeFrame } = useQuery<AttendanceTimeFrame>({
    queryKey: ["/api/attendance-timeframe"],
  });

  // Get agent's clients
  const { data: clients, isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Get performance reports
  const { data: performanceReport, isLoading: isLoadingPerformance } = useQuery<PerformanceReport>({
    queryKey: ["/api/reports/performance"],
  });

  // Format time to 12-hour format (converting from 24-hour format)
  const formatTimeFrame = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: minutes > 0 ? '2-digit' : undefined,
      hour12: true
    });
  };

  // Update date and time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  // Handle opening the attendance modal
  const handleOpenAttendanceModal = () => {
    const startTime = timeFrame?.startTime || "06:00";
    const endTime = timeFrame?.endTime || "09:00";
    
    if (!isAttendanceTimeValid(new Date(), startTime, endTime)) {
      const startFormatted = formatTimeFrame(startTime);
      const endFormatted = formatTimeFrame(endTime);
      
      toast({
        title: "Outside valid hours",
        description: `Attendance can only be marked between ${startFormatted} and ${endFormatted}.`,
        variant: "destructive",
      });
      return;
    }
    
    setShowAttendanceModal(true);
  };

  // Get the recent clients (last 5)
  const recentClients = clients?.slice(-5).reverse() || [];

  // Format timeframe for display
  const startTimeFormatted = timeFrame ? formatTimeFrame(timeFrame.startTime) : "6:00 AM";
  const endTimeFormatted = timeFrame ? formatTimeFrame(timeFrame.endTime) : "9:00 AM";
  const timeFrameText = `Mark your daily attendance between ${startTimeFormatted} and ${endTimeFormatted}`;

  // Check if current time is within the valid attendance time range
  const isWithinTimeFrame = timeFrame ? 
    isAttendanceTimeValid(new Date(), timeFrame.startTime, timeFrame.endTime) : 
    isAttendanceTimeValid(new Date());

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
        <Header onToggleSidebar={() => setShowMobileSidebar(!showMobileSidebar)} title="Dashboard" />

        {/* Main content scrollable area */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {/* Date and time indicator */}
              <div className="mb-6">
                <p className="text-sm text-gray-500">
                  {formatDate(currentDateTime)} - {formatTime(currentDateTime)}
                </p>
              </div>
              
              {/* Attendance section */}
              <Card className="mb-6">
                <CardHeader className="px-6 flex-row justify-between items-center">
                  <div>
                    <CardTitle>Attendance</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">{timeFrameText}</p>
                  </div>
                  {attendanceStatus?.marked && (
                    <Badge variant="outline" className="bg-green-100 text-green-800 px-4 py-2">
                      Attendance Marked
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="border-t border-gray-200 px-6">
                  <div className="text-center">
                    {isLoadingAttendance || isLoadingTimeFrame ? (
                      <p className="text-sm text-gray-500">Loading attendance status...</p>
                    ) : attendanceStatus?.marked ? (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">You've marked your attendance at:</p>
                        <p className="text-lg font-medium text-gray-900">{attendanceStatus.time}</p>
                        {attendanceStatus.attendance?.sector && (
                          <p className="text-sm text-gray-600 mt-2">
                            <span className="font-medium">Sector:</span> {attendanceStatus.attendance.sector}
                          </p>
                        )}
                        {attendanceStatus.attendance?.location && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Location:</span> {attendanceStatus.attendance.location}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-500 mb-4">Current attendance status: Not marked</p>
                        <Button
                          onClick={handleOpenAttendanceModal}
                          disabled={!isWithinTimeFrame}
                          className="inline-flex items-center"
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Mark Attendance
                        </Button>
                        <div className="mt-3 text-sm text-gray-500">
                          <p>You'll need to provide your:</p>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>Working insurance sector</li>
                            <li>Current location</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Client section */}
              <Card className="mb-6">
                <CardHeader className="px-6">
                  <CardTitle>Client Management</CardTitle>
                  <p className="text-sm text-gray-500">Add and manage client information</p>
                </CardHeader>
                <CardContent className="border-t border-gray-200 px-6">
                  <Button 
                    onClick={() => setShowAddClientModal(true)}
                    disabled={!attendanceStatus?.marked}
                    className="inline-flex items-center"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add New Client
                  </Button>
                  {!attendanceStatus?.marked && (
                    <p className="text-sm text-amber-600 mt-2">
                      <Clock className="inline h-4 w-4 mr-1" />
                      You must mark attendance before adding clients
                    </p>
                  )}
                  
                  {/* Recent clients list */}
                  <div className="mt-6">
                    <h4 className="text-base font-medium text-gray-900">Recent Clients</h4>
                    {isLoadingClients ? (
                      <p className="text-sm text-gray-500 mt-2">Loading clients...</p>
                    ) : (
                      <ul className="mt-3 grid grid-cols-1 gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {recentClients.length > 0 ? (
                          recentClients.map((client) => (
                            <li key={client.id} className="col-span-1 bg-white rounded-lg shadow divide-y divide-gray-200">
                              <div className="w-full flex items-center justify-between p-6 space-x-6">
                                <div className="flex-1 truncate">
                                  <div className="flex items-center space-x-3">
                                    <h3 className="text-sm font-medium text-gray-900 truncate">
                                      {client.firstName} {client.lastName}
                                    </h3>
                                    <Badge variant="outline" className="bg-green-100 text-green-800">
                                      Active
                                    </Badge>
                                  </div>
                                  <p className="mt-1 text-sm text-gray-500 truncate">Phone: {client.phone}</p>
                                  <p className="mt-1 text-sm text-gray-500 truncate">
                                    Added: {formatDate(new Date(client.createdAt))}
                                  </p>
                                </div>
                              </div>
                              <div>
                                <div className="-mt-px flex divide-x divide-gray-200">
                                  <div className="w-0 flex-1 flex">
                                    <Button variant="ghost" className="relative -mr-px w-0 flex-1 inline-flex items-center justify-center py-4 text-sm text-gray-700 font-medium border border-transparent rounded-bl-lg hover:text-gray-500">
                                      <Eye className="h-4 w-4 text-gray-400" />
                                      <span className="ml-3">View</span>
                                    </Button>
                                  </div>
                                  <div className="-ml-px w-0 flex-1 flex">
                                    <Button variant="ghost" className="relative w-0 flex-1 inline-flex items-center justify-center py-4 text-sm text-gray-700 font-medium border border-transparent rounded-br-lg hover:text-gray-500">
                                      <PenSquare className="h-4 w-4 text-gray-400" />
                                      <span className="ml-3">Edit</span>
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))
                        ) : (
                          <li className="col-span-full text-center py-4 text-sm text-gray-500">
                            No clients added yet. Add your first client to get started.
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Performance section */}
              <Card>
                <CardHeader className="px-6">
                  <CardTitle>Performance Overview</CardTitle>
                  <p className="text-sm text-gray-500">Your performance metrics and reports</p>
                </CardHeader>
                <CardContent className="border-t border-gray-200 px-6">
                  {isLoadingPerformance ? (
                    <p className="text-sm text-gray-500">Loading performance data...</p>
                  ) : (
                    <dl className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                      <div className="px-4 py-5 bg-gray-50 shadow rounded-lg overflow-hidden sm:p-6">
                        <dt className="text-sm font-medium text-gray-500 truncate">Attendance Rate</dt>
                        <dd className="mt-1 text-3xl font-semibold text-gray-900">
                          {performanceReport?.attendanceRate || "94%"}
                        </dd>
                      </div>
                      <div className="px-4 py-5 bg-gray-50 shadow rounded-lg overflow-hidden sm:p-6">
                        <dt className="text-sm font-medium text-gray-500 truncate">Clients This Month</dt>
                        <dd className="mt-1 text-3xl font-semibold text-gray-900">
                          {performanceReport?.totalClients || "0"}
                        </dd>
                      </div>
                      <div className="px-4 py-5 bg-gray-50 shadow rounded-lg overflow-hidden sm:p-6">
                        <dt className="text-sm font-medium text-gray-500 truncate">Average Response Time</dt>
                        <dd className="mt-1 text-3xl font-semibold text-gray-900">
                          {performanceReport?.averageResponseTime || "1.2h"}
                        </dd>
                      </div>
                    </dl>
                  )}
                  <div className="mt-6 text-right">
                    <Button 
                      variant="link" 
                      className="text-primary hover:text-blue-600"
                      onClick={() => window.location.href = '/agent/performance'}
                    >
                      View detailed reports
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      <AddClientModal 
        open={showAddClientModal} 
        onOpenChange={setShowAddClientModal} 
      />
      
      <MarkAttendanceModal 
        open={showAttendanceModal}
        onOpenChange={setShowAttendanceModal}
        timeFrame={{
          startTime: timeFrame?.startTime || "06:00",
          endTime: timeFrame?.endTime || "09:00"
        }}
      />
    </div>
  );
}
