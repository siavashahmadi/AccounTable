# AccounTable - Accountability Partner Web App

AccounTable is a web application that connects users as accountability partners to help them achieve their goals through effective mutual accountability. The application is built using React for the frontend, Python for the backend/API, and Supabase for authentication and data storage.

## Core Features

- **User Authentication & Profile**: Secure registration and login with personal information and preferences
- **Partnership Formation**: Guided partner selection with trial periods and compatibility matching
- **Goal Setting & Tracking**: SMART goal creation with progress visualization
- **Communication System**: In-app messaging and scheduled check-ins
- **Accountability Features**: Progress tracking, milestone celebrations, and check-in management
- **Feedback System**: Guided feedback templates promoting positive reinforcement

## Database Setup in Supabase

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

5. **Configure Storage**:
   - Navigate to Storage
   - Create a new bucket called `avatars`
   - Set the privacy to public (or configure appropriate RLS policies)

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  avatar_url TEXT,
  time_zone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Partnerships Table
```sql
CREATE TABLE partnerships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_one UUID REFERENCES users(id) NOT NULL,
  user_two UUID REFERENCES users(id) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'trial', 'active', 'ended')),
  trial_end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_one, user_two)
);
```

### Goals Table
```sql
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  partnership_id UUID REFERENCES partnerships(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'abandoned')),
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  target_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Check-ins Table
```sql
CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partnership_id UUID REFERENCES partnerships(id) NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Progress Updates Table
```sql
CREATE TABLE progress_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID REFERENCES goals(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  description TEXT NOT NULL,
  progress_value NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Messages Table
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partnership_id UUID REFERENCES partnerships(id) NOT NULL,
  sender_id UUID REFERENCES users(id) NOT NULL,
  content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Troubleshooting Common Issues

### User Records Not Being Created

If user records are not being automatically created in the `users` table when signing up:

1. Check if the `handle_new_user` trigger is working:
   ```sql
   SELECT * FROM pg_trigger;
   ```
   Look for `on_auth_user_created` in the results

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

## Performance Considerations

1. **Real-time Updates**
   - Utilize Supabase's real-time capabilities for instant message delivery
   - Implement efficient polling for notifications and updates

2. **Database Efficiency**
   - Implement proper indexing for frequent queries
   - Use appropriate caching strategies
   - Monitor query performance

## Migrations

For future database changes:

1. Create a new SQL file in this directory with a timestamp prefix:
   - Example: `20230501123000_add_notification_preferences.sql`

2. Follow these guidelines for migrations:
   - Make changes atomic and focused
   - Include both "up" and "down" migration scripts
   - Test migrations thoroughly before applying to production
   - Document any manual steps required

Apply migrations in order to keep your database schema up to date.

## Security Best Practices

1. **Data Protection**
   - Implement proper Row Level Security (RLS) policies
   - Encrypt sensitive data
   - Regular security audits

2. **Authentication**
   - Use secure password policies
   - Implement MFA where possible
   - Regular session management

3. **Privacy**
   - Clear data sharing policies
   - User consent management
   - Data retention policies 