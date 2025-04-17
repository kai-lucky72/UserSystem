import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatTime, isAttendanceTimeValid } from "@/utils/date-utils";

export default function AgentAttendance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const { data: attendanceStatus, isLoading } = useQuery({
    queryKey: ["/api/attendance/status", user?.id],
    enabled: !!user,
  });

  const markAttendanceMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Attendance marked successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
                        disabled={!isAttendanceTimeValid(new Date())}
                      >
                        Mark Attendance
                      </Button>
                      {!isAttendanceTimeValid(new Date()) && (
                        <p className="text-sm text-red-500 mt-2">
                          Attendance can only be marked between 6:00 AM and 9:00 AM
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
