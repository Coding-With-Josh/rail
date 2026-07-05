-- Seed a test organization, device, and device_identifiers mapping for local testing
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING)

INSERT INTO public.organizations (id, name, slug, created_at)
VALUES ('org-test-mac', 'Test Org (MAC)', 'test-org-mac', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.devices (id, device_id, organization_id, secret_hash, firmware_version, capabilities, device_type, is_online, is_revoked, geofence_status, enrolled_at, updated_at)
VALUES (
  'device-test-mac-1',
  lower('25:06:27:19:00:8D'),
  'org-test-mac',
  '<seeded-no-secret>',
  'unknown',
  '{}',
  'mobile',
  false,
  false,
  'unknown',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Insert device_identifiers mapping for the provided MAC (normalized to lowercase)
INSERT INTO public.device_identifiers (id, device_id, identifier_type, identifier_value, created_at)
VALUES (
  gen_random_uuid(),
  'device-test-mac-1',
  'mac',
  lower('25:06:27:19:00:8D'),
  now()
)
ON CONFLICT (identifier_value) DO NOTHING;
