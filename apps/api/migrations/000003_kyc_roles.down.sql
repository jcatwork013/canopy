ALTER TABLE kyc_submissions
  DROP COLUMN IF EXISTS requested_seller,
  DROP COLUMN IF EXISTS requested_caretaker;
