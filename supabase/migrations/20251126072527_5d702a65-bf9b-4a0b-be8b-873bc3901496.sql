-- Create herbal remedies table
CREATE TABLE public.herbal_remedies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES public.herbal_practitioners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  ingredients JSONB DEFAULT '[]'::jsonb,
  usage_instructions TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  price NUMERIC(10,2),
  approval_status verification_status NOT NULL DEFAULT 'pending'::verification_status,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create herbal articles table
CREATE TABLE public.herbal_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES public.herbal_practitioners(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  cover_image TEXT,
  approval_status verification_status NOT NULL DEFAULT 'pending'::verification_status,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Create herbal consultations table
CREATE TABLE public.herbal_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES public.herbal_practitioners(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  consultation_fee NUMERIC(10,2),
  status appointment_status DEFAULT 'pending'::appointment_status,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create remedy moderation audit table
CREATE TABLE public.herbal_remedy_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remedy_id UUID NOT NULL REFERENCES public.herbal_remedies(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create article moderation audit table
CREATE TABLE public.herbal_article_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.herbal_articles(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.herbal_remedies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.herbal_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.herbal_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.herbal_remedy_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.herbal_article_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for herbal_remedies
CREATE POLICY "Practitioners can view their own remedies"
  ON public.herbal_remedies FOR SELECT
  USING (
    practitioner_id IN (
      SELECT id FROM public.herbal_practitioners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can create remedies"
  ON public.herbal_remedies FOR INSERT
  WITH CHECK (
    practitioner_id IN (
      SELECT id FROM public.herbal_practitioners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can update their own remedies"
  ON public.herbal_remedies FOR UPDATE
  USING (
    practitioner_id IN (
      SELECT id FROM public.herbal_practitioners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all remedies"
  ON public.herbal_remedies FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update all remedies"
  ON public.herbal_remedies FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Public can view approved remedies"
  ON public.herbal_remedies FOR SELECT
  USING (approval_status = 'approved'::verification_status);

-- RLS Policies for herbal_articles
CREATE POLICY "Practitioners can view their own articles"
  ON public.herbal_articles FOR SELECT
  USING (
    practitioner_id IN (
      SELECT id FROM public.herbal_practitioners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can create articles"
  ON public.herbal_articles FOR INSERT
  WITH CHECK (
    practitioner_id IN (
      SELECT id FROM public.herbal_practitioners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can update their own articles"
  ON public.herbal_articles FOR UPDATE
  USING (
    practitioner_id IN (
      SELECT id FROM public.herbal_practitioners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all articles"
  ON public.herbal_articles FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update all articles"
  ON public.herbal_articles FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Public can view approved articles"
  ON public.herbal_articles FOR SELECT
  USING (approval_status = 'approved'::verification_status);

-- RLS Policies for herbal_consultations
CREATE POLICY "Practitioners can view their consultations"
  ON public.herbal_consultations FOR SELECT
  USING (
    practitioner_id IN (
      SELECT id FROM public.herbal_practitioners WHERE user_id = auth.uid()
    ) OR auth.uid() = patient_id
  );

CREATE POLICY "Patients can create consultations"
  ON public.herbal_consultations FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Practitioners can update their consultations"
  ON public.herbal_consultations FOR UPDATE
  USING (
    practitioner_id IN (
      SELECT id FROM public.herbal_practitioners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all consultations"
  ON public.herbal_consultations FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for audit tables
CREATE POLICY "Admins can view remedy audit"
  ON public.herbal_remedy_audit FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "System can insert remedy audit"
  ON public.herbal_remedy_audit FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view article audit"
  ON public.herbal_article_audit FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "System can insert article audit"
  ON public.herbal_article_audit FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_herbal_remedies_practitioner ON public.herbal_remedies(practitioner_id);
CREATE INDEX idx_herbal_remedies_status ON public.herbal_remedies(approval_status);
CREATE INDEX idx_herbal_articles_practitioner ON public.herbal_articles(practitioner_id);
CREATE INDEX idx_herbal_articles_status ON public.herbal_articles(approval_status);
CREATE INDEX idx_herbal_consultations_practitioner ON public.herbal_consultations(practitioner_id);
CREATE INDEX idx_herbal_consultations_patient ON public.herbal_consultations(patient_id);

-- Trigger for updated_at
CREATE TRIGGER update_herbal_remedies_updated_at
  BEFORE UPDATE ON public.herbal_remedies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_herbal_articles_updated_at
  BEFORE UPDATE ON public.herbal_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_herbal_consultations_updated_at
  BEFORE UPDATE ON public.herbal_consultations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();