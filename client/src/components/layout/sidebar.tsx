import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  UserCog, 
  Users, 
  HelpCircle, 
  BarChart3,
  Clock,
  User as UserIcon,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserRole } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();

  if (!user) return null;

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        // Force navigation to auth page after logout
        navigate("/auth");
      },
      onError: (error) => {
        toast({
          title: "Logout failed",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };

  // Determine navigation items based on user role
  const getNavItems = () => {
    switch (user.role) {
      case UserRole.ADMIN:
        return [
          { href: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard className="mr-3 h-5 w-5" /> },
          { href: "/admin/managers", label: "Manage Managers", icon: <UserCog className="mr-3 h-5 w-5" /> },
          { href: "/admin/users", label: "View All Users", icon: <Users className="mr-3 h-5 w-5" /> },
          { href: "/admin/reports", label: "Reports", icon: <BarChart3 className="mr-3 h-5 w-5" /> },
          { href: "/admin/help-requests", label: "Help Requests", icon: <HelpCircle className="mr-3 h-5 w-5" /> },
        ];
      case UserRole.MANAGER:
        return [
          { href: "/manager/dashboard", label: "Dashboard", icon: <LayoutDashboard className="mr-3 h-5 w-5" /> },
          { href: "/manager/agents", label: "Manage Agents", icon: <Users className="mr-3 h-5 w-5" /> },
          { href: "/manager/attendance", label: "Attendance", icon: <Clock className="mr-3 h-5 w-5" /> },
          { href: "/manager/reports", label: "Performance Reports", icon: <BarChart3 className="mr-3 h-5 w-5" /> },
          { href: "/manager/leader", label: "Agent Leader", icon: <UserCog className="mr-3 h-5 w-5" /> },
        ];
      case UserRole.AGENT:
        return [
          { href: "/agent/dashboard", label: "Dashboard", icon: <LayoutDashboard className="mr-3 h-5 w-5" /> },
          { href: "/agent/attendance", label: "Attendance", icon: <Clock className="mr-3 h-5 w-5" /> },
          { href: "/agent/clients", label: "Clients", icon: <UserIcon className="mr-3 h-5 w-5" /> },
          { href: "/agent/performance", label: "Performance", icon: <BarChart3 className="mr-3 h-5 w-5" /> },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  // Get initials for the avatar
  const getInitials = () => {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
  };

  // Get dashboard link based on role
  const getDashboardLink = () => {
    switch (user.role) {
      case UserRole.ADMIN:
        return "/admin/dashboard";
      case UserRole.MANAGER:
        return "/manager/dashboard";
      case UserRole.AGENT:
        return "/agent/dashboard";
      default:
        return "/";
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-gray-800", className)}>
      <div className="flex items-center h-16 px-4 bg-gray-900">
        <Link href={getDashboardLink()}>
          <div className="text-lg font-bold text-white cursor-pointer">
            {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Dashboard
          </div>
        </Link>
      </div>

      <div className="flex flex-col flex-grow">
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item, index) => (
            <div
              onClick={() => navigate(item.href)}
              className={cn(
                "flex items-center px-2 py-2 text-sm font-medium rounded-md group cursor-pointer",
                location === item.href
                  ? "text-white bg-gray-900"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              )}
            >
              {item.icon}
              {item.label}
              {location === item.href && (
                <ChevronRight className="ml-auto h-4 w-4" />
              )}
            </div>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center">
          <Avatar className="h-10 w-10 border-2 border-gray-700">
            <AvatarFallback className={cn(
              "font-semibold",
              user.role === UserRole.ADMIN ? "bg-gray-500 text-white" :
              user.role === UserRole.MANAGER ? "bg-green-500 text-white" :
              "bg-blue-100 text-blue-600"
            )}>
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">{user.firstName} {user.lastName}</p>
            <Button 
              variant="link" 
              className="p-0 h-auto text-xs font-medium text-gray-300 hover:text-white"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-3 w-3 mr-1" />
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}