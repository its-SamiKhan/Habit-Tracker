# 🚀 Deployment Guide: Render + Vercel + MongoDB Atlas

This guide will help you deploy your Habit Tracker application to production using free hosting services.

## 📋 Prerequisites

- GitHub account
- MongoDB Atlas account
- Render account
- Vercel account

## 🔧 Step 1: Set Up MongoDB Atlas

1. **Create MongoDB Atlas Account**
   - Go to [mongodb.com/atlas](https://mongodb.com/atlas)
   - Sign up for free
   - Create a new cluster (M0 free tier)

2. **Configure Database**
   - Create database user (username/password)
   - Set network access: Add IP address `0.0.0.0/0` (allow all)
   - Get connection string: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/habit-tracker?retryWrites=true&w=majority`

## 🖥️ Step 2: Deploy Backend to Render

1. **Push Code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit for deployment"
   git branch -M main
   git remote add origin https://github.com/yourusername/habit-tracker.git
   git push -u origin main
   ```

2. **Deploy to Render**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: `habit-tracker-backend`
     - **Environment**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Auto-Deploy**: `Yes`

3. **Set Environment Variables in Render**
   - Go to Environment tab
   - Add these variables:
     - `MONGO_URI`: Your MongoDB Atlas connection string
     - `JWT_SECRET`: Your secure JWT secret key
     - `NODE_ENV`: `production`

4. **Deploy and Get URL**
   - Click "Create Web Service"
   - Wait for deployment
   - Copy your backend URL (e.g., `https://habit-tracker-backend.onrender.com`)

## 🌐 Step 3: Deploy Frontend to Vercel

1. **Update Frontend Config**
   - Edit `frontend/js/config.js`
   - Replace `https://habit-tracker-backend.onrender.com/api` with your actual Render URL

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub
   - Click "New Project"
   - Import your GitHub repository
   - Configure:
     - **Framework Preset**: `Other`
     - **Root Directory**: `frontend`
     - **Build Command**: (leave empty)
     - **Output Directory**: `frontend`

3. **Deploy**
   - Click "Deploy"
   - Wait for deployment
   - Copy your frontend URL (e.g., `https://habit-tracker.vercel.app`)

## 🔗 Step 4: Update CORS Settings

1. **Update Backend CORS**
   - Edit `backend/server.js`
   - Replace `https://your-vercel-app.vercel.app` with your actual Vercel URL
   - Redeploy to Render

## ✅ Step 5: Test Your Deployment

1. **Test Backend**
   - Visit: `https://your-backend-url.onrender.com/health`
   - Should return: `{"status":"OK","timestamp":"...","environment":"production"}`

2. **Test Frontend**
   - Visit your Vercel URL
   - Register a new account
   - Create habits and test functionality

## 🔧 Environment Variables Summary

### Render (Backend)
```
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/habit-tracker?retryWrites=true&w=majority
JWT_SECRET=8b28c7cadff032d0acf526dc4f53847e3a08c97902b8c6405819340e3951b74d40228effb5a5bc210ee40f5b6a656dde35c2e1455e7875cda12349c7eb7a92d4
NODE_ENV=production
```

### Vercel (Frontend)
- No environment variables needed (uses config.js)

## 🚨 Troubleshooting

### Backend Issues
- **MongoDB Connection Failed**: Check Atlas connection string and IP whitelist
- **CORS Errors**: Verify frontend URL in CORS configuration
- **Environment Variables**: Ensure all required variables are set in Render

### Frontend Issues
- **API Connection Failed**: Check backend URL in `config.js`
- **Build Errors**: Ensure all files are properly committed to GitHub

## 📊 Monitoring

- **Render Dashboard**: Monitor backend performance and logs
- **Vercel Dashboard**: Monitor frontend deployments
- **MongoDB Atlas**: Monitor database usage and performance

## 🔄 Updates

To update your deployed application:
1. Make changes locally
2. Test locally
3. Commit and push to GitHub
4. Render and Vercel will auto-deploy

Your Habit Tracker is now live on the internet! 🎉
