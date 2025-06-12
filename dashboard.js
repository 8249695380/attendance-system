const toggleBtn = document.getElementById('themeToggle');
const body = document.body;
let fullAttendanceData = []; // store all entries
let currentMonth = new Date();
let fullAttendanceData = [];
let uniqueStudents = [];

fetch('/api/dashboard-stats')
  .then(res => res.json())
  .then(data => {
    document.getElementById('totalStudents').textContent = data.total;
    document.getElementById('presentToday').textContent = data.present;
    document.getElementById('absentToday').textContent = data.absent;

    fullAttendanceData = data.attendance;
    renderTable(fullAttendanceData);
  });

function renderTable(data) {
  const tbody = document.getElementById('attendanceTable');
  tbody.innerHTML = "";
  data.forEach(entry => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${entry.name}</td>
      <td>${entry.status}</td>
      <td>${entry.date}</td>
    `;
    tbody.appendChild(row);
  });
}

function applyFilters() {
  const nameVal = document.getElementById('searchName').value.toLowerCase();
  const statusVal = document.getElementById('statusFilter').value;
  const dateVal = document.getElementById('dateFilter').value;

  const filtered = fullAttendanceData.filter(entry => {
    return (!nameVal || entry.name.toLowerCase().includes(nameVal)) &&
           (!statusVal || entry.status === statusVal) &&
           (!dateVal || entry.date === dateVal);
  });

  renderTable(filtered);
}

['searchName', 'statusFilter', 'dateFilter'].forEach(id => {
  document.getElementById(id).addEventListener('input', applyFilters);
});

function generateCalendar(attendanceList) {
  const calendar = document.getElementById('calendar');
  const label = document.getElementById('monthLabel');
  calendar.innerHTML = "";

  const selectedStudent = document.getElementById('studentSelect').value;

  // Filter attendance for current month and selected student
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const filtered = attendanceList.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate.getFullYear() === year &&
           entryDate.getMonth() === month &&
           (!selectedStudent || entry.name === selectedStudent);
  });

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  daysOfWeek.forEach(d => {
    const day = document.createElement('div');
    day.textContent = d;
    day.classList.add('header');
    calendar.appendChild(day);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  label.textContent = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  for (let i = 0; i < firstDay; i++) {
    calendar.appendChild(document.createElement('div'));
  }

  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const entry = filtered.find(e => e.date === dateStr);
    const cell = document.createElement('div');
    cell.textContent = day;

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    if (dateStr === todayStr) cell.classList.add('today');

    if (entry) {
      cell.classList.add(entry.status === "Present" ? "present" : "absent");
    }

    calendar.appendChild(cell);
  }
}

// Call this after fetching the data
fetch('/api/dashboard-stats')
  .then(res => res.json())
  .then(data => {
    fullAttendanceData = data.attendance;
    renderTable(fullAttendanceData);
    generateCalendar(fullAttendanceData);
  });

fetch('/api/dashboard-stats')
  .then(res => res.json())
  .then(data => {
    document.getElementById('totalStudents').textContent = data.total;
    document.getElementById('presentToday').textContent = data.present;
    document.getElementById('absentToday').textContent = data.absent;

    fullAttendanceData = data.attendance;
    renderTable(fullAttendanceData);
    populateStudentSelect(fullAttendanceData);
    generateCalendar(fullAttendanceData);
  });

function populateStudentSelect(data) {
  const studentSet = new Set(data.map(e => e.name));
  const select = document.getElementById('studentSelect');
  select.innerHTML = `<option value="">-- All Students --</option>`;
  studentSet.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });

  select.addEventListener('change', () => generateCalendar(fullAttendanceData));
}

