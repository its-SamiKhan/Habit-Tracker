const API_URL = 'http://localhost:3000/api';
const token = localStorage.getItem('token');

if (!token) window.location.href = 'login.html';

async function fetchHabits() {
  const response = await fetch(`${API_URL}/habits`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const habits = await response.json();
  const habitList = document.getElementById('habit-list');
  habitList.innerHTML = '';
  habits.forEach(habit => {
    const li = document.createElement('li');
    li.className = 'bg-white p-3 rounded shadow-md flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0 animate-fade-in';
    li.innerHTML = `
      <span class="text-gray-700">${habit.name} (${habit.goal})</span>
      <div class="flex space-x-2">
        <button onclick="logHabit('${habit._id}')" class="bg-green-200 text-gray-800 px-3 py-1 rounded hover:bg-green-300 transition transform hover:scale-105">Log Today</button>
        <a href="calendar.html?habitId=${habit._id}" class="text-blue-300 hover:text-blue-400 transition">View Calendar</a>
        <button onclick="deleteHabit('${habit._id}')" class="bg-red-200 text-gray-800 px-3 py-1 rounded hover:bg-red-300 transition transform hover:scale-105">Delete</button>
      </div>
    `;
    habitList.appendChild(li);
  });
}

document.getElementById('habit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('habit-name').value;
  const goal = document.getElementById('habit-goal').value;
  await fetch(`${API_URL}/habits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ name, goal }),
  });
  document.getElementById('habit-form').reset();
  fetchHabits();
});

async function logHabit(habitId) {
  await fetch(`${API_URL}/habits/${habitId}/log`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ date: new Date().toISOString().split('T')[0], completed: true }),
  });
  fetchHabits();
}

async function deleteHabit(habitId) {
  if (confirm('Delete this habit?')) {
    await fetch(`${API_URL}/habits/${habitId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    fetchHabits();
  }
}

document.getElementById('logout').addEventListener('click', () => {
  localStorage.removeItem('token');
  window.location.href = 'login.html';
});

// Service Worker for Push Notifications
if ('serviceWorker' in navigator && 'PushManager' in window) {
  navigator.serviceWorker.register('service-worker.js')
    .then(registration => {
      return registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'YOUR_VAPID_PUBLIC_KEY'  // Replace with your VAPID key for production
      });
    })
    .then(subscription => console.log('Push subscribed:', subscription))
    .catch(err => console.error('Push subscription failed:', err));
}

fetchHabits();
