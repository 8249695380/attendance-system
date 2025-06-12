router.post('/attendance/update', async (req, res) => {
  const { name, date, status } = req.body;

  const filePath = path.join(__dirname, '../data/data.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  const index = data.attendance.findIndex(e => e.name === name && e.date === date);
  if (index > -1) {
    data.attendance[index].status = status;
  } else {
    data.attendance.push({ name, date, status });
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  res.json({ message: 'Attendance updated' });
});
