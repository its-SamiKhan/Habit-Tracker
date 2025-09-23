# Daily Habit Builder and Tracker

A full-stack web application for building and tracking daily habits. Built with HTML/CSS/JavaScript (frontend), Node.js/Express (backend), and MongoDB (database).

## Features

- User authentication (register/login)
- Create and manage habits
- Log daily habit completions
- Progress calendar with heatmap visualization
- Streak tracking and analytics
- Responsive design with Tailwind CSS
- Browser push notifications (basic setup)
- Fade-in animations and hover effects

## Project Structure

```
habit-tracker/
├── backend/
│   ├── models/          # (empty - models defined in server.js)
│   ├── routes/          # (empty - routes defined in server.js)
│   ├── server.js        # Express server with API endpoints
│   ├── package.json     # Backend dependencies
│   └── .env            # Environment variables
├── frontend/
│   ├── css/
│   │   └── styles.css   # Custom CSS with animations
│   ├── js/
│   │   └── main.js      # Frontend JavaScript logic
│   ├── index.html       # Dashboard/Home page
│   ├── login.html       # Login page
│   ├── register.html    # Registration page
│   ├── calendar.html    # Progress calendar and analytics
│   └── service-worker.js # Push notification service worker
└── README.md           # This file
```

## Prerequisites

- **Node.js** (v18+): Download from [nodejs.org](https://nodejs.org)
- **MongoDB**: Install locally or use MongoDB Atlas cloud database
- A code editor like VS Code
- Browser for testing (e.g., Chrome)

## Steps to Run the Website Locally

### Quick Start Commands

**1. Start MongoDB (if not already running):**
```bash
brew services start mongodb-community
```

**2. Start the Backend Server:**
```bash
cd /Users/sam/Projects/Habit-Tracker/backend
npm start
```
*Keep this terminal window open - the server will run on port 3000*

**3. Start the Frontend Server (in a new terminal):**
```bash
cd /Users/sam/Projects/Habit-Tracker/frontend
python3 -m http.server 3001
```
*Keep this terminal window open - the frontend will run on port 3001*

**4. Access Your Application:**
Open your browser and go to: **http://localhost:3001**

### Stop the Services

**To stop everything:**
- **Backend**: Press `Ctrl+C` in the backend terminal
- **Frontend**: Press `Ctrl+C` in the frontend terminal  
- **MongoDB**: `brew services stop mongodb-community`

### Quick Reference

**Start everything:**
```bash
# Terminal 1
brew services start mongodb-community
cd /Users/sam/Projects/Habit-Tracker/backend && npm start

# Terminal 2 (new terminal)
cd /Users/sam/Projects/Habit-Tracker/frontend && python3 -m http.server 3001
```

**Access:** http://localhost:3001

**Stop everything:**
```bash
# Press Ctrl+C in both terminals, then:
brew services stop mongodb-community
```

## Setup Instructions

### Step 1: Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables in `.env`:
   ```
   MONGO_URI=mongodb://localhost:27017/habit-tracker
   JWT_SECRET=your-secret-key-here
   ```
   - For MongoDB Atlas, replace the URI with your Atlas connection string
   - Generate a strong JWT secret key

4. Start MongoDB:
   - **Local**: Run `mongod` or start MongoDB service
   - **Atlas**: Ensure your IP is whitelisted

5. Start the backend server:
   ```bash
   npm start
   ```
   The server will run on port 3000.

### Step 2: Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Serve the frontend files:
   ```bash
   npx serve .
   ```
   Or install serve globally:
   ```bash
   npm install -g serve
   serve .
   ```

3. Open your browser and navigate to the served URL (usually `http://localhost:3000` or `http://localhost:5000`)

### Step 3: Testing the Application

1. Open the registration page and create a new account
2. Log in with your credentials
3. Add habits using the dashboard
4. Log daily completions
5. View progress calendar for each habit

6. Test responsive design by resizing the browser

## API Endpoints

- `POST /api/register` - User registration
- `POST /api/login` - User login
- `GET /api/habits` - Get user's habits
- `POST /api/habits` - Create new habit
- `PUT /api/habits/:id` - Update habit
- `DELETE /api/habits/:id` - Delete habit
- `POST /api/habits/:id/log` - Log habit completion
- `GET /api/habits/:id/logs` - Get habit logs

## Features in Detail

### Authentication
- JWT-based authentication
- Password hashing with bcrypt
- Protected API routes

### Habit Management
- Create habits with name and goal
- Edit and delete habits
- User-specific habit isolation

### Progress Tracking
- Daily habit logging
- 30-day progress calendar
- Streak calculation
- Completion statistics

### UI/UX
- Responsive design (mobile-first)
- Tailwind CSS styling
- Fade-in animations
- Hover effects
- Light color scheme (blues, greens, grays)

### Notifications
- Service worker setup for push notifications
- Daily reminder system (placeholder implementation)
- Console logging for testing

## Deployment

### Frontend
Deploy the `frontend/` folder to:
- Netlify (drag and drop)
- Vercel
- GitHub Pages

### Backend
Deploy to:
- Render
- Heroku
- Railway

### Database
Use MongoDB Atlas for production.

## Troubleshooting

- **CORS errors**: Backend has CORS enabled
- **MongoDB connection**: Check URI in `.env`
- **JWT issues**: Ensure secret is set
- **Notifications**: Browsers require HTTPS for full push functionality
- **Port conflicts**: Change ports in server.js and frontend URLs

## Development Notes

- Reminder system runs every 10 seconds for testing (change to 24 hours for production)
- VAPID keys needed for production push notifications
- All dates use YYYY-MM-DD format
- Responsive breakpoints at 768px
- Animations use CSS keyframes

## License

Built with ❤️ for personal use and learning.
