document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');
  const errorMessage = document.getElementById('errorMessage');
  const question1 = document.getElementById('question1');
  const question2 = document.getElementById('question2');

  question1.addEventListener('change', () => {
    updateQuestionOptions();
  });

  question2.addEventListener('change', () => {
    updateQuestionOptions();
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
      showErrorMessage('Passwords do not match');
      return;
    }

    const q1 = document.getElementById('question1').value;
    const q2 = document.getElementById('question2').value;

    if (q1 === q2) {
      showErrorMessage('Please choose two different security questions');
      return;
    }

    const data = {
      username: document.getElementById('username').value.trim(),
      password: password,
      householdName: document.getElementById('householdName').value.trim(),
      securityQuestions: [
        {
          question: q1,
          answer: document.getElementById('answer1').value.trim()
        },
        {
          question: q2,
          answer: document.getElementById('answer2').value.trim()
        }
      ]
    };

    try {
      const response = await fetchAPI('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      if (response.success) {
        showRecoveryCode(response.recoveryCode);
      }
    } catch (error) {
      showErrorMessage(error.message || 'Registration failed');
    }
  });

  function updateQuestionOptions() {
    const q1Value = question1.value;
    const q2Value = question2.value;

    Array.from(question1.options).forEach(option => {
      if (option.value === q2Value && option.value !== '') {
        option.disabled = true;
        option.style.color = '#ccc';
      } else {
        option.disabled = false;
        option.style.color = '';
      }
    });

    Array.from(question2.options).forEach(option => {
      if (option.value === q1Value && option.value !== '') {
        option.disabled = true;
        option.style.color = '#ccc';
      } else {
        option.disabled = false;
        option.style.color = '';
      }
    });
  }

  function showErrorMessage(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');

    setTimeout(() => {
      errorMessage.classList.add('hidden');
    }, 5000);
  }

  function showRecoveryCode(code) {
    document.getElementById('recoveryCodeText').textContent = code;
    document.getElementById('recoveryCodeModal').classList.remove('hidden');

    document.getElementById('confirmSaved').addEventListener('change', (e) => {
      document.getElementById('continueBtn').disabled = !e.target.checked;
    });

    document.getElementById('copyCodeBtn').addEventListener('click', () => {
      navigator.clipboard.writeText(code);
      showSuccess('Recovery code copied to clipboard');
    });

    document.getElementById('continueBtn').addEventListener('click', () => {
      window.location.href = '/login';
    });
  }
});