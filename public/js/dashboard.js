document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
  setupModals();
  setupForms();
});

async function loadDashboardData() {
  try {
    const [statsResponse, upcomingResponse, recentResponse] = await Promise.all([
      fetchAPI('/dashboard/stats'),
      fetchAPI('/dashboard/upcoming'),
      fetchAPI('/dashboard/recent')
    ]);

    displayStats(statsResponse);
    displayUpcomingBills(upcomingResponse);
    displayRecentActivity(recentResponse);
  } catch (error) {
    console.error('Dashboard error:', error);
    showError('Failed to load dashboard data');
  }
}

function displayStats(data) {
  document.getElementById('confirmedIncome').textContent = formatCurrency(data.confirmedIncome);
  document.getElementById('totalExpenses').textContent = formatCurrency(data.totalExpenses);
  
  const leftThisMonth = document.getElementById('leftThisMonth');
  leftThisMonth.textContent = formatCurrency(data.leftThisMonth);
  leftThisMonth.className = 'stat-value amount ' + (data.leftThisMonth >= 0 ? 'text-success' : 'text-danger');
  
  const afterBills = document.getElementById('afterBills');
  afterBills.textContent = formatCurrency(data.afterBills);
  afterBills.className = 'stat-value amount ' + (data.afterBills >= 0 ? 'text-success' : 'text-danger');

  const statusCard = document.getElementById('statusCard');
  const statusMessage = document.getElementById('statusMessage');
  statusMessage.textContent = data.statusMessage;
  
  statusCard.className = 'card status-card status-' + data.status;
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
          ${activity.change >= 0 ? '+' : ''}${formatCurrency(Math.abs(activity.change))}
        </span>
        <span class="activity-date">${formatDate(activity.date)}</span>
      </div>
    </div>
  `).join('');
}

function setupModals() {
  const addExpenseBtn = document.getElementById('addExpenseBtn');
  const closeExpenseModal = document.getElementById('closeExpenseModal');
  const expenseModal = document.getElementById('addExpenseModal');

  function closeModal(modal) {
    if (modal) modal.classList.add('hidden');
  }

  if (addExpenseBtn) {
    addExpenseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      expenseModal.classList.remove('hidden');
      document.getElementById('expenseDate').valueAsDate = new Date();
    });
  }

  if (closeExpenseModal) {
    closeExpenseModal.addEventListener('click', () => closeModal(expenseModal));
  }

  if (expenseModal) {
    expenseModal.addEventListener('click', (e) => {
      if (e.target === expenseModal) closeModal(expenseModal);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal(expenseModal);
  });

  const expenseModalContent = expenseModal?.querySelector('.modal-content');
  if (expenseModalContent) {
    expenseModalContent.addEventListener('click', (e) => e.stopPropagation());
  }
}

function setupForms() {
  const addExpenseForm = document.getElementById('addExpenseForm');
  const expenseModal = document.getElementById('addExpenseModal');

  if (addExpenseForm) {
    addExpenseForm.addEventListener('submit', async (e) => {
      e.preventDefault();

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
}