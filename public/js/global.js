const API_BASE = '/api';

const fetchAPI = async (url, options = {}) => {
  try {
    const response = await fetch(API_BASE + url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const showError = (message) => {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  
  const container = document.querySelector('.container');
  if (container) {
    container.insertBefore(errorDiv, container.firstChild);
    setTimeout(() => errorDiv.remove(), 5000);
  }
};

const showSuccess = (message) => {
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.textContent = message;
  
  const container = document.querySelector('.container');
  if (container) {
    container.insertBefore(successDiv, container.firstChild);
    setTimeout(() => successDiv.remove(), 3000);
  }
};

const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const validateAmount = (amount) => {
  const num = parseFloat(amount);
  return !isNaN(num) && num >= 0 && num <= 9999999.99;
};

const validateDate = (date) => {
  const d = new Date(date);
  return d instanceof Date && !isNaN(d);
};

// ===== GLOBAL CONFIRMATION MODAL SYSTEM =====
let globalConfirmations = {
  pending: [],
  snoozed: []
};

// Load confirmations from API
async function loadConfirmations() {
  try {
    const response = await fetchAPI('/confirmations');
    
    if (response.success) {
      globalConfirmations.pending = response.pending || [];
      globalConfirmations.snoozed = response.snoozed || [];
      
      const total = globalConfirmations.pending.length + globalConfirmations.snoozed.length;
      
      // Update badge count
      updateConfirmationBadge(total);
      
      // Show modal if there are pending confirmations
      if (total > 0) {
        const lastDismissed = localStorage.getItem('confirmationsLastDismissed');
        const now = new Date().getTime();
        const oneHour = 60 * 60 * 1000;
        
        // Show modal if never dismissed or dismissed more than 1 hour ago
        if (!lastDismissed || (now - parseInt(lastDismissed)) > oneHour) {
          showConfirmationModal();
        }
      }
      
      return total;
    }
  } catch (error) {
    console.error('Failed to load confirmations:', error);
    return 0;
  }
}

// Update badge count
function updateConfirmationBadge(count) {
  const badge = document.getElementById('confirmationBadge');
  const badgeCount = document.getElementById('badgeCount');
  
  if (badge && badgeCount) {
    if (count > 0) {
      badge.classList.remove('hidden');
      badgeCount.textContent = count;
    } else {
      badge.classList.add('hidden');
    }
  }
}

// Show the modal
function showConfirmationModal() {
  const modal = document.getElementById('confirmationModal');
  if (!modal) return;
  
  const allConfirmations = [...globalConfirmations.pending, ...globalConfirmations.snoozed];
  const incomeConfirmations = allConfirmations.filter(c => c.type === 'income');
  const expenseConfirmations = allConfirmations.filter(c => c.type === 'expense');
  
  // Update count
  const countEl = document.getElementById('modalPendingCount');
  if (countEl) countEl.textContent = allConfirmations.length;
  
  // Populate income confirmations
  const incomeContainer = document.getElementById('modalIncomeConfirmations');
  if (incomeContainer) {
    if (incomeConfirmations.length > 0) {
      incomeContainer.innerHTML = incomeConfirmations.map(c => createIncomeConfirmationHTML(c)).join('');
    } else {
      incomeContainer.innerHTML = '<p class="empty-state">No pending income confirmations</p>';
    }
  }
  
  // Populate expense confirmations
  const expenseContainer = document.getElementById('modalExpenseConfirmations');
  if (expenseContainer) {
    if (expenseConfirmations.length > 0) {
      expenseContainer.innerHTML = expenseConfirmations.map(c => createExpenseConfirmationHTML(c)).join('');
    } else {
      expenseContainer.innerHTML = '<p class="empty-state">No pending expense confirmations</p>';
    }
  }
  
  // Show modal
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// Hide the modal
function hideConfirmationModal() {
  const modal = document.getElementById('confirmationModal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

// Create income confirmation HTML
function createIncomeConfirmationHTML(confirmation) {
  const now = new Date();
  const dueDate = new Date(confirmation.dueDate);
  const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
  const isOverdue = daysOverdue > 0;
  const isSnoozed = confirmation.status === 'snoozed';
  
  let statusBadge = '';
  if (isSnoozed) {
    const snoozeDate = new Date(confirmation.snoozeUntil);
    statusBadge = `<span class="status-badge snoozed-badge">⏰ Snoozed until ${formatDate(snoozeDate)}</span>`;
  } else if (isOverdue) {
    statusBadge = `<span class="status-badge overdue-badge">⚠️ ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue</span>`;
  } else {
    statusBadge = `<span class="status-badge today-badge">📅 Today</span>`;
  }
  
  return `
    <div class="confirmation-item ${isOverdue ? 'confirmation-overdue' : ''} ${isSnoozed ? 'confirmation-snoozed' : ''}">
      <div class="confirmation-header">
        ${statusBadge}
        <span class="confirmation-date">Due: ${formatDate(dueDate)}</span>
      </div>
      <div class="confirmation-text">
        Did you get paid ${formatCurrency(confirmation.expectedAmount)} from ${confirmation.name}?
      </div>
      <div class="confirmation-actions">
        <button class="btn btn-success btn-sm" onclick="confirmIncome('${confirmation._id}', ${confirmation.expectedAmount})">✓ YES</button>
        <button class="btn btn-warning btn-sm" onclick="snoozeConfirmation('${confirmation._id}')">⏰ LATER</button>
        <button class="btn btn-primary btn-sm" onclick="showDifferentAmount('${confirmation._id}', 'income')">💰 Different</button>
      </div>
    </div>
  `;
}

// Create expense confirmation HTML
function createExpenseConfirmationHTML(confirmation) {
  const now = new Date();
  const dueDate = new Date(confirmation.dueDate);
  const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
  const isOverdue = daysOverdue > 0;
  const isSnoozed = confirmation.status === 'snoozed';
  
  let statusBadge = '';
  if (isSnoozed) {
    const snoozeDate = new Date(confirmation.snoozeUntil);
    statusBadge = `<span class="status-badge snoozed-badge">⏰ Snoozed until ${formatDate(snoozeDate)}</span>`;
  } else if (isOverdue) {
    statusBadge = `<span class="status-badge overdue-badge">⚠️ ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue</span>`;
  } else {
    statusBadge = `<span class="status-badge today-badge">📅 Today</span>`;
  }
  
  return `
    <div class="confirmation-item ${isOverdue ? 'confirmation-overdue' : ''} ${isSnoozed ? 'confirmation-snoozed' : ''}">
      <div class="confirmation-header">
        ${statusBadge}
        <span class="confirmation-date">Due: ${formatDate(dueDate)}</span>
      </div>
      <div class="confirmation-text">
        Is the ${confirmation.name} (${formatCurrency(confirmation.expectedAmount)}) paid?
      </div>
      <div class="confirmation-actions">
        <button class="btn btn-success btn-sm" onclick="showExpenseDate('${confirmation._id}')">✓ YES</button>
        <button class="btn btn-warning btn-sm" onclick="snoozeConfirmation('${confirmation._id}')">⏰ LATER</button>
        <button class="btn btn-danger btn-sm" onclick="skipConfirmation('${confirmation._id}')">✗ SKIP</button>
      </div>
    </div>
  `;
}

// Initialize modal on page load
document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is logged in (skip login/register pages)
  const isAuthPage = window.location.pathname === '/login' || 
                     window.location.pathname === '/register' ||
                     window.location.pathname === '/forgot-password';
  
  if (!isAuthPage) {
    await loadConfirmations();
    
    // Setup modal event listeners
    const closeBtn = document.getElementById('closeConfirmationModal');
    const doneBtn = document.getElementById('closeModalBtn');
    const remindBtn = document.getElementById('remindMeLaterBtn');
    const modal = document.getElementById('confirmationModal');
    const badge = document.getElementById('confirmationBadge');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        hideConfirmationModal();
        localStorage.setItem('confirmationsLastDismissed', new Date().getTime());
      });
    }
    
    if (doneBtn) {
      doneBtn.addEventListener('click', () => {
        hideConfirmationModal();
        localStorage.setItem('confirmationsLastDismissed', new Date().getTime());
      });
    }
    
    if (remindBtn) {
      remindBtn.addEventListener('click', () => {
        hideConfirmationModal();
        localStorage.setItem('confirmationsLastDismissed', new Date().getTime());
        showSuccess('We\'ll remind you in 1 hour');
      });
    }
    
    // Click badge to show modal
    if (badge) {
      badge.addEventListener('click', () => {
        showConfirmationModal();
      });
    }
    
    // Close on overlay click
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target.id === 'confirmationModal') {
          hideConfirmationModal();
          localStorage.setItem('confirmationsLastDismissed', new Date().getTime());
        }
      });
    }
  }
});

// Expose reload function globally
window.reloadConfirmations = loadConfirmations;