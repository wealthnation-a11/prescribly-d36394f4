import { useEffect, useState } from 'react';
import { Search, Filter, CheckCircle, XCircle, Eye, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Doctor {
  id: string;
  user_id: string;
  license_number: string;
  specialization: string;
  years_of_experience: number;
  consultation_fee: number;
  bio: string;
  verification_status: string;
  rating: number;
  total_reviews: number;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

export const DoctorsManagement = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          *,
          profiles:profile_id (
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching doctors:', error);
        return;
      }

      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateDoctorStatus = async (doctorId: string, status: 'pending' | 'approved' | 'rejected' | 'suspended') => {
    try {
      const { error } = await supabase
        .from('doctors')
        .update({ verification_status: status })
        .eq('id', doctorId);

      if (error) {
        console.error('Error updating doctor status:', error);
        return;
      }

      toast({
        title: "Doctor Status Updated",
        description: `Doctor has been ${status}.`,
      });

      fetchDoctors();
    } catch (error) {
      console.error('Error updating doctor status:', error);
    }
  };

  const filteredDoctors = doctors.filter(doctor =>
    doctor.profiles?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${doctor.profiles?.first_name} ${doctor.profiles?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      suspended: 'bg-orange-100 text-orange-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Doctors Management</h1>
        <p className="text-slate-600">Loading doctors...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Doctors Management</h1>
        <p className="text-slate-600 mt-2">Manage doctor profiles and verification</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Doctor Profiles</CardTitle>
          <div className="flex gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search doctors by name, email, or specialization..."
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
                  <th className="text-left py-3 px-4 font-medium text-slate-900">Doctor</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-900">Specialization</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-900">Experience</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-900">Fee</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-900">Rating</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-900">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDoctors.map((doctor) => (
                  <tr key={doctor.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-slate-900">
                          Dr. {doctor.profiles?.first_name} {doctor.profiles?.last_name}
                        </div>
                        <div className="text-sm text-slate-500">{doctor.profiles?.email}</div>
                        <div className="text-sm text-slate-500">License: {doctor.license_number}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-900">{doctor.specialization}</td>
                    <td className="py-3 px-4 text-slate-900">{doctor.years_of_experience} years</td>
                    <td className="py-3 px-4 text-slate-900">₦{doctor.consultation_fee?.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-slate-900">{doctor.rating}</span>
                        <span className="text-slate-500 text-sm">({doctor.total_reviews})</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusBadge(doctor.verification_status)}>
                        {doctor.verification_status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                        {doctor.verification_status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateDoctorStatus(doctor.id, 'approved')}
                              className="flex items-center gap-1 text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateDoctorStatus(doctor.id, 'rejected')}
                              className="flex items-center gap-1 text-red-600 hover:text-red-700"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </Button>
                          </>
                        )}
                        {doctor.verification_status === 'approved' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateDoctorStatus(doctor.id, 'suspended')}
                            className="flex items-center gap-1 text-orange-600 hover:text-orange-700"
                          >
                            <XCircle className="w-4 h-4" />
                            Suspend
                          </Button>
                        )}
                      </div>
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