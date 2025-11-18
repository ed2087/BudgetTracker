document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupForms();
  setupModals();
  setupButtons();
});

async function loadSettings() {
  try {
    const response = await fetchAPI('/settings');
    
    if (response.success) {
      document.getElementById('householdName').value = response.householdName;
      document.getElementById('username').value = response.username;
      
      if (response.preferences) {
        document.getElementById('reminderFrequency').value = response.preferences.reminderFrequency || 'daily';
        document.getElementById('lowBalanceThreshold').value = response.preferences.lowBalanceThreshold || 500;
      }
    }
  } catch (error) {
    showError('Failed to load settings');
  }
}

function setupForms() {
  const householdForm = document.getElementById('householdForm');
  const passwordForm = document.getElementById('passwordForm');
  const preferencesForm = document.getElementById('preferencesForm');
  const deleteConfirmForm = document.getElementById('deleteConfirmForm');

  householdForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
      householdName: document.getElementById('householdName').value
    };

    try {
      await fetchAPI('/settings/household', {
        method: 'PUT',
        body: JSON.stringify(data)
      });

      showSuccess('Household information updated');
    } catch (error) {
      showError(error.message);
    }
  });

  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
      showError('New passwords do not match');
      return;
    }

    const data = {
      currentPassword: document.getElementById('currentPassword').value,
      newPassword: newPassword
    };

    try {
      await fetchAPI('/settings/password', {
        method: 'PUT',
        body: JSON.stringify(data)
      });

      showSuccess('Password changed successfully');
      passwordForm.reset();
    } catch (error) {
      showError(error.message);
    }
  });

  preferencesForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
      reminderFrequency: document.getElementById('reminderFrequency').value,
      lowBalanceThreshold: parseFloat(document.getElementById('lowBalanceThreshold').value)
    };

    try {
      await fetchAPI('/settings/preferences', {
        method: 'PUT',
        body: JSON.stringify(data)
      });

      showSuccess('Preferences updated');
    } catch (error) {
      showError(error.message);
    }
  });

  deleteConfirmForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
      confirmPassword: document.getElementById('deleteConfirmPassword').value
    };

    try {
      await fetchAPI('/settings/delete-all', {
        method: 'DELETE',
        body: JSON.stringify(data)
      });

      showSuccess('All data deleted successfully');
      document.getElementById('deleteConfirmModal').classList.add('hidden');
      deleteConfirmForm.reset();
      
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (error) {
      showError(error.message);
    }
  });
}

function setupModals() {
  const deleteModal = document.getElementById('deleteConfirmModal');

  const closeDeleteBtn = document.getElementById('closeDeleteModal');
  if (closeDeleteBtn) {
    closeDeleteBtn.addEventListener('click', () => {
      deleteModal.classList.add('hidden');
    });
  }

  window.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
      deleteModal.classList.add('hidden');
    }
  });
}

function setupButtons() {
  const exportBtn = document.getElementById('exportDataBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      window.location.href = '/api/settings/export';
    });
  }

  const deleteBtn = document.getElementById('deleteAllBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      document.getElementById('deleteConfirmModal').classList.remove('hidden');
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetchAPI('/auth/logout', { method: 'POST' });
        window.location.href = '/login';
      } catch (error) {
        showError('Failed to logout');
      }
    });
  }
}