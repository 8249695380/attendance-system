function login(event) {
  event.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  // Hardcoded credentials (can later be connected to MongoDB)
  if (username === 'admin' && password === '1234') {
    localStorage.setItem('loggedIn', 'true');
    window.location.href = 'index.html';
  } else {
    document.getElementById('error').innerText = 'Invalid credentials!';
  }
}
