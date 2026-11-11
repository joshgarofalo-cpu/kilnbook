-- Sample data so the app has something to show. Same made-up pieces as the demo.
-- Run after schema.sql. Replace with Jessie and Risa's real piece list when you have it.
--
-- BEFORE running: add your login in Supabase (Authentication -> Users -> Add user)
-- and put that email address on the line marked CHANGE ME.

with studio as (
  insert into studios (name) values ('Sample Pottery Studio') returning id
),
owner as (
  insert into studio_members (studio_id, user_id, role)
  select studio.id, u.id, 'owner'
  from studio, auth.users u
  where u.email = 'you@example.com'   -- CHANGE ME
  returning studio_id
),
new_items as (
  insert into items (studio_id, name, singular_label, plural_label, cost, price, qty, reorder_point, supplier)
  select studio.id, v.* from studio, (values
    ('Coffee mug',      'mug',    'mugs',    4.25, 22.00, 18, 12, 'Mayco'),
    ('Dinner plate',    'plate',  'plates',  5.50, 28.00,  9, 10, 'Mayco'),
    ('Small bowl',      'bowl',   'bowls',   3.75, 18.00, 22, 12, 'Duncan'),
    ('Piggy bank',      'piggy bank', 'piggy banks', 6.80, 32.00, 4, 6, 'Duncan'),
    ('Ornament',        'ornament', 'ornaments', 1.20, 10.00, 40, 24, 'Mayco')
  ) as v(name, singular_label, plural_label, cost, price, qty, reorder_point, supplier)
  returning id, name, studio_id
),
t1 as (
  insert into tickets (studio_id, customer_name, phone, shelf, status)
  select id, 'Maya Chen', '+15405550142', 'A1', 'painted' from studio returning id, studio_id
),
t2 as (
  insert into tickets (studio_id, customer_name, phone, note, shelf, status, kiln_at)
  select id, 'Rivera family', '+15405550178', 'Birthday party', 'A2', 'kiln', now() from studio returning id, studio_id
)
insert into ticket_lines (studio_id, ticket_id, item_id, qty)
select t1.studio_id, t1.id, i.id, 1 from t1, new_items i where i.name = 'Coffee mug'
union all
select t2.studio_id, t2.id, i.id, 3 from t2, new_items i where i.name = 'Small bowl';
