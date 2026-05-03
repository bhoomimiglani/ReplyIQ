# ReplyIQ - AI-Powered SaaS Customer Support Platform

A full-stack multi-tenant SaaS platform that automates customer support using AI.

## Tech Stack

**Frontend:** React 18, Vite, TailwindCSS, Socket.io-client, React Query, Zustand  
**Backend:** Node.js, Express, MongoDB, Mongoose, Socket.io  
**AI/ML:** OpenAI GPT-4, OpenAI Embeddings, ChromaDB (vector store)  
**Auth:** JWT + bcrypt  
**File Processing:** Multer, pdf-parse, cheerio (URL scraping)

## Features

- Multi-tenant architecture (businesses as tenants)
- Knowledge base ingestion (PDFs, text, URLs)
- Semantic search with vector embeddings
- AI chatbot with conversation memory
- Tone/style customization
- Ticket escalation system
- Real-time chat via WebSockets
- Business dashboard with analytics
- Admin panel

## Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- OpenAI API Key
- ChromaDB running locally or via Docker

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Fill in your environment variables
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### ChromaDB (Vector Store)
```bash
docker run -p 8000:8000 chromadb/chroma
```

## Environment Variables

See `backend/.env.example` for required variables.

## Architecture

```
frontend/          # React SPA
backend/
  src/
    config/        # DB, AI, vector store config
    controllers/   # Route handlers
    middleware/    # Auth, error handling, upload
    models/        # Mongoose schemas
    routes/        # Express routers
    services/      # Business logic (AI, ingestion, etc.)
    utils/         # Helpers
    socket/        # Socket.io handlers
  server.js
```
