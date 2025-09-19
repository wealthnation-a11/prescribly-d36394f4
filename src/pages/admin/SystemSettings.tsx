import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Settings, Shield, Database, Bell, Mail, Globe, AlertTriangle, CheckCircle, Save, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SystemSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // System settings state
  const [systemConfig, setSystemConfig] = useState({
    // Platform Settings
    platformName: "Prescribly",
    maintenanceMode: false,
    registrationEnabled: true,
    doctorRegistrationEnabled: true,
    
    // Security Settings
    sessionTimeout: "24", // hours
    passwordMinLength: "8",
    requireEmailVerification: true,
    twoFactorEnabled: false,
    
    // Communication Settings
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    
    // Business Settings
    defaultCurrency: "NGN",
    adminCommission: "15", // percentage
    consultationFeeMin: "1000",
    consultationFeeMax: "50000",
    
    // API Settings
    rateLimitPerHour: "100",
    uploadMaxSize: "10", // MB
    allowedFileTypes: "jpg,jpeg,png,pdf,doc,docx",
  });

  const handleSave = async (section: string) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({ 
        title: "Settings saved successfully!",
        description: `${section} settings have been updated.`
      });
    } catch (error) {
      toast({ 
        title: "Failed to save settings", 
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminLayout 
      title="System Settings" 
      subtitle="Configure platform settings and system parameters"
      showBackButton
    >
      <div className="space-y-6">
        {/* System Status */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Online</div>
              <p className="text-xs text-muted-foreground">All systems operational</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Database</CardTitle>
              <Database className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">Connected</div>
              <p className="text-xs text-muted-foreground">Response: 45ms</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security</CardTitle>
              <Shield className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">Secure</div>
              <p className="text-xs text-muted-foreground">SSL active</p>
            </CardContent>
          </Card>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="platform" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="platform">Platform</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="api">API & Limits</TabsTrigger>
          </TabsList>

          <TabsContent value="platform" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Platform Configuration</CardTitle>
                <CardDescription>
                  Basic platform settings and operational controls
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="platformName">Platform Name</Label>
                  <Input
                    id="platformName"
                    value={systemConfig.platformName}
                    onChange={(e) => setSystemConfig(prev => ({ ...prev, platformName: e.target.value }))}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">System Controls</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Maintenance Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable to temporarily disable user access
                      </p>
                    </div>
                    <Switch 
                      checked={systemConfig.maintenanceMode}
                      onCheckedChange={(checked) => setSystemConfig(prev => ({ ...prev, maintenanceMode: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>User Registration</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow new patients to register
                      </p>
                    </div>
                    <Switch 
                      checked={systemConfig.registrationEnabled}
                      onCheckedChange={(checked) => setSystemConfig(prev => ({ ...prev, registrationEnabled: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Doctor Registration</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow new doctors to apply
                      </p>
                    </div>
                    <Switch 
                      checked={systemConfig.doctorRegistrationEnabled}
                      onCheckedChange={(checked) => setSystemConfig(prev => ({ ...prev, doctorRegistrationEnabled: checked }))}
                    />
                  </div>
                </div>

                {systemConfig.maintenanceMode && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>
                      Maintenance mode is enabled. Users cannot access the platform.
                    </AlertDescription>
                  </Alert>
                )}

                <Button onClick={() => handleSave("Platform")} disabled={isLoading}>
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? "Saving..." : "Save Platform Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Configure authentication and security parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={systemConfig.sessionTimeout}
                      onChange={(e) => setSystemConfig(prev => ({ ...prev, sessionTimeout: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
                    <Input
                      id="passwordMinLength"
                      type="number"
                      value={systemConfig.passwordMinLength}
                      onChange={(e) => setSystemConfig(prev => ({ ...prev, passwordMinLength: e.target.value }))}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Authentication Settings</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Verification Required</Label>
                      <p className="text-sm text-muted-foreground">
                        Users must verify email before accessing platform
                      </p>
                    </div>
                    <Switch 
                      checked={systemConfig.requireEmailVerification}
                      onCheckedChange={(checked) => setSystemConfig(prev => ({ ...prev, requireEmailVerification: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable 2FA for enhanced security
                      </p>
                    </div>
                    <Switch 
                      checked={systemConfig.twoFactorEnabled}
                      onCheckedChange={(checked) => setSystemConfig(prev => ({ ...prev, twoFactorEnabled: checked }))}
                    />
                  </div>
                </div>

                <Button onClick={() => handleSave("Security")} disabled={isLoading}>
                  <Shield className="mr-2 h-4 w-4" />
                  {isLoading ? "Saving..." : "Save Security Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communication" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Communication Settings</CardTitle>
                <CardDescription>
                  Configure notification and messaging preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Notification Channels</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <div>
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Send notifications via email
                        </p>
                      </div>
                    </div>
                    <Switch 
                      checked={systemConfig.emailNotifications}
                      onCheckedChange={(checked) => setSystemConfig(prev => ({ ...prev, emailNotifications: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-green-600" />
                      <div>
                        <Label>SMS Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Send notifications via SMS
                        </p>
                      </div>
                    </div>
                    <Switch 
                      checked={systemConfig.smsNotifications}
                      onCheckedChange={(checked) => setSystemConfig(prev => ({ ...prev, smsNotifications: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 flex items-center gap-2">
                      <Bell className="h-4 w-4 text-purple-600" />
                      <div>
                        <Label>Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Send browser push notifications
                        </p>
                      </div>
                    </div>
                    <Switch 
                      checked={systemConfig.pushNotifications}
                      onCheckedChange={(checked) => setSystemConfig(prev => ({ ...prev, pushNotifications: checked }))}
                    />
                  </div>
                </div>

                <Button onClick={() => handleSave("Communication")} disabled={isLoading}>
                  <Bell className="mr-2 h-4 w-4" />
                  {isLoading ? "Saving..." : "Save Communication Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="business" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Business Configuration</CardTitle>
                <CardDescription>
                  Configure pricing, currency, and business rules
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="defaultCurrency">Default Currency</Label>
                    <Select 
                      value={systemConfig.defaultCurrency}
                      onValueChange={(value) => setSystemConfig(prev => ({ ...prev, defaultCurrency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NGN">Nigerian Naira (NGN)</SelectItem>
                        <SelectItem value="USD">US Dollar (USD)</SelectItem>
                        <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminCommission">Admin Commission (%)</Label>
                    <Input
                      id="adminCommission"
                      type="number"
                      value={systemConfig.adminCommission}
                      onChange={(e) => setSystemConfig(prev => ({ ...prev, adminCommission: e.target.value }))}
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-4">Consultation Fee Limits</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="consultationFeeMin">Minimum Fee (₦)</Label>
                      <Input
                        id="consultationFeeMin"
                        type="number"
                        value={systemConfig.consultationFeeMin}
                        onChange={(e) => setSystemConfig(prev => ({ ...prev, consultationFeeMin: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="consultationFeeMax">Maximum Fee (₦)</Label>
                      <Input
                        id="consultationFeeMax"
                        type="number"
                        value={systemConfig.consultationFeeMax}
                        onChange={(e) => setSystemConfig(prev => ({ ...prev, consultationFeeMax: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={() => handleSave("Business")} disabled={isLoading}>
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? "Saving..." : "Save Business Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>API & System Limits</CardTitle>
                <CardDescription>
                  Configure API rate limits and system constraints
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="rateLimitPerHour">Rate Limit (requests/hour)</Label>
                    <Input
                      id="rateLimitPerHour"
                      type="number"
                      value={systemConfig.rateLimitPerHour}
                      onChange={(e) => setSystemConfig(prev => ({ ...prev, rateLimitPerHour: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="uploadMaxSize">Max Upload Size (MB)</Label>
                    <Input
                      id="uploadMaxSize"
                      type="number"
                      value={systemConfig.uploadMaxSize}
                      onChange={(e) => setSystemConfig(prev => ({ ...prev, uploadMaxSize: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allowedFileTypes">Allowed File Types</Label>
                  <Input
                    id="allowedFileTypes"
                    placeholder="jpg,jpeg,png,pdf,doc,docx"
                    value={systemConfig.allowedFileTypes}
                    onChange={(e) => setSystemConfig(prev => ({ ...prev, allowedFileTypes: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list of allowed file extensions
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">System Health</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">99.9%</div>
                      <p className="text-sm text-muted-foreground">Uptime</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">45ms</div>
                      <p className="text-sm text-muted-foreground">Avg Response</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => handleSave("API")} disabled={isLoading}>
                    <Save className="mr-2 h-4 w-4" />
                    {isLoading ? "Saving..." : "Save API Settings"}
                  </Button>
                  <Button variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reset Cache
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}