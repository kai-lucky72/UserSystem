import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Briefcase, MapPin } from "lucide-react";
import { User } from "@shared/schema";

interface AttendanceRecord {
  id: number;
  userId: number;
  date: string;
  agentName?: string;
  sector?: string;
  location?: string;
}

export default function ManagerAttendance() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filteredDate, setFilteredDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Get all agents managed by this manager
  const { data: agents, isLoading: loadingAgents } = useQuery<User[]>({
    queryKey: ["/api/agents"],
  });

  // Get attendance report for the selected date
  const { data: attendance, isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/reports/attendance", filteredDate],
    queryFn: async () => {
      const res = await fetch(`/api/reports/attendance?date=${filteredDate}`);
      if (!res.ok) throw new Error("Failed to fetch attendance data");
      return res.json();
    },
  });

  // Update the filtered date when selected date changes
  useEffect(() => {
    setFilteredDate(format(selectedDate, 'yyyy-MM-dd'));
  }, [selectedDate]);

  const formatAttendanceTime = (dateStr: string) => {
    return format(new Date(dateStr), 'h:mm a');
  };

  // Function to handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    setSelectedDate(newDate);
  };

  // Create a list of all agents whether they've marked attendance or not
  const getAttendanceList = () => {
    if (!agents || !attendance) return [];

    // Create a map of attendance records by userId for quick lookup
    const attendanceMap = new Map();
    attendance.forEach(record => {
      attendanceMap.set(record.userId, record);
    });

    // Return full list of agents with their attendance status
    return agents.map(agent => {
      const attendanceRecord = attendanceMap.get(agent.id);
      
      return {
        id: agent.id,
        name: `${agent.firstName} ${agent.lastName}`,
        time: attendanceRecord ? formatAttendanceTime(attendanceRecord.date) : null,
        status: attendanceRecord ? 'Present' : 'Absent',
        sector: attendanceRecord?.sector || 'N/A',
        location: attendanceRecord?.location || 'N/A',
        attendanceId: attendanceRecord?.id
      };
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <Sidebar />
        </div>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <h1 className="text-2xl font-semibold text-gray-900">Attendance Management</h1>

              <Tabs defaultValue="daily">
                <TabsList>
                  <TabsTrigger value="daily">Daily View</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly View</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly View</TabsTrigger>
                </TabsList>

                <TabsContent value="daily" className="mt-6">
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>Daily Attendance - {format(selectedDate, 'MMM dd, yyyy')}</CardTitle>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">Date:</span>
                          <input
                            type="date"
                            className="border rounded px-3 py-1 text-sm"
                            value={format(selectedDate, 'yyyy-MM-dd')}
                            onChange={handleDateChange}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {isLoading || loadingAgents ? (
                          <p className="text-center py-4 text-gray-500">Loading attendance records...</p>
                        ) : getAttendanceList().length > 0 ? (
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Agent
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Time
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Sector
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Location
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {getAttendanceList().map((agent) => (
                                <tr key={agent.id}>
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">
                                      {agent.name}
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {agent.time || 'Not marked'}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <div className="flex items-center text-sm text-gray-500">
                                      <Briefcase className="h-4 w-4 mr-1 text-gray-400" />
                                      <span>{agent.sector}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <div className="flex items-center text-sm text-gray-500">
                                      <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                                      <span>{agent.location}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      agent.status === 'Present' 
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {agent.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p className="text-center py-4 text-gray-500">No attendance records found for today.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="weekly" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Weekly Attendance Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-center py-4 text-gray-500">Weekly attendance view is coming soon.</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="monthly" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Monthly Attendance Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-center py-4 text-gray-500">Monthly attendance view is coming soon.</p>
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
