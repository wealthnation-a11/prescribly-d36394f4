import { HerbalPractitionerLayout } from '@/components/HerbalPractitionerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Calendar, Package } from 'lucide-react';

export default function HerbalEarnings() {
  return (
    <HerbalPractitionerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Earnings</h1>
          <p className="text-muted-foreground">Track your income and financial performance</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0.00</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0.00</div>
              <p className="text-xs text-muted-foreground">Current month earnings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products Sold</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Total remedies sold</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Growth</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0%</div>
              <p className="text-xs text-muted-foreground">Month over month</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Revenue Share Structure</h3>
                <p className="text-muted-foreground mb-6">
                  Understand how your earnings are calculated from product sales
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <DollarSign className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg mb-2">Your Earnings</h4>
                        <p className="text-3xl font-bold text-primary mb-2">90%</p>
                        <p className="text-sm text-muted-foreground">
                          You receive 90% of every product sale
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50 border-muted">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-muted">
                        <TrendingUp className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg mb-2">Platform Fee</h4>
                        <p className="text-3xl font-bold mb-2">10%</p>
                        <p className="text-sm text-muted-foreground">
                          Platform maintenance and payment processing
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-accent/10 border border-accent/20 rounded-lg p-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Example Calculation
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Product Sale Price:</span>
                    <span className="font-semibold">$100.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Your Earnings (90%):</span>
                    <span className="font-semibold text-primary">$90.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform Fee (10%):</span>
                    <span className="font-semibold">$10.00</span>
                  </div>
                </div>
              </div>

              <div className="text-center pt-4">
                <p className="text-sm text-muted-foreground">
                  Detailed earnings analytics and payment processing will be available soon
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </HerbalPractitionerLayout>
  );
}
