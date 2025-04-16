import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User, UserRole } from "@shared/schema";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DeleteUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

export function DeleteUserModal({ open, onOpenChange, user }: DeleteUserModalProps) {
  const { toast } = useToast();

  const isManager = user?.role === UserRole.MANAGER;
  
  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      
      const endpoint = isManager 
        ? `/api/managers/${user.id}` 
        : `/api/agents/${user.id}`;
      
      const res = await apiRequest("DELETE", endpoint);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: `${isManager ? "Manager" : "Agent"} deleted successfully.`,
      });
      
      // Invalidate appropriate queries
      if (isManager) {
        queryClient.invalidateQueries({ queryKey: ["/api/managers"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      }
      
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

  const handleDelete = () => {
    deleteUserMutation.mutate();
  };

  if (!user) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
          <AlertDialogDescription>
            {isManager 
              ? "Are you sure you want to delete this manager? This action will also remove all agents associated with this manager."
              : "Are you sure you want to delete this agent? This action cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            disabled={deleteUserMutation.isPending}
          >
            {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
