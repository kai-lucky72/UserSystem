import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AddManagerModal } from "@/components/modals/add-manager-modal";
import { DeleteUserModal } from "@/components/modals/delete-user-modal";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, UserRole } from "@shared/schema";
import { UserCog, Users, HelpCircle, Eye, Trash2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showAddManagerModal, setShowAddManagerModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedManager, setSelectedManager] = useState<User | null>(null);

  const { data: managers, isLoading } = useQuery<User[]>({
    queryKey: ["/api/managers"],
  });

  // Mock statistics for the dashboard
  const stats = {
    managers: managers?.length || 0,
    agents: 47, // This would normally come from an API call
    helpRequests: 3, // This would normally come from an API call
  };

  const handleDeleteManager = (manager: User) => {
    setSelectedManager(manager);
    setShowDeleteModal(true);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <Sidebar />
        </div>
      </div>

      {/* Mobile sidebar */}
      {showMobileSidebar && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setShowMobileSidebar(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-gray-800">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <Button
                variant="ghost"
                size="icon"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setShowMobileSidebar(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
            <Sidebar />
          </div>
          <div className="flex-shrink-0 w-14"></div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top header */}
        <Header onToggleSidebar={() => setShowMobileSidebar(!showMobileSidebar)} title="Dashboard" />

        {/* Main content scrollable area */}
        <main className="flex-1 overflow-y-auto">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {/* Dashboard summary cards */}
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {/* Managers card */}
                <Card>
                  <CardContent className="pt-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <UserCog className="h-8 w-8 text-blue-500" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Managers</dt>
                          <dd className="text-lg font-medium text-gray-900">{stats.managers}</dd>
                        </dl>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-gray-50 px-5 py-3">
                    <Button variant="link" className="text-sm font-medium text-primary hover:text-blue-700">
                      View all
                    </Button>
                  </CardFooter>
                </Card>

                {/* Agents card */}
                <Card>
                  <CardContent className="pt-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Users className="h-8 w-8 text-green-500" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Agents</dt>
                          <dd className="text-lg font-medium text-gray-900">{stats.agents}</dd>
                        </dl>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-gray-50 px-5 py-3">
                    <Button variant="link" className="text-sm font-medium text-primary hover:text-blue-700">
                      View all
                    </Button>
                  </CardFooter>
                </Card>

                {/* Help requests card */}
                <Card>
                  <CardContent className="pt-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <HelpCircle className="h-8 w-8 text-red-500" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Pending Help Requests</dt>
                          <dd className="text-lg font-medium text-gray-900">{stats.helpRequests}</dd>
                        </dl>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-gray-50 px-5 py-3">
                    <Button variant="link" className="text-sm font-medium text-primary hover:text-blue-700">
                      Resolve
                    </Button>
                  </CardFooter>
                </Card>
              </div>

              {/* Manager management section */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Manage Managers</h2>
                  <Button 
                    onClick={() => setShowAddManagerModal(true)}
                    className="inline-flex items-center"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Manager
                  </Button>
                </div>
                
                {/* Manager list */}
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                      <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                        <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Name
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Work ID
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Email
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Agents
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {managers && managers.length > 0 ? (
                                managers.map((manager) => (
                                  <tr key={manager.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10">
                                          <Avatar className="h-10 w-10 bg-blue-100">
                                            <AvatarFallback className="text-blue-600 font-semibold">
                                              {getInitials(manager.firstName, manager.lastName)}
                                            </AvatarFallback>
                                          </Avatar>
                                        </div>
                                        <div className="ml-4">
                                          <div className="text-sm font-medium text-gray-900">
                                            {manager.firstName} {manager.lastName}
                                          </div>
                                          <div className="text-sm text-gray-500">
                                            {manager.phoneNumber}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">{manager.workId}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">{manager.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">
                                        <Badge variant="outline" className="text-sm">
                                          0 Agents
                                        </Badge>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      <div className="flex space-x-2">
                                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="text-red-600 hover:text-red-800"
                                          onClick={() => handleDeleteManager(manager)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                                    No managers found. Add a manager to get started.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      <AddManagerModal 
        open={showAddManagerModal} 
        onOpenChange={setShowAddManagerModal} 
      />

      <DeleteUserModal 
        open={showDeleteModal} 
        onOpenChange={setShowDeleteModal} 
        user={selectedManager}
      />
    </div>
  );
}
