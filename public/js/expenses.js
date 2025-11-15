let currentPage = 1;
let totalPages = 1;
let currentFilters = {
  month: '',
  category: '',
  type: ''
};

document.addEventListener('DOMContentLoaded', () => {
  initializePage();
  setupForms();
  setupFilters();
  setupPagination();
  setupModals();
});

function initializePage() {
  const now = new Date();
  document.getElementById('expenseDate').valueAsDate = now;
  
  // Don't set default month filter - show all expenses
  const filterMonth = document.getElementById('filterMonth');
  const currentMonth = now.getMonth();
  filterMonth.value = currentMonth;
  // Leave currentFilters.month empty to show all by default
  currentFilters.month = '';
  
  loadExpenses();
  loadSummary();
}

function setupForms() {
  const quickAddForm = document.getElementById('quickAddForm');

  quickAddForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await addExpense();
  });
}

function setupFilters() {
  const applyBtn = document.getElementById('applyFiltersBtn');
  const sortBy = document.getElementById('sortBy');

  applyBtn.addEventListener('click', () => {
    applyFilters();
  });

  sortBy.addEventListener('change', () => {
    loadExpenses();
  });
}

function setupPagination() {
  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');

  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadExpenses();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadExpenses();
    }
  });
}

function setupModals() {
  const uploadBtn = document.getElementById('uploadReceiptBtn');
  const closeDetailBtn = document.getElementById('closeDetailModal');

  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
      document.getElementById('receiptModal').classList.remove('hidden');
    });
  }

  if (closeDetailBtn) {
    closeDetailBtn.addEventListener('click', () => {
      document.getElementById('expenseDetailModal').classList.add('hidden');
    });
  }
}

function applyFilters() {
  currentFilters.month = document.getElementById('filterMonth').value;
  currentFilters.category = document.getElementById('filterCategory').value;
  currentFilters.type = document.getElementById('filterType').value;
  
  currentPage = 1;
  loadExpenses();
}

async function loadExpenses() {
  try {
    const params = new URLSearchParams({
      page: currentPage,
      limit: 20
    });

    // Only filter by month if a specific month is selected
    if (currentFilters.month !== '' && currentFilters.month !== 'all') {
      const now = new Date();
      const year = now.getFullYear();
      const month = parseInt(currentFilters.month);
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      params.append('startDate', startDate.toISOString().split('T')[0]);
      params.append('endDate', endDate.toISOString().split('T')[0]);
    }

    if (currentFilters.category) {
      params.append('category', currentFilters.category);
    }

    if (currentFilters.type) {
      params.append('type', currentFilters.type);
    }

    const response = await fetchAPI(`/expenses?${params}`);
    
    if (response.success) {
      displayExpenses(response.expenses);
      updatePagination(response.page, response.pages);
    }
  } catch (error) {
    showError('Failed to load expenses');
  }
}

async function loadSummary() {
  try {
    const now = new Date();
    const response = await fetchAPI(`/expenses/summary?month=${now.getMonth()}&year=${now.getFullYear()}`);
    
    if (response.success) {
      displaySummary(response);
    }
  } catch (error) {
    console.error('Failed to load summary');
  }
}

function displaySummary(data) {
  document.getElementById('totalExpenses').textContent = formatCurrency(data.totalExpenses);
  
  const necessitiesEl = document.getElementById('necessities');
  const luxuriesEl = document.getElementById('luxuries');
  
  const total = data.totalExpenses;
  const necPercent = total > 0 ? ((data.necessities / total) * 100).toFixed(0) : 0;
  const luxPercent = total > 0 ? ((data.luxuries / total) * 100).toFixed(0) : 0;
  
  necessitiesEl.innerHTML = `
    <span class="amount">${formatCurrency(data.necessities)}</span>
    <span class="percentage">(${necPercent}%)</span>
  `;
  
  luxuriesEl.innerHTML = `
    <span class="amount">${formatCurrency(data.luxuries)}</span>
    <span class="percentage">(${luxPercent}%)</span>
  `;
  
  document.getElementById('transactionCount').textContent = data.transactionCount;
}

