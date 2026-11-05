---
name: db-change
description: Workflow for changing the HOPE Supabase database (new table, column, policy, function or sample data). Use whenever a feature needs a schema change, so RLS stays correct and supabase/migrations/ matches the live database.
---

The live project is `lnzpkbazdutogwwhasix`. Changes go straight to the database the public dev site uses, so be careful and additive.

1. **Look first.** Use `list_tables` (verbose for the tables involved) and read the existing files in `supabase/migrations/` to match naming and conventions.
2. **Write the SQL** following the existing pattern:
   - `id uuid primary key default gen_random_uuid()`, `created_at timestamptz not null default now()`, and `is_published boolean not null default true` for public content;
   - `is_sample boolean not null default false` on any table that will hold mock rows;
   - `alter table ... enable row level security;` plus the two standard policies:
     - `"Read published <x>"` for select to anon, authenticated using `(is_published or (select private.is_admin()))`;
     - `"Admins manage <x>"` for all to authenticated using and with check `((select private.is_admin()))`;
   - private data goes in a separate admin-only table (like `student_private`), never in a public table's columns;
   - grant select to anon, authenticated and write privileges to authenticated, as the existing migrations do.
3. **Apply** it with the `apply_migration` MCP tool, using a snake_case name. Destructive statements (drop, delete, truncate) need the user's explicit confirmation first.
4. **Save the same SQL** to `supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql`, with the header comment "Applied to project lnzpkbazdutogwwhasix on <date>. Keep this file in sync with the database."
5. **Check security**: run `get_advisors` with type `security`. The `get_team()` SECURITY DEFINER warning is known and intentional; anything new must be fixed.
6. **Test RLS with the public key** (values in `.env.local`):
   - `curl "$VITE_SUPABASE_URL/rest/v1/<table>?select=*&limit=3" -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY"` returns only published, public rows;
   - an anonymous POST must fail (401 or 403).
7. **Wire it up**:
   - public reads in `src/lib/data.js`;
   - an admin tab (`crudView` config in `src/admin/crud.js` plus a tab entry in `src/admin/admin.js`);
   - if it has sample rows, add the table to `TABLES` in `src/admin/sample.js`;
   - a row in the README's data table.
