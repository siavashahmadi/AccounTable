# Database Setup for AccounTable

This directory contains the database schema and configuration for the AccounTable application.

## Setting up the Database in Supabase

1. **Create a new Supabase project**:
   - Go to [https://app.supabase.io/](https://app.supabase.io/)
   - Click "New Project" and follow the instructions
   - Copy your project URL and anon key to your `.env` file

2. **Run the schema.sql script**:
   - Navigate to the SQL Editor in your Supabase project
   - Copy the entire content of `schema.sql` from this directory
   - Paste it into the SQL Editor and click "Run"
   - This will create all necessary tables and RLS policies

3. **Enable Database Extensions**:
   - Navigate to Database > Extensions in your Supabase project
   - Make sure the following extensions are enabled:
     - `uuid-ossp` (for generating UUIDs)
     - `pgcrypto` (for cryptographic functions)

4. **Configure Authentication**:
   - Navigate to Authentication > Settings
   - Enable Email authentication
   - Configure any other auth providers you want to use
   - (Optional) Configure Email templates

5. **Configure Storage** (if using avatar uploads):
   - Navigate to Storage
   - Create a new bucket called `avatars`
   - Set the privacy to public (or configure appropriate RLS policies)

## Troubleshooting Common Issues

### User Records Not Being Created

If user records are not being automatically created in the `users` table when signing up:

1. Check if the `handle_new_user` trigger is working:
   - Run this SQL to test: 
     ```sql
     SELECT * FROM pg_trigger;
     ```
   - Look for `on_auth_user_created` in the results

2. Manually create the user record:
   ```sql
   INSERT INTO public.users (id, email, first_name, last_name, time_zone)
   VALUES ('YOUR_AUTH_USER_ID', 'email@example.com', 'First', 'Last', 'UTC');
   ```

### Row Level Security Issues

If you're getting "permission denied" errors, check:

1. That RLS is properly enabled on the table
2. That appropriate policies exist for the operation you're trying to perform
3. That you're authenticated properly
4. Run this query to check your current user ID:
   ```sql
   SELECT auth.uid();
   ```
   
## Database Schema

The application uses the following tables:

- `users`: User profiles
- `partnerships`: Accountability partnerships between two users
- `goals`: Goals set by users within partnerships
- `check_ins`: Scheduled check-in meetings
- `progress_updates`: Updates on goal progress
- `messages`: Communication between partners

## Migrations

For future database changes, create a new SQL file in this directory with a timestamp prefix:
- Example: `20230501123000_add_notification_preferences.sql`

Apply migrations in order to keep your database schema up to date. 