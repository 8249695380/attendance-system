const express = require('express');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;
const XLSX = require('xlsx');
const DATA_FILE = './data.json';
const fileUpload = require('express-fileupload');
const multer = require('multer');
const XLSX = require('xlsx');
const upload = multer({ dest: 'uploads/' });
const session = require('express-session');
const bcrypt = require('bcrypt');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const moment = require('moment');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const resetTokens = {};
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const hashedEmail = hashEmail("teacher1@example.com");
app.use(fileUpload());
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Load attendance for a specific date
app.get('/api/attendance', (req, res) => {
  const { date } = req.query;
  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading file.');
    const attendance = JSON.parse(data || '{}');
    res.send(attendance[date] || []);
  });
});

// Save attendance for a specific date
app.post('/api/attendance', (req, res) => {
  const { date, records } = req.body;
  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    let attendance = {};
    if (!err && data) {
      attendance = JSON.parse(data);
    }
    attendance[date] = records;

    fs.writeFile(DATA_FILE, JSON.stringify(attendance, null, 2), err => {
      if (err) return res.status(500).send('Error writing file.');
      res.send({ message: 'Attendance saved successfully.' });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

app.get('/api/export/excel', (req, res) => {
  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Failed to read data file.');

    const attendance = JSON.parse(data || '{}');
    const exportData = [];

    Object.entries(attendance).forEach(([date, records]) => {
      records.forEach(student => {
        exportData.push({
          Date: date,
          Name: student.name,
          Status: student.present ? 'Present' : 'Absent'
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    res.setHeader('Content-Disposition', 'attachment; filename=attendance.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  });
});

app.post('/api/import/excel', (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).send('No file uploaded.');
  }

  const file = req.files.file;
  const workbook = XLSX.read(file.data, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.S

app.post('/api/import/attendance', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

  const filePath = req.file.path;
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const importedData = XLSX.utils.sheet_to_json(sheet);

  fs.readFile(DATA_FILE, 'utf8', (err, rawData) => {
    const existingData = JSON.parse(rawData || '{}');

    importedData.forEach(row => {
      const date = row.Date;
      if (!date || !row.Name) return;

      if (!existingData[date]) existingData[date] = [];

      // Prevent duplicates
      const existing = existingData[date].find(s => s.name === row.Name);
      if (!existing) {
        existingData[date].push({
          name: row.Name,
          present: row.Status?.toLowerCase() === 'present'
        });
      }
    });

    fs.writeFile(DATA_FILE, JSON.stringify(existingData, null, 2), err => {
      if (err) return res.status(500).json({ message: 'Failed to save data.' });
      res.json({ message: 'Attendance imported successfully!' });
    });
  });
});

app.use(session({
  secret: 'attendance_secret_key',
  resave: false,
  saveUninitialized: true,
}));

app.post('/api/register', express.json(), (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send('Missing credentials');

  fs.readFile('users.json', 'utf8', (err, data) => {
    const users = JSON.parse(data || '[]');
    if (users.find(u => u.username === username)) {
      return res.status(409).send('Username already exists');
    }

    const hashed = bcrypt.hashSync(password, 10);
    users.push({ username, password: hashed });

    fs.writeFile('users.json', JSON.stringify(users, null, 2), () => {
      res.send('User registered');
    });
  });
});

app.post('/api/login', express.json(), (req, res) => {
  const { username, password } = req.body;
  fs.readFile('users.json', 'utf8', (err, data) => {
    const users = JSON.parse(data || '[]');
    const user = users.find(u => u.username === username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).send('Invalid login');
    }

    req.session.user = user.username;
    res.send('Login successful');
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.send('Logged out');
  });
});

function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(403).send('Login required');
  next();
}

app.get('/api/summary', requireLogin, (req, res) => {
  fs.readFile(DATA_FILE, 'utf8', (err, rawData) => {
    const allData = JSON.parse(rawData || '{}');
    const user = req.session.user;

    const userData = Object.entries(allData)
      .filter(([key]) => key.startsWith(user + ':'));

    const studentSet = new Set();

    userData.forEach(([, records]) => {
      records.forEach(s => studentSet.add(s.name));
    });

    res.json({
      username: user,
      totalDays: userData.length,
      uniqueStudents: studentSet.size
    });
  });
});

function logout() {
  fetch('/api/logout', { method: 'POST' })
    .then(() => location.reload());
}

app.get('/api/user-dates', requireLogin, (req, res) => {
  fs.readFile(DATA_FILE, 'utf8', (err, rawData) => {
    const allData = JSON.parse(rawData || '{}');
    const user = req.session.user;

    const dates = Object.keys(allData)
      .filter(key => key.startsWith(user + ':'))
      .map(key => key.split(':')[1]); // extract date

    res.json({ dates });
  });
});

app.get('/api/attendance-summary', requireLogin, (req, res) => {
  fs.readFile(DATA_FILE, 'utf8', (err, rawData) => {
    const data = JSON.parse(rawData || '{}');
    const user = req.session.user;

    const userData = Object.entries(data)
      .filter(([key]) => key.startsWith(user + ':'))
      .map(([_, records]) => records);

    const studentDays = {};
    let totalDays = userData.length;

    userData.forEach(dayList => {
      dayList.forEach(s => {
        if (!studentDays[s.name]) studentDays[s.name] = { present: 0 };
        if (s.present) studentDays[s.name].present += 1;
      });
    });

    const result = {};
    for (const [name, stats] of Object.entries(studentDays)) {
      result[name] = ((stats.present / totalDays) * 100).toFixed(1);
    }

    res.json(result);
  });
});

app.get('/api/download-report', requireLogin, async (req, res) => {
  const user = req.session.user;
  fs.readFile(DATA_FILE, 'utf8', async (err, rawData) => {
    const allData = JSON.parse(rawData || '{}');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Attendance');

    sheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Student Name', key: 'name', width: 25 },
      { header: 'Present', key: 'present', width: 10 }
    ];

    for (const [key, records] of Object.entries(allData)) {
      if (key.startsWith(user + ':')) {
        const date = key.split(':')[1];
        records.forEach(s => {
          sheet.addRow({
            date,
            name: s.name,
            present: s.present ? 'Yes' : 'No'
          });
        });
      }
    }

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="attendance_report.xlsx"'
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    await workbook.xlsx.write(res);
    res.end();
  });
});

app.get('/api/download-pdf', requireLogin, (req, res) => {
  const user = req.session.user;
  fs.readFile(DATA_FILE, 'utf8', (err, rawData) => {
    const allData = JSON.parse(rawData || '{}');
    const userData = Object.entries(allData)
      .filter(([key]) => key.startsWith(user + ':'));

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.pdf');
    doc.pipe(res);

    // Header
    doc.fontSize(18).text(`Attendance Report - ${user}`, { align: 'center' });
    doc.moveDown();

    userData.forEach(([key, students]) => {
      const date = key.split(':')[1];
      doc.fontSize(14).fillColor('#000').text(`📅 Date: ${moment(date).format("MMM DD, YYYY")}`);
      doc.fontSize(12);
      students.forEach(s => {
        doc.text(`- ${s.name}: ${s.present ? 'Present' : 'Absent'}`);
      });
      doc.moveDown();
    });

    doc.end();
  });
});

app.get('/api/students', requireLogin, (req, res) => {
  const user = req.session.user;
  const allData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '{}');

  const studentSet = new Set();
  for (const [key, students] of Object.entries(allData)) {
    if (!key.startsWith(user + ':')) continue;
    students.forEach(s => studentSet.add(s.name));
  }

  res.json({ students: Array.from(studentSet) });
});

app.post('/api/add-student', requireLogin, (req, res) => {
  const { name } = req.body;
  const user = req.session.user;
  const today = new Date().toISOString().split('T')[0];
  const key = `${user}:${today}`;
  const allData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '{}');
  allData[key] = allData[key] || [];
  if (!allData[key].find(s => s.name === name)) {
    allData[key].push({ name, present: false });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(allData, null, 2));
  res.sendStatus(200);
});

app.post('/api/delete-student', requireLogin, (req, res) => {
  const { name } = req.body;
  const user = req.session.user;
  const allData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '{}');
  for (const key in allData) {
    if (!key.startsWith(user + ':')) continue;
    allData[key] = allData[key].filter(s => s.name !== name);
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(allData, null, 2));
  res.sendStatus(200);
});

app.post('/api/edit-student', requireLogin, (req, res) => {
  const { oldName, newName } = req.body;
  const user = req.session.user;
  const allData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '{}');
  for (const key in allData) {
    if (!key.startsWith(user + ':')) continue;
    allData[key].forEach(s => {
      if (s.name === oldName) s.name = newName;
    });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(allData, null, 2));
  res.sendStatus(200);
});

app.post('/api/request-reset', (req, res) => {
  const { email } = req.body;
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8') || '{}');
  const user = Object.entries(users).find(([_, val]) => val.email === email);
  if (!user) return res.json({ message: "❌ Email not found." });

  const [username] = user;
  const token = crypto.randomBytes(32).toString('hex');
  resetTokens[token] = username;

  // Send email
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'your-email@gmail.com',
      pass: 'your-app-password'
    }
  });

  const link = `http://localhost:3000/reset.html?token=${token}`;
  transporter.sendMail({
    to: email,
    subject: "🔐 Reset Your Attendance System Password",
    html: `Click here to reset your password: <a href="${link}">${link}</a>`
  });

  res.json({ message: "📧 Reset link sent to email." });
})

app.post('/api/reset-password', (req, res) => {
  const { token, password } = req.body;
  const username = resetTokens[token];
  if (!username) return res.json({ message: "❌ Invalid or expired token." });

  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8') || '{}');
  users[username].password = password;
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

  delete resetTokens[token];
  res.json({ message: "✅ Password reset successful!" });
});

function createUser(username, password, email) {
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8') || '{}');
  const hashedPassword = bcrypt.hashSync(password, 10); // 10 = salt rounds

  users[username] = { password: hashedPassword, email };
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8') || '{}');

  if (!users[username]) return res.send('❌ Invalid credentials');

  const storedHash = users[username].password;
  const isMatch = bcrypt.compareSync(password, storedHash);

  if (isMatch) {
    req.session.user = username;
    res.redirect('/');
  } else {
    res.send('❌ Invalid credentials');
  }
});

app.post('/api/reset-password', (req, res) => {
  const { token, password } = req.body;
  const username = resetTokens[token];
  if (!username) return res.json({ message: "❌ Invalid or expired token." });

  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8') || '{}');
  const hashed = bcrypt.hashSync(password, 10);
  users[username].password = hashed;

  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  delete resetTokens[token];

  res.json({ message: "✅ Password reset successfully!" });
});


function hashEmail(email) {
  return crypto.createHash('sha256').update(email).digest('hex');
}

users[username] = {
  password: bcrypt.hashSync(password, 10),
  emailHash: hashedEmail
};

app.post('/api/request-reset', (req, res) => {
  const { email } = req.body;
  const emailHash = hashEmail(email);

  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8') || '{}');
  const userEntry = Object.entries(users).find(([_, val]) => val.emailHash === emailHash);

  if (!userEntry) return res.json({ message: "❌ Email not found." });

  const [username] = userEntry;
  // continue as before (generate token, send mail)
});

