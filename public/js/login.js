document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const errorMessage = document.getElementById('errorMessage');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    if (!username || !password) {
      showErrorMessage('Please enter username and password');
      return;
    }

    try {
      const response = await fetchAPI('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password, rememberMe })
      });

      if (response.success) {
        window.location.href = '/dashboard';
      }
    } catch (error) {
      showErrorMessage(error.message || 'Login failed. Check your credentials.');
    }
  });

  function showErrorMessage(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');

    setTimeout(() => {
      errorMessage.classList.add('hidden');
    }, 5000);
  }
});