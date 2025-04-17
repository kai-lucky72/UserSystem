import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, UserRole } from "@shared/schema";
import { UserPlus, Search, Trash2, Eye } from "lucide-react";
import { AddAgentModal } from "@/components/modals/add-agent-modal";
import { DeleteUserModal } from "@/components/modals/delete-user-modal";

export default function ManagerAgents() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: agents, isLoading } = useQuery<User[]>({
    queryKey: ["/api/agents"],
  });

  const handleDeleteAgent = (agent: User) => {
    setSelectedAgent(agent);
    setShowDeleteModal(true);
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
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-gray-900">Manage Agents</h1>
                <Button onClick={() => setShowAddModal(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Agent
                </Button>
              </div>

              <div className="mt-4 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  placeholder="Search agents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-xs pl-10"
                />
              </div>

              <div className="mt-6">
                <Card>
                  <CardContent className="p-0">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Work ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {agents?.map((agent) => (
                          <tr key={agent.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>
                                    {agent.firstName[0]}{agent.lastName[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {agent.firstName} {agent.lastName}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {agent.workId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {agent.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    // Handle view action
                                    const baseUrl = agent.role === UserRole.AGENT ? "/agent" : "/manager";
                                    window.location.href = `${baseUrl}/performance?userId=${agent.id}`;
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteAgent(agent)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      <AddAgentModal open={showAddModal} onOpenChange={(open) => setShowAddModal(open)} />
      <DeleteUserModal
        open={showDeleteModal}
        onOpenChange={(open) => setShowDeleteModal(open)}
        user={selectedAgent}
      />
    </div>
  );
}
