-- Migration to allow NULL values for profile fields that should be clearable
ALTER TABLE users ALTER COLUMN location DROP NOT NULL;