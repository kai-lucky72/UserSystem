import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

  const assignLeaderMutation = useMutation({
    mutationFn: async () => {
      if (!agent) return;
      const res = await apiRequest("POST", `/api/agents/${agent.id}/leader`, {});
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign as Team Leader</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-500">
          Are you sure you want to assign {agent?.firstName} {agent?.lastName} as team leader? 
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
            disabled={assignLeaderMutation.isPending}
          >
            {assignLeaderMutation.isPending ? "Assigning..." : "Assign as Leader"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}