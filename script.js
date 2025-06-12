let students = [];
let attendanceData = {};
let currentDate = '';

window.onload = async function () {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('month-picker').value = new Date().toISOString().slice(0, 7);
  document.getElementById('date-picker').value = today;
  currentDate = today;
  await loadAttendanceByDate();
};

async function loadAttendanceByDate() {
  currentDate = document.getElementById('date-picker').value;

  const res = await fetch('/api/attendance');
  attendanceData = await res.json();
  students = attendanceData[currentDate] || getDefaultStudents();
  renderStudents();
}

function jumpToDate(date) {
  document.getElementById('date-picker').value = date;
  loadAttendanceByDate();
}

function getDefaultStudents() {
  return [
    { name: "Alice", present: false },
    { name: "Bob", present: false },
    { name: "Charlie", present: false }
  ];
}

function renderStudents() {
  const list = document.getElementById('student-list');
  list.innerHTML = '';
  students.forEach((student, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <label>
        <input type="checkbox" ${student.present ? 'checked' : ''} onchange="toggleAttendance(${index})">
        ${student.name}
      </label>`;
    list.appendChild(li);
  });
  updateSummary(); // 👈 Add this here
}

function toggleAttendance(index) {
  students[index].present = !students[index].present;
  updateSummary(); // 👈 Add this here
}

function saveAttendance() {
  attendanceData[currentDate] = students;

  fetch('/api/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(attendanceData)
  }).then(res => res.json())
    .then(data => alert(data.message));
}

function logout() {
  localStorage.removeItem('loggedIn');
  window.location.href = 'login.html';
}
function downloadCSV() {
  const csvRows = [
    ['Name', 'Present'] // header row
  ];

  students.forEach(student => {
    csvRows.push([student.name, student.present ? 'Yes' : 'No']);
  });

  const csvContent = csvRows.map(e => e.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `attendance_${currentDate}.csv`;
  a.click();
}
function updateSummary() {
  const presentCount = students.filter(s => s.present).length;
  const absentCount = students.length - presentCount;
  document.getElementById('summary').innerHTML =
    `<strong>Summary:</strong> Present: ${presentCount} | Absent: ${absentCount}`;
}
async function loadAttendanceHistory() {
  const res = await fetch('/api/attendance');
  const allData = await res.json();

  const tbody = document.querySelector('#history-table tbody');
  tbody.innerHTML = '';

  Object.keys(allData).sort().reverse().forEach(date => {
    const records = allData[date];
    const presentCount = records.filter(s => s.present).length;
    const absentCount = records.length - presentCount;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${date}</td>
      <td>${presentCount}</td>
      <td>${absentCount}</td>
      <td><button onclick="jumpToDate('${date}')">View</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function printAttendance() {
  const originalTitle = document.title;
  document.title = `Attendance - ${currentDate}`;
  window.print();
  document.title = originalTitle;
}

<link rel="stylesheet" href="style.css">

function openStudentManager() {
  const list = document.getElementById('student-edit-list');
  list.innerHTML = '';
  students.forEach((s, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <input type="text" value="${s.name}" onchange="editStudent(${i}, this.value)">
      <button onclick="removeStudent(${i})">❌</button>
    `;
    list.appendChild(li);
  });
  document.getElementById('student-manager').style.display = 'block';
}

function closeStudentManager() {
  document.getElementById('student-manager').style.display = 'none';
}

function addStudent() {
  const name = document.getElementById('new-student-name').value.trim();
  if (!name) return alert('Enter a name');
  students.push({ name, present: false });
  document.getElementById('new-student-name').value = '';
  openStudentManager();  // refresh the list
  renderStudents();
}

function editStudent(index, newName) {
  students[index].name = newName.trim();
  renderStudents();
}

function removeStudent(index) {
  students.splice(index, 1);
  openStudentManager();  // refresh
  renderStudents();
}

async function generateMonthlyChart() {
  const selectedMonth = document.getElementById('month-picker').value; // YYYY-MM
  if (!selectedMonth) return alert('Please select a month.');

  const res = await fetch('/api/attendance');
  const allData = await res.json();

  const labels = [];
  const presentCounts = [];

  Object.entries(allData).forEach(([date, records]) => {
    if (date.startsWith(selectedMonth)) {
      labels.push(date);
      presentCounts.push(records.filter(s => s.present).length);
    }
  });

  const ctx = document.getElementById('monthly-chart').getContext('2d');
  if (window.attendanceChart) window.attendanceChart.destroy();

  window.attendanceChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Present Students',
        data: presentCounts,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: true, precision: 0 }
      }
    }
  });
}

