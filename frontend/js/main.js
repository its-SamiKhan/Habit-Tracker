const API_URL = 'http://localhost:3000/api';
const token = localStorage.getItem('token');

if (!token) window.location.href = 'login.html';

let categories = [];
let templates = [];

// Load categories and templates on page load
async function loadInitialData() {
  try {
    const [categoriesRes, templatesRes] = await Promise.all([
      fetch(`${API_URL}/categories`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`${API_URL}/templates`, { headers: { 'Authorization': `Bearer ${token}` } })
    ]);
    
    categories = await categoriesRes.json();
    templates = await templatesRes.json();
    
    // Populate category dropdowns
    const categorySelect = document.getElementById('habit-category');
    const categoryFilter = document.getElementById('category-filter');
    
    categories.forEach(category => {
      // Add to habit creation dropdown
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categorySelect.appendChild(option);
      
      // Add to filter dropdown
      const filterOption = document.createElement('option');
      filterOption.value = category;
      filterOption.textContent = category;
      categoryFilter.appendChild(filterOption);
    });
  } catch (error) {
    console.error('Error loading initial data:', error);
  }
}

async function fetchHabits() {
  const response = await fetch(`${API_URL}/habits`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const habits = await response.json();
  const habitList = document.getElementById('habit-list');
  habitList.innerHTML = '';
  
  // Update quick stats
  updateQuickStats(habits);
  
  habits.forEach(habit => {
    const li = document.createElement('li');
    li.className = 'bg-white p-3 rounded shadow-md flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0 animate-fade-in';
    li.innerHTML = `
      <div class="flex-1">
        <div class="flex items-center space-x-2">
          <div class="w-3 h-3 rounded-full" style="background-color: ${habit.color || '#3B82F6'}"></div>
          <span class="text-gray-700 font-medium">${habit.name}</span>
          <span class="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">${habit.category || 'General'}</span>
        </div>
        ${habit.description ? `<p class="text-sm text-gray-500 mt-1">${habit.description}</p>` : ''}
        <p class="text-sm text-gray-400">${habit.goal} ${habit.reminderTime ? `• Reminder: ${habit.reminderTime}` : ''}</p>
      </div>
      <div class="flex space-x-2">
        <button onclick="logHabit('${habit._id}')" class="bg-green-200 text-gray-800 px-3 py-1 rounded hover:bg-green-300 transition transform hover:scale-105">Log Today</button>
        <button onclick="viewStats('${habit._id}')" class="bg-blue-200 text-gray-800 px-3 py-1 rounded hover:bg-blue-300 transition transform hover:scale-105">Stats</button>
        <button onclick="editHabit('${habit._id}', ${JSON.stringify(habit).replace(/"/g, '&quot;')})" class="bg-yellow-200 text-gray-800 px-3 py-1 rounded hover:bg-yellow-300 transition transform hover:scale-105">Edit</button>
        <a href="calendar.html?habitId=${habit._id}" class="bg-indigo-200 text-gray-800 px-3 py-1 rounded hover:bg-indigo-300 transition transform hover:scale-105">Calendar</a>
        <button onclick="openNotes('${habit._id}')" class="bg-purple-200 text-gray-800 px-3 py-1 rounded hover:bg-purple-300 transition transform hover:scale-105">Notes</button>
        <button onclick="deleteHabit('${habit._id}')" class="bg-red-200 text-gray-800 px-3 py-1 rounded hover:bg-red-300 transition transform hover:scale-105">Delete</button>
      </div>
    `;
    habitList.appendChild(li);
  });
}

async function updateQuickStats(habits) {
  const totalHabits = habits.length;
  let todayCompleted = 0;
  let bestStreak = 0;
  let totalCompletions = 0;
  
  const today = new Date().toISOString().split('T')[0];
  
  for (const habit of habits) {
    try {
      const statsResponse = await fetch(`${API_URL}/habits/${habit._id}/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const stats = await statsResponse.json();
      
      bestStreak = Math.max(bestStreak, stats.longestStreak || 0);
      totalCompletions += stats.totalCompletions || 0;
      
      // Check if habit was completed today
      const logsResponse = await fetch(`${API_URL}/habits/${habit._id}/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const logs = await logsResponse.json();
      const todayLog = logs.find(log => log.date === today && log.completed);
      if (todayLog) todayCompleted++;
    } catch (error) {
      console.error('Error fetching stats for habit:', habit._id, error);
    }
  }
  
  const completionRate = totalHabits > 0 ? Math.round((todayCompleted / totalHabits) * 100) : 0;
  
  document.getElementById('total-habits').textContent = totalHabits;
  document.getElementById('today-completed').textContent = todayCompleted;
  document.getElementById('current-streak').textContent = bestStreak;
  document.getElementById('completion-rate').textContent = completionRate + '%';
}

document.getElementById('habit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('habit-name').value;
  const goal = document.getElementById('habit-goal').value;
  const category = document.getElementById('habit-category').value;
  const description = document.getElementById('habit-description').value;
  const reminderTime = document.getElementById('habit-reminder').value;
  
  await fetch(`${API_URL}/habits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ name, goal, category, description, reminderTime }),
  });
  document.getElementById('habit-form').reset();
  fetchHabits();
});

// Template functionality
document.getElementById('use-template').addEventListener('click', () => {
  const templateModal = document.createElement('div');
  templateModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  templateModal.innerHTML = `
    <div class="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
      <h3 class="text-xl font-semibold mb-4">Choose a Habit Template</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3" id="template-list">
        ${templates.map(template => `
          <div class="border border-gray-200 p-3 rounded cursor-pointer hover:bg-gray-50 template-item" data-template='${JSON.stringify(template)}'>
            <div class="font-medium">${template.name}</div>
            <div class="text-sm text-gray-500">${template.category} • ${template.goal}</div>
            <div class="text-xs text-gray-400 mt-1">${template.description}</div>
          </div>
        `).join('')}
      </div>
      <div class="flex justify-end space-x-2 mt-4">
        <button id="close-template" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Cancel</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(templateModal);
  
  // Add event listeners
  templateModal.querySelectorAll('.template-item').forEach(item => {
    item.addEventListener('click', () => {
      const template = JSON.parse(item.dataset.template);
      document.getElementById('habit-name').value = template.name;
      document.getElementById('habit-goal').value = template.goal;
      document.getElementById('habit-category').value = template.category;
      document.getElementById('habit-description').value = template.description;
      document.body.removeChild(templateModal);
    });
  });
  
  templateModal.querySelector('#close-template').addEventListener('click', () => {
    document.body.removeChild(templateModal);
  });
});

// View stats functionality
async function viewStats(habitId) {
  try {
    const response = await fetch(`${API_URL}/habits/${habitId}/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const stats = await response.json();
    
    const statsModal = document.createElement('div');
    statsModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    statsModal.innerHTML = `
      <div class="bg-white p-6 rounded-lg max-w-md w-full mx-4">
        <h3 class="text-xl font-semibold mb-4">Habit Statistics</h3>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span>Total Completions:</span>
            <span class="font-semibold">${stats.totalCompletions}</span>
          </div>
          <div class="flex justify-between">
            <span>Current Streak:</span>
            <span class="font-semibold text-green-600">${stats.currentStreak} days</span>
          </div>
          <div class="flex justify-between">
            <span>Longest Streak:</span>
            <span class="font-semibold text-blue-600">${stats.longestStreak} days</span>
          </div>
          <div class="flex justify-between">
            <span>Success Rate:</span>
            <span class="font-semibold text-purple-600">${stats.completionRate}%</span>
          </div>
        </div>
        <div class="flex justify-end mt-4">
          <button id="close-stats" class="px-4 py-2 bg-blue-300 text-gray-800 rounded hover:bg-blue-400">Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(statsModal);
    
    statsModal.querySelector('#close-stats').addEventListener('click', () => {
      document.body.removeChild(statsModal);
    });
  } catch (error) {
    alert('Error loading statistics');
    console.error('Error:', error);
  }
}

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

// Notes modal: view and add notes for a habit
async function openNotes(habitId) {
  try {
    const resp = await fetch(`${API_URL}/habits/${habitId}/notes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const notes = await resp.json();
    const notesModal = document.createElement('div');
    notesModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    notesModal.innerHTML = `
      <div class="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h3 class="text-xl font-semibold mb-4">Notes</h3>
        <form id="add-note-form" class="space-y-2 mb-4">
          <div class="flex space-x-2">
            <input type="date" id="note-date" class="border border-gray-300 p-2 rounded flex-1" value="${new Date().toISOString().split('T')[0]}">
            <button type="submit" class="px-4 py-2 bg-purple-300 text-gray-800 rounded hover:bg-purple-400">Add/Update</button>
          </div>
          <textarea id="note-text" class="border border-gray-300 p-2 rounded w-full" rows="3" placeholder="Write your note..."></textarea>
        </form>
        <div id="notes-list" class="space-y-3">
          ${Array.isArray(notes) && notes.length > 0 ? notes.map(n => `
            <div class="border border-gray-200 rounded p-3">
              <div class="text-sm text-gray-500">${n.date} ${n.completed ? '<span class=\'ml-2 text-green-600\'>(completed)</span>' : ''}</div>
              <div class="text-gray-700 whitespace-pre-wrap">${(n.note || '').replace(/</g,'&lt;')}</div>
            </div>
          `).join('') : '<div class="text-gray-500">No notes yet.</div>'}
        </div>
        <div class="flex justify-end mt-4">
          <button id="close-notes" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(notesModal);

    notesModal.querySelector('#add-note-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const date = document.getElementById('note-date').value;
      const note = document.getElementById('note-text').value;
      try {
        const save = await fetch(`${API_URL}/habits/${habitId}/note`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ date, note })
        });
        if (!save.ok) throw new Error('Save failed');
        // Refresh list
        const refreshed = await fetch(`${API_URL}/habits/${habitId}/notes`, { headers: { 'Authorization': `Bearer ${token}` }});
        const newNotes = await refreshed.json();
        const list = notesModal.querySelector('#notes-list');
        list.innerHTML = Array.isArray(newNotes) && newNotes.length > 0 ? newNotes.map(n => `
          <div class="border border-gray-200 rounded p-3">
            <div class="text-sm text-gray-500">${n.date} ${n.completed ? '<span class=\'ml-2 text-green-600\'>(completed)</span>' : ''}</div>
            <div class="text-gray-700 whitespace-pre-wrap">${(n.note || '').replace(/</g,'&lt;')}</div>
          </div>
        `).join('') : '<div class="text-gray-500">No notes yet.</div>';
        document.getElementById('note-text').value = '';
      } catch (err) {
        alert('Could not save note');
      }
    });

    notesModal.querySelector('#close-notes').addEventListener('click', () => {
      document.body.removeChild(notesModal);
    });
  } catch (e) {
    alert('Failed to load notes');
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

// Category filter functionality
document.getElementById('category-filter').addEventListener('change', (e) => {
  const selectedCategory = e.target.value;
  const habitItems = document.querySelectorAll('#habit-list li');
  
  habitItems.forEach(item => {
    const habitCategory = item.querySelector('.text-xs').textContent;
    if (selectedCategory === '' || habitCategory === selectedCategory) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
});

// Export data functionality
document.getElementById('export-data').addEventListener('click', async () => {
  try {
    const response = await fetch(`${API_URL}/export`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habit-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('Data exported successfully!');
  } catch (error) {
    alert('Error exporting data');
    console.error('Export error:', error);
  }
});

// Load weekly progress
async function loadWeeklyProgress() {
  try {
    const response = await fetch(`${API_URL}/habits`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const habits = await response.json();
    
    if (habits.length === 0) return;
    
    // Get weekly progress for the first habit (or you could aggregate all habits)
    const firstHabit = habits[0];
    const progressResponse = await fetch(`${API_URL}/habits/${firstHabit._id}/weekly-progress`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const progress = await progressResponse.json();
    
    const weeklyContainer = document.getElementById('weekly-progress');
    // Clear existing content except headers
    const headers = weeklyContainer.querySelectorAll('div:not(:nth-child(-n+7))');
    headers.forEach(header => header.remove());
    
    progress.forEach(day => {
      const dayDiv = document.createElement('div');
      dayDiv.className = `h-8 w-8 rounded mx-auto ${day.completed ? 'bg-green-200' : 'bg-gray-200'}`;
      dayDiv.title = day.date;
      weeklyContainer.appendChild(dayDiv);
    });
  } catch (error) {
    console.error('Error loading weekly progress:', error);
  }
}

// Edit habit functionality
function editHabit(habitId, currentHabit) {
  const editModal = document.createElement('div');
  editModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  editModal.innerHTML = `
    <div class="bg-white p-6 rounded-lg max-w-md w-full mx-4">
      <h3 class="text-xl font-semibold mb-4">Edit Habit</h3>
      <form id="edit-habit-form" class="space-y-3">
        <input type="text" id="edit-habit-name" value="${currentHabit.name}" class="border border-gray-300 p-2 rounded w-full focus:border-blue-300" required>
        <input type="text" id="edit-habit-goal" value="${currentHabit.goal}" class="border border-gray-300 p-2 rounded w-full focus:border-blue-300" required>
        <select id="edit-habit-category" class="border border-gray-300 p-2 rounded w-full focus:border-blue-300">
          ${categories.map(cat => `<option value="${cat}" ${cat === currentHabit.category ? 'selected' : ''}>${cat}</option>`).join('')}
        </select>
        <input type="text" id="edit-habit-description" value="${currentHabit.description || ''}" placeholder="Description" class="border border-gray-300 p-2 rounded w-full focus:border-blue-300">
        <input type="time" id="edit-habit-reminder" value="${currentHabit.reminderTime || ''}" class="border border-gray-300 p-2 rounded w-full focus:border-blue-300">
        <div class="flex justify-end space-x-2">
          <button type="button" id="cancel-edit" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Cancel</button>
          <button type="submit" class="px-4 py-2 bg-blue-300 text-gray-800 rounded hover:bg-blue-400">Save Changes</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(editModal);
  
  editModal.querySelector('#edit-habit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const updatedHabit = {
      name: document.getElementById('edit-habit-name').value,
      goal: document.getElementById('edit-habit-goal').value,
      category: document.getElementById('edit-habit-category').value,
      description: document.getElementById('edit-habit-description').value,
      reminderTime: document.getElementById('edit-habit-reminder').value
    };
    
    try {
      await fetch(`${API_URL}/habits/${habitId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedHabit)
      });
      
      document.body.removeChild(editModal);
      fetchHabits();
    } catch (error) {
      alert('Error updating habit');
      console.error('Update error:', error);
    }
  });
  
  editModal.querySelector('#cancel-edit').addEventListener('click', () => {
    document.body.removeChild(editModal);
  });
}

// Initialize the app
loadInitialData().then(() => {
  fetchHabits();
  loadWeeklyProgress();
});
