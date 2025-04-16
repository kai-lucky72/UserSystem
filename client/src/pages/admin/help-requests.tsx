import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpRequest } from "@shared/schema";
import { HelpCircle, CheckCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate, timeAgo } from "@/utils/date-utils";
import { useToast } from "@/hooks/use-toast";

export default function HelpRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const { data: unresolved, isLoading: loadingUnresolved } = useQuery<HelpRequest[]>({
    queryKey: ["/api/help-requests", false],
    queryFn: async () => {
      const res = await fetch("/api/help-requests?resolved=false");
      if (!res.ok) throw new Error("Failed to fetch help requests");
      return res.json();
    },
  });

  const { data: resolved, isLoading: loadingResolved } = useQuery<HelpRequest[]>({
    queryKey: ["/api/help-requests", true],
    queryFn: async () => {
      const res = await fetch("/api/help-requests?resolved=true");
      if (!res.ok) throw new Error("Failed to fetch resolved help requests");
      return res.json();
    },
  });

  const resolveRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      await apiRequest("PATCH", `/api/help-requests/${requestId}/resolve`);
    },
    onSuccess: () => {
      toast({
        title: "Help request resolved",
        description: "The help request has been marked as resolved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/help-requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to resolve request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleResolve = (requestId: number) => {
    resolveRequestMutation.mutate(requestId);
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
        <Header onToggleSidebar={() => setShowMobileSidebar(!showMobileSidebar)} title="Help Requests" />

        {/* Main content scrollable area */}
        <main className="flex-1 overflow-y-auto">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <h1 className="text-2xl font-semibold text-gray-900">Help Requests</h1>
              <p className="mt-1 text-sm text-gray-500">
                View and manage help requests from managers and agents.
              </p>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
              <Tabs defaultValue="unresolved" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="unresolved">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>Pending</span>
                      {unresolved && (
                        <Badge variant="secondary" className="ml-2">
                          {unresolved.length}
                        </Badge>
                      )}
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="resolved">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>Resolved</span>
                    </div>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="unresolved" className="mt-6">
                  {loadingUnresolved ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : unresolved && unresolved.length > 0 ? (
                    <div className="space-y-4">
                      {unresolved.map((request) => (
                        <Card key={request.id} className="overflow-hidden">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-4">
                                <HelpCircle className="h-8 w-8 text-red-500 mt-1" />
                                <div>
                                  <h3 className="text-lg font-medium">
                                    {request.title}
                                    <Badge variant="outline" className="ml-2 font-normal">
                                      ID: #{request.id}
                                    </Badge>
                                  </h3>
                                  <p className="mt-1 text-sm text-gray-500">
                                    From: {request.userName} ({request.userEmail})
                                  </p>
                                  <p className="mt-2 text-sm text-gray-700">{request.message}</p>
                                  <div className="mt-3 flex items-center text-xs text-gray-500">
                                    <span>Submitted {timeAgo(new Date(request.createdAt))}</span>
                                    <span className="mx-1">&bull;</span>
                                    <span>{formatDate(new Date(request.createdAt))}</span>
                                  </div>
                                </div>
                              </div>
                              <Button
                                onClick={() => handleResolve(request.id)}
                                disabled={resolveRequestMutation.isPending}
                                className="ml-4"
                              >
                                {resolveRequestMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                )}
                                Mark as Resolved
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <HelpCircle className="h-12 w-12 text-gray-400 mx-auto" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No pending help requests</h3>
                      <p className="mt-1 text-sm text-gray-500">All help requests have been resolved!</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="resolved" className="mt-6">
                  {loadingResolved ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : resolved && resolved.length > 0 ? (
                    <div className="space-y-4">
                      {resolved.map((request) => (
                        <Card key={request.id} className="overflow-hidden bg-gray-50">
                          <CardContent className="p-6">
                            <div className="flex items-start space-x-4">
                              <CheckCircle className="h-8 w-8 text-green-500 mt-1" />
                              <div className="flex-1">
                                <h3 className="text-lg font-medium text-gray-700">
                                  {request.title}
                                  <Badge variant="outline" className="ml-2 font-normal text-gray-600">
                                    ID: #{request.id}
                                  </Badge>
                                </h3>
                                <p className="mt-1 text-sm text-gray-500">
                                  From: {request.userName} ({request.userEmail})
                                </p>
                                <p className="mt-2 text-sm text-gray-600">{request.message}</p>
                                <div className="mt-3 flex items-center text-xs text-gray-500">
                                  <span>Resolved {timeAgo(new Date(request.resolvedAt || request.createdAt))}</span>
                                  <span className="mx-1">&bull;</span>
                                  <span>Submitted {formatDate(new Date(request.createdAt))}</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-gray-400 mx-auto" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No resolved help requests</h3>
                      <p className="mt-1 text-sm text-gray-500">Once requests are resolved, they will appear here.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}