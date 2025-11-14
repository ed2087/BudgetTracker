let currentPage = 1;
let currentFilters = {
  startDate: null,
  endDate: null,
  category: '',
  type: ''
};

document.addEventListener('DOMContentLoaded', () => {
  initializePage();
  setupForms();
  setupDateRangeListener();
});

function initializePage() {
  const now = new Date();
  document.getElementById('expenseDate').valueAsDate = now;
  
  setThisMonthDates();
  loadExpenses();
  loadSummary();
}

function setThisMonthDates() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  currentFilters.startDate = firstDay.toISOString().split('T')[0];
  currentFilters.endDate = lastDay.toISOString().split('T')[0];
}

async function loadExpenses() {
  try {
    const params = new URLSearchParams({
      page: currentPage,
      limit: 20,
      ...currentFilters
    });

    const response = await fetchAPI(`/expenses?${params}`);
    
    if (response.success) {
      displayExpenses(response.expenses);
      displayPagination(response.page, response.pages);
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
  document.getElementById('summaryTotal').textContent = formatCurrency(data.totalExpenses);
  document.getElementById('summaryNecessities').textContent = formatCurrency(data.necessities);
  document.getElementById('summaryLuxuries').textContent = formatCurrency(data.luxuries);
  document.getElementById('summaryCount').textContent = data.transactionCount;
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
    'Shopping': '🛍️',
    'Other': '📦'
  };
  return icons[category] || '📦';
}

function displayPagination(page, totalPages) {
  const container = document.getElementById('pagination');
  
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '<div class="pagination-controls">';
  
  if (page > 1) {
    html += `<button class="btn btn-sm" onclick="changePage(${page - 1})">Previous</button>`;
  }
  
  html += `<span class="pagination-info">Page ${page} of ${totalPages}</span>`;
  
  if (page < totalPages) {
    html += `<button class="btn btn-sm" onclick="changePage(${page + 1})">Next</button>`;
  }
  
  html += '</div>';
  container.innerHTML = html;
}

function changePage(page) {
  currentPage = page;
  loadExpenses();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupForms() {
  const filtersForm = document.getElementById('filtersForm');
  const quickAddForm = document.getElementById('quickAddForm');
  const uploadBtn = document.getElementById('uploadReceiptBtn');

  filtersForm.addEventListener('submit', (e) => {
    e.preventDefault();
    applyFilters();
  });

  quickAddForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await addExpense();
  });

  uploadBtn.addEventListener('click', () => {
    document.getElementById('receiptModal').classList.remove('hidden');
  });
}

function setupDateRangeListener() {
  const dateRangeSelect = document.getElementById('filterDateRange');
  const customDateRange = document.getElementById('customDateRange');

  dateRangeSelect.addEventListener('change', () => {
    if (dateRangeSelect.value === 'custom') {
      customDateRange.classList.remove('hidden');
    } else {
      customDateRange.classList.add('hidden');
      updateDateRange(dateRangeSelect.value);
    }
  });
}

function updateDateRange(range) {
  const now = new Date();
  let startDate, endDate;

  switch(range) {
    case 'this-month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'last-month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case 'last-3-months':
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
  }

  currentFilters.startDate = startDate.toISOString().split('T')[0];
  currentFilters.endDate = endDate.toISOString().split('T')[0];
}

function applyFilters() {
  const dateRange = document.getElementById('filterDateRange').value;
  
  if (dateRange === 'custom') {
    currentFilters.startDate = document.getElementById('startDate').value;
    currentFilters.endDate = document.getElementById('endDate').value;
  }
  
  currentFilters.category = document.getElementById('filterCategory').value;
  currentFilters.type = document.getElementById('filterType').value;
  
  currentPage = 1;
  loadExpenses();
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
  const content = document.getElementById('expenseDetailContent');
  
  content.innerHTML = `
    <div class="detail-section">
      <div class="detail-row">
        <span class="detail-label">Name:</span>
        <span class="detail-value">${expense.name}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Category:</span>
        <span class="detail-value">${expense.category}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Amount:</span>
        <span class="detail-value amount">${formatCurrency(expense.amount)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Date Paid:</span>
        <span class="detail-value">${formatDate(expense.paidDate)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Type:</span>
        <span class="detail-value">${expense.type}</span>
      </div>
      ${expense.notes ? `
        <div class="detail-row">
          <span class="detail-label">Notes:</span>
          <span class="detail-value">${expense.notes}</span>
        </div>
      ` : ''}
      ${expense.receiptText ? `
        <div class="detail-row">
          <span class="detail-label">Receipt Text:</span>
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

document.getElementById('closeReceiptModal')?.addEventListener('click', () => {
  document.getElementById('receiptModal').classList.add('hidden');
});

document.getElementById('closeDetailModal')?.addEventListener('click', () => {
  document.getElementById('expenseDetailModal').classList.add('hidden');
});