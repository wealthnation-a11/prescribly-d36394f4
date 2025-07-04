import { useEffect, useState } from 'react';
import { Search, Filter, Download, Ban, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  is_blocked: boolean;
  created_at: string;
}

export const UsersManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserBlock = async (userId: string, isBlocked: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_blocked: !isBlocked })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating user:', error);
        return;
      }

      toast({
        title: isBlocked ? "User Unblocked" : "User Blocked",
        description: `User has been ${isBlocked ? 'unblocked' : 'blocked'} successfully.`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      doctor: 'bg-blue-100 text-blue-800',
      patient: 'bg-green-100 text-green-800',
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Users Management</h1>
        <p className="text-slate-600">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Users Management</h1>
          <p className="text-slate-600 mt-2">Manage all registered users</p>
        </div>
        <Button className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Users
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
          <div className="flex gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-900">User</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-900">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-900">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-900">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-900">Joined</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-slate-900">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-sm text-slate-500">{user.phone}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-900">{user.email}</td>
                    <td className="py-3 px-4">
                      <Badge className={getRoleBadge(user.role)}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={user.is_blocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                        {user.is_blocked ? 'Blocked' : 'Active'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleUserBlock(user.user_id, user.is_blocked)}
                        className={`flex items-center gap-2 ${
                          user.is_blocked 
                            ? 'text-green-600 hover:text-green-700' 
                            : 'text-red-600 hover:text-red-700'
                        }`}
                      >
                        {user.is_blocked ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Unblock
                          </>
                        ) : (
                          <>
                            <Ban className="w-4 h-4" />
                            Block
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};