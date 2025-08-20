# Video AI Platform

A modern video editing platform with AI-powered features built with React, Vite, and Supabase.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+ (for AI worker)
- Docker (optional)

### Frontend Setup

1. **Clone and install dependencies**
```bash
npm install
```

2. **Environment setup**
```bash
cp .env.example .env
# Edit .env with your actual values
```

3. **Start development server**
```bash
npm run dev
```

### AI Worker Setup

1. **Navigate to AI worker directory**
```bash
cd ai-worker
```

2. **Option A: Docker (Recommended)**
```bash
./deploy.sh docker
```

3. **Option B: Local Python**
```bash
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 🌐 Deployment

### Frontend (Vercel)

1. **Connect repository to Vercel**
2. **Set environment variables** from `.env.example`
3. **Deploy** - Vercel will auto-detect Vite configuration

### AI Worker

#### Fly.io (Recommended)
```bash
cd ai-worker
./deploy.sh fly
```

#### Render
```bash
cd ai-worker
./deploy.sh render
```

#### Manual Docker
```bash
cd ai-worker
docker build -t ai-worker .
docker run -p 8000:8000 --env-file .env ai-worker
```

## 🔧 Configuration

### Environment Variables

**Frontend (.env)**
- `VITE_SUPABASE_*` - Supabase configuration

**AI Worker**
- `OPENAI_API_KEY` - OpenAI API key
- `AI_WORKER_URL` - Public URL of the worker

### Supabase Setup

1. **Create Supabase project**
2. **Run migrations** (auto-applied via Lovable)
3. **Set up storage buckets**
4. **Configure Edge Functions**

## 📚 Architecture

```
Frontend (React/Vite) → Supabase Edge Functions → AI Worker (Python/FastAPI)
```

- **Frontend**: React with Vite, Tailwind CSS, Supabase client
- **Backend**: Supabase (Auth, Database, Storage, Edge Functions)
- **AI Worker**: FastAPI service for video/audio processing

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Project Structure

```
src/
├── components/      # React components
├── pages/          # Route components
├── contexts/       # React contexts
├── hooks/          # Custom hooks
├── lib/            # Utilities
├── integrations/   # Supabase integration
└── styles/         # Styling

ai-worker/
├── main.py         # FastAPI application
├── requirements.txt
├── Dockerfile
└── deploy.sh       # Deployment script
```

## 🔐 Security

- Row Level Security (RLS) enabled on all tables
- Authentication via Supabase Auth
- API keys managed via Supabase secrets
- CORS properly configured

## 📖 API Documentation

### AI Worker Endpoints

- `GET /health` - Health check
- `POST /analyze/beats` - Audio beat analysis
- `POST /analyze/scenes` - Video scene detection
- `POST /generate/captions` - AI caption generation
- `POST /timeline/compile` - Video timeline compilation

Visit `https://your-ai-worker-url/docs` for interactive API documentation.

## 🆘 Troubleshooting

### Common Issues

1. **AI Worker not accessible**
   - Check `AI_WORKER_URL` environment variable
   - Verify worker is running and healthy

2. **Supabase connection issues**
   - Verify `VITE_SUPABASE_*` variables
   - Check network connectivity

3. **File upload failures**
   - Check storage bucket policies
   - Verify authentication

### Logs

- **Frontend**: Browser console
- **AI Worker**: Container/service logs
- **Supabase**: Dashboard logs section
