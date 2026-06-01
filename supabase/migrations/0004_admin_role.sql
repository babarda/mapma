-- MAPMA admin access.
-- The profiles.role column already exists (0001_init.sql): member | moderator | admin.
-- The admin dashboard (/admin) is gated on role = 'admin', checked server-side
-- with the service-role key. No schema change is needed — you only need to
-- promote the owner account.
--
-- Run this ONCE in the Supabase SQL editor, replacing the email with yours.
-- It creates a profile row if one doesn't exist yet, then sets the role.

insert into public.profiles (id, role)
select id, 'admin'
from auth.users
where email = 'REPLACE_WITH_YOUR_EMAIL@example.com'
on conflict (id) do update set role = 'admin';

-- Verify:
-- select p.id, u.email, p.role
-- from public.profiles p join auth.users u on u.id = p.id
-- where p.role = 'admin';
