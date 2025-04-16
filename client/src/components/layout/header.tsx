import { useState } from "react";
import { Menu, Search, Bell } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserRole } from "@shared/schema";

interface HeaderProps {
  onToggleSidebar?: () => void;
  title?: string;
}

export function Header({ onToggleSidebar, title = "Dashboard" }: HeaderProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  if (!user) return null;
  
  // Get initials for the avatar
  const getInitials = () => {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
  };

  return (
    <header className="w-full">
      <div className="relative z-10 flex-shrink-0 h-16 bg-white border-b border-gray-200 shadow-sm flex">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
          onClick={onToggleSidebar}
        >
          <span className="sr-only">Open sidebar</span>
          <Menu />
        </Button>
        
        <div className="flex-1 flex justify-between px-4 md:px-0">
          <div className="flex-1 flex md:hidden items-center">
            <h1 className="text-lg font-medium text-gray-900">{title}</h1>
          </div>
          
          <div className="flex-1 flex md:ml-6">
            <div className="w-full md:ml-0 max-w-lg">
              <label htmlFor="search-field" className="sr-only">
                Search
              </label>
              <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center">
                  <Search className="h-5 w-5 ml-3" />
                </div>
                <Input
                  id="search-field"
                  className="block h-full w-full border-transparent py-2 pl-10 pr-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-transparent sm:text-sm"
                  placeholder={
                    user.role === UserRole.MANAGER
                      ? "Search agents"
                      : user.role === UserRole.ADMIN
                      ? "Search"
                      : "Search clients"
                  }
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div className="ml-4 flex items-center md:ml-6">
            <Button
              variant="ghost"
              size="icon"
              className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <span className="sr-only">View notifications</span>
              <Bell />
            </Button>
            
            {/* Profile dropdown (only visible on mobile) */}
            <div className="ml-3 relative md:hidden">
              <Avatar className="h-8 w-8">
                <AvatarFallback className={cn(
                  "font-semibold text-sm",
                  user.role === UserRole.ADMIN ? "bg-gray-500 text-white" :
                  user.role === UserRole.MANAGER ? "bg-green-500 text-white" :
                  "bg-blue-100 text-blue-600"
                )}>
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
