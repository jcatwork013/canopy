-- Which roles the user is applying for with this KYC submission. The admin grants
-- exactly these on approval (is_seller / is_caretaker).
ALTER TABLE kyc_submissions
  ADD COLUMN requested_seller    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN requested_caretaker BOOLEAN NOT NULL DEFAULT FALSE;
