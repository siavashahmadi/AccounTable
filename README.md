# AccounTable

An accountability partner web application that helps users achieve their goals through effective mutual accountability partnerships.

## Features

- User Authentication & Profile Management
- Partnership Formation and Management
- Goal Setting & Tracking
- Regular Check-ins
- In-app Messaging
- Progress Tracking & Visualization
- Email Notifications

## Tech Stack

- Frontend: React (Vite)
- Backend: Python (FastAPI)
- Database: Supabase
- Authentication: Supabase Auth
- Real-time Updates: Supabase Realtime

## Project Structure

```
accountable/
├── frontend/           # React frontend application
├── backend/           # Python FastAPI backend
└── docker/            # Docker configuration files
```

## Prerequisites

- Node.js (v18 or later)
- Python (3.10 or later)
- Docker and Docker Compose (for deployment)
- Supabase Account

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/accountable.git
cd accountable
```

2. Set up the frontend:
```bash
cd frontend
npm install
cp .env.example .env  # Configure your environment variables
npm run dev
```

3. Set up the backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Configure your environment variables
uvicorn main:app --reload
```

4. Configure Supabase:
- Create a new Supabase project
- Copy your project URL and anon key
- Update the environment variables in both frontend and backend

## Environment Variables

### Frontend (.env)
```
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_URL=http://localhost:8000
```

### Backend (.env)
```
SUPABASE_URL=your-supabase-project-url
SUPABASE_KEY=your-supabase-service-key
SMTP_SERVER=your-smtp-server
SMTP_PORT=587
SMTP_USERNAME=your-smtp-username
SMTP_PASSWORD=your-smtp-password
```

## Running with Docker

```bash
docker-compose up --build
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 