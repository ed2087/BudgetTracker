document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
  setupModals();
  setupForms();
});

async function loadDashboardData() {
  try {
    const [statsResponse, pendingResponse, upcomingResponse, recentResponse] = await Promise.all([
      fetchAPI('/dashboard/stats'),
      fetchAPI('/dashboard/pending'),
      fetchAPI('/dashboard/upcoming'),
      fetchAPI('/dashboard/recent')
    ]);

    displayStats(statsResponse);
    displayPendingConfirmations(pendingResponse);
    displayUpcomingBills(upcomingResponse);
    displayRecentActivity(recentResponse);
  } catch (error) {
    showError('Failed to load dashboard data');
  }
}

function displayStats(data) {
  document.getElementById('currentBalance').textContent = formatCurrency(data.currentBalance);
  document.getElementById('monthlyIncome').textContent = formatCurrency(data.monthlyIncome);
  document.getElementById('monthlyExpenses').textContent = formatCurrency(data.monthlyExpenses);
  
  const netDiff = document.getElementById('netDifference');
  netDiff.textContent = formatCurrency(data.netDifference);
  netDiff.className = 'stat-value amount ' + (data.netDifference >= 0 ? 'text-success' : 'text-danger');

  const statusCard = document.getElementById('statusCard');
  const statusMessage = document.getElementById('statusMessage');
  statusMessage.textContent = data.statusMessage;
  
  statusCard.className = 'card status-card status-' + data.status;
}

function displayPendingConfirmations(data) {
  const totalPending = data.incomeConfirmations.length + data.expenseConfirmations.length;
  
  if (totalPending === 0) {
    document.getElementById('pendingSection').classList.add('hidden');
    return;
  }

  document.getElementById('pendingSection').classList.remove('hidden');
  document.getElementById('pendingCount').textContent = totalPending;

  const incomeContainer = document.getElementById('incomeConfirmations');
  const expenseContainer = document.getElementById('expenseConfirmations');

  incomeContainer.innerHTML = '';
  expenseContainer.innerHTML = '';

  data.incomeConfirmations.forEach(confirmation => {
    incomeContainer.innerHTML += createIncomeConfirmationHTML(confirmation);
  });

  data.expenseConfirmations.forEach(confirmation => {
    expenseContainer.innerHTML += createExpenseConfirmationHTML(confirmation);
  });

  attachConfirmationListeners();
}

function createIncomeConfirmationHTML(confirmation) {
  return `
    <div class="confirmation-item">
      <div class="confirmation-text">
        Did you get paid ${formatCurrency(confirmation.expectedAmount)} from ${confirmation.name}?
      </div>
      <div class="confirmation-actions">
        <button class="btn btn-success btn-sm" onclick="confirmIncome('${confirmation._id}', ${confirmation.expectedAmount})">YES - Received</button>
        <button class="btn btn-warning btn-sm" onclick="snoozeConfirmation('${confirmation._id}')">NOT YET</button>
        <button class="btn btn-primary btn-sm" onclick="showDifferentAmount('${confirmation._id}', 'income')">Different Amount</button>
      </div>
    </div>
  `;
}

function createExpenseConfirmationHTML(confirmation) {
  return `
    <div class="confirmation-item">
      <div class="confirmation-text">
        Is the ${confirmation.name} (${formatCurrency(confirmation.expectedAmount)}) paid this month?
      </div>
      <div class="confirmation-actions">
        <button class="btn btn-success btn-sm" onclick="showExpenseDate('${confirmation._id}')">YES - Mark Paid</button>
        <button class="btn btn-warning btn-sm" onclick="snoozeConfirmation('${confirmation._id}')">NOT YET</button>
        <button class="btn btn-danger btn-sm" onclick="skipConfirmation('${confirmation._id}')">SKIP THIS MONTH</button>
      </div>
    </div>
  `;
}

function attachConfirmationListeners() {
  // Listeners are attached via onclick in HTML for simplicity
}

function displayUpcomingBills(data) {
  const container = document.getElementById('upcomingBills');
  
  if (!data.upcomingBills || data.upcomingBills.length === 0) {
    container.innerHTML = '<p class="empty-state">No upcoming bills in the next 7 days</p>';
    return;
  }

  container.innerHTML = data.upcomingBills.map(bill => `
    <div class="bill-item">
      <div class="bill-info">
        <span class="bill-name">${bill.name}</span>
        <span class="bill-amount amount">${formatCurrency(bill.expectedAmount)}</span>
      </div>
      <div class="bill-due">Due: Day ${bill.dueDay}</div>
    </div>
  `).join('');
}

