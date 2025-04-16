
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

export default function ManagerAttendance() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: attendance } = useQuery({
    queryKey: ["/api/reports/attendance"],
  });

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

              <div className="mt-6">
                <Tabs defaultValue="daily">
                  <TabsList>
                    <TabsTrigger value="daily">Daily View</TabsTrigger>
                    <TabsTrigger value="weekly">Weekly View</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly View</TabsTrigger>
                  </TabsList>

                  <TabsContent value="daily" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Daily Attendance - {format(selectedDate, 'MMM dd, yyyy')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Agent
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Clock In
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Clock Out
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {attendance?.map((record: any) => (
                                <tr key={record.id}>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">
                                      {record.agentName}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {format(new Date(record.clockIn), 'HH:mm:ss')}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {record.clockOut ? format(new Date(record.clockOut), 'HH:mm:ss') : '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      record.status === 'on_time' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                      {record.status === 'on_time' ? 'On Time' : 'Late'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
