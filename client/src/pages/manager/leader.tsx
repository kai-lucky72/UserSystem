import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User } from "@shared/schema";
import { Crown } from "lucide-react";
import { AssignLeaderModal } from "@/components/modals/assign-leader-modal";

export default function ManagerLeader() {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<User | null>(null);

  const { data: agents } = useQuery<User[]>({
    queryKey: ["/api/agents"],
  });

  const leaderAgent = agents?.find(agent => agent.isLeader);

  const handleAssignLeader = () => {
    // Always set selectedAgent to null to force the dropdown to appear
    // This allows the user to choose from the list of agents
    setSelectedAgent(null);
    setShowAssignModal(true);
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
              <h1 className="text-2xl font-semibold text-gray-900">Agent Leader</h1>

              <div className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {leaderAgent ? (
                          <>
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="bg-blue-100 text-blue-600">
                                {leaderAgent.firstName[0]}{leaderAgent.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">
                                {leaderAgent.firstName} {leaderAgent.lastName}
                              </h3>
                              <p className="text-sm text-gray-500">{leaderAgent.workId}</p>
                            </div>
                          </>
                        ) : (
                          <p className="text-gray-500">No agent leader assigned</p>
                        )}
                      </div>
                      <Button onClick={handleAssignLeader}>
                        <Crown className="h-4 w-4 mr-2" />
                        {leaderAgent ? "Change Leader" : "Assign Leader"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      <AssignLeaderModal 
        open={showAssignModal} 
        onOpenChange={setShowAssignModal}
        agent={selectedAgent}
      />
    </div>
  );
}
