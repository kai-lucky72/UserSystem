import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";

interface AssignLeaderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: User | null;
}

export function AssignLeaderModal({ open, onOpenChange, agent }: AssignLeaderModalProps) {
  const { toast } = useToast();
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");

  // Always get all agents when the modal is open
  const { data: agents } = useQuery<User[]>({
    queryKey: ["/api/agents"],
    enabled: open
  });

  // Set default selected agent when modal opens or agent prop changes
  useEffect(() => {
    if (agent) {
      setSelectedAgentId(agent.id.toString());
    } else if (agents && agents.length > 0) {
      setSelectedAgentId(agents[0].id.toString());
    }
  }, [agent, agents, open]);

  const assignLeaderMutation = useMutation({
    mutationFn: async () => {
      const agentId = agent ? agent.id : parseInt(selectedAgentId);
      if (!agentId) return;
      
      const res = await apiRequest("POST", `/api/agents/${agentId}/assign-leader`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Agent assigned as leader successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAssign = () => {
    assignLeaderMutation.mutate();
  };

  // Find the currently selected agent in the list
  const selectedAgent = agent || 
    (selectedAgentId && agents ? agents.find(a => a.id.toString() === selectedAgentId) : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign as Team Leader</DialogTitle>
        </DialogHeader>

        {/* Always show agent selection dropdown when we have agents */}
        {agents && agents.length > 0 ? (
          <div className="py-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Agent
            </label>
            <Select 
              value={selectedAgentId} 
              onValueChange={setSelectedAgentId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id.toString()}>
                    {agent.firstName} {agent.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <p className="text-sm text-gray-500">
          Are you sure you want to assign {selectedAgent?.firstName} {selectedAgent?.lastName} as team leader? 
          This will remove leader status from any existing team leader.
        </p>

        <DialogFooter className="mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={assignLeaderMutation.isPending || !selectedAgentId}
          >
            {assignLeaderMutation.isPending ? "Assigning..." : "Assign as Leader"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}