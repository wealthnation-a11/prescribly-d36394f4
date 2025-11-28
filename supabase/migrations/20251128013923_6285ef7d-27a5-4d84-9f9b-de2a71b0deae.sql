-- Add authorization_code to subscriptions for recurring payments
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS authorization_code text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS subscription_code text;

-- Create herbal_messages table for practitioner-patient communication
CREATE TABLE IF NOT EXISTS herbal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id uuid NOT NULL REFERENCES herbal_practitioners(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('practitioner', 'patient')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read boolean NOT NULL DEFAULT false
);

-- RLS policies for herbal_messages
ALTER TABLE herbal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Practitioners can view their messages"
  ON herbal_messages FOR SELECT
  USING (
    practitioner_id IN (
      SELECT id FROM herbal_practitioners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Patients can view their messages"
  ON herbal_messages FOR SELECT
  USING (patient_id = auth.uid());

CREATE POLICY "Practitioners can send messages"
  ON herbal_messages FOR INSERT
  WITH CHECK (
    practitioner_id IN (
      SELECT id FROM herbal_practitioners WHERE user_id = auth.uid()
    ) AND sender_type = 'practitioner'
  );

CREATE POLICY "Patients can send messages"
  ON herbal_messages FOR INSERT
  WITH CHECK (patient_id = auth.uid() AND sender_type = 'patient');

CREATE POLICY "Users can mark their messages as read"
  ON herbal_messages FOR UPDATE
  USING (
    patient_id = auth.uid() OR 
    practitioner_id IN (
      SELECT id FROM herbal_practitioners WHERE user_id = auth.uid()
    )
  );

-- Create indexes for herbal_messages
CREATE INDEX IF NOT EXISTS idx_herbal_messages_practitioner ON herbal_messages(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_herbal_messages_patient ON herbal_messages(patient_id);
CREATE INDEX IF NOT EXISTS idx_herbal_messages_created ON herbal_messages(created_at DESC);

-- Create shopping_cart table
CREATE TABLE IF NOT EXISTS shopping_cart (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  remedy_id uuid NOT NULL REFERENCES herbal_remedies(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, remedy_id)
);

-- RLS policies for shopping_cart
ALTER TABLE shopping_cart ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their cart"
  ON shopping_cart FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can add to their cart"
  ON shopping_cart FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their cart"
  ON shopping_cart FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete from their cart"
  ON shopping_cart FOR DELETE
  USING (user_id = auth.uid());

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  practitioner_id uuid NOT NULL REFERENCES herbal_practitioners(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')),
  items jsonb NOT NULL,
  total_amount numeric NOT NULL,
  admin_commission numeric NOT NULL,
  practitioner_earnings numeric NOT NULL,
  payment_reference text,
  shipping_address jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS policies for orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their orders"
  ON orders FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Practitioners can view their orders"
  ON orders FOR SELECT
  USING (
    practitioner_id IN (
      SELECT id FROM herbal_practitioners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can update order status"
  ON orders FOR UPDATE
  USING (
    practitioner_id IN (
      SELECT id FROM herbal_practitioners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all orders"
  ON orders FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Create indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_practitioner ON orders(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shopping_cart_updated_at
  BEFORE UPDATE ON shopping_cart
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();