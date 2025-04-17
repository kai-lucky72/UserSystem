import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Phone, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

// Define interfaces for API responses
interface TeamLeader {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
}

interface ManagerInfo {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  teamLeader: TeamLeader | null;
}

export default function ManagerInfoPage() {
  const { user } = useAuth();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Fetch manager info
  const { data: managerInfo, isLoading, error } = useQuery<ManagerInfo>({
    queryKey: ["/api/manager-info"],
    queryFn: async () => {
      const res = await fetch("/api/manager-info");
      if (!res.ok) throw new Error("Failed to fetch manager info");
      return res.json();
    },
  });

  // Get initials for the avatar
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length > 1 
      ? `${parts[0].charAt(0)}${parts[1].charAt(0)}`
      : parts[0].charAt(0);
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
        <Header onToggleSidebar={() => setShowMobileSidebar(!showMobileSidebar)} title="Manager Information" />

        {/* Main content scrollable area */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">Your Management Team</h1>
            
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                Failed to load manager information. Please try again.
              </div>
            ) : managerInfo ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Manager Card */}
                <Card className="overflow-hidden">
                  <CardHeader className="bg-blue-50 border-b border-blue-100">
                    <CardTitle className="flex items-center">
                      <Users className="h-5 w-5 mr-2 text-blue-600" />
                      Your Manager
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center mb-6">
                      <Avatar className="h-20 w-20 mb-4 bg-blue-100">
                        <AvatarFallback className="text-blue-600 font-semibold text-xl">
                          {getInitials(managerInfo.name)}
                        </AvatarFallback>
                      </Avatar>
                      <h2 className="text-xl font-semibold">{managerInfo.name}</h2>
                      <Badge variant="outline" className="mt-1 bg-blue-50 text-blue-700">
                        Manager
                      </Badge>
                    </div>
                    
                    <div className="space-y-3 mt-6">
                      <div className="flex items-center text-gray-600">
                        <Mail className="h-5 w-5 mr-3 text-gray-400" />
                        <a href={`mailto:${managerInfo.email}`} className="text-blue-600 hover:underline">
                          {managerInfo.email}
                        </a>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Phone className="h-5 w-5 mr-3 text-gray-400" />
                        <a href={`tel:${managerInfo.phoneNumber}`} className="text-blue-600 hover:underline">
                          {managerInfo.phoneNumber}
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Team Leader Card */}
                {managerInfo.teamLeader ? (
                  <Card className="overflow-hidden">
                    <CardHeader className="bg-green-50 border-b border-green-100">
                      <CardTitle className="flex items-center">
                        <Users className="h-5 w-5 mr-2 text-green-600" />
                        Team Leader
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center mb-6">
                        <Avatar className="h-20 w-20 mb-4 bg-green-100">
                          <AvatarFallback className="text-green-600 font-semibold text-xl">
                            {getInitials(managerInfo.teamLeader.name)}
                          </AvatarFallback>
                        </Avatar>
                        <h2 className="text-xl font-semibold">{managerInfo.teamLeader.name}</h2>
                        <Badge variant="outline" className="mt-1 bg-green-50 text-green-700">
                          Team Leader
                        </Badge>
                      </div>
                      
                      <div className="space-y-3 mt-6">
                        <div className="flex items-center text-gray-600">
                          <Mail className="h-5 w-5 mr-3 text-gray-400" />
                          <a href={`mailto:${managerInfo.teamLeader.email}`} className="text-blue-600 hover:underline">
                            {managerInfo.teamLeader.email}
                          </a>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Phone className="h-5 w-5 mr-3 text-gray-400" />
                          <a href={`tel:${managerInfo.teamLeader.phoneNumber}`} className="text-blue-600 hover:underline">
                            {managerInfo.teamLeader.phoneNumber}
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="overflow-hidden">
                    <CardHeader className="bg-gray-50 border-b border-gray-100">
                      <CardTitle className="flex items-center">
                        <Users className="h-5 w-5 mr-2 text-gray-600" />
                        Team Leader
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 text-center py-12">
                      <p className="text-gray-500">
                        No team leader has been assigned for your team yet.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
} 