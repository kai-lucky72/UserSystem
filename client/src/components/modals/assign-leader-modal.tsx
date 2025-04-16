import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";
import { Loader2 } from "lucide-react";

interface AssignLeaderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const leaderSchema = z.object({
  agentId: z.string().min(1, "Please select an agent"),
});

type LeaderFormData = z.infer<typeof leaderSchema>;

export function AssignLeaderModal({ open, onOpenChange }: AssignLeaderModalProps) {
  const { toast } = useToast();
  
  const { data: agents, isLoading } = useQuery<User[]>({
    queryKey: ["/api/agents"],
    enabled: open,
  });
  
  const form = useForm<LeaderFormData>({
    resolver: zodResolver(leaderSchema),
    defaultValues: {
      agentId: "",
    },
  });

  const assignLeaderMutation = useMutation({
    mutationFn: async (data: LeaderFormData) => {
      const res = await apiRequest("POST", `/api/agents/${data.agentId}/assign-leader`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Agent assigned as leader successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      form.reset();
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

  const onSubmit = (data: LeaderFormData) => {
    assignLeaderMutation.mutate(data);
  };

  // Reset the form when the modal is opened
  useEffect(() => {
    if (open) {
      form.reset();
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Team Leader</DialogTitle>
          <DialogDescription>
            Select an agent to assign as the team leader. The current leader (if any) will be automatically replaced.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="agentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Agent</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an agent" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {agents?.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id.toString()}>
                            {agent.firstName} {agent.lastName} ({agent.workId})
                            {agent.isLeader ? " - Current Leader" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onClose()}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={assignLeaderMutation.isPending || !(agents && agents.length > 0)}
                >
                  {assignLeaderMutation.isPending ? "Assigning..." : "Assign as Leader"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
