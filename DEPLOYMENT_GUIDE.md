# 🚀 EthioBus Deployment Guide

Complete guide to deploy your bus reservation system with real-time seat locking to production.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Option 1: Render (Recommended)](#option-1-render-recommended)
3. [Option 2: Vercel + Railway](#option-2-vercel--railway)
4. [Option 3: AWS](#option-3-aws)
5. [Database Setup (MongoDB Atlas)](#database-setup-mongodb-atlas)
6. [Environment Variables](#environment-variables)
7. [Post-Deployment](#post-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- ✅ GitHub account with your code pushed
- ✅ MongoDB Atlas account (free tier available)
- ✅ Payment gateway credentials (Chapa, Stripe)
- ✅ Domain name (optional but recommended)

---

## Option 1: Render (Recommended - Free Tier)

**Best for**: Full-stack apps with WebSocket support
**Cost**: Free tier available
**Pros**: Easy setup, WebSocket support, auto-deploy from GitHub

### Step 1: Setup MongoDB Atlas

1. **Create MongoDB Atlas Account**
   - Go to https://www.mongodb.com/cloud/atlas
   - Sign up for free account
   - Create a new cluster (M0 Free tier)

2. **Configure Database**
   ```
   - Cluster Name: ethiobus-cluster
   - Provider: AWS
   - Region: Choose closest to your users (e.g., eu-west-1)
   ```

3. **Create Database User**
   ```
   - Username: ethiobus_admin
   - Password: [Generate strong password]
   - Save credentials securely!
   ```

4. **Whitelist IP Addresses**
   ```
   - Click "Network Access"
   - Add IP Address: 0.0.0.0/0 (Allow from anywhere)
   - Note: For production, restrict to specific IPs
   ```

5. **Get Connection String**
   ```
   - Click "Connect"
   - Choose "Connect your application"
   - Copy connection string:
   mongodb+srv://ethiobus_admin:<password>@ethiobus-cluster.xxxxx.mongodb.net/ethiobusdb?retryWrites=true&w=majority
   ```

### Step 2: Deploy Backend to Render

1. **Create Render Account**
   - Go to https://render.com
   - Sign up with GitHub

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select your repo: `bus-reservation-system`

3. **Configure Backend Service**
   ```
   Name: ethiobus-backend
   Region: Choose closest to users
   Branch: main
   Root Directory: backend
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: python run.py
   ```

4. **Add Environment Variables**
   ```
   SECRET_KEY=your-secret-key-here-generate-random-string
   JWT_SECRET_KEY=your-jwt-secret-key-here-generate-random-string
   MONGO_URI=mongodb+srv://ethiobus_admin:YOUR_PASSWORD@ethiobus-cluster.xxxxx.mongodb.net/ethiobusdb?retryWrites=true&w=majority
   PORT=5000
   DEBUG=False
   
   # Payment Gateways
   CHAPA_SECRET_KEY=your-chapa-secret-key
   CHAPA_PUBLIC_KEY=your-chapa-public-key
   CHAPA_BASE_URL=https://api.chapa.co/v1
   
   STRIPE_SECRET_KEY=your-stripe-secret-key
   STRIPE_PUBLIC_KEY=your-stripe-public-key
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Note your backend URL: `https://ethiobus-backend.onrender.com`

### Step 3: Deploy Frontend to Render

1. **Create New Static Site**
   - Click "New +" → "Static Site"
   - Connect same GitHub repository

2. **Configure Frontend Service**
   ```
   Name: ethiobus-frontend
   Branch: main
   Root Directory: frontend
   Build Command: npm install && npm run build
   Publish Directory: dist
   ```

3. **Add Environment Variables**
   ```
   VITE_API_URL=https://ethiobus-backend.onrender.com
   VITE_CHAPA_PUBLIC_KEY=your-chapa-public-key
   VITE_STRIPE_PUBLIC_KEY=your-stripe-public-key
   ```

4. **Deploy**
   - Click "Create Static Site"
   - Wait for deployment (3-5 minutes)
   - Your site will be live at: `https://ethiobus-frontend.onrender.com`

### Step 4: Start Cleanup Task

1. **Create Background Worker**
   - Click "New +" → "Background Worker"
   - Connect same repository
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python -m app.utils.cleanup_locks`

2. **Add Same Environment Variables** as backend

3. **Deploy**
   - This will run the seat lock cleanup task continuously

---

## Option 2: Vercel + Railway

**Best for**: Separate frontend/backend hosting
**Cost**: Free tier available

### Frontend on Vercel

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy Frontend**
   ```bash
   cd frontend
   vercel
   ```

3. **Configure**
   - Follow prompts
   - Add environment variables in Vercel dashboard

### Backend on Railway

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Deploy Backend**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Set root directory to `backend`

3. **Add Environment Variables** in Railway dashboard

---

## Option 3: AWS (Advanced)

### Backend on AWS Elastic Beanstalk

1. **Install AWS CLI**
   ```bash
   pip install awsebcli
   ```

2. **Initialize**
   ```bash
   cd backend
   eb init -p python-3.9 ethiobus-backend
   ```

3. **Create Environment**
   ```bash
   eb create ethiobus-backend-env
   ```

4. **Deploy**
   ```bash
   eb deploy
   ```

### Frontend on AWS S3 + CloudFront

1. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Upload to S3**
   ```bash
   aws s3 sync dist/ s3://ethiobus-frontend
   ```

3. **Configure CloudFront** for CDN

---

## Database Setup (MongoDB Atlas)

### Create Database and Collections

1. **Connect to MongoDB**
   ```bash
   mongosh "mongodb+srv://ethiobus-cluster.xxxxx.mongodb.net/ethiobusdb" --username ethiobus_admin
   ```

2. **Create Indexes** (Important for performance!)
   ```javascript
   // Seat locks indexes
   db.seat_locks.createIndex({ schedule_id: 1, seat_number: 1 })
   db.seat_locks.createIndex({ expires_at: 1 })
   db.seat_locks.createIndex({ user_id: 1 })
   
   // Bookings indexes
   db.bookings.createIndex({ schedule_id: 1 })
   db.bookings.createIndex({ user_id: 1 })
   db.bookings.createIndex({ pnr_number: 1 }, { unique: true })
   
   // Schedules indexes
   db.busschedules.createIndex({ departure_date: 1 })
   db.busschedules.createIndex({ origin_city: 1, destination_city: 1 })
   
   // Users indexes
   db.users.createIndex({ email: 1 }, { unique: true })
   db.users.createIndex({ phone: 1 })
   ```

3. **Create TTL Index** for automatic lock cleanup
   ```javascript
   db.seat_locks.createIndex(
     { expires_at: 1 }, 
     { expireAfterSeconds: 0 }
   )
   ```

---

## Environment Variables

### Backend (.env)

```env
# Flask Configuration
SECRET_KEY=generate-random-64-char-string
DEBUG=False
PORT=5000

# Database
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/ethiobusdb?retryWrites=true&w=majority

# JWT
JWT_SECRET_KEY=generate-random-64-char-string

# Chapa Payment (Ethiopian)
CHAPA_SECRET_KEY=CHASECK_TEST-xxxxxxxxxxxxxxxxxx
CHAPA_PUBLIC_KEY=CHAPUBK_TEST-xxxxxxxxxxxxxxxxxx
CHAPA_BASE_URL=https://api.chapa.co/v1

# Stripe Payment (International)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxx
STRIPE_PUBLIC_KEY=pk_live_xxxxxxxxxxxxxxxxxx

# CORS (Add your frontend URL)
CORS_ORIGINS=https://your-frontend-url.com
```

### Frontend (.env)

```env
# API Configuration
VITE_API_URL=https://your-backend-url.com

# Payment Configuration
VITE_CHAPA_PUBLIC_KEY=CHAPUBK_TEST-xxxxxxxxxxxxxxxxxx
VITE_STRIPE_PUBLIC_KEY=pk_live_xxxxxxxxxxxxxxxxxx
```

### Generate Secure Keys

```bash
# Generate SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(64))"

# Generate JWT_SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

---

## Post-Deployment Checklist

### 1. Test Core Features

- [ ] User registration and login
- [ ] Search for schedules
- [ ] Real-time seat selection
- [ ] WebSocket connection (check browser console)
- [ ] Seat locking (test with 2 browsers)
- [ ] Booking creation
- [ ] Payment processing
- [ ] Ticket generation
- [ ] Ticketer walk-in booking

### 2. Test Real-Time Features

- [ ] Open 2 browsers (customer + ticketer)
- [ ] Select same schedule
- [ ] Select different seats
- [ ] Verify seats show as orange for other user
- [ ] Complete booking in one browser
- [ ] Verify seat turns red in other browser

### 3. Performance Testing

```bash
# Test API response time
curl -w "@curl-format.txt" -o /dev/null -s https://your-backend-url.com/

# Test WebSocket connection
# Open browser console and check for:
# ✅ WebSocket connected: xxxxx
```

### 4. Security Checklist

- [ ] HTTPS enabled (SSL certificate)
- [ ] Environment variables secured
- [ ] MongoDB IP whitelist configured
- [ ] CORS properly configured
- [ ] JWT tokens working
- [ ] Password hashing enabled
- [ ] Rate limiting configured (optional)

### 5. Monitoring Setup

**Render Dashboard:**
- Check logs for errors
- Monitor CPU/Memory usage
- Set up alerts for downtime

**MongoDB Atlas:**
- Monitor database performance
- Check connection count
- Set up backup schedule

---

## Custom Domain Setup

### 1. Purchase Domain
- Namecheap, GoDaddy, or Google Domains
- Example: `ethiobus.com`

### 2. Configure DNS (Render)

**For Frontend:**
```
Type: CNAME
Name: www
Value: ethiobus-frontend.onrender.com
```

**For Backend:**
```
Type: CNAME
Name: api
Value: ethiobus-backend.onrender.com
```

### 3. Update Environment Variables

```env
# Frontend
VITE_API_URL=https://api.ethiobus.com

# Backend
CORS_ORIGINS=https://www.ethiobus.com,https://ethiobus.com
```

---

## Troubleshooting

### WebSocket Not Connecting

**Problem**: "WebSocket connection failed"

**Solutions**:
1. Check if backend supports WebSocket (Render does by default)
2. Verify CORS settings include WebSocket origins
3. Check browser console for specific errors
4. Ensure using `wss://` (secure WebSocket) in production

### Database Connection Failed

**Problem**: "MongoServerError: Authentication failed"

**Solutions**:
1. Verify MongoDB connection string
2. Check username/password are correct
3. Ensure IP whitelist includes 0.0.0.0/0
4. Test connection string locally first

### Seat Locks Not Expiring

**Problem**: Locks stay forever

**Solutions**:
1. Ensure cleanup task is running
2. Check TTL index is created
3. Verify MongoDB Atlas version supports TTL
4. Check cleanup task logs

### Payment Gateway Errors

**Problem**: "Payment initialization failed"

**Solutions**:
1. Verify API keys are correct
2. Check if using test/live keys appropriately
3. Ensure callback URLs are whitelisted
4. Check payment gateway dashboard for errors

### Build Failures

**Problem**: Deployment fails during build

**Solutions**:
```bash
# Frontend build issues
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build

# Backend build issues
cd backend
rm -rf venv
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

---

## Scaling Considerations

### When to Scale

- More than 100 concurrent users
- Response time > 2 seconds
- Database queries slow
- WebSocket connections dropping

### Scaling Options

1. **Horizontal Scaling**
   - Add Redis for WebSocket scaling
   - Use load balancer
   - Multiple backend instances

2. **Database Scaling**
   - Upgrade MongoDB Atlas tier
   - Add read replicas
   - Implement caching (Redis)

3. **CDN for Frontend**
   - CloudFlare
   - AWS CloudFront
   - Faster global access

---

## Maintenance

### Daily Tasks
- [ ] Check error logs
- [ ] Monitor WebSocket connections
- [ ] Check database performance

### Weekly Tasks
- [ ] Review seat lock cleanup logs
- [ ] Check payment gateway transactions
- [ ] Monitor disk space usage

### Monthly Tasks
- [ ] Update dependencies
- [ ] Review security patches
- [ ] Backup database
- [ ] Performance optimization

---

## Cost Estimates

### Free Tier (Render + MongoDB Atlas)
- **Backend**: Free (750 hours/month)
- **Frontend**: Free
- **Database**: Free (512MB storage)
- **Total**: $0/month
- **Limitations**: Sleeps after 15 min inactivity

### Paid Tier (Recommended for Production)
- **Backend**: $7/month (always on)
- **Frontend**: Free
- **Database**: $9/month (2GB storage)
- **Domain**: $12/year
- **Total**: ~$16/month + $12/year

### Enterprise Tier
- **Backend**: $25/month (2GB RAM)
- **Frontend**: $19/month (CDN)
- **Database**: $57/month (10GB storage)
- **Total**: ~$101/month

---

## Support & Resources

### Documentation
- Render: https://render.com/docs
- MongoDB Atlas: https://docs.atlas.mongodb.com
- Vercel: https://vercel.com/docs
- Railway: https://docs.railway.app

### Community
- GitHub Issues: Report bugs
- Stack Overflow: Technical questions
- Discord: Real-time help

---

## Quick Deploy Commands

### Deploy to Render (One-Click)

1. **Fork Repository** on GitHub

2. **Click Deploy Button** (add to README):
   ```markdown
   [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)
   ```

3. **Configure** environment variables

4. **Deploy** automatically

---

## Success Checklist

After deployment, verify:

- ✅ Frontend loads at your URL
- ✅ Backend API responds
- ✅ WebSocket connects (check console)
- ✅ Can register/login
- ✅ Can search schedules
- ✅ Can select seats (real-time)
- ✅ Seats lock properly
- ✅ Can complete booking
- ✅ Payment works
- ✅ Ticketer booking works
- ✅ All channels synchronized

---

## 🎉 Congratulations!

Your EthioBus reservation system with real-time seat locking is now live in production!

**Next Steps:**
1. Share the URL with users
2. Monitor performance
3. Collect feedback
4. Iterate and improve

---

*Deployment Guide - December 10, 2024*
*For EthioBus Real-Time Seat Reservation System*
