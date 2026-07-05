-- Add device_identifiers mapping table for external identifiers (mac, serial)

CREATE TABLE IF NOT EXISTS public.device_identifiers (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  identifier_type text NOT NULL,
  identifier_value text NOT NULL UNIQUE,
  created_at timestamp without time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.device_identifiers
  ADD CONSTRAINT device_identifiers_device_id_devices_id_fk FOREIGN KEY (device_id)
  REFERENCES public.devices(id) ON DELETE cascade ON UPDATE no action;
