/**
 * 静谧时光 - Minimal Focus
 * 极简待办 + 番茄计时 + 记录 + 习惯
 * 数据本地存储，无需后端
 */

const STORAGE_KEYS = {
  tasks: 'quietTime_tasks',
  notes: 'quietTime_notes',
  habits: 'quietTime_habits',
  habitLogs: 'quietTime_habitLogs',
  focusRecords: 'quietTime_focusRecords',
  settings: 'quietTime_settings',
};

const POMODORO_MINUTES = 25;
const POMODORO_BREAK_MINUTES = 5;

// ---------- 数据层 ----------
function load(key, defaultValue = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function id() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function isToday(dateStr) {
  return dateStr === todayStr();
}

function isPast(dateStr) {
  return dateStr && dateStr < todayStr();
}

function isFuture(dateStr) {
  return dateStr && dateStr > todayStr();
}

// ---------- 任务 ----------
let tasks = load(STORAGE_KEYS.tasks, []);

function getTasks() {
  return tasks;
}

function addTask(task) {
  const t = {
    id: id(),
    title: (task.title || '').trim(),
    dueDate: task.dueDate || null,
    reminder: task.reminder || null,
    category: task.category || '',
    priority: Number(task.priority) || 0,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  if (!t.title) return null;
  tasks.push(t);
  save(STORAGE_KEYS.tasks, tasks);
  return t;
}

function updateTask(id, updates) {
  const i = tasks.findIndex((t) => t.id === id);
  if (i === -1) return;
  tasks[i] = { ...tasks[i], ...updates };
  save(STORAGE_KEYS.tasks, tasks);
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  save(STORAGE_KEYS.tasks, tasks);
}

function toggleTask(id) {
  const t = tasks.find((x) => x.id === id);
  if (t) updateTask(id, { completed: !t.completed });
}

function getTodayTasks() {
  return tasks.filter((t) => !t.completed && (t.dueDate === null || t.dueDate === '' || isToday(t.dueDate)));
}

function getTasksBySegment(segment) {
  if (segment === 'inbox') return tasks.filter((t) => !t.completed && !t.dueDate);
  if (segment === 'today') return tasks.filter((t) => !t.completed && (t.dueDate === null || t.dueDate === '' || isToday(t.dueDate)));
  if (segment === 'planned') return tasks.filter((t) => !t.completed && t.dueDate && (isToday(t.dueDate) || isFuture(t.dueDate)));
  if (segment === 'done') return tasks.filter((t) => t.completed);
  return tasks;
}

// ---------- 笔记 ----------
let notes = load(STORAGE_KEYS.notes, []);

function getNotes() {
  return [...notes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function addNote(content) {
  const c = (content || '').trim();
  if (!c) return null;
  const n = { id: id(), content: c, createdAt: new Date().toISOString() };
  notes.push(n);
  save(STORAGE_KEYS.notes, notes);
  return n;
}

// ---------- 习惯 ----------
let habits = load(STORAGE_KEYS.habits, []);
let habitLogs = load(STORAGE_KEYS.habitLogs, []);

function getHabits() {
  return habits;
}

function addHabit(habit) {
  const name = (habit.name || '').trim();
  if (!name) return null;
  const h = {
    id: id(),
    name,
    icon: habit.icon || '📖',
    createdAt: new Date().toISOString(),
  };
  habits.push(h);
  save(STORAGE_KEYS.habits, habits);
  return h;
}

function deleteHabit(id) {
  habits = habits.filter((h) => h.id !== id);
  habitLogs = habitLogs.filter((l) => l.habitId !== id);
  save(STORAGE_KEYS.habits, habits);
  save(STORAGE_KEYS.habitLogs, habitLogs);
}

function isHabitDoneToday(habitId) {
  return habitLogs.some((l) => l.habitId === habitId && l.date === todayStr());
}

function toggleHabitLog(habitId) {
  const date = todayStr();
  const idx = habitLogs.findIndex((l) => l.habitId === habitId && l.date === date);
  if (idx >= 0) {
    habitLogs.splice(idx, 1);
  } else {
    habitLogs.push({ habitId, date });
  }
  save(STORAGE_KEYS.habitLogs, habitLogs);
}

function getHabitStreak(habitId) {
  const dates = habitLogs
    .filter((l) => l.habitId === habitId)
    .map((l) => l.date)
    .sort()
    .reverse();
  if (dates.length === 0) return 0;
  if (dates[0] !== todayStr() && dates[0] !== new Date(Date.now() - 86400000).toISOString().slice(0, 10)) return 0;
  let streak = 0;
  let d = new Date();
  const today = todayStr();
  for (let i = 0; i < 365; i++) {
    const ds = d.toISOString().slice(0, 10);
    if (dates.includes(ds)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

function getMaxHabitStreak() {
  return habits.reduce((max, h) => Math.max(max, getHabitStreak(h.id)), 0);
}

// ---------- 专注记录 ----------
let focusRecords = load(STORAGE_KEYS.focusRecords, []);

function addFocusRecord(seconds, taskId = null) {
  focusRecords.push({
    id: id(),
    taskId,
    duration: seconds,
    startTime: new Date().toISOString(),
  });
  save(STORAGE_KEYS.focusRecords, focusRecords);
}

function getTodayFocusStats() {
  const today = todayStr();
  const list = focusRecords.filter((r) => r.startTime.startsWith(today));
  const totalSeconds = list.reduce((s, r) => s + r.duration, 0);
  return { count: list.length, totalSeconds };
}

function getTotalFocusMinutes() {
  return Math.floor(focusRecords.reduce((s, r) => s + r.duration, 0) / 60);
}

// ---------- 设置 ----------
let settings = load(STORAGE_KEYS.settings, { theme: 'light', accent: 'blue' });

function getSettings() {
  return settings;
}

function saveSettings(s) {
  settings = { ...settings, ...s };
  save(STORAGE_KEYS.settings, settings);
  applyTheme();
}

function applyTheme() {
  const theme = settings.theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : settings.theme;
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-accent', settings.accent || 'blue');
}

// ---------- 界面：导航 ----------
const titles = {
  today: '今天',
  tasks: '任务',
  focus: '专注',
  notes: '记录',
  habits: '习惯',
  profile: '我的',
};

function showView(tab) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  document.querySelectorAll('.tab-item').forEach((t) => t.classList.remove('active'));
  const view = document.getElementById('view-' + tab);
  const tabEl = document.querySelector('.tab-item[data-tab="' + tab + '"]');
  if (view) view.classList.add('active');
  // 专注页无独立 Tab，显示时保持「今日」高亮，便于返回
  if (tab === 'focus') {
    document.querySelector('.tab-item[data-tab="today"]').classList.add('active');
  } else if (tabEl) {
    tabEl.classList.add('active');
  }
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = titles[tab] || tab;
  // 只在任务/记录/习惯页显示悬浮添加按钮
  document.getElementById('fabAddTask').style.display = tab === 'tasks' ? 'flex' : 'none';
  document.getElementById('fabAddNote').style.display = tab === 'notes' ? 'flex' : 'none';
  document.getElementById('fabAddHabit').style.display = tab === 'habits' ? 'flex' : 'none';
  if (tab === 'today') renderToday();
  if (tab === 'tasks') renderTasks();
  if (tab === 'focus') renderFocus();
  if (tab === 'notes') renderNotes();
  if (tab === 'habits') renderHabits();
  if (tab === 'profile') renderProfile();
}

// ---------- 今日首页 ----------
function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 12) return '上午好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

function renderToday() {
  const todayTasks = getTodayTasks();
  document.getElementById('greetingText').textContent = getGreeting();
  document.getElementById('todayTaskCount').textContent = `今天有 ${todayTasks.length} 个任务待完成`;
  const listEl = document.getElementById('todayTaskList');
  listEl.innerHTML = '';
  todayTasks.slice(0, 8).forEach((t) => {
    const li = document.createElement('li');
    li.className = 'task-item' + (t.completed ? ' done' : '');
    li.innerHTML = `
      <div class="task-check" data-id="${t.id}" aria-label="完成">${t.completed ? '✓' : ''}</div>
      <div class="task-body">
        <div class="task-title">${escapeHtml(t.title)}</div>
        ${t.dueDate ? `<div class="task-meta">${formatDate(t.dueDate)}</div>` : ''}
      </div>
    `;
    li.querySelector('.task-check').addEventListener('click', () => {
      toggleTask(t.id);
      renderToday();
    });
    listEl.appendChild(li);
  });
  if (todayTasks.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = '暂无今日任务，去任务页添加吧';
    listEl.appendChild(empty);
  }
  // 习惯
  const habitsList = getHabits();
  const doneCount = habitsList.filter((h) => isHabitDoneToday(h.id)).length;
  document.getElementById('habitSummary').textContent = habitsList.length ? `${doneCount}/${habitsList.length} 完成` : '全部完成';
  const habitListEl = document.getElementById('todayHabitList');
  habitListEl.innerHTML = '';
  habitsList.forEach((h) => {
    const done = isHabitDoneToday(h.id);
    const streak = getHabitStreak(h.id);
    const card = document.createElement('li');
    card.className = 'habit-card' + (done ? ' done' : '');
    card.innerHTML = `
      <span class="habit-icon">${h.icon}</span>
      <div class="habit-info">
        <div class="habit-name">${escapeHtml(h.name)}</div>
        <div class="habit-streak">🔥 连续 ${streak} 天</div>
      </div>
      <button type="button" class="habit-btn" data-id="${h.id}" aria-label="打卡">${done ? '✓' : '○'}</button>
    `;
    card.querySelector('.habit-btn').addEventListener('click', () => {
      toggleHabitLog(h.id);
      renderToday();
    });
    habitListEl.appendChild(card);
  });
  if (habitsList.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = '在习惯页添加习惯后，可在此快速打卡';
    habitListEl.appendChild(empty);
  }
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  const today = todayStr();
  if (dateStr === today) return '今天';
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === yesterday) return '昨天';
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// ---------- 任务页 ----------
let currentSegment = 'today';

function renderTasks() {
  const list = getTasksBySegment(currentSegment);
  const listEl = document.getElementById('allTaskList');
  listEl.innerHTML = '';
  list.forEach((t) => {
    const li = document.createElement('li');
    li.className = 'task-item' + (t.completed ? ' done' : '');
    li.innerHTML = `
      <div class="task-check" data-id="${t.id}">${t.completed ? '✓' : ''}</div>
      <div class="task-body">
        <div class="task-title">${escapeHtml(t.title)}</div>
        <div class="task-meta">${t.category ? t.category + ' · ' : ''}${t.dueDate ? formatDate(t.dueDate) : '无日期'}</div>
      </div>
      <button type="button" class="task-delete" data-id="${t.id}" aria-label="删除">删除</button>
    `;
    li.querySelector('.task-check').addEventListener('click', () => {
      toggleTask(t.id);
      renderTasks();
    });
    li.querySelector('.task-delete').addEventListener('click', () => {
      deleteTask(t.id);
      renderTasks();
    });
    listEl.appendChild(li);
  });
  if (list.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = '暂无任务';
    listEl.appendChild(empty);
  }
}

// ---------- 专注页（番茄钟） ----------
let focusTimer = null;
let focusSecondsLeft = POMODORO_MINUTES * 60;
let focusRunning = false;
let focusTaskId = null;

function renderFocus() {
  updateFocusDisplay();
  const stats = getTodayFocusStats();
  const el = document.getElementById('focusTodayStats');
  el.innerHTML = `<span>今日 ${stats.count} 个番茄钟</span><span>${Math.floor(stats.totalSeconds / 60)} 分钟</span>`;
}

function updateFocusDisplay() {
  const m = Math.floor(focusSecondsLeft / 60);
  const s = focusSecondsLeft % 60;
  document.getElementById('focusTime').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  document.getElementById('focusLabel').textContent = focusRunning ? '专注中' : '准备就绪';
  document.getElementById('focusRing').classList.toggle('running', focusRunning);
  const task = focusTaskId ? tasks.find((t) => t.id === focusTaskId) : null;
  document.getElementById('focusTaskName').textContent = task ? task.title : '选择任务（可选）';
  document.getElementById('btnFocusStart').textContent = focusRunning ? '暂停' : '开始';
}

function tickFocus() {
  if (!focusRunning) return;
  focusSecondsLeft--;
  updateFocusDisplay();
  if (focusSecondsLeft <= 0) {
    stopFocusTimer();
    addFocusRecord(POMODORO_MINUTES * 60, focusTaskId);
    focusSecondsLeft = POMODORO_BREAK_MINUTES * 60;
    focusRunning = false;
    updateFocusDisplay();
    renderFocus();
    try {
      if (document.hasFocus()) new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUtvT').play();
    } catch (_) {}
    alert('一个番茄钟完成！休息 5 分钟吧 🍅');
  }
}

function startFocusTimer() {
  if (focusRunning) {
    focusRunning = false;
    if (focusTimer) clearInterval(focusTimer);
    focusTimer = null;
  } else {
    focusRunning = true;
    if (!focusTimer) focusTimer = setInterval(tickFocus, 1000);
  }
  updateFocusDisplay();
}

function stopFocusTimer() {
  focusRunning = false;
  if (focusTimer) {
    clearInterval(focusTimer);
    focusTimer = null;
  }
}

function resetFocus() {
  stopFocusTimer();
  focusSecondsLeft = POMODORO_MINUTES * 60;
  updateFocusDisplay();
  renderFocus();
}

// ---------- 记录页 ----------
function renderNotes() {
  const list = getNotes();
  const el = document.getElementById('noteTimeline');
  el.innerHTML = '';
  list.forEach((n) => {
    const li = document.createElement('li');
    li.className = 'note-item';
    const d = new Date(n.createdAt);
    li.innerHTML = `
      <div class="note-date">${d.toLocaleString('zh-CN')}</div>
      <div class="note-content">${escapeHtml(n.content)}</div>
    `;
    el.appendChild(li);
  });
  if (list.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = '还没有记录，点击右下角 + 快速记录';
    el.appendChild(empty);
  }
}

// ---------- 习惯页 ----------
function renderHabits() {
  const list = getHabits();
  const el = document.getElementById('habitList');
  el.innerHTML = '';
  list.forEach((h) => {
    const done = isHabitDoneToday(h.id);
    const streak = getHabitStreak(h.id);
    const li = document.createElement('li');
    li.className = 'habit-item' + (done ? ' done' : '');
    li.innerHTML = `
      <span class="habit-icon">${h.icon}</span>
      <div class="habit-info">
        <div class="habit-name">${escapeHtml(h.name)}</div>
        <div class="habit-streak">🔥 连续 ${streak} 天</div>
      </div>
      <button type="button" class="habit-btn" data-id="${h.id}">${done ? '✓' : '○'}</button>
    `;
    li.querySelector('.habit-btn').addEventListener('click', () => {
      toggleHabitLog(h.id);
      renderHabits();
      renderToday();
    });
    el.appendChild(li);
  });
  if (list.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = '添加你的第一个习惯吧';
    el.appendChild(empty);
  }
}

// ---------- 我的 ----------
function renderProfile() {
  const completedCount = tasks.filter((t) => t.completed).length;
  document.getElementById('statTasksDone').textContent = completedCount;
  document.getElementById('statFocusMins').textContent = getTotalFocusMinutes();
  document.getElementById('statHabitStreak').textContent = getMaxHabitStreak();
  document.getElementById('settingTheme').value = settings.theme || 'light';
  document.getElementById('settingAccent').value = settings.accent || 'blue';
}

// ---------- 弹窗：任务 ----------
function openTaskModal(editId = null) {
  const modal = document.getElementById('modalTask');
  const titleEl = document.getElementById('taskTitle');
  const dueEl = document.getElementById('taskDueDate');
  const catEl = document.getElementById('taskCategory');
  const priEl = document.getElementById('taskPriority');
  if (editId) {
    const t = tasks.find((x) => x.id === editId);
    if (t) {
      document.querySelector('#modalTask .modal-title').textContent = '编辑任务';
      titleEl.value = t.title;
      dueEl.value = t.dueDate || '';
      catEl.value = t.category || '';
      priEl.value = String(t.priority || 0);
      modal.dataset.editId = editId;
    }
  } else {
    document.querySelector('#modalTask .modal-title').textContent = '新建任务';
    titleEl.value = '';
    dueEl.value = '';
    catEl.value = '';
    priEl.value = '0';
    delete modal.dataset.editId;
  }
  modal.classList.add('show');
  titleEl.focus();
}

function closeTaskModal() {
  document.getElementById('modalTask').classList.remove('show');
}

function saveTaskFromModal() {
  const titleEl = document.getElementById('taskTitle');
  const editId = document.getElementById('modalTask').dataset.editId;
  if (editId) {
    updateTask(editId, {
      title: titleEl.value.trim(),
      dueDate: document.getElementById('taskDueDate').value || null,
      category: document.getElementById('taskCategory').value || '',
      priority: Number(document.getElementById('taskPriority').value) || 0,
    });
  } else {
    addTask({
      title: titleEl.value,
      dueDate: document.getElementById('taskDueDate').value || null,
      category: document.getElementById('taskCategory').value || '',
      priority: Number(document.getElementById('taskPriority').value) || 0,
    });
  }
  closeTaskModal();
  renderToday();
  renderTasks();
}

// ---------- 弹窗：笔记 ----------
function openNoteModal() {
  document.getElementById('noteContent').value = '';
  document.getElementById('modalNote').classList.add('show');
  document.getElementById('noteContent').focus();
}

function closeNoteModal() {
  document.getElementById('modalNote').classList.remove('show');
}

function saveNoteFromModal() {
  const content = document.getElementById('noteContent').value;
  if (addNote(content)) {
    closeNoteModal();
    renderNotes();
  }
}

// ---------- 弹窗：习惯 ----------
function openHabitModal() {
  document.getElementById('habitName').value = '';
  document.querySelector('input[name="habitIcon"]:checked').checked = false;
  const first = document.querySelector('input[name="habitIcon"][value="📖"]');
  if (first) first.checked = true;
  document.getElementById('modalHabit').classList.add('show');
  document.getElementById('habitName').focus();
}

function closeHabitModal() {
  document.getElementById('modalHabit').classList.remove('show');
}

function saveHabitFromModal() {
  const name = document.getElementById('habitName').value;
  const iconEl = document.querySelector('input[name="habitIcon"]:checked');
  const icon = iconEl ? iconEl.value : '📖';
  if (addHabit({ name, icon })) {
    closeHabitModal();
    renderHabits();
    renderToday();
  }
}

// ---------- 事件绑定 ----------
function init() {
  applyTheme();
  renderToday();

  document.querySelectorAll('.tab-item').forEach((btn) => {
    btn.addEventListener('click', () => showView(btn.dataset.tab));
  });

  document.querySelectorAll('.segment').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.segment').forEach((s) => s.classList.remove('active'));
      btn.classList.add('active');
      currentSegment = btn.dataset.segment;
      renderTasks();
    });
  });

  document.getElementById('fabAddTask').addEventListener('click', () => openTaskModal());
  document.getElementById('fabAddNote').addEventListener('click', openNoteModal);
  document.getElementById('fabAddHabit').addEventListener('click', openHabitModal);

  document.getElementById('btnStartFocus').addEventListener('click', () => showView('focus'));
  document.getElementById('btnQuickNote').addEventListener('click', openNoteModal);

  document.getElementById('taskModalCancel').addEventListener('click', closeTaskModal);
  document.getElementById('taskModalSave').addEventListener('click', saveTaskFromModal);
  document.getElementById('noteModalCancel').addEventListener('click', closeNoteModal);
  document.getElementById('noteModalSave').addEventListener('click', saveNoteFromModal);
  document.getElementById('habitModalCancel').addEventListener('click', closeHabitModal);
  document.getElementById('habitModalSave').addEventListener('click', saveHabitFromModal);

  document.getElementById('btnFocusStart').addEventListener('click', startFocusTimer);
  document.getElementById('btnFocusReset').addEventListener('click', resetFocus);

  document.getElementById('settingTheme').addEventListener('change', (e) => {
    saveSettings({ theme: e.target.value });
  });
  document.getElementById('settingAccent').addEventListener('change', (e) => {
    saveSettings({ accent: e.target.value });
  });

  document.getElementById('modalTask').addEventListener('click', (e) => {
    if (e.target.id === 'modalTask') closeTaskModal();
  });
  document.getElementById('modalNote').addEventListener('click', (e) => {
    if (e.target.id === 'modalNote') closeNoteModal();
  });
  document.getElementById('modalHabit').addEventListener('click', (e) => {
    if (e.target.id === 'modalHabit') closeHabitModal();
  });
}

init();
