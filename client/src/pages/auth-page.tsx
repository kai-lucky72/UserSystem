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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserRole } from "@shared/schema";

// For login form
const loginSchema = z.object({
  workId: z.string().min(1, "Work ID is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().optional(),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

// For registration form (unused in this app as users are added by admin/managers)
const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email format"),
  workId: z.string().min(1, "Work ID is required"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const [location, navigate] = useLocation();
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("login");

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

  // Register form
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      workId: "",
      password: "",
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
    loginMutation.mutate({
      workId: data.workId,
      email: data.email,
      password: data.password,
    });
  };

  const onRegisterSubmit = (data: RegisterFormData) => {
    // This would normally call a register mutation, but in this app
    // users can only be added by admins or managers
    alert("Registration is not allowed. Users are added manually by Admins (for Managers) or Managers (for Agents).");
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

        <Tabs defaultValue="login" className="w-full" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
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
                      type="email" 
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
                      placeholder="Enter your password if set"
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
          </TabsContent>
          
          <TabsContent value="register">
            <Card>
              <CardContent className="pt-6">
                <form className="space-y-4" onSubmit={registerForm.handleSubmit(onRegisterSubmit)}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input 
                        id="firstName" 
                        placeholder="John"
                        {...registerForm.register("firstName")}
                      />
                      {registerForm.formState.errors.firstName && (
                        <p className="text-sm text-red-500">{registerForm.formState.errors.firstName.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input 
                        id="lastName" 
                        placeholder="Doe"
                        {...registerForm.register("lastName")}
                      />
                      {registerForm.formState.errors.lastName && (
                        <p className="text-sm text-red-500">{registerForm.formState.errors.lastName.message}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="registerEmail">Email</Label>
                    <Input 
                      id="registerEmail" 
                      type="email" 
                      placeholder="john.doe@example.com"
                      {...registerForm.register("email")}
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-sm text-red-500">{registerForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="registerWorkId">Work ID</Label>
                    <Input 
                      id="registerWorkId" 
                      placeholder="e.g., ADM001, MGR123, or AGT001"
                      {...registerForm.register("workId")}
                    />
                    {registerForm.formState.errors.workId && (
                      <p className="text-sm text-red-500">{registerForm.formState.errors.workId.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="registerPassword">Password (Optional)</Label>
                    <Input 
                      id="registerPassword" 
                      type="password" 
                      placeholder="Create a password"
                      {...registerForm.register("password")}
                    />
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-red-500">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                  >
                    Register
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowHelpModal(true)}
          >
            Need help signing in?
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
