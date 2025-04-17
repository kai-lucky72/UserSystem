import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatTime, isAttendanceTimeValid } from "@/utils/date-utils";

// Define types
interface AttendanceStatus {
  marked: boolean;
  time?: string;
  attendance?: any;
}

interface AttendanceTimeFrame {
  startTime: string;
  endTime: string;
  id?: number;
  managerId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export default function AgentAttendance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Get current attendance status
  const { data: attendanceStatus, isLoading } = useQuery<AttendanceStatus>({
    queryKey: ["/api/attendance/status"],
  });

  // Get attendance timeframe set by the manager
  const { data: timeFrame, isLoading: isLoadingTimeFrame } = useQuery<AttendanceTimeFrame>({
    queryKey: ["/api/attendance-timeframe/agent"],
    queryFn: async () => {
      const res = await fetch("/api/attendance-timeframe/agent");
      if (!res.ok) throw new Error("Failed to fetch attendance timeframe");
      return res.json();
    },
  });

  // Format time to 12-hour format
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

  // Mark attendance mutation
  const markAttendanceMutation = useMutation({
    mutationFn: async () => {
      // Add needed fields for attendance
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sector: "General Insurance",
          location: "Main Office"
        }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to mark attendance");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/status"] });
    },
  });

  // Get formatted timeframe for display
  const startTimeFormatted = timeFrame ? formatTimeFrame(timeFrame.startTime) : "6:00 AM";
  const endTimeFormatted = timeFrame ? formatTimeFrame(timeFrame.endTime) : "9:00 AM";
  const timeFrameText = `Attendance can only be marked between ${startTimeFormatted} and ${endTimeFormatted}`;

  // Check if current time is within the valid attendance window
  const isWithinTimeFrame = timeFrame ? 
    isAttendanceTimeValid(new Date(), timeFrame.startTime, timeFrame.endTime) : 
    isAttendanceTimeValid(new Date());

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar className="hidden md:flex" />
      
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
        <Header onToggleSidebar={() => setShowMobileSidebar(!showMobileSidebar)} title="Attendance" />
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Card>
                <CardHeader>
                  <CardTitle>Today's Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div>Loading...</div>
                  ) : attendanceStatus?.marked ? (
                    <div className="text-green-600">
                      Attendance marked at {attendanceStatus.time}
                    </div>
                  ) : (
                    <div>
                      <Button 
                        onClick={() => markAttendanceMutation.mutate()}
                        disabled={!isWithinTimeFrame}
                      >
                        Mark Attendance
                      </Button>
                      {!isWithinTimeFrame && (
                        <p className="text-sm text-red-500 mt-2">
                          {timeFrameText}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
