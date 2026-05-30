-- =============================================================
-- Fix: la tabla public.profiles fue creada sin la columna `nombre`
-- (ver 20260530_create_profiles.sql), pero el backend la selecciona
-- en cuenta-corriente.service.ts (.select('id, email, dni, nombre')).
-- PostgREST devolvía 400 "column profiles.nombre does not exist"
-- al crear una cuenta corriente buscando por DNI o email.
-- =============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nombre TEXT;
