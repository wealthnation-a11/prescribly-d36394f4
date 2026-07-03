
-- Enum for ledger entry types
CREATE TYPE public.wallet_txn_type AS ENUM (
  'topup', 'consultation_charge', 'refund', 'adjustment', 'hmo_charge'
);
CREATE TYPE public.wallet_txn_direction AS ENUM ('credit', 'debit');
CREATE TYPE public.wallet_txn_status AS ENUM ('pending', 'succeeded', 'failed');
CREATE TYPE public.wallet_status AS ENUM ('active', 'frozen');

-- 1. wallets
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_cents BIGINT NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status public.wallet_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY w_own_sel ON public.wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY w_adm ON public.wallets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 2. wallet_virtual_accounts
CREATE TABLE public.wallet_virtual_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'hitchpay',
  provider_account_id TEXT,
  bank_name TEXT,
  account_number TEXT NOT NULL,
  account_name TEXT,
  reference_code TEXT,
  is_real_bank_account BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_virtual_accounts TO authenticated;
GRANT ALL ON public.wallet_virtual_accounts TO service_role;
ALTER TABLE public.wallet_virtual_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY wva_own_sel ON public.wallet_virtual_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY wva_adm ON public.wallet_virtual_accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 3. wallet_transactions (append-only ledger)
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.wallet_txn_type NOT NULL,
  direction public.wallet_txn_direction NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  balance_after_cents BIGINT,
  status public.wallet_txn_status NOT NULL DEFAULT 'succeeded',
  currency TEXT NOT NULL DEFAULT 'USD',
  provider TEXT,
  provider_reference TEXT,
  related_id UUID,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX wt_user_created_idx ON public.wallet_transactions(user_id, created_at DESC);
CREATE UNIQUE INDEX wt_provider_ref_unique ON public.wallet_transactions(provider, provider_reference)
  WHERE provider_reference IS NOT NULL;
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY wt_own_sel ON public.wallet_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY wt_adm ON public.wallet_transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 4. hitchpay_events (webhook log)
CREATE TABLE public.hitchpay_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE,
  event_type TEXT,
  payload JSONB NOT NULL,
  signature_verified BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.hitchpay_events TO service_role;
ALTER TABLE public.hitchpay_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY he_adm ON public.hitchpay_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- updated_at triggers
CREATE TRIGGER wallets_updated_at BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER wva_updated_at BEFORE UPDATE ON public.wallet_virtual_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Atomic credit function (called from edge functions / service_role only)
CREATE OR REPLACE FUNCTION public.credit_wallet(
  _user_id UUID,
  _amount_cents BIGINT,
  _type public.wallet_txn_type,
  _provider TEXT DEFAULT NULL,
  _provider_reference TEXT DEFAULT NULL,
  _related_id UUID DEFAULT NULL,
  _description TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb
) RETURNS public.wallet_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wallet public.wallets;
  v_txn public.wallet_transactions;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _amount_cents <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;

  INSERT INTO public.wallets(user_id) VALUES(_user_id)
    ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.wallets SET balance_cents = balance_cents + _amount_cents, updated_at = now()
    WHERE user_id = _user_id RETURNING * INTO v_wallet;

  INSERT INTO public.wallet_transactions(
    wallet_id, user_id, type, direction, amount_cents, balance_after_cents,
    status, currency, provider, provider_reference, related_id, description, metadata
  ) VALUES (
    v_wallet.id, _user_id, _type, 'credit', _amount_cents, v_wallet.balance_cents,
    'succeeded', v_wallet.currency, _provider, _provider_reference, _related_id, _description, _metadata
  ) RETURNING * INTO v_txn;
  RETURN v_txn;
END; $$;
REVOKE EXECUTE ON FUNCTION public.credit_wallet(UUID,BIGINT,public.wallet_txn_type,TEXT,TEXT,UUID,TEXT,JSONB) FROM PUBLIC, anon, authenticated;

-- Atomic debit function
CREATE OR REPLACE FUNCTION public.debit_wallet(
  _user_id UUID,
  _amount_cents BIGINT,
  _type public.wallet_txn_type,
  _related_id UUID DEFAULT NULL,
  _description TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb
) RETURNS public.wallet_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wallet public.wallets;
  v_txn public.wallet_transactions;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _amount_cents <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  IF _type NOT IN ('consultation_charge','hmo_charge','adjustment','refund') THEN
    RAISE EXCEPTION 'invalid debit type';
  END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF v_wallet IS NULL THEN RAISE EXCEPTION 'wallet not found'; END IF;
  IF v_wallet.status <> 'active' THEN RAISE EXCEPTION 'wallet frozen'; END IF;
  IF v_wallet.balance_cents < _amount_cents THEN RAISE EXCEPTION 'insufficient funds'; END IF;

  UPDATE public.wallets SET balance_cents = balance_cents - _amount_cents, updated_at = now()
    WHERE id = v_wallet.id RETURNING * INTO v_wallet;

  INSERT INTO public.wallet_transactions(
    wallet_id, user_id, type, direction, amount_cents, balance_after_cents,
    status, currency, related_id, description, metadata
  ) VALUES (
    v_wallet.id, _user_id, _type, 'debit', _amount_cents, v_wallet.balance_cents,
    'succeeded', v_wallet.currency, _related_id, _description, _metadata
  ) RETURNING * INTO v_txn;
  RETURN v_txn;
END; $$;
REVOKE EXECUTE ON FUNCTION public.debit_wallet(UUID,BIGINT,public.wallet_txn_type,UUID,TEXT,JSONB) FROM PUBLIC, anon, authenticated;

-- Realtime for balance + transactions so UI updates instantly on webhook credits
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
