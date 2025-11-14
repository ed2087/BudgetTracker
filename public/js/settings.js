document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadBalance();
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

async function loadBalance() {
  try {
    const response = await fetchAPI('/settings/balance');
    
    if (response.success) {
      document.getElementById('currentBalance').textContent = formatCurrency(response.currentBalance);
      document.getElementById('lastUpdated').textContent = formatDate(response.lastUpdated);
    }
  } catch (error) {
    console.error('Failed to load balance');
  }
}

function setupForms() {
  const householdForm = document.getElementById('householdForm');
  const passwordForm = document.getElementById('passwordForm');
  const preferencesForm = document.getElementById('preferencesForm');
  const updateBalanceForm = document.getElementById('updateBalanceForm');
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

  updateBalanceForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
      newBalance: parseFloat(document.getElementById('newBalance').value),
      reason: document.getElementById('balanceReason').value || 'Manual adjustment'
    };

    try {
      await fetchAPI('/settings/balance/update', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      showSuccess('Balance updated successfully');
      document.getElementById('updateBalanceModal').classList.add('hidden');
      updateBalanceForm.reset();
      loadBalance();
    } catch (error) {
      showError(error.message);
    }
  });

  deleteConfirmForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
      confirmPassword: document.getElementById('confirmPassword').value
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
  const updateBalanceModal = document.getElementById('updateBalanceModal');
  const historyModal = document.getElementById('balanceHistoryModal');
  const deleteModal = document.getElementById('deleteConfirmModal');

  document.getElementById('closeBalanceModal').addEventListener('click', () => {
    updateBalanceModal.classList.add('hidden');
  });

  document.getElementById('closeHistoryModal').addEventListener('click', () => {
    historyModal.classList.add('hidden');
  });

  document.getElementById('closeDeleteModal').addEventListener('click', () => {
    deleteModal.classList.add('hidden');
  });

  window.addEventListener('click', (e) => {
    if (e.target === updateBalanceModal) {
      updateBalanceModal.classList.add('hidden');
    }
    if (e.target === historyModal) {
      historyModal.classList.add('hidden');
    }
    if (e.target === deleteModal) {
      deleteModal.classList.add('hidden');
    }
  });
}

function setupButtons() {
  document.getElementById('updateBalanceBtn').addEventListener('click', () => {
    document.getElementById('updateBalanceModal').classList.remove('hidden');
  });

  document.getElementById('viewHistoryBtn').addEventListener('click', async () => {
    await loadBalanceHistory();
  });

  document.getElementById('exportDataBtn').addEventListener('click', () => {
    window.location.href = '/api/settings/export';
  });

  document.getElementById('deleteAllBtn').addEventListener('click', () => {
    document.getElementById('deleteConfirmModal').classList.remove('hidden');
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
      await fetchAPI('/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (error) {
      showError('Failed to logout');
    }
  });
}

async function loadBalanceHistory() {
  try {
    const response = await fetchAPI('/settings/balance/history');
    
    if (response.success) {
      displayBalanceHistory(response.history);
    }
  } catch (error) {
    showError('Failed to load balance history');
  }
}

function displayBalanceHistory(history) {
  const container = document.getElementById('balanceHistory');
  
  if (history.length === 0) {
    container.innerHTML = '<p class="empty-state">No balance history yet</p>';
  } else {
    container.innerHTML = history.map(entry => `
      <div class="history-item">
        <div class="history-date">${formatDate(entry.date)}</div>
        <div class="history-details">
          <div class="history-reason">${entry.reason}</div>
          <div class="history-type badge badge-${entry.type === 'income' ? 'success' : entry.type === 'expense' ? 'danger' : 'secondary'}">
            ${entry.type}
          </div>
        </div>
        <div class="history-amounts">
          <div class="history-change amount ${entry.change >= 0 ? 'text-success' : 'text-danger'}">
            ${entry.change >= 0 ? '+' : ''}${formatCurrency(entry.change)}
          </div>
          <div class="history-balance">Balance: ${formatCurrency(entry.balance)}</div>
        </div>
      </div>
    `).join('');
  }

  document.getElementById('balanceHistoryModal').classList.remove('hidden');
}