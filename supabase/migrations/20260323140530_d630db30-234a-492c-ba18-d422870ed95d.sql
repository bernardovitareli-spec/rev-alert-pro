
-- Assign admin role to vitareli@mcterraplenagem.com
-- Using security definer function to access auth.users
CREATE OR REPLACE FUNCTION public.assign_admin_by_email(target_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email LIMIT 1;
  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;

SELECT public.assign_admin_by_email('vitareli@mcterraplenagem.com');

-- Clean up the helper function
DROP FUNCTION public.assign_admin_by_email(text);
