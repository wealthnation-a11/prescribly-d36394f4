import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Award, Star, AlertCircle } from "lucide-react";

export const DoctorProfile = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-slate-600">Update your professional information and credentials</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats Cards */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5 text-blue-600" />
              Profile Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">90%</p>
            <p className="text-sm text-slate-600">completion rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="w-5 h-5 text-green-600" />
              Years Experience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">8</p>
            <p className="text-sm text-slate-600">years practicing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="w-5 h-5 text-orange-600" />
              Patient Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">4.8</p>
            <p className="text-sm text-slate-600">average rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon */}
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Profile Management Coming Soon</h3>
          <p className="text-slate-600">
            Complete profile management system is being developed. 
            You'll be able to update your credentials, specializations, and professional information.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorProfile;