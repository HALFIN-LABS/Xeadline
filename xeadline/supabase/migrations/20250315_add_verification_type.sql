-- Add verification_type column to nip05_usernames table
ALTER TABLE public.nip05_usernames ADD COLUMN IF NOT EXISTS verification_type TEXT DEFAULT 'standard';

-- Create an index on verification_type for faster lookups
CREATE INDEX IF NOT EXISTS idx_nip05_usernames_verification_type ON public.nip05_usernames(verification_type);

-- Comment on the column to explain its purpose
COMMENT ON COLUMN public.nip05_usernames.verification_type IS 'Type of verification badge: standard, staff, contributor';

-- Update existing rows to have the standard verification type
UPDATE public.nip05_usernames SET verification_type = 'standard' WHERE verification_type IS NULL;