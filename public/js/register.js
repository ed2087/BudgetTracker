document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');
  const errorMessage = document.getElementById('errorMessage');
  const question1 = document.getElementById('question1');
  const question2 = document.getElementById('question2');
  
  let currentStep = 1;
  let isSubmitting = false;

  // Step navigation
  document.getElementById('nextStep1').addEventListener('click', () => {
    if (validateStep1()) {
      goToStep(2);
    }
  });

  document.getElementById('backStep2').addEventListener('click', () => {
    goToStep(1);
  });

  // Question selection - prevent duplicates
  question1.addEventListener('change', updateQuestionOptions);
  question2.addEventListener('change', updateQuestionOptions);

  // Form submit
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!validateStep2()) return;

    isSubmitting = true;
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('submitBtn').textContent = 'Creating Account...';

    const data = {
      username: document.getElementById('username').value.trim(),
      password: document.getElementById('password').value,
      householdName: document.getElementById('householdName').value.trim(),
      securityQuestions: [
        {
          question: question1.value,
          answer: document.getElementById('answer1').value.trim()
        },
        {
          question: question2.value,
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
      isSubmitting = false;
      document.getElementById('submitBtn').disabled = false;
      document.getElementById('submitBtn').textContent = 'Create Account';
    }
  });

  function validateStep1() {
    const householdName = document.getElementById('householdName').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!householdName || !username || !password || !confirmPassword) {
      showErrorMessage('Please fill in all fields');
      return false;
    }

    if (username.length < 3) {
      showErrorMessage('Username must be at least 3 characters');
      return false;
    }

    if (password.length < 6) {
      showErrorMessage('Password must be at least 6 characters');
      return false;
    }

    if (password !== confirmPassword) {
      showErrorMessage('Passwords do not match');
      return false;
    }

    hideErrorMessage();
    return true;
  }

  function validateStep2() {
    const q1 = question1.value;
    const q2 = question2.value;
    const a1 = document.getElementById('answer1').value.trim();
    const a2 = document.getElementById('answer2').value.trim();

    if (!q1 || !q2 || !a1 || !a2) {
      showErrorMessage('Please answer both security questions');
      return false;
    }

    if (q1 === q2) {
      showErrorMessage('Please choose two different security questions');
      return false;
    }

    if (a1.length < 2 || a2.length < 2) {
      showErrorMessage('Answers must be at least 2 characters');
      return false;
    }

    hideErrorMessage();
    return true;
  }

  function goToStep(step) {
    currentStep = step;

    // Update form steps
    document.querySelectorAll('.form-step').forEach(el => {
      el.classList.remove('active');
    });
    
    const targetStep = document.querySelector(`.form-step[data-step="${step}"]`);
    if (targetStep) {
      targetStep.classList.add('active');
    }

    // Update progress steps
    document.querySelectorAll('.step').forEach((el, index) => {
      const stepNum = index + 1;
      el.classList.remove('active', 'completed');
      
      if (stepNum < step) {
        el.classList.add('completed');
      } else if (stepNum === step) {
        el.classList.add('active');
      }
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function hideErrorMessage() {
    errorMessage.classList.add('hidden');
  }

function showRecoveryCode(code) {
  document.getElementById('recoveryCodeText').textContent = code;
  goToStep(3);

  document.getElementById('confirmSaved').addEventListener('change', (e) => {
    document.getElementById('continueBtn').disabled = !e.target.checked;
  });

  document.getElementById('copyCodeBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(code);
    const btn = document.getElementById('copyCodeBtn');
    btn.textContent = '✓ Copied!';
    setTimeout(() => {
      btn.textContent = '📋 Copy Code';
    }, 2000);
  });

  document.getElementById('continueBtn').addEventListener('click', () => {
    window.location.href = '/login';
  });
}



});