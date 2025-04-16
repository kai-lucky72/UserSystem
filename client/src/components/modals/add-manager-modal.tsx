import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { InsertUser, insertUserSchema, UserRole } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { z } from "zod";

interface AddManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Extend schema with validation
const managerSchema = insertUserSchema.extend({
  confirmPassword: z.string().optional(),
}).refine(data => !data.password || data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ManagerFormData = z.infer<typeof managerSchema>;

export function AddManagerModal({ open, onOpenChange }: AddManagerModalProps) {
  const { toast } = useToast();
  
  const form = useForm<ManagerFormData>({
    resolver: zodResolver(managerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      workId: "",
      nationalId: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
      role: UserRole.MANAGER,
    },
  });

  const addManagerMutation = useMutation({
    mutationFn: async (data: Omit<ManagerFormData, "confirmPassword">) => {
      const managerData: InsertUser = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        workId: data.workId,
        nationalId: data.nationalId,
        phoneNumber: data.phoneNumber,
        password: data.password || undefined,
        role: UserRole.MANAGER,
      };
      
      const res = await apiRequest("POST", "/api/managers", managerData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Manager added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/managers"] });
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

  const onSubmit = (data: ManagerFormData) => {
    // Remove confirmPassword field before sending
    const { confirmPassword, ...managerData } = data;
    addManagerMutation.mutate(managerData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Manager</DialogTitle>
          <DialogDescription>
            Enter the details of the new manager. All fields are required.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john.doe@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="nationalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>National ID</FormLabel>
                  <FormControl>
                    <Input placeholder="1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 234-567-8901" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="workId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work ID</FormLabel>
                  <FormControl>
                    <Input placeholder="MGR123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password (Optional)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirm password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={addManagerMutation.isPending}
              >
                {addManagerMutation.isPending ? "Adding..." : "Add Manager"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
