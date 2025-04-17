import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { z } from "zod";
import { HelpModal } from "@/components/modals/help-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { UserRole } from "@shared/schema";

// For login form
const loginSchema = z.object({
  workId: z.string().min(1, "Work ID is required"),
  email: z.string().min(1, "Email is required"),
  password: z.string().optional(),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const [location, navigate] = useLocation();
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      workId: "",
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      switch (user.role) {
        case UserRole.ADMIN:
          navigate("/admin/dashboard");
          break;
        case UserRole.MANAGER:
          navigate("/manager/dashboard");
          break;
        case UserRole.AGENT:
          navigate("/agent/dashboard");
          break;
        default:
          navigate("/");
      }
    }
  }, [user, navigate]);

  const onLoginSubmit = (data: LoginFormData) => {
    // Ensure we're sending an empty string rather than undefined for password
    const payload = {
      workId: data.workId,
      email: data.email,
      password: data.password || "" // Convert undefined/null to empty string
    };
    
    loginMutation.mutate(payload);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Team Management System
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form className="space-y-4" onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
              <div className="space-y-1">
                <Label htmlFor="workId">Work ID</Label>
                <Input 
                  id="workId" 
                  placeholder="Enter your Work ID"
                  {...loginForm.register("workId")}
                />
                {loginForm.formState.errors.workId && (
                  <p className="text-sm text-red-500">{loginForm.formState.errors.workId.message}</p>
                )}
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="text" 
                  placeholder="Enter your email"
                  {...loginForm.register("email")}
                />
                {loginForm.formState.errors.email && (
                  <p className="text-sm text-red-500">{loginForm.formState.errors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="password">Password (Optional)</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Only required if previously set"
                  {...loginForm.register("password")}
                />
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-red-500">{loginForm.formState.errors.password.message}</p>
                )}
              </div>
              
              <div className="flex items-center">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="rememberMe" 
                    {...loginForm.register("rememberMe")}
                  />
                  <Label htmlFor="rememberMe" className="text-sm">Remember me</Label>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-4 text-center">
          <Button 
            variant="link" 
            className="text-sm"
            onClick={() => setShowHelpModal(true)}
          >
            Need Help?
          </Button>
        </div>
      </div>

      <HelpModal
        open={showHelpModal}
        onOpenChange={setShowHelpModal}
      />
    </div>
  );
}