function displayRecentActivity(data) {
  const container = document.getElementById('recentActivity');
  
  if (!data.recentActivity || data.recentActivity.length === 0) {
    container.innerHTML = '<p class="empty-state">No recent activity</p>';
    return;
  }

  container.innerHTML = data.recentActivity.map(activity => `
    <div class="activity-item">
      <div class="activity-info">
        <span class="activity-type ${activity.type}">${activity.type === 'income' ? '↑' : '↓'}</span>
        <span class="activity-reason">${activity.reason}</span>
      </div>
      <div class="activity-details">
        <span class="activity-amount amount ${activity.type === 'income' ? 'text-success' : 'text-danger'}">
          ${activity.change >= 0 ? '+' : ''}${formatCurrency(activity.change)}
        </span>
        <span class="activity-date">${formatDate(activity.date)}</span>
      </div>
    </div>
  `).join('');
}

function setupModals() {
  const addExpenseBtn = document.getElementById('addExpenseBtn');
  const updateBalanceBtn = document.getElementById('updateBalanceBtn');
  const closeExpenseModal = document.getElementById('closeExpenseModal');
  const closeBalanceModal = document.getElementById('closeBalanceModal');
  const expenseModal = document.getElementById('addExpenseModal');
  const balanceModal = document.getElementById('updateBalanceModal');

  // Helper function to close a modal
  function closeModal(modal) {
    modal.classList.add('hidden');
  }

  // Open expense modal
  if (addExpenseBtn) {
    addExpenseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeModal(balanceModal); // Close other modal if open
      expenseModal.classList.remove('hidden');
      document.getElementById('expenseDate').valueAsDate = new Date();
    });
  }

  // Open balance modal
  if (updateBalanceBtn) {
    updateBalanceBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeModal(expenseModal); // Close other modal if open
      balanceModal.classList.remove('hidden');
    });
  }

  // Close expense modal via X button
  if (closeExpenseModal) {
    closeExpenseModal.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeModal(expenseModal);
    });
  }

  // Close balance modal via X button
  if (closeBalanceModal) {
    closeBalanceModal.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeModal(balanceModal);
    });
  }

  // Close expense modal when clicking outside (on backdrop)
  if (expenseModal) {
    expenseModal.addEventListener('click', (e) => {
      // Only close if clicking directly on the modal backdrop, not its children
      if (e.target === expenseModal) {
        closeModal(expenseModal);
      }
    });
  }

  // Close balance modal when clicking outside (on backdrop)
  if (balanceModal) {
    balanceModal.addEventListener('click', (e) => {
      // Only close if clicking directly on the modal backdrop, not its children
      if (e.target === balanceModal) {
        closeModal(balanceModal);
      }
    });
  }

  // Close modals with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal(expenseModal);
      closeModal(balanceModal);
    }
  });

  // Prevent clicks inside modal content from closing the modal
  const expenseModalContent = expenseModal?.querySelector('.modal-content');
  const balanceModalContent = balanceModal?.querySelector('.modal-content');

  if (expenseModalContent) {
    expenseModalContent.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  if (balanceModalContent) {
    balanceModalContent.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
}

function setupForms() {
  const addExpenseForm = document.getElementById('addExpenseForm');
  const updateBalanceForm = document.getElementById('updateBalanceForm');
  const expenseModal = document.getElementById('addExpenseModal');
  const balanceModal = document.getElementById('updateBalanceModal');

  if (addExpenseForm) {
    addExpenseForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const data = {
        name: document.getElementById('expenseName').value,
        category: document.getElementById('expenseCategory').value,
        amount: parseFloat(document.getElementById('expenseAmount').value),
        paidDate: document.getElementById('expenseDate').value,
        notes: document.getElementById('expenseNotes').value,
        type: 'one-time'
      };

      try {
        await fetchAPI('/expenses', {
          method: 'POST',
          body: JSON.stringify(data)
        });

        showSuccess('Expense added successfully');
        expenseModal.classList.add('hidden');
        addExpenseForm.reset();
        loadDashboardData();
      } catch (error) {
        showError(error.message);
      }
    });
  }

  if (updateBalanceForm) {
    updateBalanceForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      e.stopPropagation();

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
        balanceModal.classList.add('hidden');
        updateBalanceForm.reset();
        loadDashboardData();
      } catch (error) {
        showError(error.message);
      }
    });
  }
}