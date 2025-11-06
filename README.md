# 🏥 TeleHealth Connect

> A full-stack Telehealth web platform that enables patients to connect with verified doctors for remote consultations.

## Live Demo
- **Frontend**: [https://zero-latency-rouge.vercel.app](https://zero-latency-rouge.vercel.app)
- **Backend API**: [https://zerolatency-xf57.onrender.com/api](https://zerolatency-xf57.onrender.com/api)
- **Local Development**: Frontend on port 5173, Backend on port 5000

## Project Overview

ZeroLatency Connect is a comprehensive telehealth platform featuring:
- **Patient Portal**: Register, find doctors, and book appointments
- **Doctor Dashboard**: Manage appointments and host video consultations  
- **Moderator Panel**: Verify doctor credentials and manage hospitals
- **Video Consultations**: Secure video calls with chat and transcription
- **Mock Payments**: Simulated payment flow using Stripe test mode

## Tech Stack

### Frontend
- **Framework**: Next.js 14 with TypeScript
- **Styling**: TailwindCSS
- **Deployment**: Vercel

### Backend  
- **Runtime**: Node.js with Express
- **Database**: PostgreSQL (NeonDB)
- **ORM**: Prisma
- **Authentication**: JWT
- **Deployment**: Render

### Additional Services
- **Video Calls**: WebRTC / Daily.co
- **Transcription**: Deepgram / Whisper API
- **Payments**: Stripe (Test Mode)
- **File Storage**: Cloudinary

## Project Structure

```
telehealth-connect/
├── client/                 # Next.js frontend
│   ├── app/                # App router pages
│   ├── components/         # Reusable UI components
│   ├── lib/                # Utility functions & API calls
│   └── styles/             # Global styles
├── server/                 # Express backend
│   ├── routes/             # API routes
│   ├── controllers/        # Business logic
│   ├── middleware/         # Auth & validation
│   ├── prisma/             # Database schema
│   └── utils/              # Helper functions
└── docs/                   # Documentation
```

## Deployment

### Backend (Render)
1. Connect your GitHub repo to Render
2. Set environment variables
3. Deploy automatically on push

### Frontend (Vercel)
1. Import project from GitHub
2. Configure build settings
3. Deploy with automatic previews

## Development Phases

- [x] **Phase 1**: Foundation - Auth, roles, basic setup ✅
- [x] **Phase 2**: Doctor verification & moderation ✅
- [x] **Phase 3**: Appointment booking system ✅
- [ ] **Phase 4**: Payment simulation
- [ ] **Phase 5**: Video calls & chat
- [ ] **Phase 6**: Transcription & records
- [ ] **Phase 7**: QA & final polish

## User Roles

| Role | Capabilities |
|------|-------------|
| **Patient** | Register, book appointments, join consultations |
| **Doctor** | Manage profile, handle appointments, conduct consultations |
| **Moderator** | Verify doctors, manage hospitals, monitor platform |



