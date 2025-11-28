import { useState } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { MobileHeader } from '@/components/MobileHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function CheckoutPage() {
  const { cartItems, getTotalAmount, clearCart } = useShoppingCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.email) {
      toast.error('User email not found');
      return;
    }

    setProcessing(true);

    try {
      const totalAmount = getTotalAmount();

      // Initialize Paystack payment
      const { data: initData, error: initError } = await supabase.functions.invoke('paystack-initialize', {
        body: {
          email: user.email,
          amount: totalAmount,
          type: 'order',
          metadata: {
            shipping_info: shippingInfo,
            cart_items: cartItems.map(item => ({
              remedy_id: item.remedy_id,
              quantity: item.quantity,
              price: item.remedy.price,
              practitioner_id: item.remedy.practitioner_id
            }))
          }
        }
      });

      if (initError || !initData.status) {
        throw new Error(initData?.message || 'Payment initialization failed');
      }

      // Store order info in localStorage for completion after payment
      localStorage.setItem('pending_order', JSON.stringify({
        shipping_info: shippingInfo,
        cart_items: cartItems,
        payment_reference: initData.reference
      }));

      // Redirect to Paystack
      window.location.href = initData.authorization_url;
      
    } catch (error) {
      console.error('Order error:', error);
      toast.error('Failed to initialize payment');
      setProcessing(false);
    }
  };

  if (cartItems.length === 0) {
    navigate('/herbal/cart');
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <MobileHeader title="Checkout" />
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
              <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Shipping Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name *</Label>
                        <Input
                          id="fullName"
                          required
                          value={shippingInfo.fullName}
                          onChange={(e) => setShippingInfo(prev => ({ ...prev, fullName: e.target.value }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="address">Address *</Label>
                        <Input
                          id="address"
                          required
                          value={shippingInfo.address}
                          onChange={(e) => setShippingInfo(prev => ({ ...prev, address: e.target.value }))}
                        />
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">City *</Label>
                          <Input
                            id="city"
                            required
                            value={shippingInfo.city}
                            onChange={(e) => setShippingInfo(prev => ({ ...prev, city: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State *</Label>
                          <Input
                            id="state"
                            required
                            value={shippingInfo.state}
                            onChange={(e) => setShippingInfo(prev => ({ ...prev, state: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="zipCode">ZIP Code *</Label>
                          <Input
                            id="zipCode"
                            required
                            value={shippingInfo.zipCode}
                            onChange={(e) => setShippingInfo(prev => ({ ...prev, zipCode: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone *</Label>
                          <Input
                            id="phone"
                            type="tel"
                            required
                            value={shippingInfo.phone}
                            onChange={(e) => setShippingInfo(prev => ({ ...prev, phone: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes">Order Notes (Optional)</Label>
                        <Textarea
                          id="notes"
                          value={shippingInfo.notes}
                          onChange={(e) => setShippingInfo(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Any special instructions for delivery..."
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-1">
                  <Card>
                    <CardHeader>
                      <CardTitle>Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        {cartItems.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>{item.remedy.name} x {item.quantity}</span>
                            <span>${(item.remedy.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t pt-4 space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>${getTotalAmount().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-lg">
                          <span>Total</span>
                          <span>${getTotalAmount().toFixed(2)}</span>
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full" 
                        size="lg"
                        disabled={processing}
                      >
                        {processing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Place Order'
                        )}
                      </Button>

                      <p className="text-xs text-muted-foreground text-center">
                        By placing your order, you agree to our terms and conditions
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </form>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}