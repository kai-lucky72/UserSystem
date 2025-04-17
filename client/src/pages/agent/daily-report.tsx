import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Clock, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/utils/date-utils";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Client } from "@shared/schema";

export default function DailyReportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get today's clients
  const { data: clients, isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Filter clients to today's only
  const todayClients = clients?.filter(client => {
    const clientDate = new Date(client.createdAt).toDateString();
    const today = new Date().toDateString();
    return clientDate === today;
  }) || [];

  // Submit daily report mutation
  const submitReport = useMutation({
    mutationFn: async () => {
      if (!comment.trim()) {
        throw new Error("Please add a comment for your daily report");
      }
      
      if (todayClients.length === 0) {
        throw new Error("You haven't added any clients today to include in the report");
      }
      
      const res = await fetch("/api/daily-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ comment }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to submit daily report");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Report Submitted",
        description: "Your daily report has been submitted successfully",
      });
      setComment("");
      setIsSubmitting(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error Submitting Report",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    submitReport.mutate();
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
        <Header onToggleSidebar={() => setShowMobileSidebar(!showMobileSidebar)} title="Generate Daily Report" />

        {/* Main content scrollable area */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 flex justify-between items-center">
              <h1 className="text-2xl font-semibold text-gray-900">Daily Report</h1>
              <div className="flex items-center text-gray-600">
                <Clock className="h-5 w-5 mr-2" />
                <span>{formatDate(new Date())}</span>
              </div>
            </div>
            
            {/* Clients section */}
            <Card className="mb-6">
              <CardHeader className="bg-blue-50 border-b border-blue-100">
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-600" />
                  Today's Clients ({todayClients.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="py-4">
                {isLoadingClients ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : todayClients.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <p>You haven't added any clients today.</p>
                    <p className="mt-2">Add clients before generating a daily report.</p>
                  </div>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Phone
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {todayClients.map((client) => (
                          <tr key={client.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {client.firstName} {client.lastName}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{client.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{client.phone}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Comment section */}
            <Card>
              <CardHeader className="bg-green-50 border-b border-green-100">
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-green-600" />
                  Daily Comment
                </CardTitle>
              </CardHeader>
              <CardContent className="py-4">
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    <p>Add a comment about today's work, challenges, and achievements.</p>
                  </div>
                  <Textarea
                    placeholder="Today I focused on..."
                    className="min-h-[150px]"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter className="bg-gray-50 flex justify-end">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || todayClients.length === 0 || !comment.trim()}
                  className="flex items-center"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Submit Daily Report
                </Button>
              </CardFooter>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
} 