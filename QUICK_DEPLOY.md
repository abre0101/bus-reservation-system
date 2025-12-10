# 🚀 Quick Deploy Guide - 15 Minutes to Production

Get your EthioBus system live in 15 minutes!

---

## Step 1: MongoDB Atlas (5 minutes)

1. **Go to** https://www.mongodb.com/cloud/atlas
2. **Sign up** for free account
3. **Create cluster** (M0 Free tier)
4. **Create database user**:
   - Username: `ethiobus_admin`
   - Password: [Generate strong password - SAVE IT!]
5. **Whitelist IP**: Add `0.0.0.0/0`
6. **Get connection string**:
   ```
   mongodb+srv://ethiobus_admin:YOUR_PASSWORD@cluster.mongodb.net/ethiobusdb
   ```
7. **Save this string** - you'll need it!

---

## Step 2: Deploy to Render (10 minutes)

### A. Backend (5 minutes)

1. **Go to** https://render.com
2. **Sign up** with GitHub
3. **New Web Service** → Connect your repo
4. **Configure**:
   ```
   Name: ethiobus-backend
   Root Directory: backend
   Build Command: pip install -r requirements.txt
   Start Command: python run.py
   ```
5. **Add Environment Variables**:
   ```
   MONGO_URI = [Your MongoDB connection string from Step 1]
   SECRET_KEY = [Click "Generate" button]
   JWT_SECRET_KEY = [Click "Generate" button]
   PORT = 5000
   DEBUG = False
   ```
6. **Click "Create Web Service"**
7. **Wait 5 minutes** for deployment
8. **Copy your backend URL**: `https://ethiobus-backend-xxxx.onrender.com`

### B. Frontend (3 minutes)

1. **New Static Site** → Same repo
2. **Configure**:
   ```
   Name: ethiobus-frontend
   Root Directory: frontend
   Build Command: npm install && npm run build
   Publish Directory: dist
   ```
3. **Add Environment Variable**:
   ```
   VITE_API_URL = [Your backend URL from above]
   ```
4. **Click "Create Static Site"**
5. **Wait 3 minutes** for deployment
6. **Your site is live!** 🎉

### C. Cleanup Worker (2 minutes)

1. **New Background Worker** → Same repo
2. **Configure**:
   ```
   Name: ethiobus-cleanup
   Root Directory: backend
   Build Command: pip install -r requirements.txt
   Start Command: python -m app.utils.cleanup_locks
   ```
3. **Add same MONGO_URI** from backend
4. **Click "Create Background Worker"**

---

## Step 3: Create Database Indexes (2 minutes)

1. **Go to MongoDB Atlas** → Your cluster
2. **Click "Collections"** → "Create Database"
   - Database: `ethiobusdb`
3. **Open MongoDB Shell** (bottom left)
4. **Run these commands**:
   ```javascript
   use ethiobusdb
   
   // Seat locks indexes (IMPORTANT!)
   db.seat_locks.createIndex({ schedule_id: 1, seat_number: 1 })
   db.seat_locks.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })
   
   // Bookings indexes
   db.bookings.createIndex({ schedule_id: 1 })
   db.bookings.createIndex({ pnr_number: 1 }, { unique: true })
   
   // Users index
   db.users.createIndex({ email: 1 }, { unique: true })
   ```

---

## Step 4: Test Your Deployment (3 minutes)

1. **Open your frontend URL** in browser
2. **Register a new account**
3. **Login**
4. **Search for schedules** (might be empty - that's OK!)
5. **Check browser console** (F12):
   - Should see: `✅ WebSocket connected`
6. **Test complete!** ✅

---

## 🎉 You're Live!

Your URLs:
- **Frontend**: `https://ethiobus-frontend-xxxx.onrender.com`
- **Backend**: `https://ethiobus-backend-xxxx.onrender.com`

---

## Next Steps

### Add Sample Data

1. **Create admin account** via API:
   ```bash
   curl -X POST https://your-backend-url.com/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Admin User",
       "email": "admin@ethiobus.com",
       "password": "SecurePassword123!",
       "phone": "+251911234567",
       "role": "admin"
     }'
   ```

2. **Login as admin** and add:
   - Buses
   - Routes
   - Schedules

### Configure Payment Gateways

**Chapa (Ethiopian payments)**:
1. Sign up at https://chapa.co
2. Get API keys
3. Add to Render environment variables:
   ```
   CHAPA_SECRET_KEY = CHASECK_TEST-xxxxx
   CHAPA_PUBLIC_KEY = CHAPUBK_TEST-xxxxx
   ```

**Stripe (International)**:
1. Sign up at https://stripe.com
2. Get API keys
3. Add to environment variables

### Custom Domain (Optional)

1. **Buy domain** (e.g., ethiobus.com)
2. **In Render**:
   - Go to your frontend service
   - Click "Settings" → "Custom Domain"
   - Add your domain
3. **In your domain registrar**:
   - Add CNAME record:
     ```
     www → ethiobus-frontend-xxxx.onrender.com
     ```

---

## Troubleshooting

### "Cannot connect to database"
- Check MongoDB connection string
- Verify password is correct
- Ensure IP whitelist includes 0.0.0.0/0

### "WebSocket connection failed"
- Wait 2-3 minutes after deployment
- Check backend logs in Render
- Verify CORS settings

### "Build failed"
- Check Render logs
- Verify all dependencies in requirements.txt/package.json
- Try manual build locally first

---

## Free Tier Limitations

**Render Free Tier**:
- ⚠️ Services sleep after 15 minutes of inactivity
- ⚠️ First request after sleep takes 30-60 seconds
- ⚠️ 750 hours/month limit (enough for 1 service 24/7)

**Upgrade to Paid** ($7/month):
- ✅ Always on (no sleep)
- ✅ Faster response times
- ✅ Better for production

**MongoDB Atlas Free Tier**:
- ✅ 512MB storage (enough for thousands of bookings)
- ✅ Shared cluster
- ✅ Perfect for getting started

---

## Cost Summary

### Free (Testing)
- Backend: Free (sleeps after 15 min)
- Frontend: Free
- Database: Free (512MB)
- **Total: $0/month**

### Paid (Production)
- Backend: $7/month (always on)
- Frontend: Free
- Database: $9/month (2GB)
- **Total: $16/month**

---

## Support

**Need help?**
- Check `DEPLOYMENT_GUIDE.md` for detailed instructions
- Review Render logs for errors
- Check MongoDB Atlas metrics
- Open GitHub issue

---

## 🎊 Congratulations!

Your bus reservation system with real-time seat locking is now live in production!

**Share your URL and start taking bookings!** 🚌✨

---

*Quick Deploy Guide - December 10, 2024*
*From zero to production in 15 minutes*
