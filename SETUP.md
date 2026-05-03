# SupportAI Setup Guide

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- OpenAI API Key
- ChromaDB (for vector search)

## Quick Start

### 1. Configure Environment

Edit `backend/.env`:
```
MONGODB_URI=mongodb://localhost:27017/supportai
OPENAI_API_KEY=sk-your-key-here
CHROMA_URL=http://localhost:8000
JWT_SECRET=change-this-to-a-random-string
```

### 2. Start ChromaDB (Vector Database)

Using Docker:
```bash
docker run -p 8000:8000 chromadb/chroma
```

Or install locally:
```bash
pip install chromadb
chroma run --port 8000
```

### 3. Start MongoDB

```bash
# Local MongoDB
mongod --dbpath ./data/db

# Or use MongoDB Atlas (update MONGODB_URI in .env)
```

### 4. Seed the Database

```bash
cd backend
npm run seed
```

This creates:
- Admin: `admin@supportai.com` / `Admin@123456`
- Demo business: `demo@acme.com` / `Demo@123456`

### 5. Start the Application

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

Visit: http://localhost:5173

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│  Landing · Auth · Dashboard · Analytics · Admin Panel   │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP + WebSocket
┌──────────────────────▼──────────────────────────────────┐
│                  Express Backend                         │
│  Auth · KB Ingestion · Chat · Tickets · Analytics       │
└──────┬──────────────────────────────────┬───────────────┘
       │                                  │
┌──────▼──────┐                  ┌────────▼────────┐
│   MongoDB   │                  │    ChromaDB     │
│  Users      │                  │  Vector Store   │
│  Tenants    │                  │  (Embeddings)   │
│  Convos     │                  └─────────────────┘
│  Tickets    │                           │
└─────────────┘                  ┌────────▼────────┐
                                 │   OpenAI API    │
                                 │  GPT-4o-mini    │
                                 │  Embeddings     │
                                 └─────────────────┘
```

## Key Features

### Multi-Tenant
Each business gets isolated data. Tenant ID is derived from the authenticated user's account.

### Knowledge Base Ingestion
- **PDF**: Extracted via pdf-parse
- **Text/DOCX**: Direct file read
- **URL**: Scraped with cheerio
- **FAQ**: Structured Q&A pairs
- All content is chunked → embedded → stored in ChromaDB

### AI Chat Flow
1. Customer sends message
2. Query is embedded via OpenAI
3. ChromaDB returns top-K relevant chunks
4. GPT-4o-mini generates response with context
5. Confidence score calculated
6. If confidence < threshold → auto-create ticket

### Embedding Widget
Add to any website:
```html
<script>
  window.SupportAIConfig = { apiKey: "YOUR_API_KEY" };
</script>
<script src="https://cdn.supportai.com/widget.js" async></script>
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register business |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Current user |
| GET | /api/knowledge-base | List documents |
| POST | /api/knowledge-base/upload | Upload file |
| POST | /api/knowledge-base/url | Add URL |
| POST | /api/knowledge-base/faq | Add FAQs |
| POST | /api/chat/message | Send chat message |
| GET | /api/chat/conversations | List conversations |
| GET | /api/tickets | List tickets |
| PUT | /api/tickets/:id | Update ticket |
| GET | /api/analytics/overview | Analytics data |
| GET | /api/admin/stats | Admin stats |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| MONGODB_URI | MongoDB connection string | Yes |
| OPENAI_API_KEY | OpenAI API key | Yes |
| JWT_SECRET | JWT signing secret | Yes |
| CHROMA_URL | ChromaDB URL | Yes |
| FRONTEND_URL | Frontend URL for CORS | No |
| PORT | Backend port (default: 5000) | No |
