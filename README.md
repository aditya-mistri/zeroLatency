# ZeroLatency Connect

> A full-stack telehealth web platform that enables patients to connect with verified doctors for remote consultations.

## Live Demo
- **Frontend**: [https://zero-latency-rouge.vercel.app](https://zero-latency-rouge.vercel.app)
- **Backend API**: [https://zerolatency-xf57.onrender.com/api](https://zerolatency-xf57.onrender.com/api)
- **Always live - with the help of Cron-Jobs** 

## Project Overview

ZeroLatency Connect is a comprehensive telehealth platform featuring:
- **Patient Portal**: Register, find doctors, and book appointments
- **Doctor Dashboard**: Manage appointments and host video consultations  
- **Moderator Panel**: Verify doctor credentials and manage hospitals
- **Video Consultations**: Secure video calls with integrated chat
- **🆕 Live Transcription**: Real-time speech-to-text in 13+ languages to overcome dialect barriers
- **Mock Payments**: Simulated payment flow using Stripe test mode

## Product Gallery
<img width="1902" height="886" alt="image" src="https://github.com/user-attachments/assets/03dcd093-87e3-4bfe-8980-d42921d047d7" />
<img width="1901" height="879" alt="image" src="https://github.com/user-attachments/assets/3c015175-c9b2-44ac-93e4-9ca8b739b7bc" />

**Moderator**
<img width="1919" height="880" alt="image" src="https://github.com/user-attachments/assets/22544845-c72f-48a0-8ee4-3dfe234f7a46" />
<img width="1919" height="547" alt="image" src="https://github.com/user-attachments/assets/8d289496-71bf-455a-a0f6-689111b8da5c" />

**Doctor**
<img width="1903" height="911" alt="image" src="https://github.com/user-attachments/assets/6f5a159f-c105-4fb2-be4e-452659e5238c" />
<img width="1901" height="916" alt="image" src="https://github.com/user-attachments/assets/e1116479-2bc6-49c0-875c-d8ea731c63f6" />

**Paitent**
<img width="1918" height="911" alt="image" src="https://github.com/user-attachments/assets/e976388d-504d-4676-bce4-01377e88412d" />


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
- **Video Calls**: Stream.io Video SDK
- **Chat**: Stream.io Chat SDK
- **Live Transcription**: Web Speech API (Browser-based, FREE)
- **Payments**: Stripe (Test Mode)
- **File Storage**: Cloudinary

## Project Structure

```
ZeroLatency-connect/
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
## Development Phases

- [x] **Phase 1**: Foundation - Auth, roles, basic setup ✅
- [x] **Phase 2**: Doctor verification & moderation ✅
- [x] **Phase 3**: Appointment booking system ✅
- [x] **Phase 4**: Payment simulation ✅
- [x] **Phase 5**: Video calls & chat ✅
- [x] **Phase 6**: Live transcription (English & Hindi) ✅
- [ ] **Phase 7**: Medical records & history
- [ ] **Phase 8**: QA & final polish
| **Patient** | Register, book appointments, join consultations |
| **Doctor** | Manage profile, handle appointments, conduct consultations |
| **Moderator** | Verify doctors, manage hospitals, monitor platform |

## 🆕 Key Features

### Live Transcription
Real-time speech-to-text during video consultations to overcome language and dialect barriers.

**Features:**
- ✅ Real-time transcription in 13+ languages
- ✅ Support for multiple dialects (US, UK, Indian English, etc.)
- ✅ Download transcripts as text files
- ✅ Free to use (Web Speech API)
- ✅ Privacy-focused (all processing in browser)

**Supported Languages:**
🇺🇸 English (US/UK/India) | 🇪🇸 Spanish | 🇫🇷 French | 🇩🇪 German | 🇮🇹 Italian | 🇧🇷 Portuguese | 🇮🇳 Hindi | 🇨🇳 Chinese | 🇯🇵 Japanese | 🇰🇷 Korean | 🇸🇦 Arabic

📖 [Full Documentation](./docs/live-transcription.md) | [Quick Start Guide](./docs/transcription-quick-start.md)