function displayExpenses(expenses) {
  const container = document.getElementById('expensesList');
  
  if (expenses.length === 0) {
    container.innerHTML = '<p class="empty-state">No expenses found for the selected filters</p>';
    return;
  }

  container.innerHTML = expenses.map(expense => `
    <div class="expense-item">
      <div class="expense-icon">
        ${getCategoryIcon(expense.category)}
      </div>
      <div class="expense-info">
        <div class="expense-name">${expense.name}</div>
        <div class="expense-meta">
          <span class="badge">${expense.category}</span>
          <span class="badge badge-${expense.type === 'recurring' ? 'success' : 'primary'}">${expense.type}</span>
          <span class="expense-date">${formatDate(expense.paidDate)}</span>
        </div>
      </div>
      <div class="expense-amount amount text-danger">${formatCurrency(expense.amount)}</div>
      <div class="expense-actions">
        <button class="btn btn-sm btn-primary" onclick="viewExpense('${expense._id}')">View</button>
        <button class="btn btn-sm btn-danger" onclick="deleteExpense('${expense._id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function getCategoryIcon(category) {
  const icons = {
    'Housing': '🏠',
    'Utilities': '💡',
    'Transportation': '🚗',
    'Groceries': '🛒',
    'Insurance': '🛡️',
    'Debt Payments': '💳',
    'Healthcare': '🏥',
    'Entertainment': '🎬',
    'Dining Out': '🍽️',
    'Clothing': '👕',
    'Hobbies': '🎨',
    'Subscriptions': '📱',
    'Shopping': '�️',
    'Other': '📦'
  };
  return icons[category] || '📦';
}

function updatePagination(page, pages) {
  currentPage = page;
  totalPages = pages;
  
  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');
  const pageInfo = document.getElementById('pageInfo');
  
  prevBtn.disabled = (page <= 1);
  nextBtn.disabled = (page >= pages);
  pageInfo.textContent = `Page ${page} of ${pages}`;
}

async function addExpense() {
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
    document.getElementById('quickAddForm').reset();
    document.getElementById('expenseDate').valueAsDate = new Date();
    
    // Reload with current filters
    loadExpenses();
    loadSummary();
  } catch (error) {
    showError(error.message);
  }
}

async function viewExpense(id) {
  try {
    const response = await fetchAPI(`/expenses/${id}`);
    
    if (response.success) {
      displayExpenseDetail(response.expense);
    }
  } catch (error) {
    showError('Failed to load expense details');
  }
}

function displayExpenseDetail(expense) {
  const content = document.getElementById('expenseDetail');
  
  content.innerHTML = `
    <div class="detail-section">
      <div class="detail-row">
        <span class="detail-label">Name</span>
        <span class="detail-value">${expense.name}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Category</span>
        <span class="detail-value">${expense.category}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Amount</span>
        <span class="detail-value amount">${formatCurrency(expense.amount)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Date Paid</span>
        <span class="detail-value">${formatDate(expense.paidDate)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Type</span>
        <span class="detail-value">${expense.type}</span>
      </div>
      ${expense.notes ? `
        <div class="detail-row">
          <span class="detail-label">Notes</span>
          <span class="detail-value">${expense.notes}</span>
        </div>
      ` : ''}
      ${expense.receiptText ? `
        <div class="detail-row">
          <span class="detail-label">Receipt Text</span>
          <div class="receipt-text">${expense.receiptText}</div>
        </div>
      ` : ''}
    </div>
  `;

  document.getElementById('expenseDetailModal').classList.remove('hidden');
}

async function deleteExpense(id) {
  if (!confirm('Are you sure you want to delete this expense?')) {
    return;
  }

  try {
    await fetchAPI(`/expenses/${id}`, {
      method: 'DELETE'
    });

    showSuccess('Expense deleted');
    loadExpenses();
    loadSummary();
  } catch (error) {
    showError(error.message);
  }
}