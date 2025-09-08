import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { User } from "@shared/schema";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";

export default function AdminPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: allUsers, isLoading, isError } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });
  
  useEffect(() => {
    if (!user) {
      setLocation("/auth");
    }
  }, [user, setLocation]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Data</h2>
        <p className="text-gray-700 mb-6">Could not load user data. Please try again later.</p>
        <Button onClick={() => setLocation("/")}>Back to Home</Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-primary">CHARLEY Admin</h1>
        <Button variant="outline" onClick={() => setLocation("/")} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to App
        </Button>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Registered Users</CardTitle>
          <CardDescription>Total users: {Array.isArray(allUsers) ? allUsers.length : 0}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(allUsers) && allUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.fullName || '-'}</TableCell>
                    <TableCell>{user.email || '-'}</TableCell>
                    <TableCell>{user.gender || '-'}</TableCell>
                    <TableCell>{user.location || '-'}</TableCell>
                    <TableCell>{user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}</TableCell>
                  </TableRow>
                ))}
                {(!allUsers || !Array.isArray(allUsers) || allUsers.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Database Tables</CardTitle>
          <CardDescription>Overview of all database tables</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-md p-4">
              <h3 className="font-semibold mb-2">Users</h3>
              <p className="text-sm text-gray-600">Stores user account information</p>
              <p className="text-xs text-gray-500 mt-1">Count: {Array.isArray(allUsers) ? allUsers.length : 0}</p>
            </div>
            
            <div className="border rounded-md p-4">
              <h3 className="font-semibold mb-2">Matches</h3>
              <p className="text-sm text-gray-600">Stores user match connections</p>
            </div>
            
            <div className="border rounded-md p-4">
              <h3 className="font-semibold mb-2">Messages</h3>
              <p className="text-sm text-gray-600">Stores chat messages between users</p>
            </div>
            
            <div className="border rounded-md p-4">
              <h3 className="font-semibold mb-2">User Preferences</h3>
              <p className="text-sm text-gray-600">Stores user dating preferences</p>
            </div>
            
            <div className="border rounded-md p-4">
              <h3 className="font-semibold mb-2">User Interests</h3>
              <p className="text-sm text-gray-600">Stores user interests and hobbies</p>
            </div>
            
            <div className="border rounded-md p-4">
              <h3 className="font-semibold mb-2">Video Calls</h3>
              <p className="text-sm text-gray-600">Stores video call session data</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}