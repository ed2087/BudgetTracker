async function confirmIncome(confirmationId, expectedAmount) {
  try {
    await fetchAPI(`/confirmations/${confirmationId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ actualAmount: expectedAmount })
    });

    showSuccess('Income confirmed successfully');
    
    // Reload confirmations modal
    await window.reloadConfirmations();
    
    // Reload dashboard if on dashboard page
    if (typeof loadDashboardData === 'function') {
      loadDashboardData();
    }
  } catch (error) {
    showError(error.message);
  }
}

async function snoozeConfirmation(confirmationId) {
  const days = prompt('How many days to snooze?', '3');
  
  if (!days) return;

  const snoozeUntil = new Date();
  snoozeUntil.setDate(snoozeUntil.getDate() + parseInt(days));

  try {
    await fetchAPI(`/confirmations/${confirmationId}/snooze`, {
      method: 'POST',
      body: JSON.stringify({ snoozeUntil: snoozeUntil.toISOString() })
    });

    showSuccess(`Snoozed for ${days} day${days > 1 ? 's' : ''}`);
    
    // Reload confirmations modal
    await window.reloadConfirmations();
    
    // Reload dashboard if on dashboard page
    if (typeof loadDashboardData === 'function') {
      loadDashboardData();
    }
  } catch (error) {
    showError(error.message);
  }
}

async function skipConfirmation(confirmationId) {
  if (!confirm('Are you sure you want to skip this confirmation? It will not prompt again this period.')) {
    return;
  }

  try {
    await fetchAPI(`/confirmations/${confirmationId}/skip`, {
      method: 'POST'
    });

    showSuccess('Confirmation skipped');
    
    // Reload confirmations modal
    await window.reloadConfirmations();
    
    // Reload dashboard if on dashboard page
    if (typeof loadDashboardData === 'function') {
      loadDashboardData();
    }
  } catch (error) {
    showError(error.message);
  }
}

function showDifferentAmount(confirmationId, type) {
  const amount = prompt('Enter the actual amount:');
  
  if (!amount) return;

  const actualAmount = parseFloat(amount);
  
  if (isNaN(actualAmount) || actualAmount < 0) {
    showError('Invalid amount');
    return;
  }

  if (type === 'income') {
    confirmIncomeWithAmount(confirmationId, actualAmount);
  } else {
    updateConfirmationAmount(confirmationId, actualAmount);
  }
}

async function confirmIncomeWithAmount(confirmationId, actualAmount) {
  try {
    await fetchAPI(`/confirmations/${confirmationId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ actualAmount })
    });

    showSuccess('Income confirmed with actual amount');
    
    // Reload confirmations modal
    await window.reloadConfirmations();
    
    // Reload dashboard if on dashboard page
    if (typeof loadDashboardData === 'function') {
      loadDashboardData();
    }
  } catch (error) {
    showError(error.message);
  }
}

async function updateConfirmationAmount(confirmationId, actualAmount) {
  try {
    await fetchAPI(`/confirmations/${confirmationId}/amount`, {
      method: 'PUT',
      body: JSON.stringify({ actualAmount })
    });

    showSuccess('Amount updated');
    
    // Reload confirmations modal
    await window.reloadConfirmations();
    
    // Reload dashboard if on dashboard page
    if (typeof loadDashboardData === 'function') {
      loadDashboardData();
    }
  } catch (error) {
    showError(error.message);
  }
}

function showExpenseDate(confirmationId) {
  const dateStr = prompt('When did you pay it? (YYYY-MM-DD)', new Date().toISOString().split('T')[0]);
  
  if (!dateStr) return;

  const date = new Date(dateStr);
  
  if (isNaN(date.getTime())) {
    showError('Invalid date');
    return;
  }

  confirmExpense(confirmationId, date.toISOString());
}

async function confirmExpense(confirmationId, actualDate) {
  try {
    await fetchAPI(`/confirmations/${confirmationId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ actualDate })
    });

    showSuccess('Expense confirmed successfully');
    
    // Reload confirmations modal
    await window.reloadConfirmations();
    
    // Reload dashboard if on dashboard page
    if (typeof loadDashboardData === 'function') {
      loadDashboardData();
    }
  } catch (error) {
    showError(error.message);
  }
}