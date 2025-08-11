import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, CheckCircle, Mail } from "lucide-react";
import { Link } from "react-router-dom";

export const DoctorPendingApproval = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-xl">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6 animate-enter">
              <Lock className="w-10 h-10 text-amber-600" />
            </div>
            <CardTitle className="text-2xl text-slate-900">Account Under Review</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-lg text-slate-700 mb-2">
                Hello Dr. {user?.user_metadata?.first_name || "Doctor"},
              </p>
              <p className="text-slate-600">
                Your account is currently under review by our medical verification team. 
                You'll gain access to the doctor dashboard once your credentials are approved.
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                What happens next?
              </h3>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Our team reviews your medical license and credentials</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Verification typically takes 1-3 business days</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span>You'll receive an email notification when approved</span>
                </li>
              </ul>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-medium text-slate-900 mb-3">Need assistance?</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                  <Mail className="w-5 h-5 text-slate-600" />
                  <div>
                    <p className="font-medium text-slate-900">Email Support</p>
                    <p className="text-sm text-slate-600">support@example.com</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button 
                variant="outline" 
                onClick={handleSignOut}
                className="flex-1"
              >
                Sign Out
              </Button>
              <Button asChild className="flex-1">
                <Link to="/doctor/profile">
                  Update Profile
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DoctorPendingApproval;