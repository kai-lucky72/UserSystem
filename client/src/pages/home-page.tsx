import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { UserRole } from "@shared/schema";

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // Redirect based on user role
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
            navigate("/auth");
        }
      } else {
        // Not logged in
        navigate("/auth");
      }
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  // This component should not render anything as it will redirect
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="ml-2 text-gray-600">Redirecting...</span>
    </div>
  );
}
