-- Optional tax code; do not invent tax identifiers for seeded suppliers.
ALTER TABLE supplier ADD COLUMN tax_code VARCHAR(30) NULL;
