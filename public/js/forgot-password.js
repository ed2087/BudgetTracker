let currentUsername = '';
let resetToken = '';
let securityQuestions = [];

document.addEventListener('DOMContentLoaded', () => {
  setupForms();
  setupButtons();
});

function setupForms() {
  document.getElementById('usernameForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await verifyUsername();
  });

  document.getElementById('securityQuestionsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await verifySecurityAnswers();
  });

  document.getElementById('recoveryCodeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await verifyRecoveryCode();
  });

  document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await resetPassword();
  });
}

function setupButtons() {
  document.getElementById('securityQuestionsBtn').addEventListener('click', () => {
    showStep('securityQuestionsStep');
  });

  document.getElementById('recoveryCodeBtn').addEventListener('click', () => {
    showStep('recoveryCodeStep');
  });

  document.getElementById('backToUsernameBtn').addEventListener('click', () => {
    showStep('usernameStep');
  });

  document.getElementById('backToMethodBtn1').addEventListener('click', () => {
    showStep('methodStep');
  });

  document.getElementById('backToMethodBtn2').addEventListener('click', () => {
    showStep('methodStep');
  });

  document.getElementById('copyNewCodeBtn')?.addEventListener('click', () => {
    const code = document.getElementById('newRecoveryCodeText').textContent;
    navigator.clipboard.writeText(code);
    showSuccess('Recovery code copied to clipboard');
  });

  document.getElementById('goToLoginBtn')?.addEventListener('click', () => {
    window.location.href = '/login';
  });
}

async function verifyUsername() {
  const username = document.getElementById('username').value.trim();

  if (!username) {
    showErrorMessage('Please enter your username');
    return;
  }

  try {
    const response = await fetchAPI('/auth/verify-username', {
      method: 'POST',
      body: JSON.stringify({ username })
    });

    if (response.success) {
      currentUsername = username;
      securityQuestions = response.questions;
      showStep('methodStep');
    }
  } catch (error) {
    showErrorMessage(error.message || 'Username not found');
  }
}

async function verifySecurityAnswers() {
  const answer1 = document.getElementById('answer1').value.trim();
  const answer2 = document.getElementById('answer2').value.trim();

  if (!answer1 || !answer2) {
    showErrorMessage('Please answer both questions');
    return;
  }

  try {
    const response = await fetchAPI('/auth/verify-security-answers', {
      method: 'POST',
      body: JSON.stringify({
        username: currentUsername,
        answers: [answer1, answer2]
      })
    });

    if (response.success) {
      resetToken = response.resetToken;
      showStep('resetPasswordStep');
    }
  } catch (error) {
    showErrorMessage(error.message || 'Incorrect answers');
  }
}

async function verifyRecoveryCode() {
  const recoveryCode = document.getElementById('recoveryCode').value.trim().toUpperCase();

  if (!recoveryCode) {
    showErrorMessage('Please enter your recovery code');
    return;
  }

  try {
    const response = await fetchAPI('/auth/verify-recovery-code', {
      method: 'POST',
      body: JSON.stringify({
        username: currentUsername,
        recoveryCode
      })
    });

    if (response.success) {
      resetToken = response.resetToken;
      showStep('resetPasswordStep');
    }
  } catch (error) {
    showErrorMessage(error.message || 'Invalid recovery code');
  }
}

async function resetPassword() {
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmNewPassword').value;

  if (newPassword !== confirmPassword) {
    showErrorMessage('Passwords do not match');
    return;
  }

  if (newPassword.length < 6) {
    showErrorMessage('Password must be at least 6 characters');
    return;
  }

  try {
    const response = await fetchAPI('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        resetToken,
        newPassword
      })
    });

    if (response.success) {
      showNewRecoveryCode(response.recoveryCode);
    }
  } catch (error) {
    showErrorMessage(error.message || 'Failed to reset password');
  }
}

function showStep(stepId) {
  document.querySelectorAll('.step-container').forEach(step => {
    step.classList.add('hidden');
  });

  document.getElementById(stepId).classList.remove('hidden');

  if (stepId === 'securityQuestionsStep') {
    document.getElementById('question1Label').textContent = securityQuestions[0];
    document.getElementById('question2Label').textContent = securityQuestions[1];
  }

  document.getElementById('errorMessage').classList.add('hidden');
}

function showErrorMessage(message) {
  const errorMessage = document.getElementById('errorMessage');
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');

  setTimeout(() => {
    errorMessage.classList.add('hidden');
  }, 5000);
}

function showNewRecoveryCode(code) {
  document.getElementById('newRecoveryCodeText').textContent = code;
  document.getElementById('newRecoveryCodeModal').classList.remove('hidden');
}