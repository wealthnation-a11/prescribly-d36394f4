import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Calendar, AlertCircle } from "lucide-react";

export const DoctorEarnings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Earnings</h1>
        <p className="text-slate-600">Track your weekly and monthly earnings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₦150,000</p>
            <p className="text-sm text-slate-600">total earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₦42,000</p>
            <p className="text-sm text-slate-600">weekly earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5 text-orange-600" />
              Average/Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₦6,000</p>
            <p className="text-sm text-slate-600">daily average</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Analytics Dashboard Coming Soon</h3>
          <p className="text-slate-600">
            Comprehensive earnings analytics with charts, payment history, and financial reporting.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorEarnings;