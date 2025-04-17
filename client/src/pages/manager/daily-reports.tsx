import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, Download, CalendarIcon } from "lucide-react";
import { formatDateForInput } from "@/utils/date-utils";
import { useToast } from "@/hooks/use-toast";
import { Client } from "@shared/schema";

interface DailyReport {
  id: number;
  agentId: number;
  agentName: string;
  date: string;
  comment: string;
  clientsData: Client[];
  createdAt: string;
}

export default function DailyReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(formatDateForInput(new Date()));

  // Fetch reports based on selected date
  const { data: reports, isLoading } = useQuery<DailyReport[]>({
    queryKey: ["/api/daily-reports/manager", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/daily-reports/manager?date=${selectedDate}`);
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
  });

  // Download report as CSV
  const downloadReport = () => {
    if (!reports || reports.length === 0) {
      toast({
        title: "No data to download",
        description: "There are no reports available for the selected period.",
        variant: "destructive",
      });
      return;
    }

    // Prepare CSV headers
    let csv = "Agent Name,Client Name,Client Email,Client Phone,Client Address,Date Added\n";
    
    // Add all clients from all reports
    reports.forEach(report => {
      report.clientsData.forEach(client => {
        csv += `"${report.agentName}","${client.firstName} ${client.lastName}","${client.email}","${client.phone}","${client.address || ''}","${new Date(client.createdAt).toLocaleDateString()}"\n`;
      });
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `daily-report-${selectedDate}.csv`);
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast({
      title: "Report Downloaded",
      description: "Report has been downloaded successfully.",
    });
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
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setShowMobileSidebar(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <Sidebar />
          </div>
          <div className="flex-shrink-0 w-14"></div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top header */}
        <Header onToggleSidebar={() => setShowMobileSidebar(!showMobileSidebar)} title="Agent Daily Reports" />

        {/* Main content scrollable area */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <h1 className="text-2xl font-semibold text-gray-900">Daily Reports</h1>
              
              <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
                {/* Date Filter */}
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-5 w-5 text-gray-500" />
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                
                {/* Download Button */}
                <Button
                  variant="outline"
                  className="flex items-center"
                  onClick={downloadReport}
                  disabled={!reports || reports.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </div>
            </div>
            
            {/* Reports Section */}
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !reports || reports.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No reports available</p>
                    <p className="text-sm mt-1">There are no reports for the selected date.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {reports.map((report) => (
                  <Card key={report.id}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>{report.agentName}</CardTitle>
                        <span className="text-sm text-gray-500">
                          {new Date(report.date).toLocaleDateString()}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-medium mb-2">Agent Comment:</h3>
                          <p className="text-gray-700">{report.comment}</p>
                        </div>
                        
                        <div>
                          <h3 className="font-medium mb-2">Clients ({report.clientsData.length}):</h3>
                          <div className="border rounded overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {report.clientsData.map((client, index) => (
                                  <tr key={index}>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                      {client.firstName} {client.lastName}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap">{client.email}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">{client.phone}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
} 