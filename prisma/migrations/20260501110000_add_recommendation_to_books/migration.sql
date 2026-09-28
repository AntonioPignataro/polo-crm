-- Add a "Recomendação" field to books — which group (G1, G2, G3) the book is
-- recommended for. Reuses the existing GroupType enum. Optional: existing
-- books default to NULL.

ALTER TABLE "books" ADD COLUMN "recommendation" "GroupType";
