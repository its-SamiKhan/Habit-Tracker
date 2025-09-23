const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection with clearer validation and startup gating
const { MONGO_URI, JWT_SECRET } = process.env;

if (!MONGO_URI) {
  console.error('Missing MONGO_URI in .env. Set your MongoDB Atlas connection string.');
  process.exit(1);
}

// Basic sanity checks to help diagnose common Atlas mistakes
try {
  const uri = new URL(MONGO_URI.replace('mongodb+srv://', 'https://'));
  if (!MONGO_URI.startsWith('mongodb+srv://')) {
    console.warn('MONGO_URI should start with mongodb+srv:// for Atlas.');
  }
  if (!uri.hostname || !/\./.test(uri.hostname)) {
    console.warn('MONGO_URI hostname appears invalid. Expect something like cluster0.xxxxx.mongodb.net');
  }
} catch (_) {
  console.warn('MONGO_URI format could not be parsed. Ensure it matches the Atlas connection string format.');
}

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected');
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message || err);
    console.error('\nTroubleshooting:\n- Use the exact Atlas URI from: Atlas → Connect → Drivers → Node.js\n- Include database name after host (e.g., /habit-tracker)\n- URL-encode password if it has special characters\n- Ensure your IP is allowed in Atlas Network Access');
    process.exit(1);
  });

// User Model
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  username: String,
});
const User = mongoose.model('User', UserSchema);

// Habit Model
const HabitSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  goal: String,
  category: { type: String, default: 'General' },
  description: String,
  reminderTime: String, // HH:MM format
  color: { type: String, default: '#3B82F6' },
  createdAt: { type: Date, default: Date.now },
});
const Habit = mongoose.model('Habit', HabitSchema);

// HabitLog Model
const HabitLogSchema = new mongoose.Schema({
  habitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Habit' },
  date: String,  // YYYY-MM-DD
  completed: Boolean,
  note: String,
});
HabitLogSchema.index({ habitId: 1, date: 1 }, { unique: true });
const HabitLog = mongoose.model('HabitLog', HabitLogSchema);

