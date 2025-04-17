import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  UserCog, 
  Users, 
  HelpCircle, 
  BarChart3,
  Clock,
  User as UserIcon,
  LogOut,
  Settings,
  FileText,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserRole } from "@shared/schema";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const { user, logoutMutation } = useAuth();
  const [location, navigate] = useLocation();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setOpen(false);
        navigate("/auth");
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
          { href: "/manager/daily-reports", label: "View Daily Reports", icon: <FileText className="mr-3 h-5 w-5" /> },
          { href: "/manager/leader", label: "Agent Leader", icon: <UserCog className="mr-3 h-5 w-5" /> },
          { href: "/manager/settings", label: "Settings", icon: <Settings className="mr-3 h-5 w-5" /> },
        ];
      case UserRole.AGENT:
        return [
          { href: "/agent/dashboard", label: "Dashboard", icon: <LayoutDashboard className="mr-3 h-5 w-5" /> },
          { href: "/agent/attendance", label: "Attendance", icon: <Clock className="mr-3 h-5 w-5" /> },
          { href: "/agent/clients", label: "Clients", icon: <UserIcon className="mr-3 h-5 w-5" /> },
          { href: "/agent/performance", label: "Performance", icon: <BarChart3 className="mr-3 h-5 w-5" /> },
          { href: "/agent/manager-info", label: "Manager Info", icon: <UserCog className="mr-3 h-5 w-5" /> },
          { href: "/agent/daily-report", label: "Daily Report", icon: <FileText className="mr-3 h-5 w-5" /> },
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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[80%] sm:w-[350px] p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-4 border-b border-gray-200">
            <SheetTitle className="text-left">
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Menu
            </SheetTitle>
            <div className="flex items-center mt-4">
              <Avatar className="h-10 w-10">
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
                <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </div>
          </SheetHeader>
          
          <div className="flex-1 overflow-auto">
            <nav className="px-2 py-3 space-y-1">
              {navItems.map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    navigate(item.href);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center w-full px-3 py-2 text-sm font-medium rounded-md",
                    location === item.href
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="p-4 border-t border-gray-200">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {logoutMutation.isPending ? "Signing out..." : "Sign out"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
} 