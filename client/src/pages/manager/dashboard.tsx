import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AddAgentModal } from "@/components/modals/add-agent-modal";
import { DeleteUserModal } from "@/components/modals/delete-user-modal";
import { AssignLeaderModal } from "@/components/modals/assign-leader-modal";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User } from "@shared/schema";
import { UserPlus, UserCheck, BarChart3, Eye, Trash2, Plus, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showAddAgentModal, setShowAddAgentModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignLeaderModal, setShowAssignLeaderModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<User | null>(null);

  const { data: agents, isLoading } = useQuery<User[]>({
    queryKey: ["/api/agents"],
  });

  // Get current date attendance statistics (would normally come from API)
  const { data: attendanceStats } = useQuery({
    queryKey: ["/api/reports/attendance"],
  });

  // Stats for dashboard summary cards
  const stats = {
    agents: agents?.length || 0,
    presentToday: attendanceStats ? agents?.filter(agent => 
      attendanceStats.some((a: any) => a.userId === agent.id)
    ).length : 0,
    clientInteractions: 32, // This would normally come from an API call
  };

  const handleDeleteAgent = (agent: User) => {
    setSelectedAgent(agent);
    setShowDeleteModal(true);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  const getStatusBadge = (agentId: number) => {
    if (!attendanceStats) return (
      <Badge variant="outline" className="bg-gray-100 text-gray-800">
        Unknown
      </Badge>
    );

    const isPresent = attendanceStats.some((a: any) => a.userId === agentId);
    
    return isPresent ? (
      <Badge variant="outline" className="bg-green-100 text-green-800">
        Present
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-red-100 text-red-800">
        Absent
      </Badge>
    );
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
        <Header onToggleSidebar={() => setShowMobileSidebar(!showMobileSidebar)} title="Dashboard" />

        {/* Main content scrollable area */}
        <main className="flex-1 overflow-y-auto">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {/* Dashboard summary cards */}
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {/* Agents card */}
                <Card>
                  <CardContent className="pt-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <UsersRound className="h-8 w-8 text-blue-500" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Agents</dt>
                          <dd className="text-lg font-medium text-gray-900">{stats.agents}</dd>
                        </dl>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-gray-50 px-5 py-3">
                    <Button variant="link" className="text-sm font-medium text-primary hover:text-blue-700">
                      View all
                    </Button>
                  </CardFooter>
                </Card>

                {/* Present today card */}
                <Card>
                  <CardContent className="pt-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <UserCheck className="h-8 w-8 text-green-500" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Present Today</dt>
                          <dd className="text-lg font-medium text-gray-900">{stats.presentToday}</dd>
                        </dl>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-gray-50 px-5 py-3">
                    <Button variant="link" className="text-sm font-medium text-primary hover:text-blue-700">
                      View details
                    </Button>
                  </CardFooter>
                </Card>

                {/* Client interactions card */}
                <Card>
                  <CardContent className="pt-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <BarChart3 className="h-8 w-8 text-purple-500" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Client Interactions</dt>
                          <dd className="text-lg font-medium text-gray-900">{stats.clientInteractions}</dd>
                        </dl>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-gray-50 px-5 py-3">
                    <Button variant="link" className="text-sm font-medium text-primary hover:text-blue-700">
                      View reports
                    </Button>
                  </CardFooter>
                </Card>
              </div>

              {/* Agent management section */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Manage Agents</h2>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline"
                      onClick={() => setShowAssignLeaderModal(true)}
                      className="inline-flex items-center"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Assign Leader
                    </Button>
                    <Button 
                      onClick={() => setShowAddAgentModal(true)}
                      className="inline-flex items-center"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Agent
                    </Button>
                  </div>
                </div>
                
                {/* Agent list */}
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                      <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                        <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Name
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Work ID
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Email
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Status
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Role
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {agents && agents.length > 0 ? (
                                agents.map((agent) => (
                                  <tr key={agent.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10">
                                          <Avatar className="h-10 w-10 bg-blue-100">
                                            <AvatarFallback className="text-blue-600 font-semibold">
                                              {getInitials(agent.firstName, agent.lastName)}
                                            </AvatarFallback>
                                          </Avatar>
                                        </div>
                                        <div className="ml-4">
                                          <div className="text-sm font-medium text-gray-900">
                                            {agent.firstName} {agent.lastName}
                                          </div>
                                          <div className="text-sm text-gray-500">
                                            {agent.phoneNumber}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">{agent.workId}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">{agent.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      {getStatusBadge(agent.id)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {agent.isLeader ? (
                                        <Badge variant="outline" className="bg-indigo-100 text-indigo-800">
                                          Leader
                                        </Badge>
                                      ) : (
                                        "Agent"
                                      )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      <div className="flex space-x-2">
                                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="text-red-600 hover:text-red-800"
                                          onClick={() => handleDeleteAgent(agent)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                                    No agents found. Add an agent to get started.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      <AddAgentModal 
        open={showAddAgentModal} 
        onOpenChange={setShowAddAgentModal} 
      />

      <DeleteUserModal 
        open={showDeleteModal} 
        onOpenChange={setShowDeleteModal} 
        user={selectedAgent}
      />

      <AssignLeaderModal
        open={showAssignLeaderModal}
        onOpenChange={setShowAssignLeaderModal}
      />
    </div>
  );
}