// Auth Middleware
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Routes
app.post('/api/register', async (req, res) => {
  const { email, password, username } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const user = new User({ email, password: hashedPassword, username });
    await user.save();
    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    res.status(400).json({ error: 'Email already exists' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

app.get('/api/habits', auth, async (req, res) => {
  const habits = await Habit.find({ userId: req.user.userId });
  res.json(habits);
});

app.post('/api/habits', auth, async (req, res) => {
  const habit = new Habit({ ...req.body, userId: req.user.userId });
  await habit.save();
  res.status(201).json(habit);
});

app.put('/api/habits/:id', auth, async (req, res) => {
  const habit = await Habit.findOneAndUpdate({ _id: req.params.id, userId: req.user.userId }, req.body, { new: true });
  if (!habit) return res.status(404).json({ error: 'Habit not found' });
  res.json(habit);
});

app.delete('/api/habits/:id', auth, async (req, res) => {
  const habit = await Habit.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
  if (!habit) return res.status(404).json({ error: 'Habit not found' });
  await HabitLog.deleteMany({ habitId: req.params.id });
  res.json({ message: 'Habit deleted' });
});

app.post('/api/habits/:id/log', auth, async (req, res) => {
  const { date, completed, note } = req.body;
  try {
    const log = new HabitLog({ habitId: req.params.id, date, completed, note });
    await log.save();
    res.status(201).json(log);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Log already exists for this date' });
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle completion for a given date
app.post('/api/habits/:id/toggle', auth, async (req, res) => {
  const { date, note } = req.body;
  try {
    const existing = await HabitLog.findOne({ habitId: req.params.id, date });
    if (!existing) {
      const log = new HabitLog({ habitId: req.params.id, date, completed: true, note });
      await log.save();
      return res.status(201).json(log);
    }
    existing.completed = !existing.completed;
    if (note !== undefined) existing.note = note;
    await existing.save();
    res.json(existing);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add or update note for a specific date
app.post('/api/habits/:id/note', auth, async (req, res) => {
  const { date, note } = req.body;
  if (!date) return res.status(400).json({ error: 'date required' });
  try {
    const updated = await HabitLog.findOneAndUpdate(
      { habitId: req.params.id, date },
      { $set: { note } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all notes for a habit (only entries with a note)
app.get('/api/habits/:id/notes', auth, async (req, res) => {
  try {
    const notes = await HabitLog.find({ habitId: req.params.id, note: { $exists: true, $ne: '' } })
      .select('date note completed')
      .sort({ date: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/habits/:id/logs', auth, async (req, res) => {
  const logs = await HabitLog.find({ habitId: req.params.id });
  res.json(logs);
});

// Get habit statistics
app.get('/api/habits/:id/stats', auth, async (req, res) => {
  const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.userId });
  if (!habit) return res.status(404).json({ error: 'Habit not found' });
  
  const logs = await HabitLog.find({ habitId: req.params.id, completed: true });
  const totalCompletions = logs.length;
  
  // Calculate current streak
  const today = new Date().toISOString().split('T')[0];
  let currentStreak = 0;
  const sortedLogs = logs.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  for (let i = 0; i < sortedLogs.length; i++) {
    const logDate = new Date(sortedLogs[i].date);
    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - i);
    
    if (sortedLogs[i].date === expectedDate.toISOString().split('T')[0]) {
      currentStreak++;
    } else {
      break;
    }
  }
  
  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  const allDates = [...new Set(logs.map(log => log.date))].sort();
  
  for (let i = 0; i < allDates.length; i++) {
    if (i === 0 || new Date(allDates[i]) - new Date(allDates[i-1]) === 86400000) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);
  
  res.json({
    totalCompletions,
    currentStreak,
    longestStreak,
    completionRate: totalCompletions > 0 ? Math.round((totalCompletions / 30) * 100) : 0
  });
});

// Get all habit categories
app.get('/api/categories', auth, (req, res) => {
  const categories = [
    'Health & Fitness',
    'Mental Health',
    'Productivity',
    'Learning & Education',
    'Personal Care',
    'Social & Relationships',
    'Hobbies & Creative',
    'Work & Career',
    'Finance & Money',
    'Spirituality',
    'Home & Organization',
    'Technology & Digital',
    'Travel & Adventure',
    'Food & Nutrition',
    'Sleep & Rest',
    'General'
  ];
  res.json(categories);
});

// Get habit templates
app.get('/api/templates', auth, (req, res) => {
  const templates = [
    // Health & Fitness
    { name: 'Drink 8 glasses of water', goal: 'Daily', category: 'Health & Fitness', description: 'Stay hydrated throughout the day' },
    { name: 'Exercise for 30 minutes', goal: 'Daily', category: 'Health & Fitness', description: 'Any form of physical activity' },
    { name: 'Take 10,000 steps', goal: 'Daily', category: 'Health & Fitness', description: 'Walk or run to reach daily step goal' },
    { name: 'Stretch for 15 minutes', goal: 'Daily', category: 'Health & Fitness', description: 'Improve flexibility and reduce muscle tension' },
    
    // Mental Health
    { name: 'Meditate for 10 minutes', goal: 'Daily', category: 'Mental Health', description: 'Practice mindfulness or meditation' },
    { name: 'Practice gratitude', goal: 'Daily', category: 'Mental Health', description: 'Write down 3 things you are grateful for' },
    { name: 'Deep breathing exercises', goal: 'Daily', category: 'Mental Health', description: '5 minutes of focused breathing' },
    
    // Learning & Education
    { name: 'Read for 30 minutes', goal: 'Daily', category: 'Learning & Education', description: 'Read books, articles, or educational content' },
    { name: 'Learn a new skill', goal: 'Daily', category: 'Learning & Education', description: 'Spend time learning something new' },
    { name: 'Practice a language', goal: 'Daily', category: 'Learning & Education', description: 'Use language learning apps or practice speaking' },
    { name: 'Watch educational videos', goal: 'Daily', category: 'Learning & Education', description: 'Watch TED talks or online courses' },
    
    // Productivity
    { name: 'Clean workspace', goal: 'Daily', category: 'Productivity', description: 'Keep your work area organized' },
    { name: 'Plan next day', goal: 'Daily', category: 'Productivity', description: 'Write down tomorrow\'s priorities' },
    { name: 'No phone for 1 hour', goal: 'Daily', category: 'Productivity', description: 'Focus time without distractions' },
    { name: 'Complete one important task', goal: 'Daily', category: 'Productivity', description: 'Finish one high-priority item' },
    
    // Personal Care
    { name: 'Write in journal', goal: 'Daily', category: 'Personal Care', description: 'Reflect on your day and thoughts' },
    { name: 'Skincare routine', goal: 'Daily', category: 'Personal Care', description: 'Complete morning and evening skincare' },
    { name: 'Take vitamins', goal: 'Daily', category: 'Personal Care', description: 'Remember to take daily supplements' },
    
    // Social & Relationships
    { name: 'Call family/friends', goal: 'Weekly', category: 'Social & Relationships', description: 'Stay connected with loved ones' },
    { name: 'Send a thoughtful message', goal: 'Daily', category: 'Social & Relationships', description: 'Reach out to someone you care about' },
    { name: 'Have a meaningful conversation', goal: 'Daily', category: 'Social & Relationships', description: 'Engage in deep, meaningful dialogue' },
    
    // Finance & Money
    { name: 'Track expenses', goal: 'Daily', category: 'Finance & Money', description: 'Log all daily spending' },
    { name: 'Save $5', goal: 'Daily', category: 'Finance & Money', description: 'Put aside money for savings' },
    { name: 'Review budget', goal: 'Weekly', category: 'Finance & Money', description: 'Check and adjust monthly budget' },
    
    // Sleep & Rest
    { name: 'Sleep 8 hours', goal: 'Daily', category: 'Sleep & Rest', description: 'Get adequate sleep for health' },
    { name: 'No screens 1 hour before bed', goal: 'Daily', category: 'Sleep & Rest', description: 'Improve sleep quality' },
    { name: 'Take a power nap', goal: 'Daily', category: 'Sleep & Rest', description: '15-20 minute restorative nap' },
    
    // Food & Nutrition
    { name: 'Eat 5 servings of vegetables', goal: 'Daily', category: 'Food & Nutrition', description: 'Include more vegetables in meals' },
    { name: 'Cook a healthy meal', goal: 'Daily', category: 'Food & Nutrition', description: 'Prepare nutritious food at home' },
    { name: 'Limit processed foods', goal: 'Daily', category: 'Food & Nutrition', description: 'Choose whole, unprocessed foods' }
  ];
  res.json(templates);
});

// Get user dashboard stats
app.get('/api/dashboard/stats', auth, async (req, res) => {
  const habits = await Habit.find({ userId: req.user.userId });
  const today = new Date().toISOString().split('T')[0];
  
  let totalHabits = habits.length;
  let todayCompleted = 0;
  let totalCompletions = 0;
  let bestStreak = 0;
  
  for (const habit of habits) {
    try {
      const logs = await HabitLog.find({ habitId: habit._id, completed: true });
      totalCompletions += logs.length;
      
      // Check if completed today
      const todayLog = logs.find(log => log.date === today);
      if (todayLog) todayCompleted++;
      
      // Get best streak for this habit
      const statsResponse = await fetch(`${req.protocol}://${req.get('host')}/api/habits/${habit._id}/stats`, {
        headers: { 'Authorization': req.header('Authorization') }
      });
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        bestStreak = Math.max(bestStreak, stats.longestStreak || 0);
      }
    } catch (error) {
      console.error('Error fetching stats for habit:', habit._id, error);
    }
  }
  
  const completionRate = totalHabits > 0 ? Math.round((todayCompleted / totalHabits) * 100) : 0;
  
  res.json({
    totalHabits,
    todayCompleted,
    bestStreak,
    completionRate,
    totalCompletions
  });
});

// Get habits by category
app.get('/api/habits/category/:category', auth, async (req, res) => {
  const habits = await Habit.find({ 
    userId: req.user.userId, 
    category: req.params.category 
  });
  res.json(habits);
});

// Update habit
app.put('/api/habits/:id', auth, async (req, res) => {
  const habit = await Habit.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.userId }, 
    req.body, 
    { new: true }
  );
  if (!habit) return res.status(404).json({ error: 'Habit not found' });
  res.json(habit);
});

// Get weekly progress
app.get('/api/habits/:id/weekly-progress', auth, async (req, res) => {
  const habitId = req.params.id;
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
  
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    weekDays.push(date.toISOString().split('T')[0]);
  }
  
  const logs = await HabitLog.find({ 
    habitId, 
    date: { $in: weekDays },
    completed: true 
  });
  
  const progress = weekDays.map(date => ({
    date,
    completed: logs.some(log => log.date === date)
  }));
  
  res.json(progress);
});

// Export user data
app.get('/api/export', auth, async (req, res) => {
  const habits = await Habit.find({ userId: req.user.userId });
  const habitIds = habits.map(h => h._id);
  const logs = await HabitLog.find({ habitId: { $in: habitIds } });
  
  const exportData = {
    habits: habits.map(habit => ({
      name: habit.name,
      goal: habit.goal,
      category: habit.category,
      description: habit.description,
      reminderTime: habit.reminderTime,
      createdAt: habit.createdAt
    })),
    logs: logs.map(log => ({
      habitName: habits.find(h => h._id.toString() === log.habitId.toString())?.name,
      date: log.date,
      completed: log.completed
    })),
    exportDate: new Date().toISOString()
  };
  
  res.json(exportData);
});

// Reminder Scheduler (Placeholder - runs every 10 seconds for testing; change to 24*60*60*1000 for daily)
const scheduleReminders = () => {
  setInterval(async () => {
    const habits = await Habit.find({ goal: 'Daily' });
    habits.forEach(habit => {
      // TODO: Integrate web-push to send actual notifications
      console.log(`Reminder: Log ${habit.name} today!`);
    });
  }, 10000);  // 10 seconds for testing
};
scheduleReminders();
