-- SCRIPT DE INICIALIZACIÓN PARA SUPABASE (ÁREA 41)
-- Ejecuta este script en Supabase > SQL Editor > New Query > Run

-- 1. Tabla de Perfiles de Usuario
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  email TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  cancellation_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Canchas
CREATE TABLE IF NOT EXISTS public.courts (
  id TEXT PRIMARY KEY,
  court_type TEXT NOT NULL,
  court_number INT NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  price NUMERIC DEFAULT 0
);

-- Insertar canchas de Area 41
INSERT INTO public.courts (id, court_type, court_number, is_available, price)
VALUES
  ('cancha-1', 'Futbol 7', 1, true, 35000),
  ('cancha-2', 'Futbol 7', 2, true, 35000),
  ('cancha-3', 'Futbol 5', 3, true, 25000),
  ('cancha-4', 'Futbol 5', 4, true, 25000)
ON CONFLICT (id) DO NOTHING;

-- 3. Tabla de Reservas
CREATE TABLE IF NOT EXISTS public.reservations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  court_ids JSONB DEFAULT '[]'::jsonb,
  reservation_date_time TIMESTAMPTZ,
  duration_minutes INT DEFAULT 60,
  date TEXT,
  time TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Turnos Fijos
CREATE TABLE IF NOT EXISTS public.fixed_reservations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_name TEXT NOT NULL,
  phone_number TEXT,
  court_id TEXT NOT NULL,
  day_of_week INT NOT NULL,
  time TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de Buffet
CREATE TABLE IF NOT EXISTS public.buffet_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC DEFAULT 0,
  type TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabla de Publicidades
CREATE TABLE IF NOT EXISTS public.advertisements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabla de Fondos de Pantalla
CREATE TABLE IF NOT EXISTS public.background_images (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabla de Logos
CREATE TABLE IF NOT EXISTS public.logo_images (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deshabilitar RLS para permitir lectura y escritura directa desde la app
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.buffet_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.background_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.logo_images DISABLE ROW LEVEL SECURITY;

-- Activar Realtime para actualización en vivo de turnos
ALTER PUBLICATION supabase_realtime ADD TABLE public.courts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fixed_reservations;
