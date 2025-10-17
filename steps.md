One-time setup (if data directory doesn't exist)

mkdir -p /Users/sam/Projects/Habit-Tracker/.mongo-data

1) Start MongoDB

mongod --dbpath /Users/sam/Projects/Habit-Tracker/.mongo-data --logpath /Users/sam/Projects/Habit-Tracker/mongod.log --fork

2) Backend (env, install, run)

cd /Users/sam/Projects/Habit-Tracker/backend
printf "JWT_SECRET=7Cimlbw7Rhzkx8BbRLdARAcIv58KzxlrutJLgUbr9+Q=\nMONGO_URI=mongodb+srv://habittrackeruser:F9p4FYndSKPq73jV@cluster0.hbvnena.mongodb.net/habittracker?retryWrites=true&w=majority&appName=Cluster0\n" > .env
npm ci
npm run start

Optional health check (new terminal)

curl -sS http://localhost:3000/health

3) Frontend (static server on 3001)

cd /Users/sam/Projects/Habit-Tracker/frontend
python3 -m http.server 3001

4) Open in browser

Backend: http://localhost:3000/health
Frontend: http://localhost:3001

Optional: Stop services

MongoDB:
pkill -f mongod

Backend (if foreground): Ctrl+C
Frontend (if foreground): Ctrl+C
