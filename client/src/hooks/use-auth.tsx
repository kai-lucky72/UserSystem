import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, LoginData, HelpRequestData } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  helpRequestMutation: UseMutationResult<any, Error, HelpRequestData>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        // Ensure password is always present as at least an empty string
        const fixedCredentials = {
          ...credentials,
          password: credentials.password || ""
        };
        
        // Log the request for debugging
        console.log('Sending login request with credentials:', {
          workId: fixedCredentials.workId,
          email: fixedCredentials.email,
          password: fixedCredentials.password ? '[REDACTED]' : '(empty)'
        });
        
        const res = await apiRequest("POST", "/api/login", fixedCredentials);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Authentication failed");
        }
        return await res.json();
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("Login failed. Please check your credentials.");
      }
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.firstName}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message === "Missing credentials" 
          ? "Please enter your Work ID and Email" 
          : error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const helpRequestMutation = useMutation({
    mutationFn: async (data: HelpRequestData) => {
      const res = await apiRequest("POST", "/api/help-request", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Help request submitted",
        description: "An administrator will contact you shortly.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Request failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        helpRequestMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
