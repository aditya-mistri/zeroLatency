# Render Deployment Configuration

## Backend (Express API)

### Build Command
```bash
cd server && npm install && npm run build && npx prisma generate
```

### Start Command
```bash
cd server && npm start
```

### Environment Variables
```
DATABASE_URL=postgresql://username:password@dpg-xxx.oregon-postgres.render.com/database_name
JWT_SECRET=your-production-jwt-secret-key-very-secure
JWT_EXPIRES_IN=7d
NODE_ENV=production
PORT=10000
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
```

### Auto-Deploy
- Connect your GitHub repository
- Set branch to `main`
- Render will auto-deploy on push

## Frontend (Next.js)

### Vercel Deployment

1. **Connect Repository**: Import your GitHub repo to Vercel
2. **Configure Build Settings**:
   - Framework Preset: Next.js
   - Build Command: `cd client && npm run build`
   - Output Directory: `client/.next`
   - Install Command: `cd client && npm install`

3. **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://your-render-backend.onrender.com/api
   ```

4. **Deploy**: Automatic deployment on push to main branch

## Database Setup (NeonDB)

1. **Create Account**: Sign up at neon.tech
2. **Create Database**: 
   - Name: `telehealth_connect`
   - Region: Choose closest to your users
3. **Get Connection String**: Copy the PostgreSQL connection URL
4. **Update Environment**: Add DATABASE_URL to Render

## Deployment Checklist

### Pre-Deployment
- [ ] Test all authentication flows locally
- [ ] Verify database schema with `prisma migrate dev`
- [ ] Test API endpoints with frontend
- [ ] Update CORS origins in server
- [ ] Set production JWT secret

### Post-Deployment
- [ ] Run database migrations on production
- [ ] Test user registration/login
- [ ] Verify role-based access control
- [ ] Test frontend-backend connectivity
- [ ] Monitor logs for errors

## Phase 1 Deployment URLs

- **Frontend**: https://telehealth-connect-frontend.vercel.app
- **Backend**: https://telehealth-connect-api.onrender.com
- **Health Check**: https://telehealth-connect-api.onrender.com/health