import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CartItem {
  id: string;
  remedy_id: string;
  quantity: number;
  remedy: {
    name: string;
    price: number;
    practitioner_id: string;
  };
}

export const useShoppingCart = () => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCart = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('shopping_cart')
        .select(`
          id,
          remedy_id,
          quantity,
          herbal_remedies (
            name,
            price,
            practitioner_id
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      setCartItems(
        (data || []).map((item: any) => ({
          id: item.id,
          remedy_id: item.remedy_id,
          quantity: item.quantity,
          remedy: item.herbal_remedies,
        }))
      );
    } catch (error) {
      console.error('Error loading cart:', error);
      toast.error('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (remedyId: string) => {
    if (!user) {
      toast.error('Please log in to add items to cart');
      return;
    }

    try {
      const { error } = await supabase
        .from('shopping_cart')
        .upsert({
          user_id: user.id,
          remedy_id: remedyId,
          quantity: 1,
        });

      if (error) throw error;

      toast.success('Added to cart');
      await loadCart();
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart');
    }
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    if (quantity < 1) return;

    try {
      const { error } = await supabase
        .from('shopping_cart')
        .update({ quantity })
        .eq('id', cartItemId);

      if (error) throw error;

      await loadCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Failed to update quantity');
    }
  };

  const removeFromCart = async (cartItemId: string) => {
    try {
      const { error } = await supabase
        .from('shopping_cart')
        .delete()
        .eq('id', cartItemId);

      if (error) throw error;

      toast.success('Removed from cart');
      await loadCart();
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast.error('Failed to remove from cart');
    }
  };

  const clearCart = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('shopping_cart')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setCartItems([]);
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast.error('Failed to clear cart');
    }
  };

  const getTotalAmount = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.remedy.price * item.quantity);
    }, 0);
  };

  const getItemCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  useEffect(() => {
    loadCart();
  }, [user?.id]);

  return {
    cartItems,
    loading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getTotalAmount,
    getItemCount,
    refreshCart: loadCart,
  };
};