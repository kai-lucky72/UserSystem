import { useState } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function DashboardLayout({ children, title = "Dashboard" }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <Sidebar className="flex-1" />
        </div>
      </div>

      {/* Mobile sidebar */}
      <div 
        className={cn(
          "md:hidden fixed inset-0 z-40 flex transition-opacity ease-linear duration-300",
          sidebarOpen 
            ? "opacity-100" 
            : "opacity-0 pointer-events-none"
        )}
      >
        <div 
          className={cn(
            "fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity ease-linear duration-300",
            sidebarOpen 
              ? "opacity-100" 
              : "opacity-0 pointer-events-none"
          )}
          onClick={toggleSidebar}
        />
        
        <div className={cn(
          "relative flex-1 flex flex-col max-w-xs w-full bg-gray-800 transform transition ease-in-out duration-300",
          sidebarOpen 
            ? "translate-x-0" 
            : "-translate-x-full"
        )}>
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={toggleSidebar}
            >
              <span className="sr-only">Close sidebar</span>
              <svg
                className="h-6 w-6 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <Sidebar className="flex-1" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <Header onToggleSidebar={toggleSidebar} title={title} />
          
          {/* Mobile navigation menu */}
          <div className="ml-auto flex items-center md:hidden">
            <MobileNav />
          </div>
        </div>

        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <h1 className="text-2xl font-semibold text-gray-900 hidden md:block">{title}</h1>
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-4">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 