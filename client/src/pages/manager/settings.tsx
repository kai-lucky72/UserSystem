import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ClockIcon, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ManagerSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("09:00");

  // Fetch current attendance timeframe
  const { data: timeFrame, isLoading } = useQuery({
    queryKey: ["/api/attendance-timeframe"],
    queryFn: async () => {
      const res = await fetch("/api/attendance-timeframe");
      if (!res.ok) throw new Error("Failed to fetch attendance timeframe");
      return res.json();
    },
  });

  // Update values when data is loaded
  useEffect(() => {
    if (timeFrame) {
      setStartTime(timeFrame.startTime);
      setEndTime(timeFrame.endTime);
    }
  }, [timeFrame]);

  // Mutation to update attendance timeframe
  const updateTimeframeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/attendance-timeframe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startTime, endTime }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update attendance timeframe");
      }

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Attendance timeframe updated successfully",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance-timeframe"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateTimeframeMutation.mutate();
  };

  // Validate time format
  const isValidTimeFormat = (time: string) => {
    const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(time);
  };

  const isFormValid = isValidTimeFormat(startTime) && isValidTimeFormat(endTime);

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
        <Header onToggleSidebar={() => setShowMobileSidebar(!showMobileSidebar)} title="Settings" />

        {/* Main content scrollable area */}
        <main className="flex-1 overflow-y-auto">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <h1 className="text-2xl font-semibold text-gray-900">Manager Settings</h1>
              <p className="mt-1 text-sm text-gray-500">
                Configure settings for your team
              </p>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ClockIcon className="h-5 w-5 mr-2" />
                    Attendance Time Frame
                  </CardTitle>
                  <CardDescription>
                    Set the time window when your agents are allowed to mark attendance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="startTime">Start Time (24-hour format)</Label>
                          <Input
                            id="startTime"
                            placeholder="HH:MM"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
                            title="Enter time in 24-hour format (HH:MM)"
                          />
                          {!isValidTimeFormat(startTime) && startTime && (
                            <p className="text-sm text-red-500">Invalid time format. Use HH:MM (e.g., 06:00)</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="endTime">End Time (24-hour format)</Label>
                          <Input
                            id="endTime"
                            placeholder="HH:MM"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
                            title="Enter time in 24-hour format (HH:MM)"
                          />
                          {!isValidTimeFormat(endTime) && endTime && (
                            <p className="text-sm text-red-500">Invalid time format. Use HH:MM (e.g., 09:00)</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <p className="text-sm text-gray-500">
                          Agents will only be able to mark attendance between {startTime} and {endTime}.
                        </p>
                      </div>
                      
                      <Separator />
                      
                      <div className="flex justify-end">
                        <Button 
                          type="submit" 
                          disabled={!isFormValid || updateTimeframeMutation.isPending}
                          className="flex items-center"
                        >
                          {updateTimeframeMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
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