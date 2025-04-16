import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, UserRole } from "@shared/schema";
import { Users, UserCog, User as UserIcon, Search, MoreHorizontal, Filter } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DeleteUserModal } from "@/components/modals/delete-user-modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AllUsers() {
  const { user } = useAuth();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Get all users from our API
  const { data: managers, isLoading: loadingManagers } = useQuery<User[]>({
    queryKey: ["/api/managers"],
  });

  // Get all agents - this assumes we have an endpoint that returns all agents
  // If not, we would need to modify this approach
  const { data: agents, isLoading: loadingAgents } = useQuery<User[]>({
    queryKey: ["/api/agents", "all"],
    queryFn: async () => {
      const res = await fetch("/api/agents?all=true");
      if (!res.ok) throw new Error("Failed to fetch all agents");
      return res.json();
    },
  });

  // Create a combined list of all users
  const allUsers = [
    // Add the admin user (current user if they're an admin)
    ...(user && user.role === UserRole.ADMIN ? [user] : []),
    // Add all managers
    ...(managers || []),
    // Add all agents
    ...(agents || []),
  ];

  // Apply filters
  const filteredUsers = allUsers.filter(user => {
    // Filter by role
    if (selectedRole !== "all" && user.role !== selectedRole) {
      return false;
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        user.firstName.toLowerCase().includes(searchLower) ||
        user.lastName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.workId.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  // Group users by role for the tabs view
  const usersByRole = {
    admins: filteredUsers.filter(user => user.role === UserRole.ADMIN),
    managers: filteredUsers.filter(user => user.role === UserRole.MANAGER),
    agents: filteredUsers.filter(user => user.role === UserRole.AGENT),
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case UserRole.ADMIN:
        return "bg-red-100 text-red-800 border-red-300";
      case UserRole.MANAGER:
        return "bg-blue-100 text-blue-800 border-blue-300";
      case UserRole.AGENT:
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const isLoading = loadingManagers || loadingAgents;

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
        <Header onToggleSidebar={() => setShowMobileSidebar(!showMobileSidebar)} title="All Users" />

        {/* Main content scrollable area */}
        <main className="flex-1 overflow-y-auto">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <h1 className="text-2xl font-semibold text-gray-900">All Users</h1>
              <p className="mt-1 text-sm text-gray-500">
                View and manage all users in the system.
              </p>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
              {/* Search and filter */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div className="relative w-full md:w-auto md:min-w-[300px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <Select
                      value={selectedRole}
                      onValueChange={setSelectedRole}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                        <SelectItem value={UserRole.MANAGER}>Manager</SelectItem>
                        <SelectItem value={UserRole.AGENT}>Agent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="all">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>All ({filteredUsers.length})</span>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="admins">
                      <div className="flex items-center space-x-2">
                        <UserCog className="h-4 w-4" />
                        <span>Admins ({usersByRole.admins.length})</span>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="managers">
                      <div className="flex items-center space-x-2">
                        <UserIcon className="h-4 w-4" />
                        <span>Managers ({usersByRole.managers.length})</span>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="agents">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>Agents ({usersByRole.agents.length})</span>
                      </div>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="all" className="mt-6">
                    <UsersTable
                      users={filteredUsers}
                      onDelete={handleDeleteUser}
                      getInitials={getInitials}
                      getRoleBadgeColor={getRoleBadgeColor}
                    />
                  </TabsContent>
                  
                  <TabsContent value="admins" className="mt-6">
                    <UsersTable
                      users={usersByRole.admins}
                      onDelete={handleDeleteUser}
                      getInitials={getInitials}
                      getRoleBadgeColor={getRoleBadgeColor}
                    />
                  </TabsContent>
                  
                  <TabsContent value="managers" className="mt-6">
                    <UsersTable
                      users={usersByRole.managers}
                      onDelete={handleDeleteUser}
                      getInitials={getInitials}
                      getRoleBadgeColor={getRoleBadgeColor}
                    />
                  </TabsContent>
                  
                  <TabsContent value="agents" className="mt-6">
                    <UsersTable
                      users={usersByRole.agents}
                      onDelete={handleDeleteUser}
                      getInitials={getInitials}
                      getRoleBadgeColor={getRoleBadgeColor}
                    />
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Delete User Modal */}
      <DeleteUserModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        user={selectedUser}
      />
    </div>
  );
}

// Users table component
function UsersTable({
  users,
  onDelete,
  getInitials,
  getRoleBadgeColor,
}: {
  users: User[];
  onDelete: (user: User) => void;
  getInitials: (firstName: string, lastName: string) => string;
  getRoleBadgeColor: (role: string) => string;
}) {
  const { user: currentUser } = useAuth();

  if (users.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="h-12 w-12 text-gray-400 mx-auto" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
        <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Work ID</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center">
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarFallback className={
                        user.role === UserRole.ADMIN ? "bg-gray-500 text-white" :
                        user.role === UserRole.MANAGER ? "bg-blue-500 text-white" :
                        "bg-green-500 text-white"
                      }>
                        {getInitials(user.firstName, user.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{user.firstName} {user.lastName}</div>
                      <div className="text-xs text-gray-500">{user.phoneNumber || "No phone"}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{user.workId}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem disabled={user.id === currentUser?.id}>
                        View Details
                      </DropdownMenuItem>
                      {/* Only allow deletion of users that aren't the current user and aren't admins */}
                      {user.id !== currentUser?.id && user.role !== UserRole.ADMIN && (
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => onDelete(user)}
                        >
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}