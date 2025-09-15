const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

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
  createdAt: { type: Date, default: Date.now },
});
const Habit = mongoose.model('Habit', HabitSchema);

// HabitLog Model
const HabitLogSchema = new mongoose.Schema({
  habitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Habit' },
  date: String,  // YYYY-MM-DD
  completed: Boolean,
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
  const { date, completed } = req.body;
  try {
    const log = new HabitLog({ habitId: req.params.id, date, completed });
    await log.save();
    res.status(201).json(log);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Log already exists for this date' });
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/habits/:id/logs', auth, async (req, res) => {
  const logs = await HabitLog.find({ habitId: req.params.id });
  res.json(logs);
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

app.listen(3000, () => console.log('Server running on port 3000'));