function generateTodayPie() {
  const present = students.filter(s => s.present).length;
  const absent = students.length - present;

  const ctx = document.getElementById('today-pie').getContext('2d');
  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Present', 'Absent'],
      datasets: [{
        data: [present, absent],
        backgroundColor: ['#4caf50', '#f44336']
      }]
    }
  });
}

function downloadExcel() {
  window.open('/api/export/excel', '_blank');
}

function login() {
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;
  fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: u, password: p })
  }).then(res => res.text()).then(alert).then(() => location.reload());
}

function register() {
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;
  fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: u, password: p })
  }).then(res => res.text()).then(alert);
}

window.onload = async function () {
  const res = await fetch('/api/summary');
  if (res.ok) {
    const data = await res.json();
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('user-name').textContent = data.username;
    document.getElementById('total-days').textContent = data.totalDays;
    document.getElementById('unique-students').textContent = data.uniqueStudents;
  } else {
    document.getElementById('auth').style.display = 'block';
  }
}

async function loadCalendar() {
  const res = await fetch('/api/user-dates');
  const data = await res.json();

  const calendarDiv = document.getElementById('calendar');
  calendarDiv.innerHTML = '';
  document.getElementById('calendar-container').style.display = 'block';

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
    const div = document.createElement('div');
    div.className = 'day-cell';
    div.textContent = i;
    if (data.dates.includes(dateStr)) div.classList.add('attendance-day');
    div.onclick = () => loadAttendanceForDate(dateStr);
    calendarDiv.appendChild(div);
  }
}

loadCalendar();

async function loadAttendanceChart() {
  const res = await fetch('/api/attendance-summary');
  const data = await res.json();

  const names = Object.keys(data);
  const percentages = names.map(name => data[name]);

  const ctx = document.getElementById('attendanceChart').getContext('2d');

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: names,
      datasets: [{
        label: '% Present',
        data: percentages,
        backgroundColor: '#4CAF50'
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          max: 100
        }
      }
    }
  });

  document.getElementById('chart-section').style.display = 'block';
}

function loadAttendanceForDate(date) {
  fetch(`/api/attendance/${date}`)
    .then(res => res.json())
    .then(data => {
      document.getElementById('date').value = date;
      renderStudentList(data || []);
    });
}

function downloadReport() {
  window.open('/api/download-report', '_blank');
}

function downloadPDF() {
  window.open('/api/download-pdf', '_blank');
}

function applyFilters() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const date = document.getElementById('filterDate').value;

  if (date) {
    loadAttendanceForDate(date);
  } else {
    // Filter current student list
    const rows = document.querySelectorAll('#studentList tr');
    rows.forEach(row => {
      const name = row.querySelector('td')?.innerText?.toLowerCase();
      if (name && name.includes(search)) {
        row.style.display = '';
      } else if (name) {
        row.style.display = 'none';
      }
    });
  }
}

document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('filterDate').addEventListener('change', applyFilters);

let allStudents = []; // Store list of all students across dates

function loadStudentAdminList() {
  fetch('/api/students')
    .then(res => res.json())
    .then(data => {
      allStudents = data.students;
      const ul = document.getElementById('adminStudentList');
      ul.innerHTML = '';
      allStudents.forEach(name => {
        const li = document.createElement('li');
        li.innerHTML = `
          ${name} 
          <button onclick="deleteStudent('${name}')">🗑️ Delete</button>
          <button onclick="editStudent('${name}')">✏️ Edit</button>
        `;
        ul.appendChild(li);
      });
    });
}

function addStudent() {
  const name = document.getElementById('newStudentName').value;
  if (!name) return alert('Enter a name');
  fetch('/api/add-student', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  }).then(() => {
    document.getElementById('newStudentName').value = '';
    loadStudentAdminList();
  });
}

function deleteStudent(name) {
  if (!confirm(`Delete ${name}?`)) return;
  fetch('/api/delete-student', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  }).then(loadStudentAdminList);
}

function editStudent(oldName) {
  const newName = prompt('Enter new name for: ' + oldName);
  if (!newName || newName === oldName) return;
  fetch('/api/edit-student', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldName, newName })
  }).then(loadStudentAdminList);
}

function showResetForm() {
  document.getElementById('resetForm').style.display = 'block';
}

function requestPasswordReset() {
  const email = document.getElementById('resetEmail').value;
  fetch('/api/request-reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  }).then(res => res.json()).then(data => {
    document.getElementById('resetMsg').innerText = data.message;
  });
}

