import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddClientModal } from "@/components/modals/add-client-modal";
import { formatDate } from "@/utils/date-utils";
import type { Client } from "@shared/schema";
import { Clock } from "lucide-react";

// Define interface for attendance status
interface AttendanceStatus {
  marked: boolean;
  time?: string;
  attendance?: any;
}

export default function AgentClients() {
  const { user } = useAuth();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Get current attendance status
  const { data: attendanceStatus, isLoading: isLoadingAttendance } = useQuery<AttendanceStatus>({
    queryKey: ["/api/attendance/status"],
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
        <Header onToggleSidebar={() => setShowMobileSidebar(!showMobileSidebar)} title="Clients" />
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">My Clients</h2>
                <div>
                  <Button 
                    onClick={() => setShowAddClientModal(true)}
                    disabled={!attendanceStatus?.marked}
                  >
                    Add Client
                  </Button>
                  {!attendanceStatus?.marked && (
                    <p className="text-sm text-amber-600 mt-2 flex items-center justify-end">
                      <Clock className="inline h-4 w-4 mr-1" />
                      Mark attendance first
                    </p>
                  )}
                </div>
              </div>
              
              {isLoading ? (
                <div>Loading...</div>
              ) : clients?.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    No clients added yet
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {clients?.map((client) => (
                    <Card key={client.id}>
                      <CardContent className="py-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">{client.firstName} {client.lastName}</h3>
                            <p className="text-sm text-gray-500">{client.email}</p>
                            <p className="text-sm text-gray-500">{client.phone}</p>
                          </div>
                          <div className="text-sm text-gray-500">
                            Added on {formatDate(new Date(client.createdAt))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      
      <AddClientModal 
        open={showAddClientModal} 
        onOpenChange={setShowAddClientModal} 
      />
    </div>
  );
}
