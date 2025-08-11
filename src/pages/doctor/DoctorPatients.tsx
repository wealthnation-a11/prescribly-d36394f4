import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Search, ArrowLeft, UserCheck, Calendar, FileText, Phone, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Patient {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  gender?: string;
  date_of_birth?: string;
  avatar_url?: string;
  total_appointments: number;
  last_appointment: string;
}

export const DoctorPatients = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchPatients();
  }, [user]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = patients.filter(patient =>
        `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPatients(filtered);
    } else {
      setFilteredPatients(patients);
    }
  }, [searchTerm, patients]);

  const fetchPatients = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch appointments and join with profiles table
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          patient_id,
          scheduled_time,
          status
        `)
        .eq('doctor_id', user.id)
        .eq('status', 'completed')
        .order('scheduled_time', { ascending: false });

      if (error) {
        console.error('Error fetching appointments:', error);
        toast.error('Failed to load patients');
        return;
      }

      if (!data || data.length === 0) {
        setPatients([]);
        setFilteredPatients([]);
        return;
      }

      // Get unique patient IDs
      const patientIds = [...new Set(data.map(apt => apt.patient_id))];

      // Fetch patient profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, phone, gender, date_of_birth, avatar_url')
        .in('user_id', patientIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        toast.error('Failed to load patient profiles');
        return;
      }

      // Group by patient and get stats
      const patientMap = new Map();
      
      data.forEach(appointment => {
        const profile = profilesData?.find(p => p.user_id === appointment.patient_id);
        if (!profile) return;
        
        const patientId = profile.user_id;
        if (!patientMap.has(patientId)) {
          patientMap.set(patientId, {
            user_id: profile.user_id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email,
            phone: profile.phone,
            gender: profile.gender,
            date_of_birth: profile.date_of_birth,
            avatar_url: profile.avatar_url,
            total_appointments: 0,
            last_appointment: appointment.scheduled_time
          });
        }
        
        const patient = patientMap.get(patientId);
        patient.total_appointments += 1;
        
        // Update last appointment if this one is more recent
        if (new Date(appointment.scheduled_time) > new Date(patient.last_appointment)) {
          patient.last_appointment = appointment.scheduled_time;
        }
      });

      const uniquePatients = Array.from(patientMap.values());
      setPatients(uniquePatients);
      setFilteredPatients(uniquePatients);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleManagePatient = (patientId: string) => {
    navigate(`/doctor/patient/${patientId}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/doctor-dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/doctor-dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Patients</h1>
            <p className="text-muted-foreground">Manage your patient records and medical histories</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-primary">
              <Users className="w-5 h-5" />
              Total Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{patients.length}</p>
            <p className="text-sm text-muted-foreground">registered</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-green-600">
              <UserCheck className="w-5 h-5" />
              Active Cases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{patients.filter(p => {
              const lastAppointment = new Date(p.last_appointment);
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              return lastAppointment > thirtyDaysAgo;
            }).length}</p>
            <p className="text-sm text-muted-foreground">recent patients</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/5 to-orange-500/10 border-orange-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-orange-600">
              <Calendar className="w-5 h-5" />
              Total Visits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {patients.reduce((sum, patient) => sum + patient.total_appointments, 0)}
            </p>
            <p className="text-sm text-muted-foreground">appointments</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Patients Grid */}
      {filteredPatients.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {searchTerm ? "No patients found" : "You haven't treated any patients yet"}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? "Try adjusting your search terms" 
                : "Patients will appear here after you complete appointments with them"
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => {
            const age = calculateAge(patient.date_of_birth || '');
            
            return (
              <Card key={patient.user_id} className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={patient.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {patient.first_name?.[0]}{patient.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {patient.first_name} {patient.last_name}
                      </h3>
                      
                      <div className="flex items-center gap-2 mt-1">
                        {age && (
                          <Badge variant="secondary" className="text-xs">
                            {age} years
                          </Badge>
                        )}
                        {patient.gender && (
                          <Badge variant="outline" className="text-xs">
                            {patient.gender}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1 mt-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{patient.email}</span>
                        </div>
                        {patient.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <span>{patient.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="w-3 h-3" />
                          <span>{patient.total_appointments} appointment{patient.total_appointments !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      
                      <Button 
                        size="sm" 
                        className="w-full mt-4 group-hover:bg-primary/90"
                        onClick={() => handleManagePatient(patient.user_id)}
                      >
                        View Records
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DoctorPatients;