import { HerbalPractitionerLayout } from '@/components/HerbalPractitionerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Calendar, Package } from 'lucide-react';

export default function HerbalEarnings() {
  return (
    <HerbalPractitionerLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Earnings</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track your income and financial performance</p>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4 sm:px-6 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold">$0.00</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4 sm:px-6 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold">$0.00</div>
              <p className="text-xs text-muted-foreground">Current month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4 sm:px-6 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Products Sold</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Total sold</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4 sm:px-6 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Growth</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold">0%</div>
              <p className="text-xs text-muted-foreground">Month over month</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4 sm:p-6 md:p-8">
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Revenue Share Structure</h3>
                <p className="text-sm text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
                  Understand how your earnings are calculated from product sales
                </p>
              </div>

              <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="p-2.5 sm:p-3 rounded-lg bg-primary/10 flex-shrink-0">
                        <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-base sm:text-lg mb-1 sm:mb-2">Your Earnings</h4>
                        <p className="text-2xl sm:text-3xl font-bold text-primary mb-1 sm:mb-2">90%</p>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          You receive 90% of every product sale
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50 border-muted">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="p-2.5 sm:p-3 rounded-lg bg-muted flex-shrink-0">
                        <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-base sm:text-lg mb-1 sm:mb-2">Platform Fee</h4>
                        <p className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">10%</p>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          Platform maintenance and payment processing
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 sm:p-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  Example Calculation
                </h4>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Product Sale Price:</span>
                    <span className="font-semibold whitespace-nowrap">$100.00</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Your Earnings (90%):</span>
                    <span className="font-semibold text-primary whitespace-nowrap">$90.00</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Platform Fee (10%):</span>
                    <span className="font-semibold whitespace-nowrap">$10.00</span>
                  </div>
                </div>
              </div>

              <div className="text-center pt-2 sm:pt-4">
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
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
